package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.PasswordMessageResponse;
import com.example.KnowledgeOS.dto.request.ChangePasswordRequest;
import com.example.KnowledgeOS.dto.request.ForgotPasswordRequest;
import com.example.KnowledgeOS.dto.request.ResetPasswordRequest;
import com.example.KnowledgeOS.dto.request.SetPasswordRequest;
import com.example.KnowledgeOS.service.PasswordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth/password")
public class PasswordController {

    private final PasswordService passwordService;

    @PostMapping("/setup")
    public ResponseEntity<PasswordMessageResponse> setupPassword(@RequestBody @Valid SetPasswordRequest request) {
        return ResponseEntity.ok(passwordService.setupPassword(request));
    }

    @PostMapping("/forgot")
    public ResponseEntity<PasswordMessageResponse> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request) {
        return ResponseEntity.ok(passwordService.requestPasswordReset(request));
    }

    @PostMapping("/reset")
    public ResponseEntity<PasswordMessageResponse> resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        return ResponseEntity.ok(passwordService.resetPassword(request));
    }

    @PostMapping("/change")
    public ResponseEntity<PasswordMessageResponse> changePassword(@RequestBody @Valid ChangePasswordRequest request) {
        return ResponseEntity.ok(passwordService.changePassword(request));
    }
}
