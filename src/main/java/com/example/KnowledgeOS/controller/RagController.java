package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.dto.request.RagQueryRequest;
import com.example.KnowledgeOS.service.RagPipelineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagPipelineService ragPipelineService;

    @PostMapping("/query")
    public ResponseEntity<RagResponse> query(@Valid @RequestBody RagQueryRequest request) {
        return ResponseEntity.ok(ragPipelineService.query(request.query()));
    }
}
