package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AIServiceImpl implements AIService {

    private final ChatClient chatClient;
    private final EmbeddingModel embeddingModel;

    @Override
    public String askAi(String prompt) {

        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }

    @Override
    public String getEmbedding(String text) {
        return embeddingModel.embed(text).toString();
    }

    public int getVectorSize() {
        float[] embedding =
                embeddingModel.embed("Spring Boot is a Java framework.");

        return embedding.length;
    }
}
