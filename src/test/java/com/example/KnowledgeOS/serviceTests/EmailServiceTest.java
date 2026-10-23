
package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.service.impl.EmailServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class EmailServiceTest {

    @Test
    void shouldSendWelcomeEmail() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();

        mailSender.setHost("smtp.gmail.com");
        mailSender.setPort(587);
        mailSender.setUsername(System.getenv("GMAIL_USERNAME"));
        mailSender.setPassword(System.getenv("GMAIL_APP_PASSWORD"));

        Properties properties = mailSender.getJavaMailProperties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.starttls.required", "true");

        EmailServiceImpl emailService =
                new EmailServiceImpl(
                        mailSender,
                        System.getenv("GMAIL_USERNAME")
                );

        assertDoesNotThrow(() ->
                emailService.sendWelcomeEmail(
                        "YOUR_TEST_EMAIL@gmail.com",
                        "KnowledgeOS Test User"
                )
        );
    }

    @Test
    void testCredentials() {
        String username = System.getenv("GMAIL_USERNAME");
        String password = System.getenv("GMAIL_APP_PASSWORD");

        System.out.println("Gmail username present: "
                + (username != null && !username.isBlank()));

        System.out.println("Gmail app password present: "
                + (password != null && !password.isBlank()));
    }
}
