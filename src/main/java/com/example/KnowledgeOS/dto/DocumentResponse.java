package com.example.KnowledgeOS.dto;

import com.example.KnowledgeOS.enums.DocumentStatus;

public record DocumentResponse(
       Long id,
       String fileName,
       String contentType,
       String minioObjectKey,
       Long fileSize,
       DocumentStatus documentStatus
) {
}
