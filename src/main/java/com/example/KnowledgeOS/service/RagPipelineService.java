package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RagResponse;

public interface RagPipelineService {

    RagResponse query(String userQuery);
}
