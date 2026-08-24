package com.example.KnowledgeOS.dto;

import java.util.List;

public record QueryAnalysisResponse(
        List<String> searchTerms
) {
    public QueryAnalysisResponse {
        if (searchTerms == null) {
            searchTerms = List.of();
        }
    }
}
