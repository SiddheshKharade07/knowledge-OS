package com.example.KnowledgeOS.controllerTests;

import com.example.KnowledgeOS.controller.PasswordController;
import com.example.KnowledgeOS.dto.PasswordMessageResponse;
import com.example.KnowledgeOS.dto.request.ResetPasswordRequest;
import com.example.KnowledgeOS.exception.GlobalExceptionHandler;
import com.example.KnowledgeOS.service.PasswordService;
import com.example.KnowledgeOS.util.PasswordPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the HTTP contract of the reset endpoint: invalid lengths never reach
 * the service and are returned as the project's standard 400 {@code ApiError}.
 */
class PasswordControllerValidationTest {

    private PasswordService passwordService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        passwordService = mock(PasswordService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PasswordController(passwordService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @ParameterizedTest
    @ValueSource(ints = {4, 21})
    void rejectsPasswordOutsideAllowedLength(int length) throws Exception {
        String body = requestBody("token", "a".repeat(length));

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("input validation failed"))
                .andExpect(jsonPath("$.errors[0].field").value("newPassword"))
                .andExpect(jsonPath("$.errors[0].message").value(PasswordPolicy.LENGTH_MESSAGE));

        verifyNoInteractions(passwordService);
    }

    @Test
    void rejectsEmptyPasswordWithoutCallingService() throws Exception {
        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("token", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("input validation failed"))
                .andExpect(jsonPath("$.errors[0].field").value("newPassword"));

        verifyNoInteractions(passwordService);
    }

    @ParameterizedTest
    @ValueSource(ints = {5, 10, 20})
    void acceptsPasswordWithinAllowedLength(int length) throws Exception {
        when(passwordService.resetPassword(any(ResetPasswordRequest.class)))
                .thenReturn(new PasswordMessageResponse("reset"));

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("token", "a".repeat(length))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("reset"));

        verify(passwordService).resetPassword(any(ResetPasswordRequest.class));
    }

    @Test
    void rejectionResponseDoesNotExposeTheSubmittedPasswordOrToken() throws Exception {
        String password = "a".repeat(21);
        String token = "super-secret-reset-token";

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody(token, password)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value(PasswordPolicy.LENGTH_MESSAGE))
                .andExpect(result -> {
                    String responseBody = result.getResponse().getContentAsString();
                    org.assertj.core.api.Assertions.assertThat(responseBody)
                            .doesNotContain(password)
                            .doesNotContain(token);
                });

        verifyNoInteractions(passwordService);
    }

    private String requestBody(String token, String password) {
        return "{\"token\":\"" + token + "\",\"newPassword\":\"" + password + "\"}";
    }
}
