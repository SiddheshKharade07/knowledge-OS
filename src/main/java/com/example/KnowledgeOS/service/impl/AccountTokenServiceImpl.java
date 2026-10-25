package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.entity.AccountToken;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.enums.AccountTokenPurpose;
import com.example.KnowledgeOS.repository.AccountTokenRepository;
import com.example.KnowledgeOS.service.AccountTokenService;
import com.example.KnowledgeOS.util.TokenUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AccountTokenServiceImpl implements AccountTokenService {

    private final AccountTokenRepository accountTokenRepository;

    @Override
    @Transactional
    public String createToken(User user, AccountTokenPurpose purpose, Duration ttl) {
        invalidateActiveTokens(user.getId(), Set.of(purpose));

        String rawToken = TokenUtils.generateRawToken();
        AccountToken token = AccountToken.builder()
                .user(user)
                .tokenHash(TokenUtils.sha256Hex(rawToken))
                .purpose(purpose)
                .expiresAt(Instant.now().plus(ttl))
                .build();

        accountTokenRepository.save(token);
        return rawToken;
    }

    @Override
    @Transactional
    public User consumeToken(String rawToken, AccountTokenPurpose purpose) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Invalid or expired token");
        }

        Instant now = Instant.now();

        AccountToken token = accountTokenRepository
                .findByTokenHashForUpdate(TokenUtils.sha256Hex(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired token"));

        if (token.getPurpose() != purpose
                || token.getConsumedAt() != null
                || !token.getExpiresAt().isAfter(now)) {
            throw new IllegalArgumentException("Invalid or expired token");
        }

        token.setConsumedAt(now);
        accountTokenRepository.save(token);

        return token.getUser();
    }

    @Override
    @Transactional
    public void invalidateActiveTokens(Long userId, Collection<AccountTokenPurpose> purposes) {
        if (userId == null || purposes == null || purposes.isEmpty()) {
            return;
        }
        accountTokenRepository.invalidateActiveByUserId(userId, purposes, Instant.now());
    }
}
