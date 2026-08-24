package com.example.KnowledgeOS.dto;

import org.springframework.core.io.Resource;

public record FileContentResponse(
        String fileName,
        String contentType,
        String content
) {
}
