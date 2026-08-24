package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.config.RagProperties;
import com.example.KnowledgeOS.dto.RankedChunk;
import com.example.KnowledgeOS.dto.RetrievalCandidate;
import com.example.KnowledgeOS.service.Reranker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmReranker implements Reranker {

    private final ChatClient chatClient;
    private final RagProperties ragProperties;

    @Override
    public List<RankedChunk> rerank(String query, List<RetrievalCandidate> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        int topK = ragProperties.getReranker().getTopK();
        if (!ragProperties.getReranker().isEnabled()) {
            log.debug("Reranker is disabled by configuration. Returning candidates sorted by fusion score.");
            return fallbackRerank(candidates, topK);
        }

        try {
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("User Query: ").append(query).append("\n\n");
            promptBuilder.append("Rate the relevance of each candidate chunk to the query on a scale from 0.0 to 1.0.\n\n");

            for (RetrievalCandidate cand : candidates) {
                promptBuilder.append("Chunk ID ").append(cand.getChunkId()).append(":\n")
                        .append(cand.getContent()).append("\n---\n");
            }

            String systemPrompt = """
                You are an expert document retrieval reranker.
                For each candidate chunk, evaluate how directly and completely it answers or relates to the user's query.
                Return scores formatted as lines:
                ChunkID: Score
                Example:
                1: 0.95
                2: 0.10
                """;

            String responseText = chatClient.prompt()
                    .system(systemPrompt)
                    .user(promptBuilder.toString())
                    .call()
                    .content();

            List<RankedChunk> rankedChunks = parseRerankerScores(responseText, candidates);
            if (!rankedChunks.isEmpty()) {
                rankedChunks.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));
                for (int i = 0; i < rankedChunks.size(); i++) {
                    rankedChunks.get(i).setFinalRank(i + 1);
                }
                return rankedChunks.stream().limit(topK).collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Reranking evaluation failed: {}. Falling back to fusion score ordering.", e.getMessage());
        }

        return fallbackRerank(candidates, topK);
    }

    private List<RankedChunk> parseRerankerScores(String responseText, List<RetrievalCandidate> candidates) {
        List<RankedChunk> list = new ArrayList<>();
        if (responseText == null || responseText.isBlank()) {
            return list;
        }

        for (RetrievalCandidate cand : candidates) {
            double score = cand.getFusionScore() != null ? cand.getFusionScore() : 0.5;
            String chunkIdPattern = cand.getChunkId() + ":";
            for (String line : responseText.split("\n")) {
                if (line.contains(chunkIdPattern)) {
                    try {
                        String[] parts = line.split(":");
                        if (parts.length >= 2) {
                            score = Double.parseDouble(parts[1].trim());
                        }
                    } catch (Exception ignored) {}
                }
            }

            list.add(RankedChunk.builder()
                    .chunkId(cand.getChunkId())
                    .documentId(cand.getDocumentId())
                    .documentName(cand.getDocumentName())
                    .chunkIndex(cand.getChunkIndex())
                    .content(cand.getContent())
                    .fusionScore(cand.getFusionScore())
                    .relevanceScore(score)
                    .build());
        }

        return list;
    }

    private List<RankedChunk> fallbackRerank(List<RetrievalCandidate> candidates, int topK) {
        List<RankedChunk> list = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            RetrievalCandidate cand = candidates.get(i);
            double fusionScore = cand.getFusionScore() != null ? cand.getFusionScore() : 0.0;
            list.add(RankedChunk.builder()
                    .chunkId(cand.getChunkId())
                    .documentId(cand.getDocumentId())
                    .documentName(cand.getDocumentName())
                    .chunkIndex(cand.getChunkIndex())
                    .content(cand.getContent())
                    .fusionScore(fusionScore)
                    .relevanceScore(fusionScore)
                    .finalRank(i + 1)
                    .build());
        }
        return list.stream().limit(topK).collect(Collectors.toList());
    }
}
