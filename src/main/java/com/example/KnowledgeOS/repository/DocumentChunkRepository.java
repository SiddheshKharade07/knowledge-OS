package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

    void deleteByDocumentId(Long documentId);

    List<DocumentChunk> findByDocumentIdOrderByChunkIndexAsc(Long documentId);

    @Modifying
    @Query(value = "UPDATE document_chunks SET embedding = CAST(:vectorStr AS vector) WHERE id = :chunkId", nativeQuery = true)
    void updateChunkEmbedding(@Param("chunkId") Long chunkId, @Param("vectorStr") String vectorStr);

    @Query(value = """
            SELECT c.id AS chunkId,
                   c.document_id AS documentId,
                   d.file_name AS documentName,
                   c.chunk_index AS chunkIndex,
                   c.content AS content,
                   ts_rank(c.tsv, websearch_to_tsquery('english', :query)) AS score
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.tsv @@ websearch_to_tsquery('english', :query)
            ORDER BY score DESC
            LIMIT :topK
            """, nativeQuery = true)
    List<ChunkSearchResultProjection> searchLexicalWebsearch(
            @Param("query") String query,
            @Param("topK") int topK
    );

    @Query(value = """
            SELECT c.id AS chunkId,
                   c.document_id AS documentId,
                   d.file_name AS documentName,
                   c.chunk_index AS chunkIndex,
                   c.content AS content,
                   ts_rank(c.tsv, to_tsquery('english', :tsQuery)) AS score
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.tsv @@ to_tsquery('english', :tsQuery)
            ORDER BY score DESC
            LIMIT :topK
            """, nativeQuery = true)
    List<ChunkSearchResultProjection> searchLexicalTsQuery(
            @Param("tsQuery") String tsQuery,
            @Param("topK") int topK
    );

    @Query(value = """
            SELECT c.id AS chunkId,
                   c.document_id AS documentId,
                   d.file_name AS documentName,
                   c.chunk_index AS chunkIndex,
                   c.content AS content,
                   (1.0 - (c.embedding <=> CAST(:vectorStr AS vector))) AS score
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.embedding IS NOT NULL
              AND (1.0 - (c.embedding <=> CAST(:vectorStr AS vector))) >= :similarityThreshold
            ORDER BY (c.embedding <=> CAST(:vectorStr AS vector)) ASC
            LIMIT :topK
            """, nativeQuery = true)
    List<ChunkSearchResultProjection> searchSemanticVector(
            @Param("vectorStr") String vectorStr,
            @Param("similarityThreshold") double similarityThreshold,
            @Param("topK") int topK
    );
}
