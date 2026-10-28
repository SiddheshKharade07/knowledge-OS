package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface StorageService {

    DocumentResponse uploadFile(MultipartFile file) throws IOException;

    DocumentResponse uploadFile(MultipartFile file, java.util.List<Long> departmentIds) throws IOException;

    java.util.List<DocumentResponse> uploadFiles(java.util.List<MultipartFile> files, java.util.List<Long> departmentIds) throws IOException;

    DocumentResponse uploadFileViaFilePath(String fileName) throws IOException;

    List<DocumentResponse> listDocuments();

    List<DocumentChunkResponse> getDocumentChunks(Long documentId);

    FileContentResponse getFileContent(Long documentId);

    void deleteDocument(Long documentId);
}
