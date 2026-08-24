package com.example.KnowledgeOS.dto;

public record Citation(
        Long documentId,
        String documentName,
        Long chunkId,
        Integer chunkIndex
) {
}
