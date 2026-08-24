package com.example.KnowledgeOS.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseInitializer implements CommandLineRunner {

    private static final String HNSW_INDEX_DDL =
            "CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING HNSW (embedding vector_cosine_ops)";

    private static final int MAX_HNSW_DIMENSIONS = 2000;

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingModel embeddingModel;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void run(String... args) {
        int dimensions = resolveEmbeddingDimensions();
        log.info("Initializing pgvector schema with embedding dimensions={}", dimensions);

        jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
        ensureTypedEmbeddingColumn(dimensions);
        jdbcTemplate.execute("""
                ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS tsv tsvector
                GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
                """);
        jdbcTemplate.execute(
                "CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv ON document_chunks USING GIN(tsv)");
        jdbcTemplate.execute(
                "CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id)");

        if (dimensions <= MAX_HNSW_DIMENSIONS) {
            try {
                jdbcTemplate.execute(HNSW_INDEX_DDL);
            } catch (DataAccessException e) {
                migrateIncompatibleEmbeddingColumn(dimensions, e);
                jdbcTemplate.execute(HNSW_INDEX_DDL);
            }
        } else {
            log.warn(
                    "Embedding dimension {} exceeds pgvector HNSW limit of {}. "
                            + "Semantic search will run in sequential-scan mode. "
                            + "Consider an embedding model with fewer dimensions or halfvec-based indexing.",
                    dimensions, MAX_HNSW_DIMENSIONS);
        }

        log.info("PostgreSQL schema initialization completed successfully");
    }

    private void ensureTypedEmbeddingColumn(int dimensions) {
        jdbcTemplate.execute(
                "ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(" + dimensions + ")");
    }

    private void migrateIncompatibleEmbeddingColumn(int dimensions, DataAccessException cause) {
        try {
            transactionTemplate.executeWithoutResult(tx -> {
                log.warn("Migrating 'embedding' column to typed vector({}), copying existing vectors", dimensions);
                jdbcTemplate.execute(
                        "ALTER TABLE document_chunks ADD COLUMN embedding_typed vector(" + dimensions + ")");
                jdbcTemplate.execute(
                        "UPDATE document_chunks SET embedding_typed = embedding::vector(" + dimensions + ")");
                jdbcTemplate.execute("ALTER TABLE document_chunks DROP COLUMN embedding");
                jdbcTemplate.execute("ALTER TABLE document_chunks RENAME COLUMN embedding_typed TO embedding");
            });
            log.info("Completed migration of 'embedding' column to vector({})", dimensions);
        } catch (DataAccessException migrationFailure) {
            Long embeddedRows = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM document_chunks WHERE embedding IS NOT NULL", Long.class);
            if (embeddedRows != null && embeddedRows > 0) {
                throw new IllegalStateException(
                        "document_chunks.embedding holds " + embeddedRows
                                + " vectors incompatible with dimension " + dimensions
                                + ". Re-ingest the affected documents to migrate them.",
                        migrationFailure);
            }

            log.warn("Recreating empty untyped 'embedding' column as vector({})", dimensions);
            jdbcTemplate.execute("ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding_typed");
            jdbcTemplate.execute("ALTER TABLE document_chunks DROP COLUMN embedding");
            jdbcTemplate.execute(
                    "ALTER TABLE document_chunks ADD COLUMN embedding vector(" + dimensions + ")");
        }
    }

    private int resolveEmbeddingDimensions() {
        try {
            return embeddingModel.dimensions();
        } catch (Exception e) {
            log.error("Unable to determine embedding dimensions from the configured model", e);
            throw new IllegalStateException("Cannot initialize pgvector schema: unknown embedding dimensions", e);
        }
    }
}
