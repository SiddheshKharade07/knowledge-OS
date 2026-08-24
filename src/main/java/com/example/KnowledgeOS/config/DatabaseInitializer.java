package com.example.KnowledgeOS.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            log.info("Initializing PostgreSQL schema: pgvector extension, embedding, and tsvector columns...");
            jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector;");
            jdbcTemplate.execute("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector;");
            jdbcTemplate.execute("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv ON document_chunks USING GIN(tsv);");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);");
            log.info("PostgreSQL schema initialization completed successfully.");
        } catch (Exception e) {
            log.warn("Database initialization notice: {}", e.getMessage());
        }
    }
}
