package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.config.RagProperties;
import com.example.KnowledgeOS.dto.*;
import com.example.KnowledgeOS.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Slf4j
@Service
@RequiredArgsConstructor
public class HybridRetrievalServiceImpl implements HybridRetrievalService {

    private final QueryAnalysisService queryAnalysisService;
    private final LexicalSearchService lexicalSearchService;
    private final SemanticSearchService semanticSearchService;
    private final HybridFusionService hybridFusionService;
    private final Reranker reranker;
    private final RagProperties ragProperties;

    @Override
    public RetrievalResult retrieve(String userQuery) {
        log.info("Starting hybrid retrieval pipeline for query: '{}'", userQuery);

        // 1. Query Analysis
        QueryAnalysisResponse analysis = queryAnalysisService.analyze(userQuery);
        List<String> searchTerms = analysis.searchTerms();

        // 2. Dual retrieval, executed concurrently on virtual threads (blocking I/O)
        int lexicalTopK = ragProperties.getLexical().getTopK();
        int semanticTopK = ragProperties.getSemantic().getTopK();
        double similarityThreshold = ragProperties.getSemantic().getSimilarityThreshold();

        List<RetrievalCandidate> lexicalCandidates;
        List<RetrievalCandidate> semanticCandidates;
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<List<RetrievalCandidate>> lexicalFuture =
                    executor.submit(() -> lexicalSearchService.search(userQuery, searchTerms, lexicalTopK));
            Future<List<RetrievalCandidate>> semanticFuture =
                    executor.submit(() -> semanticSearchService.search(userQuery, similarityThreshold, semanticTopK));

            lexicalCandidates = lexicalFuture.get();
            semanticCandidates = semanticFuture.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Hybrid retrieval interrupted", e);
        } catch (Exception e) {
            throw new IllegalStateException("Hybrid retrieval failed for query: " + userQuery, e);
        }

        // 3. Hybrid Fusion (RRF)
        int fusionTopK = ragProperties.getFusion().getTopK();
        double rrfK = ragProperties.getFusion().getRrfK();
        List<RetrievalCandidate> fusedCandidates =
                hybridFusionService.fuse(lexicalCandidates, semanticCandidates, rrfK, fusionTopK);

        // 4. Reranking
        List<RankedChunk> rerankedChunks = reranker.rerank(userQuery, fusedCandidates);

        // Structured Debug / Observability Info
        RagDebugInfo debugInfo = new RagDebugInfo(
                userQuery,
                searchTerms,
                lexicalCandidates,
                semanticCandidates,
                fusedCandidates,
                rerankedChunks
        );

        logRetrievalSummary(debugInfo);

        return new RetrievalResult(rerankedChunks, debugInfo);
    }

    private void logRetrievalSummary(RagDebugInfo debug) {
        log.info("RAG Retrieval Observability Summary:");
        log.info("  Original Query: {}", debug.originalQuery());
        log.info("  Analyzed Terms: {}", debug.searchTerms());
        log.info("  Lexical Candidates Count: {}", debug.lexicalCandidates().size());
        log.info("  Semantic Candidates Count: {}", debug.semanticCandidates().size());
        log.info("  Fused Candidates Count: {}", debug.fusedCandidates().size());
        log.info("  Final Reranked Count: {}", debug.rerankedCandidates().size());

        for (RankedChunk chunk : debug.rerankedCandidates()) {
            log.debug("  -> Final Chunk ID: {}, Document: {}, Rank: {}, Score: {}",
                    chunk.getChunkId(), chunk.getDocumentName(), chunk.getFinalRank(), chunk.getRelevanceScore());
        }
    }
}
