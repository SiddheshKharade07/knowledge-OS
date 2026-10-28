package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.request.DepartmentDto;
import com.example.KnowledgeOS.entity.Department;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import com.example.KnowledgeOS.mapper.DepartmentMapper;
import com.example.KnowledgeOS.repository.DepartmentRepository;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.BadRequestException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final DepartmentMapper departmentMapper;
    private final UserRepository userRepository;

    @Override
    @Transactional
    @PreAuthorize("@security.canManageDepartments() or @security.canManageUsers()")
    public DepartmentDto createDepartment(DepartmentDto departmentDto) throws BadRequestException {

        Department department = departmentRepository.findByName(departmentDto.name()).orElse(null);

        if (department != null) {
            throw new BadRequestException("Department with name: " + departmentDto.name() + " already exists");
        }

        department = departmentMapper.toEntity(departmentDto);
        department = departmentRepository.save(department);

        return departmentMapper.toDepartmentDto(department);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentDto> getAllDepartments() {
        List<Department> departments = departmentRepository.findAll();
        java.util.Map<Long, Long> counts = new java.util.HashMap<>();
        for (Object[] row : userRepository.countUsersGroupByDepartment()) {
            Long deptId = row[0] == null ? null : ((Number) row[0]).longValue();
            Long cnt = row[1] == null ? 0L : ((Number) row[1]).longValue();
            if (deptId != null) {
                counts.put(deptId, cnt);
            }
        }
        List<DepartmentDto> departmentDtos = departments.stream()
                .map(department -> {
                    Long c = counts.getOrDefault(department.getId(), 0L);
                    DepartmentDto dto = departmentMapper.toDepartmentDto(department);
                    return new DepartmentDto(dto.id(), dto.name(), dto.description(), c);
                })
                .toList();

        return departmentDtos;
    }

    @Override
    @Transactional
    @PreAuthorize("@security.canManageDepartments() or @security.canManageUsers()")
    public void deleteDepartment(Long departmentId) {
        Department department = departmentRepository.findById(departmentId).orElseThrow(() -> new ResourceNotFoundException("department with ID: " + departmentId + " not found"));
        departmentRepository.delete(department);
    }

    @Override
    public DepartmentDto getDepartmentByName(String departmentName) {
        Department department = departmentRepository.findByName(departmentName).orElseThrow(() -> new ResourceNotFoundException("department with name: " + departmentName + " not found"));
        return departmentMapper.toDepartmentDto(department);
    }

    @Override
    @Transactional
    @PreAuthorize("@security.canManageDepartments() or @security.canManageUsers()")
    public DepartmentDto updateDepartment(Long departmentId, DepartmentDto departmentDto) throws BadRequestException {

        Department department = departmentRepository.findById(departmentId).orElseThrow(() -> new ResourceNotFoundException("department with Id: " + departmentId + " not found"));
        Department departmentByNewName =
                departmentRepository.findByName(departmentDto.name())
                        .orElse(null);

        if (departmentByNewName != null
                && !departmentByNewName.getId().equals(departmentId)) {
            throw new BadRequestException(
                    "Department with name " + departmentDto.name()
                            + " already exists"
            );
        }
        department.setName(departmentDto.name());
        department = departmentRepository.save(department);

        return departmentMapper.toDepartmentDto(department);
    }
}
