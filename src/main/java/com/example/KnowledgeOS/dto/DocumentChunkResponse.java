package com.example.KnowledgeOS.dto;

public record DocumentChunkResponse(
        Long id,
        Long documentId,
        Integer chunkIndex,
        String content,
        Integer tokenCount
) {
}
