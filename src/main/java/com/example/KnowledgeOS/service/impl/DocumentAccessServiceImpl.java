package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.entity.Department;
import com.example.KnowledgeOS.entity.Document;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import com.example.KnowledgeOS.repository.DocumentRepository;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.DocumentAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentAccessServiceImpl implements DocumentAccessService {

    private final AuthUtil authUtil;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    @Override
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Long userId = authUtil.getCurrentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Set<Long> getCurrentUserDepartmentIds() {
        User user = getCurrentUser();
        if (user.getDepartments() == null || user.getDepartments().isEmpty()) {
            return Collections.emptySet();
        }
        return user.getDepartments().stream()
                .map(Department::getId)
                .collect(Collectors.toSet());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAccessible(Document document) {
        if (document == null) {
            return false;
        }
        try {
            User currentUser = getCurrentUser();
            if (document.getOwner() != null && document.getOwner().getId() != null
                    && document.getOwner().getId().equals(currentUser.getId())) {
                return true;
            }
            if (document.getDepartments() == null || document.getDepartments().isEmpty()) {
                return false;
            }
            Set<Long> userDeptIds = getCurrentUserDepartmentIds();
            if (userDeptIds.isEmpty()) {
                return false;
            }
            for (Department department : document.getDepartments()) {
                if (department != null && department.getId() != null && userDeptIds.contains(department.getId())) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void ensureAccessible(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        ensureAccessible(document);
    }

    @Override
    @Transactional(readOnly = true)
    public void ensureAccessible(Document document) {
        if (!isAccessible(document)) {
            throw new AccessDeniedException("You do not have permission to access this document");
        }
    }
}
