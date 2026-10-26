package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    List<ChatSession> findAllByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<ChatSession> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Transactional
    @Query("update ChatSession s set s.title = :title where s.id = :id")
    int updateTitle(@Param("id") Long id, @Param("title") String title);

    @Modifying
    @Transactional
    @Query("update ChatSession s set s.updatedAt = :timestamp where s.id = :id")
    int touch(@Param("id") Long id, @Param("timestamp") Instant timestamp);
}
