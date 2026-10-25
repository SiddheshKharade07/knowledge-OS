package com.example.KnowledgeOS.entity;

import com.example.KnowledgeOS.enums.AccountTokenPurpose;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "account_tokens",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_account_tokens_token_hash",
                columnNames = "token_hash"
        ),
        indexes = @Index(
                name = "idx_account_tokens_user_purpose",
                columnList = "user_id, purpose, consumed_at"
        )
)
public class AccountToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AccountTokenPurpose purpose;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant consumedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
