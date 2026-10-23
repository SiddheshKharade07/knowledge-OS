package com.example.KnowledgeOS.dto.request;

import com.example.KnowledgeOS.enums.UserRole;
import io.jsonwebtoken.security.Password;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class CreateUserRequest {

    @NotBlank(message = "Username is required")
    @Size(max = 100, message = "Username cannot exceed 100 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email")
    @Size(max = 254, message = "Email cannot exceed 254 characters")
    private String email;

    @NotNull(message = "User role is required")
    private UserRole userRole;

    private String password;

    private Set<@NotNull Long> departmentIds;
}

