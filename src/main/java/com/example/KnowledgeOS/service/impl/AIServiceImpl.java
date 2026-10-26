package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AIServiceImpl implements AIService {

    private final ChatClient chatClient;
    private final EmbeddingModel embeddingModel;

    @Override
    public float[] getVectorEmbedding(String text) {
        return embeddingModel.embed(text);
    }

    @Override
    public List<float[]> getVectorEmbeddings(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return List.of();
        }
        return embeddingModel.embed(texts);
    }
}
