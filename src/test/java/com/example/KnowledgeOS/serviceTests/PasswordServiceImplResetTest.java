package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.dto.PasswordMessageResponse;
import com.example.KnowledgeOS.dto.request.ResetPasswordRequest;
import com.example.KnowledgeOS.dto.request.SetPasswordRequest;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.enums.AccountTokenPurpose;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.AccountTokenService;
import com.example.KnowledgeOS.service.EmailService;
import com.example.KnowledgeOS.service.impl.PasswordServiceImpl;
import com.example.KnowledgeOS.util.PasswordPolicy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The service guard must reject invalid passwords even when the controller's
 * Bean Validation has been bypassed, and it must do so before the reset token is
 * consumed or the password is encoded.
 */
@ExtendWith(MockitoExtension.class)
class PasswordServiceImplResetTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AccountTokenService accountTokenService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;
    @Mock
    private AuthUtil authUtil;

    @InjectMocks
    private PasswordServiceImpl passwordService;

    @ParameterizedTest
    @ValueSource(ints = {0, 4, 21})
    void resetPasswordRejectsInvalidLengthBeforeTouchingTokenOrPassword(int length) {
        String password = "a".repeat(length);

        assertThatThrownBy(() -> passwordService.resetPassword(
                new ResetPasswordRequest("raw-reset-token", password)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(length == 0 ? "New password is required" : PasswordPolicy.LENGTH_MESSAGE);

        verifyNoInteractions(accountTokenService, passwordEncoder, userRepository);
    }

    @Test
    void setupPasswordRejectsInvalidLengthBeforeTouchingTokenOrPassword() {
        assertThatThrownBy(() -> passwordService.setupPassword(
                new SetPasswordRequest("raw-setup-token", "1234")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(PasswordPolicy.LENGTH_MESSAGE);

        verifyNoInteractions(accountTokenService, passwordEncoder, userRepository);
    }

    @Test
    void resetPasswordEncodesAndSavesValidFiveCharacterPassword() {
        User user = User.builder()
                .id(42L)
                .username("user")
                .email("user@example.com")
                .password("old-hash")
                .build();
        when(accountTokenService.consumeToken("raw-reset-token", AccountTokenPurpose.PASSWORD_RESET))
                .thenReturn(user);
        when(passwordEncoder.encode("12345")).thenReturn("encoded-hash");

        PasswordMessageResponse response = passwordService.resetPassword(
                new ResetPasswordRequest("raw-reset-token", "12345"));

        assertThat(response.message()).isEqualTo("Your password has been reset. You can now log in.");
        assertThat(user.getPassword()).isEqualTo("encoded-hash");
        verify(passwordEncoder).encode("12345");
        verify(userRepository).save(user);
        verify(accountTokenService).invalidateActiveTokens(42L, java.util.List.of(
                AccountTokenPurpose.PASSWORD_SETUP, AccountTokenPurpose.PASSWORD_RESET));
    }

    @Test
    void resetPasswordAcceptsTwentyCharacterPassword() {
        User user = User.builder().id(7L).username("user").email("user@example.com").password("old").build();
        String password = "a".repeat(20);
        when(accountTokenService.consumeToken("raw-reset-token", AccountTokenPurpose.PASSWORD_RESET))
                .thenReturn(user);
        when(passwordEncoder.encode(password)).thenReturn("encoded-hash");

        passwordService.resetPassword(new ResetPasswordRequest("raw-reset-token", password));

        assertThat(user.getPassword()).isEqualTo("encoded-hash");
        verify(passwordEncoder).encode(password);
        verify(userRepository).save(user);
    }

    @Test
    void resetPasswordNeverPersistsRawPasswordOnFailure() {
        assertThatThrownBy(() -> passwordService.resetPassword(
                new ResetPasswordRequest("raw-reset-token", "a".repeat(21))))
                .isInstanceOf(IllegalArgumentException.class);

        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any());
        verify(accountTokenService, never()).consumeToken(anyString(), any());
    }
}
