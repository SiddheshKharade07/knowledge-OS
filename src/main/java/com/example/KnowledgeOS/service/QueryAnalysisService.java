package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.QueryAnalysisResponse;

public interface QueryAnalysisService {

    QueryAnalysisResponse analyze(String userQuery);
}
