package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.enums.UserRole;

public record UserSummaryResponse(
        Long id,
        String username,
        String email,
        UserRole userRole,
        boolean active
) {
}
