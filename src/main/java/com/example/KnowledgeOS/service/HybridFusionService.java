package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RetrievalCandidate;

import java.util.List;

public interface HybridFusionService {

    List<RetrievalCandidate> fuse(
            List<RetrievalCandidate> lexicalCandidates,
            List<RetrievalCandidate> semanticCandidates,
            double rrfK,
            int topK
    );
}
