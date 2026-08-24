package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.service.DocumentIngestionService;
import com.example.KnowledgeOS.service.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class DocumentIngestionServiceTests {

    @Autowired
    private StorageService storageService;

    @Autowired
    private DocumentIngestionService service;

    @Test
    void testIngest() throws Exception {
        DocumentResponse response = storageService.uploadFile(
                TestUploads.fromClasspath("threads-concurrency-reactor-schedulers.pdf", "application/pdf"));
        System.out.println("Uploaded doc ID: " + response.id());
        service.ingest(response.id());
        System.out.println("Ingestion completed for doc ID: " + response.id());
    }
}
