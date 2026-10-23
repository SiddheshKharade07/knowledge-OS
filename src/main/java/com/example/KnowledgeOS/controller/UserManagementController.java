package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import com.example.KnowledgeOS.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/admin/user")
public class UserManagementController {

    private final UserManagementService userManagementService;

    @PostMapping
    public ResponseEntity<UserProfileResponse> createUser(@RequestBody @Valid CreateUserRequest createUserRequest) {
        UserProfileResponse userResponse = userManagementService.createUser(createUserRequest);
        return ResponseEntity.ok(userResponse);
    }
}
