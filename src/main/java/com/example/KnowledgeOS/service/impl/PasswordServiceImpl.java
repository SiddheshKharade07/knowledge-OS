package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.PasswordMessageResponse;
import com.example.KnowledgeOS.dto.request.ChangePasswordRequest;
import com.example.KnowledgeOS.dto.request.ForgotPasswordRequest;
import com.example.KnowledgeOS.dto.request.ResetPasswordRequest;
import com.example.KnowledgeOS.dto.request.SetPasswordRequest;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.enums.AccountTokenPurpose;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.AccountTokenService;
import com.example.KnowledgeOS.service.EmailService;
import com.example.KnowledgeOS.service.PasswordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordServiceImpl implements PasswordService {

    private static final String GENERIC_RESET_MESSAGE =
            "If an account with that email exists, a password reset link has been sent.";

    private final UserRepository userRepository;
    private final AccountTokenService accountTokenService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuthUtil authUtil;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.password-token.reset-ttl:1h}")
    private Duration resetTokenTtl;

    @Override
    @Transactional
    public PasswordMessageResponse setupPassword(SetPasswordRequest request) {
        User user = accountTokenService.consumeToken(
                request.token(), AccountTokenPurpose.PASSWORD_SETUP);

        updatePassword(user, request.newPassword());

        return new PasswordMessageResponse("Your password has been set. You can now log in.");
    }

    @Override
    @Transactional
    public PasswordMessageResponse requestPasswordReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());


        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            String rawToken = accountTokenService.createToken(
                    user, AccountTokenPurpose.PASSWORD_RESET, resetTokenTtl);
            String resetUrl = buildLink("/reset-password", rawToken);

            try {
                emailService.sendPasswordResetEmail(
                        user.getEmail(), user.getUsername(), resetUrl);
            } catch (MailException exception) {
                log.warn("Password reset email could not be sent for user id {}", user.getId());
            }
        });

        return new PasswordMessageResponse(GENERIC_RESET_MESSAGE);
    }

    @Override
    @Transactional
    public PasswordMessageResponse resetPassword(ResetPasswordRequest request) {
        User user = accountTokenService.consumeToken(
                request.token(), AccountTokenPurpose.PASSWORD_RESET);

        updatePassword(user, request.newPassword());


        return new PasswordMessageResponse("Your password has been reset. You can now log in.");
    }

    @Override
    @Transactional
    public PasswordMessageResponse changePassword(ChangePasswordRequest request) {
        Long userId = authUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User with id " + userId + " not found"));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException(
                    "New password must be different from the current password");
        }

        updatePassword(user, request.newPassword());


        return new PasswordMessageResponse("Your password has been changed.");
    }

    private void updatePassword(User user, String rawPassword) {
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);

        accountTokenService.invalidateActiveTokens(
                user.getId(),
                List.of(AccountTokenPurpose.PASSWORD_SETUP, AccountTokenPurpose.PASSWORD_RESET));

        try {
            emailService.sendPasswordChangedEmail(user.getEmail(), user.getUsername());
        } catch (MailException exception) {
            log.warn("Password changed but confirmation email could not be sent for user id {}",
                    user.getId());
        }
    }

    private String buildLink(String path, String rawToken) {
        String baseUrl = frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
        return baseUrl + path + "?token=" + rawToken;
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
