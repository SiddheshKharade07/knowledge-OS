package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.request.DepartmentDto;
import com.example.KnowledgeOS.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    @PostMapping
    public ResponseEntity<DepartmentDto> createDepartment(@RequestBody @Valid DepartmentDto departmentDto) throws BadRequestException {
        DepartmentDto responseDto = departmentService.createDepartment(departmentDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
    }

    @GetMapping
    public ResponseEntity<List<DepartmentDto>> getAllDepartments() {
        List<DepartmentDto> departments = departmentService.getAllDepartments();
        return ResponseEntity.ok(departments);
    }

    @GetMapping("/{departmentName}")
    public ResponseEntity<DepartmentDto> getDepartmentByName(@PathVariable String departmentName) {
        DepartmentDto responseDto = departmentService.getDepartmentByName(departmentName);
        return ResponseEntity.ok(responseDto);
    }

    @DeleteMapping("/{departmentId}")
    public ResponseEntity<Void> deleteDepartment(
            @PathVariable Long departmentId) {

        departmentService.deleteDepartment(departmentId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{departmentId}")
    public ResponseEntity<DepartmentDto> updateDepartment(@PathVariable Long departmentId, @RequestBody DepartmentDto departmentDto) throws BadRequestException {
        DepartmentDto responseDto = departmentService.updateDepartment(departmentId, departmentDto);
        return ResponseEntity.ok(responseDto);
    }
}
