
package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.UserSummaryResponse;
import com.example.KnowledgeOS.dto.request.ChangeUserRoleRequest;
import com.example.KnowledgeOS.dto.request.ChangeUserStatusRequest;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.enums.AccountTokenPurpose;
import com.example.KnowledgeOS.enums.UserRole;
import com.example.KnowledgeOS.exception.DuplicateResourceException;
import com.example.KnowledgeOS.exception.EmailDeliveryException;
import com.example.KnowledgeOS.exception.ForbiddenOperationException;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import com.example.KnowledgeOS.mapper.UserMapper;
import com.example.KnowledgeOS.repository.AccountTokenRepository;
import com.example.KnowledgeOS.repository.DocumentRepository;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.AccountTokenService;
import com.example.KnowledgeOS.service.EmailService;
import com.example.KnowledgeOS.service.UserManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.MailException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementServiceImpl implements UserManagementService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AccountTokenService accountTokenService;
    private final AuthUtil authUtil;
    private final DocumentRepository documentRepository;
    private final AccountTokenRepository accountTokenRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.password-token.setup-ttl:24h}")
    private Duration setupTokenTtl;

    @Override
    @Transactional
    @PreAuthorize("@security.canManageMembers()")
    public UserProfileResponse createUser(CreateUserRequest createUserRequest) {
        String email = normalizeEmail(createUserRequest.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("An account with this email ID already exists");
        }

        if (createUserRequest.getUserRole() == UserRole.ADMIN) {
            throw new ForbiddenOperationException("Creating or promoting users to ADMIN is not permitted through this API");
        }

        User user = userMapper.toEntity(createUserRequest);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setActive(true);

        if (user.getUserRole() == null) {
            user.setUserRole(UserRole.USER);
        }
        if (user.getUserRole() == UserRole.ADMIN) {
            throw new ForbiddenOperationException("Creating or promoting users to ADMIN is not permitted through this API");
        }

        User savedUser = userRepository.saveAndFlush(user);

        String rawToken = accountTokenService.createToken(savedUser, AccountTokenPurpose.PASSWORD_SETUP, setupTokenTtl);
        String setupLink = buildLink("/set-password", rawToken);

        try {
            emailService.sendPasswordSetupEmail(savedUser.getEmail(), savedUser.getUsername(), setupLink);
        } catch (MailException ex) {
            log.error("User created, but password setup email failed for user ID {}", savedUser.getId(), ex);
            throw new EmailDeliveryException("Password setup email could not be delivered", ex);
        }

        return userMapper.toUserProfileResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("@security.canManageMembers()")
    public Page<UserSummaryResponse> listUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("@security.canManageMembers()")
    public UserProfileResponse getUser(Long userId) {
        User user = getUserOrThrow(userId);
        return userMapper.toUserProfileResponse(user);
    }

    @Override
    @Transactional
    @PreAuthorize("@security.canManageMembers()")
    public UserProfileResponse changeRole(Long userId, ChangeUserRoleRequest request) {
        Long currentUserId = authUtil.getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(userId)) {
            throw new ForbiddenOperationException("You cannot change your own role");
        }

        User user = getUserOrThrow(userId);
        if (user.getUserRole() == UserRole.ADMIN) {
            throw new ForbiddenOperationException("You cannot change the role of another administrator");
        }
        if (request.userRole() == UserRole.ADMIN) {
            throw new ForbiddenOperationException("You cannot promote users to ADMIN through this API");
        }

        user.setUserRole(request.userRole());
        User saved = userRepository.save(user);


        try {
            emailService.sendRoleChangeEmail(saved.getEmail(), saved.getUsername(), saved.getUserRole().name());
        } catch (MailException ex) {
            log.warn("Role change email could not be sent for user id {}", saved.getId());
        }

        return userMapper.toUserProfileResponse(saved);
    }

    @Override
    @Transactional
    @PreAuthorize("@security.canManageMembers()")
    public UserProfileResponse changeStatus(Long userId, ChangeUserStatusRequest request) {
        Long currentUserId = authUtil.getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(userId)) {
            throw new ForbiddenOperationException("You cannot change your own account status");
        }

        User user = getUserOrThrow(userId);
        if (user.getUserRole() == UserRole.ADMIN) {
            throw new ForbiddenOperationException("You cannot activate or deactivate another administrator");
        }

        boolean wasActive = user.isActive();
        if (!request.active() && wasActive) {
            ensureNotLastActiveAdmin(user);
        }

        user.setActive(request.active());
        User saved = userRepository.save(user);


        try {
            emailService.sendAccountStatusEmail(saved.getEmail(), saved.getUsername(), saved.isActive());
        } catch (MailException ex) {
            log.warn("Account status email could not be sent for user id {}", saved.getId());
        }

        return userMapper.toUserProfileResponse(saved);
    }

    @Override
    @Transactional
    @PreAuthorize("@security.canManageMembers()")
    public UserProfileResponse updateUser(Long userId, CreateUserRequest updateUserRequest) {
        Long currentUserId = authUtil.getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(userId) && updateUserRequest.getUserRole() != null) {
            throw new ForbiddenOperationException("You cannot change your own role");
        }

        User user = getUserOrThrow(userId);
        if (user.getUserRole() == UserRole.ADMIN && currentUserId != null && !currentUserId.equals(userId)) {
            throw new ForbiddenOperationException("You cannot update another administrator");
        }

        String email = updateUserRequest.getEmail() == null ? user.getEmail() : normalizeEmail(updateUserRequest.getEmail());
        if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("An account with this email ID already exists");
        }

        if (updateUserRequest.getUsername() != null && !updateUserRequest.getUsername().isBlank()) {
            user.setUsername(updateUserRequest.getUsername());
        }
        user.setEmail(email);

        if (updateUserRequest.getUserRole() != null) {
            if (updateUserRequest.getUserRole() == UserRole.ADMIN && (currentUserId == null || !currentUserId.equals(userId))) {
                throw new ForbiddenOperationException("You cannot promote users to ADMIN through this API");
            }
            if (user.getUserRole() != UserRole.ADMIN) {
                user.setUserRole(updateUserRequest.getUserRole());
            }
        }

        if (updateUserRequest.getDepartmentIds() != null) {
            java.util.Set<com.example.KnowledgeOS.entity.Department> departments = new java.util.HashSet<>();
            for (Long deptId : updateUserRequest.getDepartmentIds()) {
                if (deptId == null) continue;
                com.example.KnowledgeOS.entity.Department dept = departmentRepository.findById(deptId).orElse(null);
                if (dept != null) {
                    departments.add(dept);
                }
            }
            user.setDepartments(departments);
        }

        User saved = userRepository.save(user);
        return userMapper.toUserProfileResponse(saved);
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.example.KnowledgeOS.repository.DepartmentRepository departmentRepository;

    @Override
    @Transactional
    @PreAuthorize("@security.canManageMembers()")
    public void deleteUser(Long userId) {
        Long currentUserId = authUtil.getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(userId)) {
            throw new ForbiddenOperationException("You cannot delete your own account");
        }

        User user = getUserOrThrow(userId);
        if (user.getUserRole() == UserRole.ADMIN) {
            throw new ForbiddenOperationException("You cannot delete another administrator");
        }
        if (user.isActive()) {
            ensureNotLastActiveAdmin(user);
        }

        if (documentRepository != null && documentRepository.countByOwnerId(userId) > 0) {
            throw new ForbiddenOperationException("Cannot delete a user who owns documents");
        }

        if (accountTokenRepository != null) {
            accountTokenRepository.deleteAllByUserId(userId);
        }

        userRepository.delete(user);
    }

    private void ensureNotLastActiveAdmin(User target) {
        if (target.getUserRole() != UserRole.ADMIN) {
            return;
        }
        long activeAdminCount = userRepository.countByUserRoleAndActiveTrue(UserRole.ADMIN);
        if (activeAdminCount <= 1) {
            throw new ForbiddenOperationException("Cannot remove the last active administrator");
        }
    }

    private User getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + userId + " not found"));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private String buildLink(String path, String rawToken) {
        String baseUrl = frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
        return baseUrl + path + "?token=" + rawToken;
    }

    private UserSummaryResponse toSummary(User user) {
        java.util.Set<Long> deptIds = user.getDepartments() == null
                ? java.util.Set.of()
                : user.getDepartments().stream()
                .filter(java.util.Objects::nonNull)
                .map(d -> d.getId())
                .collect(java.util.stream.Collectors.toSet());
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getUserRole(),
                user.isActive(),
                deptIds
        );
    }

}

