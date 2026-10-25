package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotNull;

public record ChangeUserStatusRequest(
        @NotNull(message = "Active status is required")
        boolean active
) {
}
