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

    @org.springframework.security.access.prepost.PreAuthorize("@security.canManageMembers() or @security.canManageDepartments() or @security.canUploadDocuments()")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "departmentIds", required = false) java.util.List<Long> departmentIds)
            throws IOException {
        DocumentResponse response = storageService.uploadFile(file, departmentIds);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @org.springframework.security.access.prepost.PreAuthorize("@security.canManageMembers() or @security.canManageDepartments() or @security.canUploadDocuments()")
    @PostMapping(value = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<java.util.List<DocumentResponse>> uploadBatch(@RequestParam("files") java.util.List<MultipartFile> files,
                                                                        @RequestParam(value = "departmentIds", required = false) java.util.List<Long> departmentIds)
            throws IOException {
        java.util.List<DocumentResponse> responses = storageService.uploadFiles(files, departmentIds);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @org.springframework.security.access.prepost.PreAuthorize("@security.canManageMembers() or @security.canManageDepartments() or @security.canUploadDocuments()")
    @PostMapping("/upload/{fileName}")
    public ResponseEntity<DocumentResponse> uploadDoc(@PathVariable String fileName) throws IOException {
        DocumentResponse documentResponse = storageService.uploadFileViaFilePath(fileName);
        return ResponseEntity.status(HttpStatus.CREATED).body(documentResponse);
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> listDocuments() {
        return ResponseEntity.ok(storageService.listDocuments());
    }

    @org.springframework.security.access.prepost.PreAuthorize("@security.canManageMembers() or @security.canManageDepartments() or @security.canUploadDocuments()")
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

    @org.springframework.security.access.prepost.PreAuthorize("@security.isAdmin() or @security.isKnowledgeManager() or @security.canDeleteDocuments()")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        storageService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }
}
