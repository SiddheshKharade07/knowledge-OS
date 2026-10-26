package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.UserSummaryResponse;
import com.example.KnowledgeOS.dto.request.ChangeUserRoleRequest;
import com.example.KnowledgeOS.dto.request.ChangeUserStatusRequest;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import com.example.KnowledgeOS.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/users")
public class UserManagementController {

    private final UserManagementService userManagementService;

    @PostMapping
    public ResponseEntity<UserProfileResponse> createUser(@RequestBody @Valid CreateUserRequest createUserRequest) {
        UserProfileResponse userResponse = userManagementService.createUser(createUserRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(userResponse);
    }

    @GetMapping
    public ResponseEntity<Page<UserSummaryResponse>> listUsers(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userManagementService.listUsers(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userManagementService.getUser(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserProfileResponse> updateUser(@PathVariable Long id, @RequestBody @Valid CreateUserRequest updateUserRequest) {
        return ResponseEntity.ok(userManagementService.updateUser(id, updateUserRequest));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserProfileResponse> updateUserPatch(@PathVariable Long id, @RequestBody @Valid CreateUserRequest updateUserRequest) {
        return ResponseEntity.ok(userManagementService.updateUser(id, updateUserRequest));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<UserProfileResponse> changeRole(@PathVariable Long id, @RequestBody @Valid ChangeUserRoleRequest request) {
        return ResponseEntity.ok(userManagementService.changeRole(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserProfileResponse> changeStatus(@PathVariable Long id, @RequestBody @Valid ChangeUserStatusRequest request) {
        return ResponseEntity.ok(userManagementService.changeStatus(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userManagementService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}

