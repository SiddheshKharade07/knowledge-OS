package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.ChatMessageDto;
import com.example.KnowledgeOS.dto.ChatMessageResponse;
import com.example.KnowledgeOS.dto.ChatSessionDto;
import com.example.KnowledgeOS.dto.Citation;
import com.example.KnowledgeOS.dto.JwtUserPrinciples;
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
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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

        if (session.getTitle() == null || session.getTitle().isBlank() || "New chat".equals(session.getTitle())) {
            session.setTitle(generateTitle(request.message()));
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

    @Override
    public SseEmitter streamMessage(SendChatMessageRequest request) {
        if (request == null || request.message() == null || request.message().trim().isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }

        // Authenticate on the request thread. Failures here are handled by the
        // global exception handler and produce a regular JSON error response.
        final Long userId = authUtil.getCurrentUserId();
        if (userId == null) {
            throw new AuthenticationCredentialsNotFoundException("no JWT found");
        }

        final Authentication currentAuthentication = SecurityContextHolder.getContext().getAuthentication();
        final String username = currentAuthentication != null
                && currentAuthentication.getPrincipal() instanceof JwtUserPrinciples principal
                ? principal.username()
                : "";
        final List<GrantedAuthority> authorities = currentAuthentication == null
                ? new ArrayList<>()
                : new ArrayList<>(currentAuthentication.getAuthorities());

        final String messageText = request.message();
        final Long requestedSessionId = request.sessionId();
        final SseEmitter emitter = new SseEmitter(300_000L);
        final ExecutorService executor = Executors.newSingleThreadExecutor();

        executor.execute(() -> {
            try {
                // The RAG pipeline reads the caller from the SecurityContext, so the
                // worker thread needs a real JWT principal, not just an id.
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(new UsernamePasswordAuthenticationToken(
                        new JwtUserPrinciples(userId, username, authorities), null, authorities));
                SecurityContextHolder.setContext(context);

                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

                final ChatSession session;
                String title;
                if (requestedSessionId != null) {
                    session = chatSessionRepository.findByIdAndUserId(requestedSessionId, userId)
                            .orElseThrow(() -> new ResourceNotFoundException("Chat session not found"));
                    title = session.getTitle();
                } else {
                    title = generateTitle(messageText);
                    session = chatSessionRepository.save(ChatSession.builder()
                            .user(user)
                            .title(title)
                            .build());
                }

                // Persist messages through the repository only. The worker thread has no
                // Hibernate session, so mutating session.getMessages() would fail lazily.
                ChatMessage userMessage = chatMessageRepository.save(ChatMessage.builder()
                        .session(session)
                        .role("USER")
                        .content(messageText)
                        .build());

                if (title == null || title.isBlank() || "New chat".equals(title)) {
                    title = generateTitle(messageText);
                    chatSessionRepository.updateTitle(session.getId(), title);
                }

                final Long sessionId = session.getId();
                final String sessionTitle = title;

                emitter.send(SseEmitter.event()
                        .name("meta")
                        .data(Map.of(
                                "sessionId", sessionId,
                                "userMessageId", userMessage.getId(),
                                "title", sessionTitle)));

                StringBuilder answerBuilder = new StringBuilder();
                List<Citation> citationsList = new ArrayList<>();

                ragPipelineService.queryStream(messageText)
                        .doOnNext(event -> {
                            try {
                                switch (event.type()) {
                                    case "content" -> {
                                        if (event.content() != null) {
                                            answerBuilder.append(event.content());
                                            emitter.send(SseEmitter.event()
                                                    .name("content")
                                                    .data(Map.of("content", event.content())));
                                        }
                                    }
                                    case "citations" -> {
                                        if (event.data() instanceof List<?> list) {
                                            for (Object item : list) {
                                                if (item instanceof Citation citation) {
                                                    citationsList.add(citation);
                                                }
                                            }
                                        }
                                        emitter.send(SseEmitter.event()
                                                .name("citations")
                                                .data(Map.of("citations", citationsList)));
                                    }
                                    case "done" -> completeStream(
                                            emitter, session, sessionId, sessionTitle,
                                            messageText, answerBuilder, citationsList);
                                    default -> {
                                        // Unknown event types are ignored on purpose.
                                    }
                                }
                            } catch (IOException ioException) {
                                // Client went away; abort generation by propagating the error.
                                throw reactor.core.Exceptions.propagate(ioException);
                            }
                        })
                        .doOnError(ex -> handleStreamError(emitter, ex))
                        .onErrorResume(ex -> reactor.core.publisher.Flux.empty())
                        .blockLast();
            } catch (Exception ex) {
                if (ex instanceof ResourceNotFoundException || ex instanceof IllegalArgumentException) {
                    log.warn("Chat stream rejected: {}", ex.getMessage());
                } else {
                    log.error("Failed to start chat stream", ex);
                }
                handleStreamError(emitter, ex);
            } finally {
                SecurityContextHolder.clearContext();
                executor.shutdown();
            }
        });

        return emitter;
    }

    private void completeStream(SseEmitter emitter,
                                ChatSession session,
                                Long sessionId,
                                String sessionTitle,
                                String messageText,
                                StringBuilder answerBuilder,
                                List<Citation> citationsList) throws IOException {
        String fullAnswer = answerBuilder.toString();
        if (fullAnswer.isBlank()) {
            fullAnswer = "I'm sorry, but the retrieved document context does not contain sufficient information to answer your question.";
        }

        ChatMessage assistantMessage = chatMessageRepository.save(ChatMessage.builder()
                .session(session)
                .role("ASSISTANT")
                .content(fullAnswer)
                .citationsJson(toJson(citationsList))
                .metadataJson(toJson(Map.of("query", messageText)))
                .build());
        chatSessionRepository.touch(sessionId, java.time.Instant.now());

        emitter.send(SseEmitter.event()
                .name("done")
                .data(Map.of(
                        "messageId", assistantMessage.getId(),
                        "sessionId", sessionId,
                        "title", sessionTitle)));
        emitter.complete();
    }

    private void handleStreamError(SseEmitter emitter, Throwable ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Stream error";
        try {
            emitter.send(SseEmitter.event()
                    .name("error")
                    .data(Map.of("message", message)));
        } catch (Exception sendFailure) {
            log.debug("Could not send SSE error event: {}", sendFailure.getMessage());
        }
        // Complete normally so the container does not perform an ERROR dispatch on an
        // already committed response (which would fail authorization a second time).
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // Already completed or closed by the client.
        }
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