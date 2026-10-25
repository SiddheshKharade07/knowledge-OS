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

    public boolean canManageDepartment() {
        return hasPermission(SystemPermission.MANAGE_DEPARTMENTS);
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
}

