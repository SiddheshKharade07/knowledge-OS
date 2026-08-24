package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RagDebugInfo;
import com.example.KnowledgeOS.dto.RankedChunk;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

public interface HybridRetrievalService {

    @Getter
    @AllArgsConstructor
    class RetrievalResult {
        private final List<RankedChunk> topChunks;
        private final RagDebugInfo debugInfo;
    }

    RetrievalResult retrieve(String userQuery);
}
