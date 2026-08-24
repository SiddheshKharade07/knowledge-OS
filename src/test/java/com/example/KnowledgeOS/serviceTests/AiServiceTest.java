package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.service.AIService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class AiServiceTest {

    @Autowired
    private AIService aiService;

    @Test
    void testAskAi() {
        String response = aiService.askAi("what is an Apple?");
        System.out.println(response);
    }

    @Test
    void testGetEmbedding() {
        float[] embedding = aiService.getVectorEmbedding("Hey my name is john");
        System.out.println(embedding.length);
    }
}
