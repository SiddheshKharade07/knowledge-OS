package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.Citation;
import com.example.KnowledgeOS.dto.RankedChunk;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ContextBuilder {

    @Getter
    public static class BuiltContext {
        private final String formattedContext;
        private final List<Citation> citations;

        public BuiltContext(String formattedContext, List<Citation> citations) {
            this.formattedContext = formattedContext;
            this.citations = citations;
        }
    }

    public BuiltContext buildContext(List<RankedChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return new BuiltContext("No relevant document context found.", List.of());
        }

        StringBuilder sb = new StringBuilder();
        List<Citation> citations = new ArrayList<>();

        for (int i = 0; i < chunks.size(); i++) {
            RankedChunk chunk = chunks.get(i);
            String docName = (chunk.getDocumentName() != null) ? chunk.getDocumentName() : "Unknown Document";
            int chunkIndex = (chunk.getChunkIndex() != null) ? chunk.getChunkIndex() : 0;

            sb.append(String.format("[Source %d | Document: %s (ID: %d), Chunk Index: %d, Chunk ID: %d]\n",
                    i + 1, docName, chunk.getDocumentId(), chunkIndex, chunk.getChunkId()));
            sb.append(chunk.getContent()).append("\n\n");

            citations.add(new Citation(
                    chunk.getDocumentId(),
                    docName,
                    chunk.getChunkId(),
                    chunkIndex
            ));
        }

        return new BuiltContext(sb.toString().trim(), citations);
    }
}
