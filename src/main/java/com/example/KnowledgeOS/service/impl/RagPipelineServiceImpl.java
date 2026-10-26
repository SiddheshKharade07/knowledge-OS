package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.service.GenerationService;
import com.example.KnowledgeOS.service.HybridRetrievalService;
import com.example.KnowledgeOS.service.RagPipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;

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

    private final com.example.KnowledgeOS.service.ContextBuilder contextBuilder;

    @Override
    public Flux<RagStreamEvent> queryStream(String userQuery) {
        log.info("Executing streaming RAG pipeline for query: '{}'", userQuery);

        HybridRetrievalService.RetrievalResult retrievalResult =
                hybridRetrievalService.retrieve(userQuery);

        if (retrievalResult.getTopChunks() == null || retrievalResult.getTopChunks().isEmpty()) {
            return Flux.just(
                    new RagStreamEvent("content", "I'm sorry, but no relevant document context was found to answer your question.", null),
                    new RagStreamEvent("citations", null, List.of()),
                    new RagStreamEvent("done", null, null)
            );
        }

        com.example.KnowledgeOS.service.ContextBuilder.BuiltContext builtContext = contextBuilder.buildContext(retrievalResult.getTopChunks());

        Flux<String> contentStream = generationService.generateAnswerStream(
                userQuery,
                retrievalResult.getTopChunks(),
                retrievalResult
        );

        return contentStream
                .map(chunk -> new RagStreamEvent("content", chunk, null))
                .concatWith(Flux.just(
                        new RagStreamEvent("citations", null, builtContext.getCitations()),
                        new RagStreamEvent("done", null, retrievalResult.getDebugInfo())
                ));
    }
}
