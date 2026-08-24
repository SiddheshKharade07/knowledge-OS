package com.example.KnowledgeOS.mapper;

import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.entity.DocumentEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    DocumentResponse toResponse(DocumentEntity document);
}
