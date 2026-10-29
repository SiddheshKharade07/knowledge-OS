package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.RagResponse;
import reactor.core.publisher.Flux;

import java.util.List;

public interface RagPipelineService {

    RagResponse query(String userQuery);

    RagResponse query(String userQuery, List<ChatHistoryMessage> history);

    Flux<RagStreamEvent> queryStream(String userQuery);

    Flux<RagStreamEvent> queryStream(String userQuery, List<ChatHistoryMessage> history);

    record RagStreamEvent(String type, String content, Object data) {
    }

    record ChatHistoryMessage(String role, String content) {
    }
}
