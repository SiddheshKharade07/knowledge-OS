CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector;

ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv ON document_chunks USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
