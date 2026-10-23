
package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.mapper.UserMapper;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.service.EmailService;
import com.example.KnowledgeOS.service.UserManagementService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.MailException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementServiceImpl implements UserManagementService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Override
    @Transactional
    @PreAuthorize("@security.canManageMembers()")
    public UserProfileResponse createUser(
            CreateUserRequest createUserRequest) {

        String email = createUserRequest.getEmail()
                .trim()
                .toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "An account with this email ID already exists");
        }

        // Generate an unpredictable placeholder password.
        // Never store passwords in plain text.
        String temporaryPassword = UUID.randomUUID().toString();

        User user = userMapper.toEntity(createUserRequest);
        user.setPassword(passwordEncoder.encode(temporaryPassword));

        User savedUser = userRepository.saveAndFlush(user);

        // Send the welcome notification after the user is persisted.
        try {
            emailService.sendWelcomeEmail(
                    savedUser.getEmail(),
                    savedUser.getUsername()
            );
        } catch (MailException ex) {
            // The user was created even if email delivery failed.
            log.error(
                    "User created, but welcome email failed for user ID {}",
                    savedUser.getId(),
                    ex
            );
        }

        return userMapper.toUserProfileResponse(savedUser);
    }
}
