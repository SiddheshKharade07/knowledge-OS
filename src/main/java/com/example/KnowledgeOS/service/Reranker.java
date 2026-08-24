package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RankedChunk;
import com.example.KnowledgeOS.dto.RetrievalCandidate;

import java.util.List;

public interface Reranker {

    List<RankedChunk> rerank(
            String query,
            List<RetrievalCandidate> candidates
    );
}
