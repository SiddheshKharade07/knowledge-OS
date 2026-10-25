package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.ChatMessageDto;
import com.example.KnowledgeOS.dto.ChatMessageResponse;
import com.example.KnowledgeOS.dto.ChatSessionDto;
import com.example.KnowledgeOS.dto.Citation;
import com.example.KnowledgeOS.dto.RagResponse;
import com.example.KnowledgeOS.dto.request.RenameChatSessionRequest;
import com.example.KnowledgeOS.dto.request.SendChatMessageRequest;
import com.example.KnowledgeOS.entity.ChatMessage;
import com.example.KnowledgeOS.entity.ChatSession;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import com.example.KnowledgeOS.repository.ChatMessageRepository;
import com.example.KnowledgeOS.repository.ChatSessionRepository;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.ChatService;
import com.example.KnowledgeOS.service.RagPipelineService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final AuthUtil authUtil;
    private final RagPipelineService ragPipelineService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public ChatSessionDto createSession() {
        Long userId = authUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatSession session = ChatSession.builder()
                .user(user)
                .title("New chat")
                .messages(new ArrayList<>())
                .build();
        ChatSession saved = chatSessionRepository.save(session);
        return ChatSessionDto.summary(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionDto> listSessions() {
        Long userId = authUtil.getCurrentUserId();
        List<ChatSession> sessions = chatSessionRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
        return sessions.stream()
                .map(ChatSessionDto::summary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ChatSessionDto getSession(Long sessionId) {
        Long userId = authUtil.getCurrentUserId();
        ChatSession session = chatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat session not found"));
        List<ChatMessageDto> messages = session.getMessages().stream()
                .map(msg -> toMessageDto(msg))
                .toList();
        return ChatSessionDto.fromEntity(session, messages);
    }

    @Override
    @Transactional
    public ChatSessionDto renameSession(Long sessionId, RenameChatSessionRequest request) {
        Long userId = authUtil.getCurrentUserId();
        ChatSession session = chatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat session not found"));
        String title = request != null && request.title() != null ? request.title().trim() : null;
        if (title == null || title.isEmpty()) {
            throw new IllegalArgumentException("title cannot be empty");
        }
        if (title.length() > 255) {
            throw new IllegalArgumentException("title must not exceed 255 characters");
        }
        session.setTitle(title);
        ChatSession saved = chatSessionRepository.save(session);
        return ChatSessionDto.summary(saved);
    }

    @Override
    @Transactional
    public void deleteSession(Long sessionId) {
        Long userId = authUtil.getCurrentUserId();
        ChatSession session = chatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat session not found"));
        chatSessionRepository.delete(session);
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(SendChatMessageRequest request) {
        if (request == null || request.message() == null || request.message().trim().isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }
        Long userId = authUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatSession session;
        if (request.sessionId() != null) {
            session = chatSessionRepository.findByIdAndUserId(request.sessionId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Chat session not found"));
        } else {
            session = ChatSession.builder()
                    .user(user)
                    .title(generateTitle(request.message()))
                    .messages(new ArrayList<>())
                    .build();
            session = chatSessionRepository.save(session);
        }

        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .role("USER")
                .content(request.message())
                .build();
        userMessage = chatMessageRepository.save(userMessage);
        session.getMessages().add(userMessage);

        String titleToUpdate = null;
        if (session.getTitle() == null || session.getTitle().isBlank() || "New chat".equals(session.getTitle())) {
            titleToUpdate = generateTitle(request.message());
            session.setTitle(titleToUpdate);
        }

        RagResponse ragResponse;
        try {
            ragResponse = ragPipelineService.query(request.message());
        } catch (Exception e) {
            log.error("RAG pipeline failed for session {}", session.getId(), e);
            throw e;
        }

        String citationsJson = toJson(ragResponse.citations());
        String metadataJson = toJson(Map.of(
                "query", ragResponse.query(),
                "hasDebugInfo", ragResponse.debugInfo() != null
        ));

        ChatMessage assistantMessage = ChatMessage.builder()
                .session(session)
                .role("ASSISTANT")
                .content(ragResponse.answer() != null ? ragResponse.answer() : "")
                .citationsJson(citationsJson)
                .metadataJson(metadataJson)
                .build();
        assistantMessage = chatMessageRepository.save(assistantMessage);
        session.getMessages().add(assistantMessage);

        chatSessionRepository.save(session);

        ChatMessageDto userDto = toMessageDto(userMessage);
        ChatMessageDto assistantDto = toMessageDto(assistantMessage);
        return new ChatMessageResponse(session.getId(), userDto, assistantDto, session.getTitle());
    }

    private String generateTitle(String message) {
        if (message == null) {
            return "New chat";
        }
        String trimmed = message.trim();
        if (trimmed.isEmpty()) {
            return "New chat";
        }
        if (trimmed.length() <= 60) {
            return trimmed;
        }
        return trimmed.substring(0, 57) + "...";
    }

    private ChatMessageDto toMessageDto(ChatMessage message) {
        List<Citation> citations = fromJsonList(message.getCitationsJson(), Citation.class);
        Object metadata = fromJson(message.getMetadataJson());
        return new ChatMessageDto(
                message.getId(),
                message.getRole(),
                message.getContent(),
                citations,
                metadata,
                message.getCreatedAt()
        );
    }

    private String toJson(Object obj) {
        if (obj == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize chat message data", e);
            return null;
        }
    }

    private Object fromJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception e) {
            log.warn("Failed to deserialize chat message metadata", e);
            return null;
        }
    }

    private <T> List<T> fromJsonList(String json, Class<T> clazz) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            com.fasterxml.jackson.core.type.TypeReference<List<T>> typeRef = new com.fasterxml.jackson.core.type.TypeReference<List<T>>() {
            };
            List<T> result = objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, clazz));
            return result == null ? List.of() : result;
        } catch (Exception e) {
            log.warn("Failed to deserialize chat message citations", e);
            return List.of();
        }
    }
}