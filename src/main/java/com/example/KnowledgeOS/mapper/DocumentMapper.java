package com.example.KnowledgeOS.mapper;

import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.entity.Document;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    DocumentResponse toResponse(Document document);
}
