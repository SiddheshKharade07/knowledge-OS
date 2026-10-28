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
import com.example.KnowledgeOS.exception.GenerationException;
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
import reactor.core.Exceptions;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private static final long STREAM_TIMEOUT_MS = 300_000L;
    private static final String DEFAULT_TITLE = "New chat";

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final AuthUtil authUtil;
    private final RagPipelineService ragPipelineService;
    private final ObjectMapper objectMapper;
    private final ExecutorService chatStreamExecutor;
    private final org.springframework.ai.chat.client.ChatClient chatClient;

    @Override
    @Transactional
    public ChatSessionDto createSession() {
        Long userId = authUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Reuse an existing draft instead of accumulating empty sessions when a client
        // asks for a new chat repeatedly without sending anything.
        List<ChatSession> existingDrafts = chatSessionRepository.findEmptyByUserId(userId);
        if (!existingDrafts.isEmpty()) {
            return ChatSessionDto.summary(existingDrafts.get(0));
        }

        ChatSession session = ChatSession.builder()
                .user(user)
                .title(DEFAULT_TITLE)
                .messages(new ArrayList<>())
                .build();
        ChatSession saved = chatSessionRepository.save(session);
        return ChatSessionDto.summary(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionDto> listSessions() {
        Long userId = authUtil.getCurrentUserId();
        // Only conversations that contain messages are real conversations. Drafts and
        // legacy empty sessions never appear in history.
        List<ChatSession> sessions = chatSessionRepository.findNonEmptyByUserId(userId);
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
                .map(this::toMessageDto)
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

    private String generateSmartTitle(String message) {
        if (message == null || message.isBlank()) {
            return DEFAULT_TITLE;
        }
        String base = generateTitle(message);
        try {
            if (chatClient != null) {
                String prompt = "Generate a concise, descriptive chat title for the following user question. " +
                        "Return only the title (3-7 words), no quotes, no punctuation at the end, no explanation.\n\n" +
                        message.trim();
                String response = chatClient.prompt()
                        .user(prompt)
                        .call()
                        .content();
                if (response != null) {
                    String cleaned = response.trim().replaceAll("^[\"'\\s]+|[\"'\\s]+$", "");
                    cleaned = cleaned.replaceAll("[\\r\\n]+", " ");
                    if (cleaned.length() > 60) {
                        cleaned = cleaned.substring(0, 60).trim();
                    }
                    if (cleaned.length() >= 3 && !cleaned.equalsIgnoreCase("New chat")) {
                        return cleaned;
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Failed to generate AI title, falling back to heuristic", ex);
        }
        return base;
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
                    .title(generateSmartTitle(request.message()))
                    .messages(new ArrayList<>())
                    .build();
            session = chatSessionRepository.save(session);
        }

        String messageText = request.message().trim();
        ChatMessage userMessage;
        if (request.userMessageId() != null) {
            userMessage = requireOwnedUserMessage(request.userMessageId(), session);
            messageText = userMessage.getContent();
        } else {
            userMessage = chatMessageRepository.save(ChatMessage.builder()
                    .session(session)
                    .role("USER")
                    .content(messageText)
                    .build());
        }

        if (needsTitle(session.getTitle()) || DEFAULT_TITLE.equals(session.getTitle())) {
            String newTitle = generateSmartTitle(messageText);
            session.setTitle(newTitle);
            try {
                chatSessionRepository.updateTitle(session.getId(), newTitle);
            } catch (Exception ex) {
                log.debug("Failed to update title for session {}", session.getId(), ex);
            }
        }

        RagResponse ragResponse;
        try {
            ragResponse = ragPipelineService.query(messageText);
        } catch (Exception e) {
            log.error("RAG pipeline failed for session {}", session.getId(), e);
            throw e;
        }

        String answer = ragResponse.answer();
        if (answer == null || answer.isBlank()) {
            throw new GenerationException("The AI service returned an empty answer.");
        }

        ChatMessage assistantMessage = chatMessageRepository.save(ChatMessage.builder()
                .session(session)
                .role("ASSISTANT")
                .content(answer)
                .citationsJson(toJson(ragResponse.citations()))
                .metadataJson(toJson(Map.of(
                        "query", ragResponse.query(),
                        "hasDebugInfo", ragResponse.debugInfo() != null
                )))
                .build());
        chatSessionRepository.touch(session.getId(), Instant.now());

        ChatMessageDto userDto = toMessageDto(userMessage);
        ChatMessageDto assistantDto = toMessageDto(assistantMessage);
        return new ChatMessageResponse(session.getId(), userDto, assistantDto, session.getTitle());
    }

    @Override
    public SseEmitter streamMessage(SendChatMessageRequest request) {
        if (request == null || request.message() == null || request.message().trim().isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }

        // Authenticate and authorize on the request thread. Anything that can fail here
        // is rendered as a normal JSON ApiError with a proper HTTP status, before any
        // event-stream bytes are written.
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

        final User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatSession session = null;
        if (request.sessionId() != null) {
            session = chatSessionRepository.findByIdAndUserId(request.sessionId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Chat session not found"));
        }

        final String messageText;
        ChatMessage existingUserMessage = null;
        if (request.userMessageId() != null) {
            if (session == null) {
                throw new IllegalArgumentException("sessionId is required when retrying a message");
            }
            existingUserMessage = requireOwnedUserMessage(request.userMessageId(), session);
            messageText = existingUserMessage.getContent();
            if (messageText == null || messageText.isBlank()) {
                throw new IllegalArgumentException("message is required");
            }
        } else {
            messageText = request.message().trim();
        }

        final SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        final StreamContext context = new StreamContext(
                emitter, userId, user, username, authorities, session, existingUserMessage, messageText);

        try {
            chatStreamExecutor.execute(() -> runStream(context));
        } catch (RejectedExecutionException rejected) {
            log.warn("Chat stream rejected: streaming executor is saturated");
            sendErrorEvent(emitter, "service_busy",
                    "KnowledgeOS is handling too many responses right now. Please try again in a moment.",
                    true,
                    null);
            completeQuietly(emitter);
        }

        return emitter;
    }

    void runStream(StreamContext context) {
        SseEmitter emitter = context.emitter();
        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(new UsernamePasswordAuthenticationToken(
                new JwtUserPrinciples(context.userId(), context.username(), context.authorities()),
                null,
                context.authorities()));
        SecurityContextHolder.setContext(securityContext);

        Long sessionId = context.session() != null ? context.session().getId() : null;
        try {
            ChatSession session = context.session();
            if (session == null) {
                session = chatSessionRepository.save(ChatSession.builder()
                        .user(context.user())
                        .title(generateTitle(context.message()))
                        .build());
            }
            sessionId = session.getId();

            // The user message is persisted once. Retries pass the existing message id so
            // a failed generation can be retried without duplicating the prompt.
            ChatMessage userMessage = context.existingUserMessage();
            if (userMessage == null) {
                userMessage = chatMessageRepository.save(ChatMessage.builder()
                        .session(session)
                        .role("USER")
                        .content(context.message())
                        .build());
            }

            String title = session.getTitle();
            if (needsTitle(title) || DEFAULT_TITLE.equals(title)) {
                title = generateSmartTitle(context.message());
                try {
                    chatSessionRepository.updateTitle(sessionId, title);
                } catch (Exception ex) {
                    log.debug("Failed to update title for session {}", sessionId, ex);
                }
            }

            final Long activeSessionId = sessionId;
            final String sessionTitle = title;
            final ChatSession activeSession = session;

            sendEvent(emitter, "meta", Map.of(
                    "sessionId", activeSessionId,
                    "userMessageId", userMessage.getId(),
                    "title", sessionTitle));

            StringBuilder answerBuilder = new StringBuilder();
            List<Citation> citations = new ArrayList<>();
            AtomicBoolean completed = new AtomicBoolean(false);

            ragPipelineService.queryStream(context.message())
                    .doOnNext(event -> handleStreamEvent(
                            emitter, event, answerBuilder, citations, completed,
                            activeSession, activeSessionId, sessionTitle, context.message()))
                    .blockLast();

            if (!completed.get()) {
                throw new GenerationException("The response stream ended before completion.");
            }
        } catch (Exception ex) {
            Throwable cause = Exceptions.unwrap(ex);
            if (ChatStreamErrorMapper.isClientDisconnect(cause)) {
                // The browser went away. Stop generation and do not log this as a failure.
                log.debug("Client disconnected from chat stream (session {})", sessionId);
                completeQuietly(emitter);
            } else {
                sendStreamFailure(emitter, cause, sessionId);
            }
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void handleStreamEvent(SseEmitter emitter,
                                   RagPipelineService.RagStreamEvent event,
                                   StringBuilder answerBuilder,
                                   List<Citation> citations,
                                   AtomicBoolean completed,
                                   ChatSession session,
                                   Long sessionId,
                                   String sessionTitle,
                                   String messageText) {
        try {
            switch (event.type()) {
                case "content" -> {
                    if (event.content() != null && !event.content().isEmpty()) {
                        answerBuilder.append(event.content());
                        sendEvent(emitter, "content", Map.of("content", event.content()));
                    }
                }
                case "citations" -> {
                    if (event.data() instanceof List<?> list) {
                        for (Object item : list) {
                            if (item instanceof Citation citation) {
                                citations.add(citation);
                            }
                        }
                    }
                    sendEvent(emitter, "citations", Map.of("citations", citations));
                }
                case "done" -> {
                    completeStream(emitter, session, sessionId, sessionTitle, messageText, answerBuilder, citations);
                    completed.set(true);
                }
                default -> {
                    // Unknown event types are ignored on purpose.
                }
            }
        } catch (IOException ioException) {
            // Client went away; abort generation by terminating the stream.
            throw Exceptions.propagate(ioException);
        }
    }

    private void completeStream(SseEmitter emitter,
                                ChatSession session,
                                Long sessionId,
                                String sessionTitle,
                                String messageText,
                                StringBuilder answerBuilder,
                                List<Citation> citations) throws IOException {
        String fullAnswer = answerBuilder.toString();
        if (fullAnswer.isBlank()) {
            // Never persist or present an empty answer as a success.
            throw new GenerationException("The AI service returned an empty answer.");
        }

        ChatMessage assistantMessage = chatMessageRepository.save(ChatMessage.builder()
                .session(session)
                .role("ASSISTANT")
                .content(fullAnswer)
                .citationsJson(toJson(citations))
                .metadataJson(toJson(Map.of("query", messageText)))
                .build());
        chatSessionRepository.touch(sessionId, Instant.now());

        sendEvent(emitter, "done", Map.of(
                "messageId", assistantMessage.getId(),
                "sessionId", sessionId,
                "title", sessionTitle));
        emitter.complete();
    }

    private void sendStreamFailure(SseEmitter emitter, Throwable failure, Long sessionId) {
        ChatStreamErrorMapper.StreamFailure mapped = ChatStreamErrorMapper.map(failure);
        if (failure instanceof ResourceNotFoundException || failure instanceof IllegalArgumentException) {
            log.warn("Chat stream rejected [{}]: {}", mapped.code(), failure.getMessage());
        } else {
            log.error("Chat stream failed [{}]", mapped.code(), failure);
        }
        sendErrorEvent(emitter, mapped.code(), mapped.message(), mapped.retryable(), sessionId);
        completeQuietly(emitter);
    }

    private void sendErrorEvent(SseEmitter emitter,
                                String code,
                                String message,
                                boolean retryable,
                                Long sessionId) {
        Map<String, Object> data = new HashMap<>();
        data.put("code", code);
        data.put("message", message);
        data.put("retryable", retryable);
        if (sessionId != null) {
            data.put("sessionId", sessionId);
        }
        try {
            sendEvent(emitter, "error", data);
        } catch (Exception sendFailure) {
            // The response is no longer writable; nothing else to do.
            log.debug("Could not send SSE error event: {}", sendFailure.getMessage());
        }
    }

    private void sendEvent(SseEmitter emitter, String name, Object data) throws IOException {
        emitter.send(SseEmitter.event().name(name).data(data));
    }

    private void completeQuietly(SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // Already completed or closed by the client.
        }
    }

    private ChatMessage requireOwnedUserMessage(Long userMessageId, ChatSession session) {
        ChatMessage message = chatMessageRepository.findById(userMessageId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat message not found"));
        if (!"USER".equals(message.getRole())
                || message.getSession() == null
                || !session.getId().equals(message.getSession().getId())) {
            throw new ResourceNotFoundException("Chat message not found");
        }
        return message;
    }

    private boolean needsTitle(String title) {
        return title == null || title.isBlank() || DEFAULT_TITLE.equals(title);
    }

    private String generateTitle(String message) {
        if (message == null) {
            return DEFAULT_TITLE;
        }
        String trimmed = message.trim();
        if (trimmed.isEmpty()) {
            return DEFAULT_TITLE;
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
            List<T> result = objectMapper.readValue(
                    json, objectMapper.getTypeFactory().constructCollectionType(List.class, clazz));
            return result == null ? List.of() : result;
        } catch (Exception e) {
            log.warn("Failed to deserialize chat message citations", e);
            return List.of();
        }
    }

    record StreamContext(
            SseEmitter emitter,
            Long userId,
            User user,
            String username,
            List<GrantedAuthority> authorities,
            ChatSession session,
            ChatMessage existingUserMessage,
            String message
    ) {
    }
}
