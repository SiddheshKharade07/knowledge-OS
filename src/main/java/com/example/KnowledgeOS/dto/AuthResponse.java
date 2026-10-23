package com.example.KnowledgeOS.dto;

public record AuthResponse(
        String token,
        UserProfileResponse user
) {
}
