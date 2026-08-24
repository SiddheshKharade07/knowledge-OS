package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.service.DocumentIngestionService;
import com.example.KnowledgeOS.service.DocumentSearchService;
import com.example.KnowledgeOS.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
public class DocumentSearchServiceTests {

    @Autowired
    private StorageService storageService;

    @Autowired
    private DocumentIngestionService documentIngestionService;

    @Autowired
    private DocumentSearchService documentSearchService;

    @BeforeEach
    void setUp() {
        try {
            DocumentResponse doc = storageService.uploadFile("company-faq.txt");
            documentIngestionService.ingest(doc.id());
        } catch (Exception ignored) {}
    }

    @Test
    void testKeywordSearch() {
        List<DocumentChunkResponse> responses = documentSearchService.SearchByKeyword("Can I work remotely, if yes for how many days?");
        responses.forEach(
                response -> System.out.println(response.toString())
        );
    }
}
