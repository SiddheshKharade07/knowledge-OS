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

    /**
     * Sessions that actually contain at least one message. Empty sessions are drafts and
     * must never clutter the conversation history.
     */
    @Query("""
            select s from ChatSession s
            where s.user.id = :userId and s.messages is not empty
            order by s.updatedAt desc
            """)
    List<ChatSession> findNonEmptyByUserId(@Param("userId") Long userId);

    /**
     * Draft sessions (no messages) owned by the user, newest first. Used to reuse an
     * existing draft instead of creating a new empty row on every "New chat" request.
     */
    @Query("""
            select s from ChatSession s
            where s.user.id = :userId and s.messages is empty
            order by s.updatedAt desc
            """)
    List<ChatSession> findEmptyByUserId(@Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("update ChatSession s set s.title = :title where s.id = :id")
    int updateTitle(@Param("id") Long id, @Param("title") String title);

    @Modifying
    @Transactional
    @Query("update ChatSession s set s.updatedAt = :timestamp where s.id = :id")
    int touch(@Param("id") Long id, @Param("timestamp") Instant timestamp);
}
