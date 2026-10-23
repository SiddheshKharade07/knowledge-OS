package com.example.KnowledgeOS.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SystemPermission {

    // Knowledge access
    ASK_QUESTIONS("knowledge:ask"),
    SEARCH_DOCUMENTS("documents:search"),
    VIEW_DOCUMENTS("documents:view"),
    VIEW_CITATIONS("documents:citations:view"),

    // Document management
    UPLOAD_DOCUMENTS("documents:upload"),
    UPDATE_DOCUMENTS("documents:update"),
    DELETE_DOCUMENTS("documents:delete"),
    MANAGE_DOCUMENT_PERMISSIONS("documents:permissions:manage"),

    // User and department administration
    MANAGE_USERS("users:manage"),
    MANAGE_DEPARTMENTS("departments:manage"),
    MANAGE_ROLES("roles:manage"),

    // System administration
    MANAGE_SYSTEM_SETTINGS("system:settings:manage");

    private final String value;
}


