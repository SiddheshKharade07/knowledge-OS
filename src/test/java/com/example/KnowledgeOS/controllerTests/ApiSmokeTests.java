package com.example.KnowledgeOS.controllerTests;

import com.example.KnowledgeOS.dto.request.DocumentUploadRequest;
import com.example.KnowledgeOS.dto.request.RagQueryRequest;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ApiSmokeTests {

    @Autowired
    private TestRestTemplate restTemplate;

    private static Long uploadedDocumentId;

    @Test
    @Order(1)
    void uploadDocumentReturns201() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/v1/documents",
                new DocumentUploadRequest("company-faq.txt"),
                Map.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        uploadedDocumentId = ((Number) response.getBody().get("id")).longValue();
        assertEquals("company-faq.txt", response.getBody().get("fileName"));
        assertEquals("UPLOADED", response.getBody().get("documentStatus"));
    }

    @Test
    @Order(2)
    void ingestUploadedDocumentReturns202() {
        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/v1/documents/" + uploadedDocumentId + "/ingest", null, Void.class);

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
    }

    @Test
    @Order(3)
    void getIngestedDocumentContentReturns200() {
        ResponseEntity<Map> response = restTemplate.getForEntity(
                "/api/v1/documents/" + uploadedDocumentId + "/content", Map.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        String content = String.valueOf(response.getBody().get("content"));
        assertFalse(content.isBlank(), "extracted content should not be blank");
    }

    @Test
    @Order(4)
    void ragQueryReturnsAnswerWithCitations() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/v1/rag/query",
                new RagQueryRequest("Can I work remotely?"),
                Map.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        String answer = String.valueOf(response.getBody().get("answer"));
        assertFalse(answer.isBlank(), "answer should not be blank");
        assertTrue(((List<?>) response.getBody().getOrDefault("citations", List.of())).size() > 0,
                "citations should be present");
    }

    @Test
    @Order(5)
    void blankQueryIsRejectedWith400() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/rag/query",
                new RagQueryRequest("   "),
                String.class);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @Order(6)
    void ingestUnknownDocumentReturns404() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/documents/999999/ingest", null, String.class);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertTrue(response.getBody().contains("Document not found"));
    }
}
