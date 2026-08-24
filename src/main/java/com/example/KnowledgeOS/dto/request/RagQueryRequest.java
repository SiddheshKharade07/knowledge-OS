package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RagQueryRequest(
        @NotBlank(message = "query is required")
        @Size(max = 2000, message = "query must not exceed 2000 characters") String query
) {
}
