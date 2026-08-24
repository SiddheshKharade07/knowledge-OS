package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {
}
