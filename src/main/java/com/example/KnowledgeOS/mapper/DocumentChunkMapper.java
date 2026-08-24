package com.example.KnowledgeOS.mapper;

import com.example.KnowledgeOS.dto.DocumentChunkResponse;
import com.example.KnowledgeOS.entity.DocumentChunk;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DocumentChunkMapper {

    @Mapping(source = "document.id", target = "documentId")
    DocumentChunkResponse toDocumentChunkResponse(DocumentChunk documentChunk);

    List<DocumentChunkResponse> toDocumentChunkResponse(List<DocumentChunk> documentChunks);
}
