package com.example.KnowledgeOS.mapper;

import com.example.KnowledgeOS.dto.DocumentResponse;
import com.example.KnowledgeOS.entity.Document;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "ownerName", source = "owner.username")
    @Mapping(target = "ownerEmail", source = "owner.email")
    DocumentResponse toResponse(Document document);
}
