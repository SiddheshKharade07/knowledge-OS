package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RetrievalCandidate;

import java.util.List;
import java.util.Set;

public interface LexicalSearchService {

    List<RetrievalCandidate> search(String userQuery, List<String> searchTerms, int topK);

    List<RetrievalCandidate> search(String userQuery, List<String> searchTerms, int topK, Long userId, Set<Long> departmentIds);
}
