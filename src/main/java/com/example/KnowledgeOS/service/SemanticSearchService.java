package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RetrievalCandidate;

import java.util.List;
import java.util.Set;

public interface SemanticSearchService {

    List<RetrievalCandidate> search(String userQuery, double similarityThreshold, int topK);

    List<RetrievalCandidate> search(String userQuery, double similarityThreshold, int topK, Long userId, Set<Long> departmentIds);
}
