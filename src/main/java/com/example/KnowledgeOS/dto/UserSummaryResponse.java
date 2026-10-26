package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.enums.UserRole;

import java.util.Set;

public record UserSummaryResponse(
        Long id,
        String username,
        String email,
        UserRole userRole,
        boolean active,
        Set<Long> departmentIds
) {
}
