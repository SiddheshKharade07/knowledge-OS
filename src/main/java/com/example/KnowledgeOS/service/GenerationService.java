package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.dto.RankedChunk;
import reactor.core.publisher.Flux;

import java.util.List;

public interface GenerationService {

    RagResponse generateAnswer(
            String userQuery,
            List<RankedChunk> topChunks,
            HybridRetrievalService.RetrievalResult retrievalResult
    );

    Flux<String> generateAnswerStream(
            String userQuery,
            List<RankedChunk> topChunks,
            HybridRetrievalService.RetrievalResult retrievalResult
    );
}
