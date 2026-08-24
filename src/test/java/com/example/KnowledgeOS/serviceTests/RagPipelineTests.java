package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.service.DocumentIngestionService;
import com.example.KnowledgeOS.service.RagPipelineService;
import com.example.KnowledgeOS.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class RagPipelineTests {

    @Autowired
    private StorageService storageService;

    @Autowired
    private DocumentIngestionService documentIngestionService;

    @Autowired
    private RagPipelineService ragPipelineService;

    private Long ingestedDocId;

    @BeforeEach
    void setUp() throws Exception {
        try {
            DocumentResponse response = storageService.uploadFile("company-faq.txt");
            ingestedDocId = response.id();
            documentIngestionService.ingest(ingestedDocId);
            System.out.println("Ingested company-faq.txt successfully with ID: " + ingestedDocId);
        } catch (Exception e) {
            System.out.println("Setup ingestion note: " + e.getMessage());
        }
    }

    @Test
    void testRemoteWorkQuery() {
        String query = "Can I work remotely?";
        RagResponse response = ragPipelineService.query(query);

        assertNotNull(response);
        assertNotNull(response.answer());
        assertFalse(response.topChunks().isEmpty(), "Top chunks should not be empty");

        String retrievedContent = response.topChunks().get(0).getContent();
        assertTrue(retrievedContent.toLowerCase().contains("remote work"),
                "Top retrieved chunk should mention remote work");
        System.out.println("Query: " + query);
        System.out.println("Answer: " + response.answer());
        System.out.println("Top Chunk: " + retrievedContent);
    }

    @Test
    void testTechnicalIssueQuery() {
        String query = "Where do I report a technical issue?";
        RagResponse response = ragPipelineService.query(query);

        assertNotNull(response);
        assertNotNull(response.answer());
        assertFalse(response.topChunks().isEmpty(), "Top chunks should not be empty");

        String retrievedContent = response.topChunks().get(0).getContent();
        assertTrue(retrievedContent.toLowerCase().contains("it support") || retrievedContent.toLowerCase().contains("technical"),
                "Top retrieved chunk should mention IT support channel");
        System.out.println("Query: " + query);
        System.out.println("Answer: " + response.answer());
    }

    @Test
    void testLeaveApprovalQuery() {
        String query = "Who approves my leave?";
        RagResponse response = ragPipelineService.query(query);

        assertNotNull(response);
        assertNotNull(response.answer());
        assertFalse(response.topChunks().isEmpty(), "Top chunks should not be empty");

        String retrievedContent = response.topChunks().get(0).getContent();
        assertTrue(retrievedContent.toLowerCase().contains("leave") || retrievedContent.toLowerCase().contains("manager"),
                "Top retrieved chunk should mention manager or leave");
        System.out.println("Query: " + query);
        System.out.println("Answer: " + response.answer());
    }

    @Test
    void testConfidentialInfoQuery() {
        String query = "Who can receive confidential information?";
        RagResponse response = ragPipelineService.query(query);

        assertNotNull(response);
        assertNotNull(response.answer());
        assertFalse(response.topChunks().isEmpty(), "Top chunks should not be empty");

        String retrievedContent = response.topChunks().get(0).getContent();
        assertTrue(retrievedContent.toLowerCase().contains("confidential") || retrievedContent.toLowerCase().contains("authorized"),
                "Top retrieved chunk should mention confidential information");
        System.out.println("Query: " + query);
        System.out.println("Answer: " + response.answer());
    }

    @Test
    void testIrrelevantQuery() {
        String query = "What is the airspeed velocity of an unladen swallow?";
        RagResponse response = ragPipelineService.query(query);

        assertNotNull(response);
        assertNotNull(response.answer());
        System.out.println("Irrelevant Query Answer: " + response.answer());
    }
}
