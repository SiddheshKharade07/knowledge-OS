package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.service.GenerationService;
import com.example.KnowledgeOS.service.HybridRetrievalService;
import com.example.KnowledgeOS.service.RagPipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagPipelineServiceImpl implements RagPipelineService {

    private final HybridRetrievalService hybridRetrievalService;
    private final GenerationService generationService;
    private final com.example.KnowledgeOS.service.ContextBuilder contextBuilder;

    @Override
    public RagResponse query(String userQuery) {
        return query(userQuery, List.of());
    }

    @Override
    public RagResponse query(String userQuery, List<ChatHistoryMessage> history) {
        log.info("Executing production RAG pipeline for query: '{}'", userQuery);

        String retrievalQuery = rewriteQueryForRetrieval(userQuery, history);
        HybridRetrievalService.RetrievalResult retrievalResult =
                hybridRetrievalService.retrieve(retrievalQuery);

        return generationService.generateAnswer(
                userQuery,
                retrievalResult.getTopChunks(),
                retrievalResult,
                history
        );
    }

    @Override
    public Flux<RagStreamEvent> queryStream(String userQuery) {
        return queryStream(userQuery, List.of());
    }

    @Override
    public Flux<RagStreamEvent> queryStream(String userQuery, List<ChatHistoryMessage> history) {
        log.info("Executing streaming RAG pipeline for query: '{}'", userQuery);

        String retrievalQuery = rewriteQueryForRetrieval(userQuery, history);
        HybridRetrievalService.RetrievalResult retrievalResult =
                hybridRetrievalService.retrieve(retrievalQuery);

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
                retrievalResult,
                history
        );

        return contentStream
                .map(chunk -> new RagStreamEvent("content", chunk, null))
                .concatWith(Flux.just(
                        new RagStreamEvent("citations", null, builtContext.getCitations()),
                        new RagStreamEvent("done", null, retrievalResult.getDebugInfo())
                ));
    }

    private String rewriteQueryForRetrieval(String userQuery, List<ChatHistoryMessage> history) {
        if (history == null || history.isEmpty() || userQuery == null) {
            return userQuery;
        }
        String q = userQuery.trim().toLowerCase();
        if (q.isEmpty()) {
            return userQuery;
        }
        // Heuristic rewrite for short follow-ups using recent history
        boolean needsRewrite = q.length() < 60 && (q.startsWith("what about") || q.startsWith("and") || q.startsWith("but")
                || q.contains("it") || q.contains("that") || q.contains("this") || q.contains("they") || q.contains("those"));
        if (!needsRewrite) {
            return userQuery;
        }
        List<ChatHistoryMessage> recent = new ArrayList<>(history);
        Collections.reverse(recent);
        StringBuilder context = new StringBuilder();
        int turns = 0;
        for (ChatHistoryMessage msg : recent) {
            if (msg == null || msg.content() == null) continue;
            if ("USER".equalsIgnoreCase(msg.role()) && turns < 2) {
                context.append(msg.content().trim()).append(" ");
                turns++;
            } else if ("ASSISTANT".equalsIgnoreCase(msg.role()) && turns < 2) {
                // include lightly
            }
            if (turns >= 2) break;
        }
        if (context.length() == 0) {
            return userQuery;
        }
        String rewritten = context.toString().trim() + " " + userQuery.trim();
        if (rewritten.length() > 500) {
            rewritten = rewritten.substring(0, 500);
        }
        return rewritten;
    }
}
