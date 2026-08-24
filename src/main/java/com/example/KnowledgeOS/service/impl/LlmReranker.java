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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmReranker implements Reranker {

    private static final Pattern SCORE_LINE = Pattern.compile("^\\s*(\\d+)\\s*[:\\-]\\s*([0-9]*\\.?[0-9]+)\\s*$");

    private static final String SYSTEM_PROMPT = """
            You are an expert document retrieval reranker.
            For each candidate chunk, evaluate how directly and completely it answers or relates to the user's query.
            Return one score line per chunk, formatted exactly as:
            <chunkId>: <score between 0.0 and 1.0>
            Example:
            12: 0.95
            7: 0.10
            Do not output anything else.
            """;

    private final ChatClient chatClient;
    private final RagProperties ragProperties;

    @Override
    public List<RankedChunk> rerank(String query, List<RetrievalCandidate> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        int topK = ragProperties.getReranker().getTopK();
        if (!ragProperties.getReranker().isEnabled()) {
            log.debug("Reranker disabled by configuration, ordering by fusion score");
            return fallbackRerank(candidates, topK);
        }

        List<RetrievalCandidate> inputCandidates = candidates.stream()
                .limit(ragProperties.getReranker().getMaxInput())
                .collect(Collectors.toList());

        try {
            String responseText = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(buildUserPrompt(query, inputCandidates))
                    .call()
                    .content();

            Map<Long, Double> scoresById = parseScores(responseText);
            List<RankedChunk> rankedChunks = toRankedChunks(inputCandidates, scoresById);

            if (!rankedChunks.isEmpty()) {
                rankedChunks.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));
                for (int i = 0; i < rankedChunks.size(); i++) {
                    rankedChunks.get(i).setFinalRank(i + 1);
                }
                log.debug("Reranked {} chunks, parsed scores for {}", inputCandidates.size(), scoresById.size());
                return rankedChunks.stream().limit(topK).collect(Collectors.toList());
            }
            log.warn("Reranker returned no parsable scores, falling back to fusion ordering");
        } catch (Exception e) {
            log.warn("Reranking failed: {}. Falling back to fusion score ordering", e.getMessage());
        }

        return fallbackRerank(inputCandidates, topK);
    }

    private String buildUserPrompt(String query, List<RetrievalCandidate> candidates) {
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("User Query: ").append(query).append("\n\n");
        promptBuilder.append("Rate the relevance of each candidate chunk to the query on a scale from 0.0 to 1.0.\n\n");
        for (RetrievalCandidate candidate : candidates) {
            promptBuilder.append("Chunk ID ").append(candidate.getChunkId()).append(":\n")
                    .append(candidate.getContent()).append("\n---\n");
        }
        return promptBuilder.toString();
    }

    private Map<Long, Double> parseScores(String responseText) {
        Map<Long, Double> scoresById = new HashMap<>();
        if (responseText == null || responseText.isBlank()) {
            return scoresById;
        }
        for (String line : responseText.split("\\R")) {
            Matcher matcher = SCORE_LINE.matcher(line.trim());
            if (!matcher.matches()) {
                continue;
            }
            try {
                scoresById.put(Long.parseLong(matcher.group(1)), Double.parseDouble(matcher.group(2)));
            } catch (NumberFormatException e) {
                log.debug("Skipping unparsable reranker line: '{}'", line);
            }
        }
        return scoresById;
    }

    private List<RankedChunk> toRankedChunks(List<RetrievalCandidate> candidates, Map<Long, Double> scoresById) {
        List<RankedChunk> list = new ArrayList<>(candidates.size());
        for (RetrievalCandidate candidate : candidates) {
            double fusionScore = candidate.getFusionScore() != null ? candidate.getFusionScore() : 0.0;
            Double llmScore = scoresById.get(candidate.getChunkId());
            list.add(RankedChunk.builder()
                    .chunkId(candidate.getChunkId())
                    .documentId(candidate.getDocumentId())
                    .documentName(candidate.getDocumentName())
                    .chunkIndex(candidate.getChunkIndex())
                    .content(candidate.getContent())
                    .fusionScore(fusionScore)
                    .relevanceScore(llmScore != null ? llmScore : fusionScore)
                    .build());
        }
        return list;
    }

    private List<RankedChunk> fallbackRerank(List<RetrievalCandidate> candidates, int topK) {
        List<RankedChunk> list = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            RetrievalCandidate candidate = candidates.get(i);
            double fusionScore = candidate.getFusionScore() != null ? candidate.getFusionScore() : 0.0;
            list.add(RankedChunk.builder()
                    .chunkId(candidate.getChunkId())
                    .documentId(candidate.getDocumentId())
                    .documentName(candidate.getDocumentName())
                    .chunkIndex(candidate.getChunkIndex())
                    .content(candidate.getContent())
                    .fusionScore(fusionScore)
                    .relevanceScore(fusionScore)
                    .finalRank(i + 1)
                    .build());
        }
        return list.stream().limit(topK).collect(Collectors.toList());
    }
}
