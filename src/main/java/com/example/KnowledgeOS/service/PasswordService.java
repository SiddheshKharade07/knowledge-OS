package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.PasswordMessageResponse;
import com.example.KnowledgeOS.dto.request.ChangePasswordRequest;
import com.example.KnowledgeOS.dto.request.ForgotPasswordRequest;
import com.example.KnowledgeOS.dto.request.ResetPasswordRequest;
import com.example.KnowledgeOS.dto.request.SetPasswordRequest;

public interface PasswordService {

    PasswordMessageResponse setupPassword(SetPasswordRequest request);

    PasswordMessageResponse requestPasswordReset(ForgotPasswordRequest request);

    PasswordMessageResponse resetPassword(ResetPasswordRequest request);

    PasswordMessageResponse changePassword(ChangePasswordRequest request);
}
