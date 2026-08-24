package com.example.KnowledgeOS.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingModel embeddingModel;

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
        createHnswIndex();

        log.info("PostgreSQL schema initialization completed successfully");
    }

    private void ensureTypedEmbeddingColumn(int dimensions) {
        jdbcTemplate.execute(
                "ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(" + dimensions + ")");
    }

    private void createHnswIndex() {
        try {
            jdbcTemplate.execute(
                    "CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING HNSW (embedding vector_cosine_ops)");
        } catch (DataAccessException e) {
            migrateUntypedEmbeddingColumn(e);
        }
    }

    private void migrateUntypedEmbeddingColumn(DataAccessException cause) {
        Long embeddedRows = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM document_chunks WHERE embedding IS NOT NULL", Long.class);

        if (embeddedRows != null && embeddedRows > 0) {
            throw new IllegalStateException(
                    "document_chunks.embedding exists in an incompatible format with " + embeddedRows
                            + " embedded rows. Re-ingest the affected documents to migrate to a typed vector column.",
                    cause);
        }

        log.warn("Recreating untyped 'embedding' column as a typed vector column");
        jdbcTemplate.execute("ALTER TABLE document_chunks DROP COLUMN embedding");
        jdbcTemplate.execute(
                "ALTER TABLE document_chunks ADD COLUMN embedding vector("
                        + resolveEmbeddingDimensions() + ")");
        jdbcTemplate.execute(
                "CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING HNSW (embedding vector_cosine_ops)");
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
