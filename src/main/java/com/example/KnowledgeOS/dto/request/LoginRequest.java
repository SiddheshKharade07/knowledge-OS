package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank String email,
        @Size(min = 5, max = 16) String password
) {
}
