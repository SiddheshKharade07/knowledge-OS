package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.entity.Document;
import com.example.KnowledgeOS.entity.User;

import java.util.Set;

public interface DocumentAccessService {
    User getCurrentUser();

    Set<Long> getCurrentUserDepartmentIds();

    boolean isAccessible(Document document);

    void ensureAccessible(Long documentId);

    void ensureAccessible(Document document);
}
