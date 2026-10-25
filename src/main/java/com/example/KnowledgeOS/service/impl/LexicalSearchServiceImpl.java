package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.RetrievalCandidate;
import com.example.KnowledgeOS.repository.ChunkSearchResultProjection;
import com.example.KnowledgeOS.repository.DocumentChunkRepository;
import com.example.KnowledgeOS.service.LexicalSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LexicalSearchServiceImpl implements LexicalSearchService {

    private final DocumentChunkRepository documentChunkRepository;

    @Override
    public List<RetrievalCandidate> search(String userQuery, List<String> searchTerms, int topK) {
        return search(userQuery, searchTerms, topK, null, Collections.emptySet());
    }

    @Override
    public List<RetrievalCandidate> search(String userQuery, List<String> searchTerms, int topK, Long userId, Set<Long> departmentIds) {
        if (topK <= 0) {
            return List.of();
        }
        if (userId == null) {
            return List.of();
        }

        List<Long> deptIdList = departmentIds == null || departmentIds.isEmpty()
                ? List.of(-1L)
                : new ArrayList<>(departmentIds);

        Map<Long, ChunkSearchResultProjection> projectionsById = new LinkedHashMap<>();

        // 1. Try websearch with search terms or user query
        String combinedQueryText = (searchTerms != null && !searchTerms.isEmpty())
                ? String.join(" ", searchTerms)
                : userQuery;

        if (combinedQueryText != null && !combinedQueryText.isBlank()) {
            try {
                List<ChunkSearchResultProjection> webResults =
                        documentChunkRepository.searchLexicalWebsearch(combinedQueryText, topK, userId, deptIdList);
                for (ChunkSearchResultProjection proj : webResults) {
                    projectionsById.putIfAbsent(proj.getChunkId(), proj);
                }
            } catch (Exception e) {
                log.warn("Websearch FTS failed for query '{}': {}", combinedQueryText, e.getMessage());
            }
        }

        // 2. If searchTerms present, also try custom formatted tsquery
        if (searchTerms != null && !searchTerms.isEmpty()) {
            String tsQuery = buildTsQuery(searchTerms);
            if (!tsQuery.isBlank()) {
                try {
                    List<ChunkSearchResultProjection> tsResults =
                            documentChunkRepository.searchLexicalTsQuery(tsQuery, topK, userId, deptIdList);
                    for (ChunkSearchResultProjection proj : tsResults) {
                        projectionsById.putIfAbsent(proj.getChunkId(), proj);
                    }
                } catch (Exception e) {
                    log.warn("Failed tsQuery execution for '{}': {}", tsQuery, e.getMessage());
                }
            }
        }

        // Convert projections to RetrievalCandidate and rank them 1..N
        List<RetrievalCandidate> candidates = new ArrayList<>();
        List<ChunkSearchResultProjection> sorted = new ArrayList<>(projectionsById.values());
        sorted.sort((a, b) -> Double.compare(
                b.getScore() != null ? b.getScore() : 0.0,
                a.getScore() != null ? a.getScore() : 0.0
        ));

        int limit = Math.min(topK, sorted.size());
        for (int i = 0; i < limit; i++) {
            ChunkSearchResultProjection proj = sorted.get(i);
            RetrievalCandidate candidate = RetrievalCandidate.builder()
                    .chunkId(proj.getChunkId())
                    .documentId(proj.getDocumentId())
                    .documentName(proj.getDocumentName())
                    .chunkIndex(proj.getChunkIndex())
                    .content(proj.getContent())
                    .lexicalScore(proj.getScore() != null ? proj.getScore() : 0.0)
                    .lexicalRank(i + 1)
                    .build();
            candidates.add(candidate);
        }

        log.debug("Lexical FTS search retrieved {} candidates for query '{}'", candidates.size(), userQuery);
        return candidates;
    }

    private String buildTsQuery(List<String> searchTerms) {
        return searchTerms.stream()
                .flatMap(term -> Arrays.stream(term.split("\\s+")))
                .map(word -> word.replaceAll("[^a-zA-Z0-9_]", ""))
                .filter(word -> !word.isBlank())
                .distinct()
                .map(word -> word + ":*")
                .collect(Collectors.joining(" & "));
    }
}
