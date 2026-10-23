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

    void sendPasswordChangedEmail(
            String recipientEmail,
            String username);

    private void sendEmail(
            String recipientEmail,
            String subject,
            String body){}
}
