package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.enums.QueryIntent;

public record QueryIntentResult(
        QueryIntent intent,
        boolean bypassRetrieval
) {
}
