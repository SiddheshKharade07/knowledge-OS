package com.example.KnowledgeOS.service;

public interface EmailService {

    void sendWelcomeEmail(String recipientEmail, String username);

    void sendRoleChangeEmail(
            String recipientEmail,
            String username,
            String newRole);

    void sendAccountStatusEmail(
            String recipientEmail,
            String username,
            boolean active);

    void sendPasswordSetupEmail(String recipientEmail, String username, String setupLink);

    void sendPasswordResetEmail(String recipientEmail, String username, String resetLink);

    void sendPasswordChangedEmail(
            String recipientEmail,
            String username);
}

