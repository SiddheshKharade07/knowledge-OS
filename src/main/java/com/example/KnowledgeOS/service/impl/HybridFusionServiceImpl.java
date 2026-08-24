package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.RetrievalCandidate;
import com.example.KnowledgeOS.service.HybridFusionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class HybridFusionServiceImpl implements HybridFusionService {

    @Override
    public List<RetrievalCandidate> fuse(
            List<RetrievalCandidate> lexicalCandidates,
            List<RetrievalCandidate> semanticCandidates,
            double rrfK,
            int topK
    ) {
        if (topK <= 0) {
            return List.of();
        }

        Map<Long, RetrievalCandidate> mergedMap = new LinkedHashMap<>();

        // Process lexical candidates
        if (lexicalCandidates != null) {
            for (RetrievalCandidate cand : lexicalCandidates) {
                RetrievalCandidate existing = mergedMap.computeIfAbsent(cand.getChunkId(), k -> RetrievalCandidate.builder()
                        .chunkId(cand.getChunkId())
                        .documentId(cand.getDocumentId())
                        .documentName(cand.getDocumentName())
                        .chunkIndex(cand.getChunkIndex())
                        .content(cand.getContent())
                        .build());

                existing.setLexicalScore(cand.getLexicalScore());
                existing.setLexicalRank(cand.getLexicalRank());
            }
        }

        // Process semantic candidates
        if (semanticCandidates != null) {
            for (RetrievalCandidate cand : semanticCandidates) {
                RetrievalCandidate existing = mergedMap.computeIfAbsent(cand.getChunkId(), k -> RetrievalCandidate.builder()
                        .chunkId(cand.getChunkId())
                        .documentId(cand.getDocumentId())
                        .documentName(cand.getDocumentName())
                        .chunkIndex(cand.getChunkIndex())
                        .content(cand.getContent())
                        .build());

                existing.setSemanticScore(cand.getSemanticScore());
                existing.setSemanticRank(cand.getSemanticRank());
            }
        }

        // Calculate RRF score for each unique candidate
        for (RetrievalCandidate cand : mergedMap.values()) {
            double lexicalRrf = (cand.getLexicalRank() != null)
                    ? (1.0 / (rrfK + cand.getLexicalRank()))
                    : 0.0;

            double semanticRrf = (cand.getSemanticRank() != null)
                    ? (1.0 / (rrfK + cand.getSemanticRank()))
                    : 0.0;

            double fusionScore = lexicalRrf + semanticRrf;
            cand.setFusionScore(fusionScore);
        }

        List<RetrievalCandidate> sortedCandidates = mergedMap.values().stream()
                .sorted((a, b) -> Double.compare(
                        b.getFusionScore() != null ? b.getFusionScore() : 0.0,
                        a.getFusionScore() != null ? a.getFusionScore() : 0.0
                ))
                .limit(topK)
                .collect(Collectors.toList());

        log.debug("RRF Fusion (k={}) merged {} lexical and {} semantic candidates into top {} fused chunks",
                rrfK,
                lexicalCandidates != null ? lexicalCandidates.size() : 0,
                semanticCandidates != null ? semanticCandidates.size() : 0,
                sortedCandidates.size());

        return sortedCandidates;
    }
}
