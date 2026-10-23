package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findAllByOrderByCreatedAtDesc();
}
