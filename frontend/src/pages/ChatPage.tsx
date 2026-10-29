import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bot, FileText, Send, Square } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { chatApi } from '../api/chat';
import { ApiRequestError } from '../api/client';
import type { ChatMessage, Citation } from '../api/types';
import { Button } from '../components/ui/Button';
import { ChatErrorCard } from '../components/chat/ChatErrorCard';
import { useChatActivity } from '../components/chat/chatActivity';
import {
  ChatStreamError,
  failureForCode,
  failureForStatus,
  isAbortError,
  toChatFailure,
  type ChatFailure,
} from '../lib/errors';
import { cn, formatTime } from '../lib/utils';
import { useAuthStore } from '../stores/auth';

type TurnStatus = 'pending' | 'streaming' | 'done' | 'failed' | 'stopped';

interface Turn {
  prompt: string;
  sessionId: number | null;
  userMessageId: number | null;
  assistantMessageId: number | null;
  content: string;
  citations: Citation[];
  status: TurnStatus;
  failure: ChatFailure | null;
}

const SUGGESTIONS = [
  'Summarize key compliance requirements',
  'What documents cover security policies?',
  'Find onboarding procedures',
  'List recent vendor requirements',
];

/** Matches the server-side `@Size(max = 2000)` validation on chat messages. */
const MAX_MESSAGE_LENGTH = 2000;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/70 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/70 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant/70" />
    </span>
  );
}

function CitationChips({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {citations.slice(0, 6).map((citation, index) => (
        <span
          key={`${citation.chunkId}-${index}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-container-low px-2 py-0.5 text-xs text-on-surface-variant"
          title={citation.documentName}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">
            [{index + 1}] {citation.documentName}
          </span>
        </span>
      ))}
    </div>
  );
}

function Bubble({
  role,
  content,
  createdAt,
  citations,
  streaming,
  incomplete,
}: {
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: string | null;
  citations?: Citation[] | null;
  streaming?: boolean;
  incomplete?: boolean;
}) {
  const isUser = role === 'USER';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('w-full max-w-4xl space-y-2', isUser && 'flex flex-col items-end')}>
        <div className={cn('flex items-center gap-2 text-xs text-on-surface-variant', isUser && 'justify-end')}>
          <span>{isUser ? 'You' : 'KnowledgeOS Copilot'}</span>
          {createdAt ? <span>{formatTime(createdAt)}</span> : null}
        </div>
        <div
          className={cn(
            'px-1 py-1 text-sm leading-7',
            isUser
              ? 'max-w-[720px] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-on-primary shadow-card'
              : 'w-full max-w-3xl text-on-surface',
          )}
        >
          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{content}</div>
          {streaming ? <TypingDots className="mt-2" /> : null}
        </div>
        {incomplete ? (
          <p className="text-xs font-medium text-warning" role="note">
            Incomplete response
          </p>
        ) : null}
        {!isUser && citations?.length ? <CitationChips citations={citations} /> : null}
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-7" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div key={index} className={cn('space-y-2', index % 2 === 1 && 'flex flex-col items-end')}>
          <div className="h-3 w-28 animate-pulse rounded bg-surface-container" />
          <div
            className={cn(
              'h-20 animate-pulse rounded-2xl bg-surface-container',
              index % 2 === 1 ? 'w-2/3' : 'w-3/4',
            )}
          />
        </div>
      ))}
    </div>
  );
}

function sessionLoadFailure(error: unknown): ChatFailure {
  if (error instanceof ApiRequestError) {
    if (error.isNetworkError) {
      return failureForCode('network', { phase: 'pre-stream' });
    }
    return failureForStatus(error.httpStatus ?? 0);
  }
  return toChatFailure(error);
}

export default function ChatPage() {
  const { sessionId: sessionIdParam } = useParams();
  const parsedSessionId = sessionIdParam === undefined ? null : Number(sessionIdParam);
  const invalidSessionParam =
    sessionIdParam !== undefined && (parsedSessionId === null || !Number.isFinite(parsedSessionId));
  const sessionId = invalidSessionParam ? null : parsedSessionId;

  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, allowNextNavigation } = useChatActivity();
  const logout = useAuthStore((state) => state.logout);

  const [message, setMessage] = React.useState('');
  const [turn, setTurn] = React.useState<Turn | null>(null);
  const turnRef = React.useRef<Turn | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const [userScrolledUp, setUserScrolledUp] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isStreaming = turn?.status === 'pending' || turn?.status === 'streaming';

  const updateTurn = React.useCallback((updater: (previous: Turn | null) => Turn | null) => {
    const next = updater(turnRef.current);
    turnRef.current = next;
    setTurn(next);
  }, []);

  const sessionQuery = useQuery({
    queryKey: ['chat', 'session', sessionId],
    queryFn: () => chatApi.getSession(sessionId as number),
    enabled: sessionId !== null,
    retry: (failureCount, error) => {
      if (
        error instanceof ApiRequestError &&
        error.httpStatus !== undefined &&
        [401, 403, 404].includes(error.httpStatus)
      ) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const messages: ChatMessage[] = React.useMemo(
    () => sessionQuery.data?.messages ?? [],
    [sessionQuery.data],
  );

  const stopGenerating = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // A route change guard aborts before unmount, but never leave a request running
  // if this component is removed for any other reason.
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    register({ streaming: isStreaming, stop: stopGenerating });
    return () => register(null);
  }, [isStreaming, register, stopGenerating]);

  // Once the persisted assistant message is available, let the database copy take over.
  React.useEffect(() => {
    const current = turn;
    if (!current || current.status !== 'done') return;
    if (current.assistantMessageId !== null && messages.some((item) => item.id === current.assistantMessageId)) {
      updateTurn(() => null);
    }
  }, [messages, turn, updateTurn]);

  // Leaving the conversation resets any local (unsaved) turn state.
  React.useEffect(() => {
    const current = turnRef.current;
    if (!current) return;
    if (current.sessionId !== null && current.sessionId !== sessionId) {
      abortRef.current?.abort();
      abortRef.current = null;
      updateTurn(() => null);
    }
  }, [sessionId, updateTurn]);

  // "New chat" while already on the draft page must clear the previous draft turn.
  React.useEffect(() => {
    const state = location.state as { newChatAt?: number } | null;
    if (!state?.newChatAt) return;
    const current = turnRef.current;
    if (current && (current.status === 'pending' || current.status === 'streaming')) {
      // Explicit "New chat" (guard confirmed) still aborts and resets.
      abortRef.current?.abort();
      abortRef.current = null;
    }
    updateTurn(() => null);
    setMessage('');
  }, [location.key, location.state, updateTurn]);

  React.useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    const onScroll = () => {
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      setUserScrolledUp(distanceFromBottom > 120);
    };
    element.addEventListener('scroll', onScroll);
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    if (userScrolledUp) return;
    endRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages.length, turn?.content.length, turn?.status, userScrolledUp]);

  React.useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [message]);

  React.useEffect(() => {
    if (sessionId === null) {
      textareaRef.current?.focus();
    }
  }, [sessionId]);

  const invalidateSession = (id: number | null) => {
    void queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    if (id !== null) {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'session', id] });
    }
  };

  const startTurn = async (
    prompt: string,
    options: { sessionId: number | null; userMessageId: number | null },
    force = false,
  ) => {
    const active = turnRef.current;
    if (!force && active && (active.status === 'pending' || active.status === 'streaming')) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setUserScrolledUp(false);
    updateTurn(() => ({
      prompt,
      sessionId: options.sessionId,
      userMessageId: options.userMessageId,
      assistantMessageId: null,
      content: '',
      citations: [],
      status: 'pending',
      failure: null,
    }));

    const routeWasDraft = sessionId === null;

    try {
      const done = await chatApi.streamMessage(
        {
          sessionId: options.sessionId,
          message: prompt,
          userMessageId: options.userMessageId,
        },
        {
          onMeta: (meta) => {
            updateTurn((previous) =>
              previous
                ? {
                    ...previous,
                    sessionId: meta.sessionId,
                    userMessageId: meta.userMessageId > 0 ? meta.userMessageId : null,
                    status: 'streaming',
                  }
                : previous,
            );
            if (routeWasDraft) {
              // Surface the new conversation in the sidebar immediately, not only
              // after the answer finishes.
              void queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
              allowNextNavigation(() => navigate(`/chat/${meta.sessionId}`, { replace: true }));
            }
          },
          onContent: (chunk) => {
            updateTurn((previous) =>
              previous
                ? { ...previous, content: previous.content + chunk, status: 'streaming' }
                : previous,
            );
          },
          onCitations: (citations) => {
            updateTurn((previous) => (previous ? { ...previous, citations } : previous));
          },
        },
        controller.signal,
      );

      updateTurn((previous) =>
        previous
          ? {
              ...previous,
              sessionId: done.sessionId,
              assistantMessageId: done.messageId > 0 ? done.messageId : null,
              status: 'done',
            }
          : previous,
      );
      invalidateSession(done.sessionId);
    } catch (error) {
      const current = turnRef.current;
      if (isAbortError(error)) {
        updateTurn((previous) =>
          previous
            ? {
                ...previous,
                status: 'stopped',
                failure: failureForCode('stopped', {
                  phase: 'in-stream',
                  sessionId: previous.sessionId,
                  userMessageId: previous.userMessageId,
                }),
              }
            : previous,
        );
        invalidateSession(current?.sessionId ?? null);
        return;
      }

      const failure = toChatFailure(error, {
        sessionId: current?.sessionId ?? options.sessionId,
        userMessageId: current?.userMessageId ?? options.userMessageId,
        phase: error instanceof ChatStreamError ? undefined : 'pre-stream',
      });
      const failureSessionId = failure.sessionId ?? current?.sessionId ?? options.sessionId;
      const failureUserMessageId = failure.userMessageId ?? current?.userMessageId ?? null;

      // Commit the failure synchronously so the navigation below cannot mistake it
      // for a turn belonging to a different conversation.
      const failedTurn: Turn = {
        prompt,
        sessionId: failureSessionId,
        userMessageId: failureUserMessageId,
        assistantMessageId: null,
        content: current?.content ?? '',
        citations: current?.citations ?? [],
        status: 'failed',
        failure,
      };
      updateTurn(() => failedTurn);

      if (failureSessionId !== null) {
        invalidateSession(failureSessionId);
        if (routeWasDraft) {
          allowNextNavigation(() => navigate(`/chat/${failureSessionId}`, { replace: true }));
        }
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const submit = () => {
    const text = message.trim();
    if (!text || isStreaming || text.length > MAX_MESSAGE_LENGTH) return;
    setMessage('');
    void startTurn(text, { sessionId, userMessageId: null });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const retry = () => {
    const current = turnRef.current;
    if (!current) return;
    void startTurn(current.prompt, { sessionId: current.sessionId, userMessageId: current.userMessageId }, true);
  };

  const dismissError = () => {
    const current = turnRef.current;
    if (!current) return;
    if (current.userMessageId === null) {
      // The prompt was never persisted (failure before streaming started), so
      // dismissing also removes the local-only bubble.
      updateTurn(() => null);
      return;
    }
    // Keep the persisted user message visible but drop the local error state.
    updateTurn((previous) => (previous ? { ...previous, failure: null } : previous));
    invalidateSession(current.sessionId);
  };

  const goToNewChat = () => {
    navigate('/chat', { state: { newChatAt: Date.now() } });
  };

  const signIn = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const turnUserId = turn?.userMessageId ?? null;
  const turnAssistantId = turn?.assistantMessageId ?? null;
  const visibleMessages = messages.filter(
    (item) => item.id !== turnUserId && item.id !== turnAssistantId,
  );
  const showEmptyState =
    !turn && visibleMessages.length === 0 && !sessionQuery.isLoading && !sessionQuery.isError;

  if (invalidSessionParam || (sessionQuery.isError && !turn)) {
    const failure = invalidSessionParam
      ? failureForCode('not_found', { phase: 'pre-stream' })
      : sessionLoadFailure(sessionQuery.error);
    return (
      <div
        role="alert"
        className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 px-5 text-center"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-error-container">
          <AlertTriangle className="h-5 w-5 text-on-error-container" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-on-surface">Conversation unavailable</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{failure.message}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={goToNewChat}>
            New chat
          </Button>
          {!invalidSessionParam ? (
            <Button size="sm" variant="ghost" onClick={() => void sessionQuery.refetch()}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const messageLength = message.trim().length;
  const messageTooLong = messageLength > MAX_MESSAGE_LENGTH;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="sr-only" role="status" aria-live="polite">
        {isStreaming ? 'Generating a response' : turn?.status === 'done' ? 'Response complete' : ''}
      </p>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-8 lg:px-6">
        {sessionQuery.isLoading && !turn ? (
          <ChatSkeleton />
        ) : showEmptyState ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-2 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-on-surface">Ask your knowledge base</h2>
            <p className="mt-1 max-w-md text-sm text-on-surface-variant">
              Get grounded answers from your organization&apos;s documents, with citations.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setMessage(suggestion);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-full border border-outline-variant/70 bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {visibleMessages.map((item) => (
              <Bubble
                key={item.id}
                role={item.role === 'USER' ? 'USER' : 'ASSISTANT'}
                content={item.content}
                createdAt={item.createdAt}
                citations={item.citations}
              />
            ))}

            {turn ? (
              <>
                <Bubble role="USER" content={turn.prompt} />
                {turn.content.length > 0 ? (
                  <Bubble
                    role="ASSISTANT"
                    content={turn.content}
                    citations={turn.citations}
                    streaming={turn.status === 'streaming' || turn.status === 'pending'}
                    incomplete={turn.status === 'failed' || turn.status === 'stopped'}
                  />
                ) : turn.status === 'pending' || turn.status === 'streaming' ? (
                  <div className="flex justify-start">
                    <div className="space-y-2">
                      <div className="text-xs text-on-surface-variant">KnowledgeOS Copilot</div>
                      <div className="rounded-2xl rounded-tl-sm border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 shadow-card">
                        <TypingDots />
                      </div>
                    </div>
                  </div>
                ) : null}

                {turn.failure ? (
                  <ChatErrorCard
                    failure={turn.failure}
                    partial={turn.status === 'failed' && turn.content.length > 0}
                    onRetry={turn.failure.retryable ? retry : undefined}
                    onDismiss={turn.failure.code === 'auth' ? undefined : dismissError}
                    onSignIn={signIn}
                  />
                ) : null}
              </>
            ) : null}

            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-outline-variant/40 bg-surface-container-lowest/95 p-3 backdrop-blur">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="flex flex-1 items-end rounded-2xl border border-outline-variant/70 bg-surface-container-lowest px-3 py-1.5 shadow-card focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              ref={textareaRef}
              rows={1}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              aria-label="Message"
              className="max-h-40 w-full resize-none bg-transparent py-1 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
            />
          </div>
          {isStreaming ? (
            <Button type="button" size="icon" variant="outline" onClick={stopGenerating} title="Stop generating" aria-label="Stop generating">
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || messageTooLong}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
        {messageLength > MAX_MESSAGE_LENGTH * 0.9 ? (
          <p
            className={cn(
              'mx-auto mt-1 max-w-3xl text-right text-[11px]',
              messageTooLong ? 'font-medium text-danger' : 'text-on-surface-variant/70',
            )}
            aria-live="polite"
          >
            {messageTooLong
              ? `Message is too long (${messageLength}/${MAX_MESSAGE_LENGTH} characters).`
              : `${messageLength}/${MAX_MESSAGE_LENGTH}`}
          </p>
        ) : (
          <p className="mt-1 text-center text-[11px] text-on-surface-variant/70">
            Answers are grounded in your organization&apos;s processed documents.
          </p>
        )}
      </div>
    </div>
  );
}
