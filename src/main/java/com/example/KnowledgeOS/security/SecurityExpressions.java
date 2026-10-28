package com.example.KnowledgeOS.security;

import com.example.KnowledgeOS.enums.SystemPermission;
import com.example.KnowledgeOS.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("security")
@RequiredArgsConstructor
public class SecurityExpressions {

    private final AuthUtil authUtil;
    private final UserRepository userRepository;

    private boolean hasPermission(SystemPermission systemPermission) {
        Long userId = authUtil.getCurrentUserId();

        if (userId == null) {
            return false;
        }

        return userRepository.findRoleByUserId(userId)
                .map(role -> role.getPermissions().contains(systemPermission))
                .orElse(false);
    }

    public boolean canManageDepartments() {
        return hasPermission(SystemPermission.MANAGE_DEPARTMENTS);
    }

    public boolean canManageMembers() {
        return hasPermission(SystemPermission.MANAGE_USERS);
    }

    public boolean canManageUsers() {
        return hasPermission(SystemPermission.MANAGE_USERS);
    }

    public boolean canManageRoles() {
        return hasPermission(SystemPermission.MANAGE_ROLES);
    }

    public boolean canManageSystemSettings() {
        return hasPermission(SystemPermission.MANAGE_SYSTEM_SETTINGS);
    }

    public boolean canUploadDocuments() {
        return hasPermission(SystemPermission.UPLOAD_DOCUMENTS);
    }

    public boolean canUpdateDocuments() {
        return hasPermission(SystemPermission.UPDATE_DOCUMENTS);
    }

    public boolean canDeleteDocuments() {
        return hasPermission(SystemPermission.DELETE_DOCUMENTS);
    }

    public boolean canManageDocuments() {
        return hasPermission(SystemPermission.UPLOAD_DOCUMENTS)
                || hasPermission(SystemPermission.UPDATE_DOCUMENTS)
                || hasPermission(SystemPermission.DELETE_DOCUMENTS)
                || hasPermission(SystemPermission.MANAGE_DOCUMENT_PERMISSIONS);
    }

    public boolean isAdmin() {
        Long userId = authUtil.getCurrentUserId();
        if (userId == null) {
            return false;
        }
        return userRepository.findRoleByUserId(userId)
                .map(role -> role == com.example.KnowledgeOS.enums.UserRole.ADMIN)
                .orElse(false);
    }

    public boolean isKnowledgeManager() {
        Long userId = authUtil.getCurrentUserId();
        if (userId == null) {
            return false;
        }
        return userRepository.findRoleByUserId(userId)
                .map(role -> role == com.example.KnowledgeOS.enums.UserRole.KNOWLEDGE_MANAGER)
                .orElse(false);
    }
}

