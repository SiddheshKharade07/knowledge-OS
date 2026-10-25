package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.enums.AccountTokenPurpose;

import java.time.Duration;
import java.util.Collection;

public interface AccountTokenService {

    String createToken(User user, AccountTokenPurpose purpose, Duration ttl);

    User consumeToken(String rawToken, AccountTokenPurpose purpose);

    void invalidateActiveTokens(Long userId, Collection<AccountTokenPurpose> purposes);
}
