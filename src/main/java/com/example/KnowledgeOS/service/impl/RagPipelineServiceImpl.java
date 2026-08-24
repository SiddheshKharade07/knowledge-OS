package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.service.GenerationService;
import com.example.KnowledgeOS.service.HybridRetrievalService;
import com.example.KnowledgeOS.service.RagPipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagPipelineServiceImpl implements RagPipelineService {

    private final HybridRetrievalService hybridRetrievalService;
    private final GenerationService generationService;

    @Override
    public RagResponse query(String userQuery) {
        log.info("Executing production RAG pipeline for query: '{}'", userQuery);

        HybridRetrievalService.RetrievalResult retrievalResult =
                hybridRetrievalService.retrieve(userQuery);

        return generationService.generateAnswer(
                userQuery,
                retrievalResult.getTopChunks(),
                retrievalResult
        );
    }
}
