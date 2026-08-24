package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;
import com.example.KnowledgeOS.dto.request.DocumentUploadRequest;
import com.example.KnowledgeOS.service.DocumentIngestionService;
import com.example.KnowledgeOS.service.StorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final StorageService storageService;
    private final DocumentIngestionService documentIngestionService;

    @PostMapping
    public ResponseEntity<DocumentResponse> upload(@Valid @RequestBody DocumentUploadRequest request)
            throws IOException {
        DocumentResponse response = storageService.uploadFile(request.fileName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> listDocuments() {
        return ResponseEntity.ok(storageService.listDocuments());
    }

    @PostMapping("/{id}/ingest")
    public ResponseEntity<Void> ingest(@PathVariable Long id) {
        documentIngestionService.ingest(id);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<FileContentResponse> getContent(@PathVariable Long id) {
        return ResponseEntity.ok(storageService.getFileContent(id));
    }

    @GetMapping("/{id}/chunks")
    public ResponseEntity<List<DocumentChunkResponse>> getChunks(@PathVariable Long id) {
        return ResponseEntity.ok(storageService.getDocumentChunks(id));
    }
}
