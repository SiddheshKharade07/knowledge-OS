package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.RetrievalCandidate;
import com.example.KnowledgeOS.repository.ChunkSearchResultProjection;
import com.example.KnowledgeOS.repository.DocumentChunkRepository;
import com.example.KnowledgeOS.service.AIService;
import com.example.KnowledgeOS.service.SemanticSearchService;
import com.example.KnowledgeOS.util.VectorUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SemanticSearchServiceImpl implements SemanticSearchService {

    private final DocumentChunkRepository documentChunkRepository;
    private final AIService aiService;

    @Override
    public List<RetrievalCandidate> search(String userQuery, double similarityThreshold, int topK) {
        if (userQuery == null || userQuery.isBlank() || topK <= 0) {
            return List.of();
        }

        try {
            float[] embedding = aiService.getVectorEmbedding(userQuery);
            if (embedding == null || embedding.length == 0) {
                log.warn("Embedding generation returned empty vector for query '{}'", userQuery);
                return List.of();
            }

            String vectorStr = VectorUtils.toPgVectorString(embedding);

            List<ChunkSearchResultProjection> projections =
                    documentChunkRepository.searchSemanticVector(vectorStr, similarityThreshold, topK);

            List<RetrievalCandidate> candidates = new ArrayList<>();
            for (int i = 0; i < projections.size(); i++) {
                ChunkSearchResultProjection proj = projections.get(i);
                RetrievalCandidate candidate = RetrievalCandidate.builder()
                        .chunkId(proj.getChunkId())
                        .documentId(proj.getDocumentId())
                        .documentName(proj.getDocumentName())
                        .chunkIndex(proj.getChunkIndex())
                        .content(proj.getContent())
                        .semanticScore(proj.getScore() != null ? proj.getScore() : 0.0)
                        .semanticRank(i + 1)
                        .build();
                candidates.add(candidate);
            }

            log.debug("Semantic pgvector search retrieved {} candidates for query '{}'", candidates.size(), userQuery);
            return candidates;
        } catch (Exception e) {
            log.error("Failed pgvector semantic search for query '{}'", userQuery, e);
            return List.of();
        }
    }
}
