package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.ChatSessionDto;
import com.example.KnowledgeOS.entity.ChatMessage;
import com.example.KnowledgeOS.entity.ChatSession;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import com.example.KnowledgeOS.repository.ChatMessageRepository;
import com.example.KnowledgeOS.repository.ChatSessionRepository;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.RagPipelineService;
import com.example.KnowledgeOS.dto.request.SendChatMessageRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChatServiceImplStreamTest {

    @Mock
    private ChatSessionRepository chatSessionRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuthUtil authUtil;
    @Mock
    private RagPipelineService ragPipelineService;
    @Mock
    private ExecutorService chatStreamExecutor;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ChatServiceImpl service;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private User user() {
        return User.builder().id(1L).username("siddhesh").email("s@example.com").password("x").build();
    }

    private ChatSession session(Long id, String title) {
        return ChatSession.builder().id(id).title(title).user(user()).build();
    }

    @Test
    void createSessionReusesAnExistingEmptyDraft() {
        ChatSession draft = session(7L, "New chat");
        when(authUtil.getCurrentUserId()).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(chatSessionRepository.findEmptyByUserId(1L)).thenReturn(List.of(draft));

        ChatSessionDto result = service.createSession();

        assertThat(result.id()).isEqualTo(7L);
        verify(chatSessionRepository, never()).save(any(ChatSession.class));
    }

    @Test
    void listSessionsOnlyReadsNonEmptyConversations() {
        when(authUtil.getCurrentUserId()).thenReturn(1L);
        when(chatSessionRepository.findNonEmptyByUserId(1L))
                .thenReturn(List.of(session(1L, "First"), session(2L, "Second")));

        List<ChatSessionDto> sessions = service.listSessions();

        assertThat(sessions).hasSize(2);
        verify(chatSessionRepository).findNonEmptyByUserId(1L);
        verify(chatSessionRepository, never()).findAllByUserIdOrderByUpdatedAtDesc(anyLong());
    }

    @Test
    void retryRequiresASessionId() {
        when(authUtil.getCurrentUserId()).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));

        SendChatMessageRequest request = new SendChatMessageRequest(null, "hello", 99L);

        assertThatThrownBy(() -> service.streamMessage(request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void retryRejectsAMessageFromAnotherConversation() {
        ChatSession target = session(10L, "Target");
        ChatSession other = session(11L, "Other");
        ChatMessage foreignMessage = ChatMessage.builder()
                .id(99L)
                .session(other)
                .role("USER")
                .content("hello")
                .build();

        when(authUtil.getCurrentUserId()).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
        when(chatSessionRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(target));
        when(chatMessageRepository.findById(99L)).thenReturn(Optional.of(foreignMessage));

        SendChatMessageRequest request = new SendChatMessageRequest(10L, "hello", 99L);

        assertThatThrownBy(() -> service.streamMessage(request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void retryDoesNotPersistASecondUserMessage() {
        ChatSession session = session(10L, "Existing title");
        ChatMessage existingUserMessage = ChatMessage.builder()
                .id(99L)
                .session(session)
                .role("USER")
                .content("hello")
                .build();
        SseEmitter emitter = mock(SseEmitter.class);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> {
            ChatMessage message = invocation.getArgument(0);
            message.setId(500L);
            return message;
        });
        when(ragPipelineService.queryStream("hello")).thenReturn(Flux.just(
                new RagPipelineService.RagStreamEvent("content", "Hi there", null),
                new RagPipelineService.RagStreamEvent("citations", null, List.of()),
                new RagPipelineService.RagStreamEvent("done", null, null)));

        ChatServiceImpl.StreamContext context = new ChatServiceImpl.StreamContext(
                emitter, 1L, user(), "siddhesh", List.of(), session, existingUserMessage, "hello");
        service.runStream(context);

        ArgumentCaptor<ChatMessage> saved = ArgumentCaptor.forClass(ChatMessage.class);
        verify(chatMessageRepository, times(1)).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo("ASSISTANT");
        assertThat(saved.getValue().getContent()).isEqualTo("Hi there");
        verify(ragPipelineService).queryStream("hello");
        verify(chatSessionRepository).touch(eq(10L), any());
        verify(emitter).complete();
    }

    @Test
    void newMessageIsPersistedOnceAndAnswered() {
        ChatSession session = session(10L, "New chat");
        SseEmitter emitter = mock(SseEmitter.class);
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> {
            ChatMessage message = invocation.getArgument(0);
            message.setId("USER".equals(message.getRole()) ? 50L : 51L);
            return message;
        });
        when(ragPipelineService.queryStream("hello")).thenReturn(Flux.just(
                new RagPipelineService.RagStreamEvent("content", "Answer", null),
                new RagPipelineService.RagStreamEvent("done", null, null)));

        ChatServiceImpl.StreamContext context = new ChatServiceImpl.StreamContext(
                emitter, 1L, user(), "siddhesh", List.of(), session, null, "hello");
        service.runStream(context);

        ArgumentCaptor<ChatMessage> saved = ArgumentCaptor.forClass(ChatMessage.class);
        verify(chatMessageRepository, times(2)).save(saved.capture());
        assertThat(saved.getAllValues())
                .extracting(ChatMessage::getRole)
                .containsExactly("USER", "ASSISTANT");
        verify(chatSessionRepository).updateTitle(10L, "hello");
        verify(emitter).complete();
    }

    @Test
    void providerFailureProducesAnErrorEventAndNoAssistantMessage() {
        ChatSession session = session(10L, "Existing title");
        ChatMessage existingUserMessage = ChatMessage.builder()
                .id(99L)
                .session(session)
                .role("USER")
                .content("hello")
                .build();
        SseEmitter emitter = mock(SseEmitter.class);
        when(ragPipelineService.queryStream("hello"))
                .thenReturn(Flux.error(new RuntimeException("internal provider secret payload")));

        ChatServiceImpl.StreamContext context = new ChatServiceImpl.StreamContext(
                emitter, 1L, user(), "siddhesh", List.of(), session, existingUserMessage, "hello");
        service.runStream(context);

        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
        verify(emitter).complete();
    }

    @Test
    void emptyAnswerIsTreatedAsFailure() {
        ChatSession session = session(10L, "Existing title");
        ChatMessage existingUserMessage = ChatMessage.builder()
                .id(99L)
                .session(session)
                .role("USER")
                .content("hello")
                .build();
        SseEmitter emitter = mock(SseEmitter.class);
        when(ragPipelineService.queryStream("hello")).thenReturn(Flux.just(
                new RagPipelineService.RagStreamEvent("done", null, null)));

        ChatServiceImpl.StreamContext context = new ChatServiceImpl.StreamContext(
                emitter, 1L, user(), "siddhesh", List.of(), session, existingUserMessage, "hello");
        service.runStream(context);

        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
        verify(emitter).complete();
    }
}
