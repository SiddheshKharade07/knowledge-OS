package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;
import com.example.KnowledgeOS.service.DocumentIngestionService;
import com.example.KnowledgeOS.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final StorageService storageService;
    private final DocumentIngestionService documentIngestionService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> upload(@RequestParam("file") MultipartFile file)
            throws IOException {
        DocumentResponse response = storageService.uploadFile(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/upload/{fileName}")
    public ResponseEntity<DocumentResponse> uploadDoc(@PathVariable String fileName) throws IOException {
        DocumentResponse documentResponse = storageService.uploadFileViaFilePath(fileName);
        return ResponseEntity.status(HttpStatus.CREATED).body(documentResponse);
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
