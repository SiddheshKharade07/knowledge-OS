package com.example.KnowledgeOS.dto;

import java.util.List;

public record RagDebugInfo(
        String originalQuery,
        List<String> searchTerms,
        List<RetrievalCandidate> lexicalCandidates,
        List<RetrievalCandidate> semanticCandidates,
        List<RetrievalCandidate> fusedCandidates,
        List<RankedChunk> rerankedCandidates,
        EvidenceSupportIndicator evidenceSupportIndicator
) {
    public RagDebugInfo(String originalQuery, List<String> searchTerms, List<RetrievalCandidate> lexicalCandidates, List<RetrievalCandidate> semanticCandidates, List<RetrievalCandidate> fusedCandidates, List<RankedChunk> rerankedCandidates) {
        this(originalQuery, searchTerms, lexicalCandidates, semanticCandidates, fusedCandidates, rerankedCandidates, null);
    }
}
