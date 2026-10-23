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

        return userRepository.findRoleByUserId(userId)
                .map(role -> role.getPermissions().contains(systemPermission))
                .orElse(false);
    }

    public boolean canManageDepartment() {
        return hasPermission(SystemPermission.MANAGE_DEPARTMENTS);
    }

    public boolean canManageMembers() {
        return hasPermission(SystemPermission.MANAGE_USERS);
    }
}
