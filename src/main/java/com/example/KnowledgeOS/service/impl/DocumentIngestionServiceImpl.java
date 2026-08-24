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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Override
    @Transactional
    public void ingest(Long documentId) {
        DocumentEntity documentEntity = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        try {
            markStatus(documentEntity, DocumentStatus.PROCESSING);

            FileContentResponse fileContentResponse = storageService.getFileContent(documentId);
            String content = fileContentResponse.content();

            if (content == null || content.isBlank()) {
                throw new IllegalArgumentException(
                        "Document contains no readable content"
                );
            }

            documentChunkRepository.deleteByDocumentId(documentId);

            TokenTextSplitter tokenTextSplitter = TokenTextSplitter.builder()
                    .withChunkSize(500)
                    .build();

            Document document = new Document(content);
            List<Document> chunks = tokenTextSplitter.apply(List.of(document));

            int chunkIdx = 0;
            List<DocumentChunk> documentChunks = new ArrayList<>();
            for (Document chunk : chunks) {
                String chunkText = chunk.getText();
                DocumentChunk documentChunk = DocumentChunk.builder()
                        .document(documentEntity)
                        .content(chunkText)
                        .chunkIndex(chunkIdx++)
                        .tokenCount(estimateTokenCount(chunkText))
                        .build();
                documentChunks.add(documentChunk);
            }

            List<DocumentChunk> savedChunks = documentChunkRepository.saveAll(documentChunks);
            documentChunkRepository.flush();

            // Generate and save vector embeddings for each chunk
            for (DocumentChunk chunk : savedChunks) {
                float[] embedding = aiService.getVectorEmbedding(chunk.getContent());
                String vectorStr = formatVectorForPgVector(embedding);
                documentChunkRepository.updateChunkEmbedding(chunk.getId(), vectorStr);
            }

            markStatus(documentEntity, DocumentStatus.COMPLETED);
            log.info("Ingested document {} into {} chunks with pgvector embeddings", documentId, savedChunks.size());
        } catch (Exception e) {
            log.error("Failed to ingest document {}", documentId, e);
            markStatus(documentEntity, DocumentStatus.FAILED);
            throw new StorageException("Failed to ingest document " + documentId, e);
        }
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

    private String formatVectorForPgVector(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(vector[i]);
            if (i < vector.length - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }
}
