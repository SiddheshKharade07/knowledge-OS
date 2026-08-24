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
        DocumentResponse response = storageService.uploadFile("threads-concurrency-reactor-schedulers.pdf");
        System.out.println(response.toString());
    }

    @Test
    void testGetFileContent() {
        FileContentResponse response = storageService.getFileContent(2L);

        System.out.println(response.content());
    }
}
