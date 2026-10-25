package com.example.KnowledgeOS.controller;

import com.example.KnowledgeOS.dto.ChatMessageResponse;
import com.example.KnowledgeOS.dto.ChatSessionDto;
import com.example.KnowledgeOS.dto.request.RenameChatSessionRequest;
import com.example.KnowledgeOS.dto.request.SendChatMessageRequest;
import com.example.KnowledgeOS.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionDto> createSession() {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.createSession());
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionDto>> listSessions() {
        return ResponseEntity.ok(chatService.listSessions());
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ChatSessionDto> getSession(@PathVariable Long sessionId) {
        return ResponseEntity.ok(chatService.getSession(sessionId));
    }

    @PatchMapping("/sessions/{sessionId}")
    public ResponseEntity<ChatSessionDto> renameSession(@PathVariable Long sessionId,
                                                       @RequestBody @Valid RenameChatSessionRequest request) {
        return ResponseEntity.ok(chatService.renameSession(sessionId, request));
    }

    @PutMapping("/sessions/{sessionId}")
    public ResponseEntity<ChatSessionDto> renameSessionPut(@PathVariable Long sessionId,
                                                          @RequestBody @Valid RenameChatSessionRequest request) {
        return ResponseEntity.ok(chatService.renameSession(sessionId, request));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long sessionId) {
        chatService.deleteSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(@Valid @RequestBody SendChatMessageRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(request));
    }

    @PostMapping("/query")
    public ResponseEntity<ChatMessageResponse> sendMessageAlt(@Valid @RequestBody SendChatMessageRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(request));
    }
}