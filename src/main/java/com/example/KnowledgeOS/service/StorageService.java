package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;

import java.io.IOException;

public interface StorageService {

    public DocumentResponse uploadFile(String filePath) throws IOException;

    public FileContentResponse getFileContent(Long documentId);
}
