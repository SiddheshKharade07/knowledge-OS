package com.example.KnowledgeOS.dto.request;

import com.example.KnowledgeOS.enums.UserRole;
import jakarta.validation.constraints.NotNull;

public record ChangeUserRoleRequest(
        @NotNull(message = "User role is required")
        UserRole userRole
) {
}
