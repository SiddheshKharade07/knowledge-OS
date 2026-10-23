package com.example.KnowledgeOS.dto.request;

import com.example.KnowledgeOS.enums.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank String username,
        @NotBlank String email,
        @Size(min = 5, max = 16) String password,
        @NotNull UserRole userRole
) {
}
