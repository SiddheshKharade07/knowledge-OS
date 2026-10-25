package com.example.KnowledgeOS.service.impl;


import com.example.KnowledgeOS.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public EmailServiceImpl(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    public void sendWelcomeEmail(String recipientEmail, String username) {
        String subject = "Welcome to KnowledgeOS";

        String body = """
                Hello %s,
                
                Welcome to KnowledgeOS!
                
                Your account has been created successfully.
                
                You can now use your account according to your assigned permissions.
                
                If you did not expect this account, please contact your administrator.
                
                Regards,
                KnowledgeOS Team
                """.formatted(username);

        sendEmail(recipientEmail, subject, body);
    }

    public void sendRoleChangeEmail(
            String recipientEmail,
            String username,
            String newRole) {

        String subject = "Your KnowledgeOS role has changed";

        String body = """
                Hello %s,
                
                Your KnowledgeOS account role has been changed to: %s.
                
                Your available permissions may have changed.
                
                If you have questions, please contact your administrator.
                
                Regards,
                KnowledgeOS Team
                """.formatted(username, newRole);

        sendEmail(recipientEmail, subject, body);
    }

    public void sendAccountStatusEmail(
            String recipientEmail,
            String username,
            boolean active) {

        String status = active ? "enabled" : "disabled";

        String subject = "KnowledgeOS account status update";

        String body = """
                Hello %s,
                
                Your KnowledgeOS account has been %s.
                
                If you have questions about this change, please contact your administrator.
                
                Regards,
                KnowledgeOS Team
                """.formatted(username, status);

        sendEmail(recipientEmail, subject, body);
    }

    @Override
    public void sendPasswordSetupEmail(String recipientEmail, String username, String setupLink) {
        String subject = "Set up your KnowledgeOS password";

        String body = """
                Hello %s,
                
                A KnowledgeOS account has been created for you.
                
                Use the link below to set your password:
                %s
                
                This link is time-limited and can be used only once.
                
                If you did not expect this invitation, please contact your administrator.
                
                Regards,
                KnowledgeOS Team
                """.formatted(username, setupLink);

        sendEmail(recipientEmail, subject, body);
    }

    @Override
    public void sendPasswordResetEmail(String recipientEmail, String username, String resetLink) {
        String subject = "Reset your KnowledgeOS password";

        String body = """
                Hello %s,
                
                We received a request to reset the password for your KnowledgeOS account.
                
                Use the link below to reset your password:
                %s
                
                This link is time-limited and can be used only once.
                
                If you did not request a password reset, you can ignore this message.
                
                Regards,
                KnowledgeOS Team
                """.formatted(username, resetLink);

        sendEmail(recipientEmail, subject, body);
    }

    @Override
    public void sendPasswordChangedEmail(
            String recipientEmail,
            String username) {

        String subject = "Your KnowledgeOS password was changed";

        String body = """
                Hello %s,
                
                The password for your KnowledgeOS account was changed.
                
                If you did not make this change, contact your administrator immediately.
                
                Regards,
                KnowledgeOS Team
                """.formatted(username);

        sendEmail(recipientEmail, subject, body);
    }

    private void sendEmail(
            String recipientEmail,
            String subject,
            String body) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(recipientEmail);
        message.setSubject(subject);
        message.setText(body);

        // Let failures propagate so the caller can handle them.
        mailSender.send(message);
    }
}

