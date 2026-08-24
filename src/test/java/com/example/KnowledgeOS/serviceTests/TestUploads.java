package com.example.KnowledgeOS.serviceTests;

import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

final class TestUploads {

    private TestUploads() {
    }

    static MultipartFile fromClasspath(String fileName, String contentType) throws IOException {
        ClassPathResource resource = new ClassPathResource("static/" + fileName);
        return new MockMultipartFile("file", fileName, contentType, resource.getInputStream().readAllBytes());
    }
}
