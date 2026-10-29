package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.dto.RankedChunk;
import com.example.KnowledgeOS.exception.GenerationException;
import com.example.KnowledgeOS.service.ContextBuilder;
import com.example.KnowledgeOS.service.GenerationService;
import com.example.KnowledgeOS.service.HybridRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GenerationServiceImpl implements GenerationService {

    private static final String SYSTEM_PROMPT = """
        You are KnowledgeOS Assistant, a precise enterprise information retrieval system.
        Answer the user's question accurately and concisely using ONLY the provided document context below.

        Strict Rules:
        1. Base your answer strictly on the provided context chunks.
        2. Do NOT invent, extrapolate, or assume facts not present in the context.
        3. If the provided context does NOT contain sufficient information to answer the question, state: "I'm sorry, but the retrieved document context does not contain sufficient information to answer your question."
        4. Reference the document source or citation where appropriate.
        """;

    private final ChatClient chatClient;
    private final ContextBuilder contextBuilder;

    @Override
    public RagResponse generateAnswer(
            String userQuery,
            List<RankedChunk> topChunks,
            HybridRetrievalService.RetrievalResult retrievalResult
    ) {
        if (topChunks == null || topChunks.isEmpty()) {
            return new RagResponse(
                    userQuery,
                    "I'm sorry, but no relevant document context was found to answer your question.",
                    List.of(),
                    List.of(),
                    retrievalResult != null ? retrievalResult.getDebugInfo() : null
            );
        }

        ContextBuilder.BuiltContext builtContext = contextBuilder.buildContext(topChunks);

        String userPrompt = String.format("""
            Retrieved Document Context:
            %s

            User Question: %s
            """, builtContext.getFormattedContext(), userQuery);

        try {
            String answer = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(userPrompt)
                    .call()
                    .content();

            if (answer == null || answer.isBlank()) {
                // An empty provider response is a failure, not an answer.
                throw new GenerationException("The AI service returned an empty answer.");
            }

            return new RagResponse(
                    userQuery,
                    answer,
                    builtContext.getCitations(),
                    topChunks,
                    retrievalResult != null ? retrievalResult.getDebugInfo() : null
            );
        } catch (GenerationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to generate LLM response for query '{}'", userQuery, e);
            throw new GenerationException("The AI service could not generate an answer.", e);
        }
    }

    @Override
    public RagResponse generateAnswer(
            String userQuery,
            List<RankedChunk> topChunks,
            HybridRetrievalService.RetrievalResult retrievalResult,
            List<com.example.KnowledgeOS.service.RagPipelineService.ChatHistoryMessage> history
    ) {
        if (topChunks == null || topChunks.isEmpty()) {
            return new RagResponse(
                    userQuery,
                    "I'm sorry, but no relevant document context was found to answer your question.",
                    List.of(),
                    List.of(),
                    retrievalResult != null ? retrievalResult.getDebugInfo() : null
            );
        }

        ContextBuilder.BuiltContext builtContext = contextBuilder.buildContext(topChunks);

        StringBuilder userPrompt = new StringBuilder();
        if (history != null && !history.isEmpty()) {
            userPrompt.append("Conversation history (for context only):\n");
            for (com.example.KnowledgeOS.service.RagPipelineService.ChatHistoryMessage msg : history) {
                if (msg == null || msg.content() == null || msg.content().isBlank()) continue;
                String role = msg.role() == null ? "USER" : msg.role().toUpperCase();
                userPrompt.append(role).append(": ").append(msg.content().trim()).append("\n\n");
            }
        }
        userPrompt.append(String.format("""
            Retrieved Document Context:
            %s

            User Question: %s
            """, builtContext.getFormattedContext(), userQuery));

        try {
            String answer = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(userPrompt.toString())
                    .call()
                    .content();

            if (answer == null || answer.isBlank()) {
                throw new GenerationException("The AI service returned an empty answer.");
            }

            return new RagResponse(
                    userQuery,
                    answer,
                    builtContext.getCitations(),
                    topChunks,
                    retrievalResult != null ? retrievalResult.getDebugInfo() : null
            );
        } catch (GenerationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to generate LLM response for query '{}'", userQuery, e);
            throw new GenerationException("The AI service could not generate an answer.", e);
        }
    }

    @Override
    public Flux<String> generateAnswerStream(
            String userQuery,
            List<RankedChunk> topChunks,
            HybridRetrievalService.RetrievalResult retrievalResult
    ) {
        return generateAnswerStream(userQuery, topChunks, retrievalResult, List.of());
    }

    @Override
    public Flux<String> generateAnswerStream(
            String userQuery,
            List<RankedChunk> topChunks,
            HybridRetrievalService.RetrievalResult retrievalResult,
            List<com.example.KnowledgeOS.service.RagPipelineService.ChatHistoryMessage> history
    ) {
        if (topChunks == null || topChunks.isEmpty()) {
            return Flux.just("I'm sorry, but no relevant document context was found to answer your question.");
        }

        ContextBuilder.BuiltContext builtContext = contextBuilder.buildContext(topChunks);

        StringBuilder userPrompt = new StringBuilder();
        if (history != null && !history.isEmpty()) {
            userPrompt.append("Conversation history (for context only):\n");
            for (com.example.KnowledgeOS.service.RagPipelineService.ChatHistoryMessage msg : history) {
                if (msg == null || msg.content() == null || msg.content().isBlank()) continue;
                String role = msg.role() == null ? "USER" : msg.role().toUpperCase();
                userPrompt.append(role).append(": ").append(msg.content().trim()).append("\n\n");
            }
        }
        userPrompt.append(String.format("""
            Retrieved Document Context:
            %s

            User Question: %s
            """, builtContext.getFormattedContext(), userQuery));

        // Provider failures must propagate so the chat stream can report a structured
        // error. Returning a canned "answer" here would falsely mark the turn as done.
        return chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt.toString())
                .stream()
                .content()
                .filter(content -> content != null);
    }
}
