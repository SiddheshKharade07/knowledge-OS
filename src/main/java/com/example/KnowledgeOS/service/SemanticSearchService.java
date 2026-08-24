package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RetrievalCandidate;

import java.util.List;

public interface SemanticSearchService {

    List<RetrievalCandidate> search(String userQuery, double similarityThreshold, int topK);
}
