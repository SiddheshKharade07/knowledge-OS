package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.FileContentResponse;
import com.example.KnowledgeOS.entity.DocumentChunk;
import com.example.KnowledgeOS.entity.DocumentEntity;
import com.example.KnowledgeOS.entity.enums.DocumentStatus;
import com.example.KnowledgeOS.exception.DocumentNotFoundException;
import com.example.KnowledgeOS.exception.StorageException;
import com.example.KnowledgeOS.repository.DocumentChunkRepository;
import com.example.KnowledgeOS.repository.DocumentRepository;
import com.example.KnowledgeOS.service.AIService;
import com.example.KnowledgeOS.service.DocumentIngestionService;
import com.example.KnowledgeOS.service.StorageService;
import com.example.KnowledgeOS.util.VectorUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentIngestionServiceImpl implements DocumentIngestionService {

    private final StorageService storageService;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final AIService aiService;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void ingest(Long documentId) {
        DocumentEntity documentEntity = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        try {
            markStatus(documentEntity, DocumentStatus.PROCESSING);

            FileContentResponse fileContentResponse = storageService.getFileContent(documentId);
            String content = fileContentResponse.content();
            if (content == null || content.isBlank()) {
                throw new IllegalArgumentException("Document contains no readable content");
            }

            List<DocumentChunk> savedChunks = transactionTemplate.execute(tx ->
                    replaceChunks(documentEntity, content));
            if (savedChunks == null || savedChunks.isEmpty()) {
                throw new IllegalStateException("Chunking produced no chunks for document " + documentId);
            }

            persistEmbeddings(savedChunks);

            markStatus(documentEntity, DocumentStatus.COMPLETED);
            log.info("Ingested document {} into {} chunks with pgvector embeddings",
                    documentId, savedChunks.size());
        } catch (Exception e) {
            log.error("Failed to ingest document {}", documentId, e);
            markStatus(documentEntity, DocumentStatus.FAILED);
            throw new StorageException("Failed to ingest document " + documentId, e);
        }
    }

    private List<DocumentChunk> replaceChunks(DocumentEntity documentEntity, String content) {
        TokenTextSplitter tokenTextSplitter = TokenTextSplitter.builder()
                .withChunkSize(500)
                .build();

        List<Document> chunks = tokenTextSplitter.apply(List.of(new Document(content)));

        documentChunkRepository.deleteByDocumentId(documentEntity.getId());

        List<DocumentChunk> documentChunks = new ArrayList<>(chunks.size());
        int chunkIdx = 0;
        for (Document chunk : chunks) {
            String chunkText = chunk.getText();
            documentChunks.add(DocumentChunk.builder()
                    .document(documentEntity)
                    .content(chunkText)
                    .chunkIndex(chunkIdx++)
                    .tokenCount(estimateTokenCount(chunkText))
                    .build());
        }
        return documentChunkRepository.saveAll(documentChunks);
    }

    private void persistEmbeddings(List<DocumentChunk> chunks) {
        List<String> chunkTexts = chunks.stream()
                .map(DocumentChunk::getContent)
                .toList();

        List<float[]> embeddings = aiService.getVectorEmbeddings(chunkTexts);
        if (embeddings.size() != chunks.size()) {
            throw new IllegalStateException(
                    "Embedding count mismatch: expected " + chunks.size() + ", got " + embeddings.size());
        }

        transactionTemplate.executeWithoutResult(tx -> {
            for (int i = 0; i < chunks.size(); i++) {
                documentChunkRepository.updateChunkEmbedding(
                        chunks.get(i).getId(), VectorUtils.toPgVectorString(embeddings.get(i)));
            }
        });
    }

    private void markStatus(DocumentEntity documentEntity, DocumentStatus status) {
        documentEntity.setDocumentStatus(status);
        documentRepository.save(documentEntity);
    }

    private int estimateTokenCount(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }
}
