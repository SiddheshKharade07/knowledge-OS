package com.example.KnowledgeOS.dto.request;

public record SetPasswordRequest(
        String token,
        String newPassword
) {
}
