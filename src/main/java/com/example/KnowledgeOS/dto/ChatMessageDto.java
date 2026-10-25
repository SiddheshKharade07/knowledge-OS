package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.entity.ChatMessage;
import com.example.KnowledgeOS.enums.MessageRole;

import java.time.Instant;
import java.util.List;

public record ChatMessageDto(
        Long id,
        String role,
        String content,
        List<Citation> citations,
        Object metadata,
        Instant createdAt
) {
    public static ChatMessageDto fromEntity(ChatMessage message, List<Citation> citations, Object metadata) {
        return new ChatMessageDto(
                message.getId(),
                message.getRole(),
                message.getContent(),
                citations,
                metadata,
                message.getCreatedAt()
        );
    }
}