package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.RankedChunk;
import com.example.KnowledgeOS.service.DocumentSearchService;
import com.example.KnowledgeOS.service.HybridRetrievalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentSearchServiceImpl implements DocumentSearchService {

    private final HybridRetrievalService hybridRetrievalService;

    @Override
    public List<DocumentChunkResponse> SearchByKeyword(String prompt) {
        HybridRetrievalService.RetrievalResult retrievalResult = hybridRetrievalService.retrieve(prompt);

        return retrievalResult.getTopChunks().stream()
                .map(this::toDocumentChunkResponse)
                .collect(Collectors.toList());
    }

    private DocumentChunkResponse toDocumentChunkResponse(RankedChunk chunk) {
        return new DocumentChunkResponse(
                chunk.getChunkId(),
                chunk.getDocumentId(),
                chunk.getChunkIndex(),
                chunk.getContent(),
                estimateTokenCount(chunk.getContent())
        );
    }

    private int estimateTokenCount(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }
}