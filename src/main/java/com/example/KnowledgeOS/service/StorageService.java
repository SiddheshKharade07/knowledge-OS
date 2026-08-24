package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface StorageService {

    DocumentResponse uploadFile(MultipartFile file) throws IOException;

    List<DocumentResponse> listDocuments();

    List<DocumentChunkResponse> getDocumentChunks(Long documentId);

    FileContentResponse getFileContent(Long documentId);
}
