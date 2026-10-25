package com.example.KnowledgeOS.dto;

import java.util.List;

public record ChatMessageResponse(
        Long sessionId,
        ChatMessageDto userMessage,
        ChatMessageDto assistantMessage,
        String title
) {
}