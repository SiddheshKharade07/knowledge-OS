package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.Citation;
import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.dto.RankedChunk;
import com.example.KnowledgeOS.service.ContextBuilder;
import com.example.KnowledgeOS.service.GenerationService;
import com.example.KnowledgeOS.service.HybridRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

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
                answer = "Unable to generate an answer at this time.";
            }

            return new RagResponse(
                    userQuery,
                    answer,
                    builtContext.getCitations(),
                    topChunks,
                    retrievalResult != null ? retrievalResult.getDebugInfo() : null
            );
        } catch (Exception e) {
            log.error("Failed to generate LLM response for query '{}'", userQuery, e);
            return new RagResponse(
                    userQuery,
                    "An error occurred while generating the answer from retrieved context.",
                    builtContext.getCitations(),
                    topChunks,
                    retrievalResult != null ? retrievalResult.getDebugInfo() : null
            );
        }
    }
}
