package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {

    List<DocumentEntity> findAllByOrderByCreatedAtDesc();
}
