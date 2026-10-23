package com.example.KnowledgeOS.mapper;

import com.example.KnowledgeOS.dto.request.DepartmentDto;
import com.example.KnowledgeOS.entity.Department;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DepartmentMapper {

    Department toEntity(DepartmentDto departmentDto);

    DepartmentDto toDepartmentDto(Department department);
}
