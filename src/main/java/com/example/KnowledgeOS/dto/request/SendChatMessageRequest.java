package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendChatMessageRequest(
        Long sessionId,
        @NotBlank(message = "message is required")
        @Size(max = 2000, message = "message must not exceed 2000 characters")
        String message
) {
}