package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;

public interface UserManagementService {
    UserProfileResponse createUser(CreateUserRequest createUserRequest);
}
