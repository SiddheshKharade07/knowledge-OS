package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.enums.UserRole;

import java.util.Set;

public record UserProfileResponse(
        Long id,
        String email,
        String username,
        UserRole userRole,
        boolean active,
        Set<Long> departmentIds
) {
}
