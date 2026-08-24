package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotBlank;

public record DocumentUploadRequest(
        @NotBlank(message = "fileName is required") String fileName
) {
}
