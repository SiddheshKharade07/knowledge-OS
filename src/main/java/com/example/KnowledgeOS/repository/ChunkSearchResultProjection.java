package com.example.KnowledgeOS.repository;

public interface ChunkSearchResultProjection {
    Long getChunkId();
    Long getDocumentId();
    String getDocumentName();
    Integer getChunkIndex();
    String getContent();
    Double getScore();
}
