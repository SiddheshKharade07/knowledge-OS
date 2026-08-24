package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.QueryAnalysisResponse;
import com.example.KnowledgeOS.service.QueryAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueryAnalysisServiceImpl implements QueryAnalysisService {

    private static final Set<String> GENERIC_STOP_WORDS = Set.of(
            "work", "days", "information", "thing", "question", "employee", "employees",
            "can", "how", "what", "where", "who", "which", "when", "why", "many", "much",
            "tell", "show", "find", "give", "please", "help"
    );

    private static final String SYSTEM_PROMPT = """
        You are an expert search query analyzer for an enterprise document retrieval system.
        Analyze the user query and extract 1-3 meaningful search concepts or key phrases.

        Rules:
        - Return meaningful phrases or domain-specific search concepts.
        - Prefer compound concepts (e.g., "remote work", "work remotely", "planned leave") over single generic words.
        - Do not include generic filler words such as: work, days, information, thing, question, employee.
        - Preserve the core intent of the user's question.
        - Output structured JSON matching: {"searchTerms": ["concept 1", "concept 2"]}
        """;

    private final ChatClient chatClient;

    @Override
    public QueryAnalysisResponse analyze(String userQuery) {
        if (userQuery == null || userQuery.isBlank()) {
            log.warn("Empty user query provided to QueryAnalysisService");
            return new QueryAnalysisResponse(List.of());
        }

        try {
            QueryAnalysisResponse response = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(userQuery)
                    .call()
                    .entity(QueryAnalysisResponse.class);

            if (response != null && response.searchTerms() != null && !response.searchTerms().isEmpty()) {
                List<String> cleanedTerms = response.searchTerms().stream()
                        .map(String::trim)
                        .map(s -> s.replaceAll("^\"|\"$", ""))
                        .filter(s -> !s.isBlank())
                        .distinct()
                        .collect(Collectors.toList());

                if (!cleanedTerms.isEmpty()) {
                    log.debug("Analyzed search terms for query '{}': {}", userQuery, cleanedTerms);
                    return new QueryAnalysisResponse(cleanedTerms);
                }
            }
        } catch (Exception e) {
            log.warn("LLM Query analysis failed for query '{}', falling back to heuristic extraction: {}", userQuery, e.getMessage());
        }

        return fallbackExtraction(userQuery);
    }

    private QueryAnalysisResponse fallbackExtraction(String userQuery) {
        String cleaned = userQuery.replaceAll("[^a-zA-Z0-9\\s]", " ").toLowerCase();
        List<String> tokens = Arrays.stream(cleaned.split("\\s+"))
                .map(String::trim)
                .filter(t -> t.length() > 2)
                .filter(t -> !GENERIC_STOP_WORDS.contains(t))
                .distinct()
                .collect(Collectors.toList());

        List<String> terms = new ArrayList<>();
        if (tokens.size() >= 2) {
            terms.add(tokens.get(0) + " " + tokens.get(1));
        }
        terms.addAll(tokens);

        if (terms.isEmpty()) {
            terms.add(userQuery.trim());
        }

        log.debug("Fallback extracted search terms: {}", terms);
        return new QueryAnalysisResponse(terms);
    }
}
