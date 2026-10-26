package com.example.KnowledgeOS.service;

import com.example.KnowledgeOS.dto.ChatMessageResponse;
import com.example.KnowledgeOS.dto.ChatSessionDto;
import com.example.KnowledgeOS.dto.request.RenameChatSessionRequest;
import com.example.KnowledgeOS.dto.request.SendChatMessageRequest;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface ChatService {
    ChatSessionDto createSession();

    List<ChatSessionDto> listSessions();

    ChatSessionDto getSession(Long sessionId);

    ChatSessionDto renameSession(Long sessionId, RenameChatSessionRequest request);

    void deleteSession(Long sessionId);

    ChatMessageResponse sendMessage(SendChatMessageRequest request);

    SseEmitter streamMessage(SendChatMessageRequest request);
}