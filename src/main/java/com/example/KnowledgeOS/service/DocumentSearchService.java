package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;

import java.util.List;

public interface DocumentSearchService {

    public List<DocumentChunkResponse> SearchByKeyword(String keyword);
}
