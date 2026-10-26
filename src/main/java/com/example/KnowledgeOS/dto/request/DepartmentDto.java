package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentDto(
        Long id,
        @NotBlank @Size(min = 2, max = 20) String name,
        String description,
        Long userCount
) {
    public DepartmentDto(Long id, String name) {
        this(id, name, null, null);
    }
}
