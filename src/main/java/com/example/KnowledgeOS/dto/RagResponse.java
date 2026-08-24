package com.example.KnowledgeOS.dto;

import java.util.List;

public record RagResponse(
        String query,
        String answer,
        List<Citation> citations,
        List<RankedChunk> topChunks,
        RagDebugInfo debugInfo
) {
}
