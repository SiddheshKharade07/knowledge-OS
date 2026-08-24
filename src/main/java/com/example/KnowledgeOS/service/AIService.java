package com.example.KnowledgeOS.service;

import java.util.List;

public interface AIService {

    String askAi(String prompt);

    float[] getVectorEmbedding(String text);

    List<float[]> getVectorEmbeddings(List<String> texts);
}
