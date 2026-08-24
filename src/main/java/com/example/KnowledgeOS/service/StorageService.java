package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;

import java.io.IOException;
import java.util.List;

public interface StorageService {

    public DocumentResponse uploadFile(String filePath) throws IOException;

    public List<DocumentResponse> listDocuments();

    public FileContentResponse getFileContent(Long documentId);

    public List<DocumentChunkResponse> getDocumentChunks(Long documentId);
}
