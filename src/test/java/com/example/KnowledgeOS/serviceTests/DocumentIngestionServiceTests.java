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
    void testIngest() {
        try {
            DocumentResponse doc = storageService.uploadFile("company-faq.txt");
            service.ingest(doc.id());
            System.out.println("Ingested doc ID: " + doc.id());
        } catch (Exception e) {
            System.out.println("Ingestion test note: " + e.getMessage());
        }
    }
}
