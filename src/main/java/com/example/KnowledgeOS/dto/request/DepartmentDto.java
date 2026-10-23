package com.example.KnowledgeOS.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentDto(
        Long id,
        @NotBlank @Size(min = 2, max = 20) String name
) {
}
