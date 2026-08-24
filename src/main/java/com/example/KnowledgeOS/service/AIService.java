package com.example.KnowledgeOS.service;

public interface AIService {

    String askAi(String prompt);

    String getEmbedding(String text);

    float[] getVectorEmbedding(String text);
}
