package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.AuthResponse;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import com.example.KnowledgeOS.dto.request.LoginRequest;
import com.example.KnowledgeOS.dto.request.SignupRequest;

public interface AuthService {

    AuthResponse signup(CreateUserRequest createUserRequest);

    AuthResponse login(LoginRequest loginRequest);
}
