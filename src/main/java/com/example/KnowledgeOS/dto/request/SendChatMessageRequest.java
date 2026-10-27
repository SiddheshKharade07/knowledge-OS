package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for sending / retrying a chat message.
 *
 * <p>{@code userMessageId} is set when the client retries a failed generation. In
 * that case the backend re-uses the already persisted user message instead of
 * inserting a duplicate copy of the prompt.</p>
 */
public record SendChatMessageRequest(
        Long sessionId,
        @NotBlank(message = "message is required")
        @Size(max = 2000, message = "message must not exceed 2000 characters")
        String message,
        Long userMessageId
) {
    public SendChatMessageRequest(Long sessionId, String message) {
        this(sessionId, message, null);
    }
}
