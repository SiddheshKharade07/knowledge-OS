package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.QueryIntentResult;

public interface IntentClassificationService {
    QueryIntentResult classify(String userQuery);
}
