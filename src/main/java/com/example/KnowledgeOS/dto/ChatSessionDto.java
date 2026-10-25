package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.entity.ChatSession;

import java.time.Instant;
import java.util.List;

public record ChatSessionDto(
        Long id,
        String title,
        List<ChatMessageDto> messages,
        Instant createdAt,
        Instant updatedAt
) {
    public static ChatSessionDto fromEntity(ChatSession session, List<ChatMessageDto> messages) {
        return new ChatSessionDto(
                session.getId(),
                session.getTitle(),
                messages,
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }

    public static ChatSessionDto summary(ChatSession session) {
        return new ChatSessionDto(
                session.getId(),
                session.getTitle(),
                List.of(),
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }
}