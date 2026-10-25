package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT u.userRole FROM User u WHERE u.id = :userId")
    Optional<UserRole> findRoleByUserId(@Param("userId") Long userId);

    long countByUserRoleAndActiveTrue(UserRole userRole);

    Page<User> findAll(Pageable pageable);
}