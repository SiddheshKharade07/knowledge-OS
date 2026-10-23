package com.example.KnowledgeOS.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Set;

import static com.example.KnowledgeOS.enums.SystemPermission.*;

@Getter
@RequiredArgsConstructor
public enum UserRole {
    USER(
            ASK_QUESTIONS,
            SEARCH_DOCUMENTS,
            VIEW_DOCUMENTS,
            VIEW_CITATIONS
    ),

    KNOWLEDGE_MANAGER(
            ASK_QUESTIONS,
            SEARCH_DOCUMENTS,
            VIEW_DOCUMENTS,
            VIEW_CITATIONS,
            UPLOAD_DOCUMENTS,
            UPDATE_DOCUMENTS,
            DELETE_DOCUMENTS,
            MANAGE_DOCUMENT_PERMISSIONS
    ),

    ADMIN(
            ASK_QUESTIONS,
            SEARCH_DOCUMENTS,
            VIEW_DOCUMENTS,
            VIEW_CITATIONS,
            UPLOAD_DOCUMENTS,
            UPDATE_DOCUMENTS,
            DELETE_DOCUMENTS,
            MANAGE_DOCUMENT_PERMISSIONS,
            MANAGE_USERS,
            MANAGE_DEPARTMENTS,
            MANAGE_ROLES,
            MANAGE_SYSTEM_SETTINGS
    );

    private final Set<SystemPermission> permissions;

    UserRole(SystemPermission... permissions) {
        this.permissions = Set.of(permissions);
    }
}
