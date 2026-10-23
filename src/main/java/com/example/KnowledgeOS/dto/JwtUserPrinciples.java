package com.example.KnowledgeOS.dto;

import org.springframework.security.core.GrantedAuthority;

import java.util.List;

public record JwtUserPrinciples(
        Long userId,
        String username,
        List<GrantedAuthority> authorities
) {
}
