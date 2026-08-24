package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RetrievalCandidate;

import java.util.List;

public interface LexicalSearchService {

    List<RetrievalCandidate> search(String userQuery, List<String> searchTerms, int topK);
}
