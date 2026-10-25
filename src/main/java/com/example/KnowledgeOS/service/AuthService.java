package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.AuthResponse;
import com.example.KnowledgeOS.dto.request.LoginRequest;

public interface AuthService {

    AuthResponse login(LoginRequest loginRequest);
}
