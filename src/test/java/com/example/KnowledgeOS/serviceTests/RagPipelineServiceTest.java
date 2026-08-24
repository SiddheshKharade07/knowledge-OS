package com.example.KnowledgeOS.serviceTests;


import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.service.RagPipelineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class RagPipelineServiceTest {

    @Autowired
    private RagPipelineService ragPipelineService;

    @Test
    void testRAGResponse() {
        RagResponse response = ragPipelineService.query("Can I work remotely?");
        System.out.println(response.toString());
    }
}
