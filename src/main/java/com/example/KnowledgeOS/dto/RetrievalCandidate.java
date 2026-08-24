package com.example.KnowledgeOS.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RetrievalCandidate {
    private Long chunkId;
    private Long documentId;
    private String documentName;
    private Integer chunkIndex;
    private String content;
    private Double lexicalScore;
    private Double semanticScore;
    private Integer lexicalRank;
    private Integer semanticRank;
    private Double fusionScore;
}
