package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.Size;

public record RenameChatSessionRequest(
        @Size(max = 255, message = "title must not exceed 255 characters")
        String title
) {
}