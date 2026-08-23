package com.example.KnowledgeOS.serviceTests;

import com.example.KnowledgeOS.service.AIService;
import com.example.KnowledgeOS.service.impl.AIServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class AiServiceTest {

    @Autowired
    private AIServiceImpl aiService;

    @Test
    void testAskAi() {
        String response = aiService.askAi("what is an Apple?");
        System.out.println(response);
    }

    @Test
    void testGetEmbedding() {
        String response = aiService.getEmbedding("Hey my name is john");
        System.out.println(response);
    }

    @Test
    void testGetVectorSize() {
        System.out.println(aiService.getVectorSize());
    }
}
