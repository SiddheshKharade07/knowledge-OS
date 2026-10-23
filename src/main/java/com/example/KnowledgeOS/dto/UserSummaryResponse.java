package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.enums.UserRole;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserSummaryResponse {

    private Long id;
    private String username;
    private String email;
    private UserRole userRole;
    private boolean active;
}