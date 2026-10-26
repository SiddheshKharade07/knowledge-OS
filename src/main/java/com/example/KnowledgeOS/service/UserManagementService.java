package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.UserSummaryResponse;
import com.example.KnowledgeOS.dto.request.ChangeUserRoleRequest;
import com.example.KnowledgeOS.dto.request.ChangeUserStatusRequest;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserManagementService {
    UserProfileResponse createUser(CreateUserRequest createUserRequest);

    Page<UserSummaryResponse> listUsers(Pageable pageable);

    UserProfileResponse getUser(Long userId);

    UserProfileResponse updateUser(Long userId, CreateUserRequest updateUserRequest);

    UserProfileResponse changeRole(Long userId, ChangeUserRoleRequest request);

    UserProfileResponse changeStatus(Long userId, ChangeUserStatusRequest request);

    void deleteUser(Long userId);
}

