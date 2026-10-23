package com.example.KnowledgeOS.dto.request;

import com.example.KnowledgeOS.enums.UserRole;

public record ChangeUserRoleRequest(
        UserRole userRole
) {
}
