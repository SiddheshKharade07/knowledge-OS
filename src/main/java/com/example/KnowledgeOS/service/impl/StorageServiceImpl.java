package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.config.StorageConfig;
import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;
import com.example.KnowledgeOS.entity.Document;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.enums.DocumentStatus;
import com.example.KnowledgeOS.exception.DocumentNotFoundException;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import com.example.KnowledgeOS.exception.StorageException;
import com.example.KnowledgeOS.mapper.DocumentChunkMapper;
import com.example.KnowledgeOS.mapper.DocumentMapper;
import com.example.KnowledgeOS.repository.DocumentChunkRepository;
import com.example.KnowledgeOS.repository.DocumentRepository;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.StorageService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageServiceImpl implements StorageService {

    private final MinioClient minioClient;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final StorageConfig storageConfig;
    private final DocumentMapper documentMapper;
    private final DocumentChunkMapper documentChunkMapper;
    private final AuthUtil authUtil;
    private final UserRepository userRepository;
    private final com.example.KnowledgeOS.service.DocumentAccessService documentAccessService;

    @Override
    public List<DocumentResponse> listDocuments() {
        try {
            com.example.KnowledgeOS.entity.User currentUser = documentAccessService.getCurrentUser();
            java.util.Set<Long> departmentIds = documentAccessService.getCurrentUserDepartmentIds();
            List<Long> deptIdList = departmentIds == null || departmentIds.isEmpty()
                    ? java.util.List.of(-1L)
                    : new java.util.ArrayList<>(departmentIds);
            return documentRepository.findAllAccessible(currentUser.getId(), deptIdList).stream()
                    .map(documentMapper::toResponse)
                    .toList();
        } catch (Exception e) {
            return java.util.List.of();
        }
    }

    @Override
    public List<DocumentChunkResponse> getDocumentChunks(Long documentId) {
        documentAccessService.ensureAccessible(documentId);
        if (!documentRepository.existsById(documentId)) {
            throw new DocumentNotFoundException(documentId);
        }
        return documentChunkRepository.findByDocumentIdOrderByChunkIndexAsc(documentId).stream()
                .map(documentChunkMapper::toDocumentChunkResponse)
                .toList();
    }

    @Override
    public DocumentResponse uploadFile(MultipartFile file) throws IOException {
        return uploadFile(file, null);
    }

    private void validateAndAssignDepartments(Document.DocumentBuilder builder, User user, java.util.List<Long> departmentIds) {
        if (user.getUserRole() == com.example.KnowledgeOS.enums.UserRole.USER) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to upload documents");
        }
        if (user.getUserRole() == com.example.KnowledgeOS.enums.UserRole.KNOWLEDGE_MANAGER) {
            if (user.getDepartments() == null || user.getDepartments().isEmpty()) {
                throw new org.springframework.security.access.AccessDeniedException("A department must be assigned to your account before uploading documents. Contact an administrator.");
            }
            if (departmentIds == null || departmentIds.isEmpty()) {
                throw new IllegalArgumentException("Select at least one department before uploading documents.");
            }
            java.util.Set<Long> authorized = user.getDepartments().stream().map(d -> d.getId()).collect(java.util.stream.Collectors.toSet());
            java.util.Set<com.example.KnowledgeOS.entity.Department> selected = new java.util.HashSet<>();
            for (Long depId : departmentIds) {
                if (depId == null) {
                    throw new IllegalArgumentException("Invalid department selection");
                }
                if (!authorized.contains(depId)) {
                    throw new org.springframework.security.access.AccessDeniedException("You cannot assign documents to an unauthorized department");
                }
                com.example.KnowledgeOS.entity.Department dep = com.example.KnowledgeOS.entity.Department.builder().id(depId).build();
                selected.add(dep);
            }
            builder.departments(selected);
            return;
        }
        if (user.getUserRole() == com.example.KnowledgeOS.enums.UserRole.ADMIN) {
            if (departmentIds == null || departmentIds.isEmpty()) {
                throw new IllegalArgumentException("Select at least one department before uploading documents.");
            }
            java.util.Set<com.example.KnowledgeOS.entity.Department> selected = new java.util.HashSet<>();
            for (Long depId : departmentIds) {
                if (depId == null) {
                    throw new IllegalArgumentException("Invalid department selection");
                }
                com.example.KnowledgeOS.entity.Department dep = com.example.KnowledgeOS.entity.Department.builder().id(depId).build();
                selected.add(dep);
            }
            builder.departments(selected);
            return;
        }
        throw new org.springframework.security.access.AccessDeniedException("You do not have permission to upload documents");
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public DocumentResponse uploadFile(MultipartFile file, java.util.List<Long> departmentIds) throws IOException {
        Long userId = authUtil.getCurrentUserId();

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new IllegalArgumentException("Uploaded file name is required");
        }
        String fileName = Path.of(originalName).getFileName().toString();
        long fileSize = file.getSize();
        String contentType = file.getContentType() != null
                ? file.getContentType()
                : probeContentType(fileName);

        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("user with ID: " + userId + " not found"));

        Document.DocumentBuilder builder = Document.builder()
                .fileName(fileName)
                .contentType(contentType)
                .fileSize(fileSize)
                .documentStatus(DocumentStatus.PROCESSING)
                .owner(user);

        validateAndAssignDepartments(builder, user, departmentIds);

        Document savedDocument = documentRepository.save(builder.build());

        String objectName = savedDocument.getId() + "/" + fileName;

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .contentType(contentType)
                            .bucket(storageConfig.getBucket())
                            .object(objectName)
                            .stream(inputStream, fileSize, -1)
                            .build()
            );
        } catch (Exception exception) {
            log.error("Failed to upload file: {}", fileName, exception);
            markFailed(savedDocument);
            throw new StorageException("Failed to upload file: " + fileName, exception);
        }

        savedDocument.setDocumentStatus(DocumentStatus.UPLOADED);
        savedDocument.setMinioObjectKey(objectName);
        savedDocument = documentRepository.save(savedDocument);

        return documentMapper.toResponse(savedDocument);
    }

    @Override
    public DocumentResponse uploadFileViaFilePath(String fileName) throws IOException {
        Long userId = authUtil.getCurrentUserId();

        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("File name is required");
        }

        String resolvedName = Path.of(fileName).getFileName().toString();
        ClassPathResource resource = new ClassPathResource("static/" + resolvedName);
        if (!resource.exists()) {
            throw new IllegalArgumentException("File not found in resources/static: " + resolvedName);
        }

        long fileSize = resource.contentLength();
        String contentType = probeContentType(resolvedName);

        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("user with userID: " + userId + " not found"));

        if (user.getUserRole() == com.example.KnowledgeOS.enums.UserRole.KNOWLEDGE_MANAGER) {
            if (user.getDepartments() == null || user.getDepartments().isEmpty()) {
                throw new org.springframework.security.access.AccessDeniedException("A department must be assigned to your account before uploading documents. Contact an administrator.");
            }
        } else if (user.getUserRole() == com.example.KnowledgeOS.enums.UserRole.USER) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to upload documents");
        }

        Document.DocumentBuilder builder = Document.builder()
                .fileName(resolvedName)
                .contentType(contentType)
                .fileSize(fileSize)
                .documentStatus(DocumentStatus.PROCESSING)
                .owner(user);

        if (user.getUserRole() == com.example.KnowledgeOS.enums.UserRole.KNOWLEDGE_MANAGER) {
            builder.departments(new java.util.HashSet<>(user.getDepartments()));
        }

        Document savedDocument = documentRepository.save(builder.build());

        String objectName = savedDocument.getId() + "/" + resolvedName;

        try (InputStream inputStream = resource.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .contentType(contentType)
                            .bucket(storageConfig.getBucket())
                            .object(objectName)
                            .stream(inputStream, fileSize, -1)
                            .build()
            );
        } catch (Exception exception) {
            log.error("Failed to upload file: {}", resolvedName, exception);
            markFailed(savedDocument);
            throw new StorageException("Failed to upload file: " + resolvedName, exception);
        }

        savedDocument.setDocumentStatus(DocumentStatus.UPLOADED);
        savedDocument.setMinioObjectKey(objectName);
        savedDocument = documentRepository.save(savedDocument);

        return documentMapper.toResponse(savedDocument);
    }

    @Override
    public FileContentResponse getFileContent(Long documentId) {
        documentAccessService.ensureAccessible(documentId);
        Document file = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        try {
            InputStream inputStream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(storageConfig.getBucket())
                            .object(file.getMinioObjectKey())
                            .build()
            );

            String content = "";

            if ("text/plain".equals(file.getContentType())) {
                content = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            } else if ("application/pdf".equals(file.getContentType())) {
                content = extractPdfContent(inputStream);
            } else {
                throw new RuntimeException(
                        "Unsupported file type: " + file.getContentType()
                );
            }

            return new FileContentResponse(
                    file.getFileName(),
                    file.getContentType(),
                    content
            );
        } catch (Exception e) {
            log.error("Failed to read file: {}", documentId, e);
            throw new StorageException("Failed to read content of document " + documentId, e);
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void deleteDocument(Long documentId) {
        com.example.KnowledgeOS.entity.User currentUser = documentAccessService.getCurrentUser();
        if (currentUser.getUserRole() != com.example.KnowledgeOS.enums.UserRole.ADMIN
                && currentUser.getUserRole() != com.example.KnowledgeOS.enums.UserRole.KNOWLEDGE_MANAGER) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to delete documents");
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        if (currentUser.getUserRole() == com.example.KnowledgeOS.enums.UserRole.KNOWLEDGE_MANAGER) {
            if (currentUser.getDepartments() == null || currentUser.getDepartments().isEmpty()) {
                throw new org.springframework.security.access.AccessDeniedException("You do not have permission to delete this document");
            }
            boolean allowed = false;
            if (document.getDepartments() != null) {
                java.util.Set<Long> userDeptIds = currentUser.getDepartments().stream()
                        .map(d -> d.getId())
                        .collect(java.util.stream.Collectors.toSet());
                for (com.example.KnowledgeOS.entity.Department dept : document.getDepartments()) {
                    if (dept != null && dept.getId() != null && userDeptIds.contains(dept.getId())) {
                        allowed = true;
                        break;
                    }
                }
            }
            if (!allowed && document.getOwner() != null && document.getOwner().getId() != null
                    && document.getOwner().getId().equals(currentUser.getId())) {
                allowed = true;
            }
            if (!allowed) {
                throw new org.springframework.security.access.AccessDeniedException("You do not have permission to delete this document");
            }
        }

        documentChunkRepository.deleteByDocumentId(documentId);
        try {
            if (document.getMinioObjectKey() != null && !document.getMinioObjectKey().isBlank()) {
                io.minio.RemoveObjectArgs removeArgs = io.minio.RemoveObjectArgs.builder()
                        .bucket(storageConfig.getBucket())
                        .object(document.getMinioObjectKey())
                        .build();
                minioClient.removeObject(removeArgs);
            }
        } catch (Exception e) {
            log.warn("Failed to remove object from MinIO for document {}: {}", documentId, e.getMessage());
        }
        documentRepository.delete(document);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public java.util.List<DocumentResponse> uploadFiles(java.util.List<MultipartFile> files, java.util.List<Long> departmentIds) throws IOException {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("No files selected");
        }
        java.util.List<DocumentResponse> results = new java.util.ArrayList<>();
        for (MultipartFile file : files) {
            results.add(uploadFile(file, departmentIds));
        }
        return results;
    }

    private void markFailed(Document document) {
        document.setDocumentStatus(DocumentStatus.FAILED);
        documentRepository.save(document);
    }

    private String probeContentType(String fileName) {
        try {
            String contentType = Files.probeContentType(Path.of(fileName));
            return contentType != null ? contentType : "application/octet-stream";
        } catch (InvalidPathException | IOException e) {
            return "application/octet-stream";
        }
    }

    private String extractPdfContent(InputStream inputStream) {
        try (PDDocument pdfDocument =
                     Loader.loadPDF(inputStream.readAllBytes())) {

            PDFTextStripper stripper = new PDFTextStripper();

            return stripper.getText(pdfDocument);

        } catch (IOException e) {

            throw new StorageException(
                    "Failed to extract PDF content",
                    e
            );
        }
    }
}
