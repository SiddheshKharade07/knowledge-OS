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

    @Override
    public List<DocumentResponse> listDocuments() {
        return documentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(documentMapper::toResponse)
                .toList();
    }

    @Override
    public List<DocumentChunkResponse> getDocumentChunks(Long documentId) {
        if (!documentRepository.existsById(documentId)) {
            throw new DocumentNotFoundException(documentId);
        }
        return documentChunkRepository.findByDocumentIdOrderByChunkIndexAsc(documentId).stream()
                .map(documentChunkMapper::toDocumentChunkResponse)
                .toList();
    }

    @Override
    public DocumentResponse uploadFile(MultipartFile file) throws IOException {
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

        Document savedDocument = documentRepository.save(Document.builder()
                .fileName(fileName)
                .contentType(contentType)
                .fileSize(fileSize)
                .documentStatus(DocumentStatus.PROCESSING)
                .owner(user)
                .build());

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

        Document savedDocument = documentRepository.save(Document.builder()
                .fileName(resolvedName)
                .contentType(contentType)
                .fileSize(fileSize)
                .documentStatus(DocumentStatus.PROCESSING)
                        .owner(user)
                .build());

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
