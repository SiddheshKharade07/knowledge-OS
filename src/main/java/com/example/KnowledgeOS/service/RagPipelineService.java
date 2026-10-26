package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RagResponse;
import reactor.core.publisher.Flux;

public interface RagPipelineService {

    RagResponse query(String userQuery);

    Flux<RagStreamEvent> queryStream(String userQuery);

    record RagStreamEvent(String type, String content, Object data) {
    }
}
