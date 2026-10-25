package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.AccountToken;
import com.example.KnowledgeOS.enums.AccountTokenPurpose;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface AccountTokenRepository extends JpaRepository<AccountToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from AccountToken t where t.tokenHash = :tokenHash")
    Optional<AccountToken> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Modifying(flushAutomatically = true)
    @Query("update AccountToken t set t.consumedAt = :now " +
            "where t.user.id = :userId and t.consumedAt is null and t.purpose in :purposes")
    int invalidateActiveByUserId(
            @Param("userId") Long userId,
            @Param("purposes") Collection<AccountTokenPurpose> purposes,
            @Param("now") Instant now);

    @Modifying(flushAutomatically = true)
    @Query("delete from AccountToken t where t.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);
}
