package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.request.DepartmentDto;
import org.apache.coyote.BadRequestException;

import java.util.List;

public interface DepartmentService {
    DepartmentDto createDepartment(DepartmentDto departmentDto) throws BadRequestException;

    List<DepartmentDto> getAllDepartments();

    void deleteDepartment(Long departmentId);

    DepartmentDto getDepartmentByName(String departmentName);

    DepartmentDto updateDepartment(Long departmentId, DepartmentDto departmentDto) throws BadRequestException;
}
