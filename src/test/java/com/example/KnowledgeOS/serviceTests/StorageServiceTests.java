package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.FileContentResponse;
import com.example.KnowledgeOS.service.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;

@SpringBootTest
public class StorageServiceTests {

    @Autowired
    private StorageService storageService;

    @Test
    void testUploadFile() throws IOException {
        DocumentResponse response = storageService.uploadFile(
                TestUploads.fromClasspath("threads-concurrency-reactor-schedulers.pdf", "application/pdf"));
        System.out.println(response.toString());
    }

    @Test
    void testGetFileContent() throws IOException {
        DocumentResponse uploaded = storageService.uploadFile(
                TestUploads.fromClasspath("company-faq.txt", "text/plain"));
        FileContentResponse response = storageService.getFileContent(uploaded.id());

        System.out.println(response.content());
    }
}
