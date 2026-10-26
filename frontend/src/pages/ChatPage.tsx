import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, FileText, PanelLeftClose, PanelLeftOpen, Plus, Send, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatApi } from '../api/chat';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { cn, formatTime } from '../lib/utils';
import { toast } from 'sonner';
import type { ChatMessage } from '../api/types';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-surface-container-lowest px-3 py-2 shadow-card">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant" />
    </div>
  );
}

const CHAT_HISTORY_KEY = 'knowledgeos.chat.history';

export default function ChatPage() {
  const { sessionId: sessionIdParam } = useParams();
  const sessionId = sessionIdParam ? Number(sessionIdParam) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState('');
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = React.useState(false);
  const [historyCollapsed, setHistoryCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(CHAT_HISTORY_KEY) === 'collapsed';
    } catch {
      return false;
    }
  });
  const endRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [userScrolledUp, setUserScrolledUp] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, historyCollapsed ? 'collapsed' : 'expanded');
    } catch {
      // ignore
    }
  }, [historyCollapsed]);

  const sessionsQuery = useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: chatApi.listSessions,
  });

  const sessionQuery = useQuery({
    queryKey: ['chat', 'session', sessionId],
    queryFn: () => chatApi.getSession(sessionId as number),
    enabled: sessionId !== null && !Number.isNaN(sessionId),
  });

  const createSession = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      navigate(`/chat/${session.id}`);
      setSessionsOpen(false);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create chat'),
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => chatApi.deleteSession(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      if (sessionId === id) {
        navigate('/chat');
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete chat'),
  });

  const [streaming, setStreaming] = React.useState(false);
  const [streamContent, setStreamContent] = React.useState('');
  const [streamCitations, setStreamCitations] = React.useState<any[]>([]);
  const [streamError, setStreamError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const streamSessionRef = React.useRef<number | null>(null);

  const sendMessage = useMutation({
    mutationFn: async (payload: string) => {
      setPendingMessage(payload);
      setMessage('');
      setUserScrolledUp(false);
      setStreaming(true);
      setStreamContent('');
      setStreamCitations([]);
      setStreamError(null);
      streamSessionRef.current = sessionId;
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        await chatApi.streamMessage(
          { sessionId, message: payload },
          {
            onMeta: (data) => {
              if (data?.sessionId) {
                streamSessionRef.current = data.sessionId;
              }
            },
            onContent: (chunk) => {
              setStreamContent((prev) => prev + chunk);
            },
            onCitations: (citations) => {
              setStreamCitations(citations || []);
            },
            onDone: (data) => {
              setStreaming(false);
              setPendingMessage(null);
              setStreamContent('');
              setStreamCitations([]);
              setStreamError(null);
              queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
              if (data?.sessionId) {
                queryClient.invalidateQueries({ queryKey: ['chat', 'session', data.sessionId] });
                if (sessionId === null) {
                  navigate(`/chat/${data.sessionId}`, { replace: true });
                }
              }
              abortRef.current = null;
            },
            onError: (err) => {
              const message = err || 'Failed to send message';
              setStreaming(false);
              setStreamError(message);
              toast.error(message);
              if (streamSessionRef.current) {
                queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
                queryClient.invalidateQueries({ queryKey: ['chat', 'session', streamSessionRef.current] });
                if (sessionId === null) {
                  navigate(`/chat/${streamSessionRef.current}`, { replace: true });
                }
              }
              setPendingMessage(null);
              abortRef.current = null;
            },
          },
          controller.signal,
        );
      } catch (err: any) {
        const aborted = err?.name === 'AbortError';
        setStreaming(false);
        if (aborted) {
          setStreamError('Generation stopped.');
          if (streamSessionRef.current) {
            queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'session', streamSessionRef.current] });
            if (sessionId === null) {
              navigate(`/chat/${streamSessionRef.current}`, { replace: true });
            }
          }
          setPendingMessage(null);
        } else {
          const message = err?.message || 'Failed to send message';
          setStreamError(message);
          toast.error(message);
          if (streamSessionRef.current) {
            queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'session', streamSessionRef.current] });
            if (sessionId === null) {
              navigate(`/chat/${streamSessionRef.current}`, { replace: true });
            }
          }
          setPendingMessage(null);
        }
        abortRef.current = null;
        if (!aborted) throw err;
      }
    },
  });

  const stopGenerating = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };


  const messages: ChatMessage[] = React.useMemo(() => {
    const base = sessionQuery.data?.messages ?? [];
    return base;
  }, [sessionQuery.data]);

  React.useEffect(() => {
    if (userScrolledUp) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingMessage, streamContent, userScrolledUp]);

  React.useEffect(() => {
    const activeStreamSession = streamSessionRef.current;
    if (activeStreamSession !== null && sessionId !== activeStreamSession) {
      abortRef.current?.abort();
      abortRef.current = null;
      streamSessionRef.current = null;
      setStreaming(false);
      setStreamContent('');
      setStreamCitations([]);
      setStreamError(null);
      setPendingMessage(null);
    }
    if (sessionId === null) {
      setStreamContent('');
      setStreamError(null);
    }
  }, [sessionId]);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setUserScrolledUp(distanceFromBottom > 120);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const suggestions = [
    'Summarize key compliance requirements',
    'What documents cover security policies?',
    'Find onboarding procedures',
    'List recent vendor requirements',
  ];

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-3.5rem)]">
      <aside
        className={cn(
          'hidden flex-col border-r border-outline-variant/40 bg-surface-container-lowest lg:flex',
          historyCollapsed ? 'w-0 overflow-hidden' : 'w-72',
        )}
      >
        <div className="flex h-12 items-center justify-between px-3">
          <p className="text-sm font-medium text-on-surface">Chats</p>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => createSession.mutate()} disabled={createSession.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setHistoryCollapsed(true)} title="Collapse chat history">
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : sessionsQuery.data?.length ? (
            <div className="space-y-0.5">
              {sessionsQuery.data.map((s) => (
                <div key={s.id} className="group relative">
                  <button
                    onClick={() => navigate(`/chat/${s.id}`)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                      sessionId === s.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                    )}
                  >
                    <Bot className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{s.title || 'New chat'}</span>
                  </button>
                  <button
                    onClick={() => deleteSession.mutate(s.id)}
                    className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-on-surface-variant hover:bg-surface-container hover:text-error group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-on-surface-variant">No chats yet</p>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-3 py-1.5">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setSessionsOpen(true)} className="lg:hidden">
              <Bot className="h-4 w-4" />
              Sessions
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setHistoryCollapsed((v) => !v)}
              className="hidden lg:flex"
              title={historyCollapsed ? 'Expand chat history' : 'Collapse chat history'}
            >
              {historyCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          <Button size="sm" variant="primary" onClick={() => createSession.mutate()} disabled={createSession.isPending}>
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 py-6 lg:px-6">
          {messages.length === 0 && !pendingMessage ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-on-surface">Ask your knowledge base</h2>
              <p className="mt-1 max-w-md text-sm text-on-surface-variant">
                Get grounded answers from your organization's documents with citations.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setMessage(s);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-full border border-outline-variant/70 bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.role === 'USER' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] space-y-2', msg.role === 'USER' ? 'items-end' : 'items-start')}>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span>{msg.role === 'USER' ? 'You' : 'KnowledgeOS Copilot'}</span>
                      {msg.createdAt ? <span>{formatTime(msg.createdAt)}</span> : null}
                    </div>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-card',
                        msg.role === 'USER'
                          ? 'rounded-tr-sm bg-primary text-on-primary'
                          : 'rounded-tl-sm border border-outline-variant/40 bg-surface-container-lowest text-on-surface',
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'ASSISTANT' && Array.isArray(msg.citations) && msg.citations.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {msg.citations.slice(0, 6).map((c, idx) => (
                          <span
                            key={`${c.chunkId}-${idx}`}
                            className="inline-flex items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-container-low px-2 py-0.5 text-xs text-on-surface-variant"
                          >
                            <FileText className="h-3 w-3" />
                            [{idx + 1}] {c.documentName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {pendingMessage ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] space-y-2">
                    <div className="flex items-center justify-end gap-2 text-xs text-on-surface-variant">
                      <span>You</span>
                    </div>
                    <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-on-primary shadow-card">
                      <p className="whitespace-pre-wrap">{pendingMessage}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {(streaming && streamContent.length === 0) ? (
                <div className="flex justify-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span>KnowledgeOS Copilot</span>
                    </div>
                    <TypingIndicator />
                  </div>
                </div>
              ) : null}
              {streamContent.length > 0 ? (
                <div className="flex justify-start">
                  <div className="max-w-[85%] space-y-2">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span>KnowledgeOS Copilot</span>
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-surface-container-lowest px-4 py-3 text-sm text-on-surface shadow-card">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
                        {streamContent}
                      </div>
                      {streaming ? (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant" />
                        </div>
                      ) : null}
                    </div>
                    {streamCitations.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {streamCitations.slice(0, 6).map((c: any, idx: number) => (
                          <span
                            key={`${c.chunkId}-${idx}`}
                            className="inline-flex items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-container-low px-2 py-0.5 text-xs text-on-surface-variant"
                          >
                            <FileText className="h-3 w-3" />
                            [{idx + 1}] {c.documentName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {!streaming && streamError ? (
                      <p className="text-xs text-error">{streamError}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant/40 bg-surface-container-lowest/95 p-3 backdrop-blur">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="flex flex-1 items-end gap-2 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest px-3 py-1.5 shadow-card">
              <textarea
                ref={textareaRef}
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                className="max-h-40 w-full resize-none bg-transparent py-1 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
              />
            </div>
            <Button type="submit" size="icon" disabled={!message.trim() || streaming}>
              <Send className="h-4 w-4" />
            </Button>
            {streaming ? (
              <Button type="button" size="sm" variant="outline" onClick={stopGenerating} title="Stop generating">
                Stop
              </Button>
            ) : null}
          </form>
          <p className="mt-1 text-center text-[11px] text-on-surface-variant/70">
            Answers are grounded in your organization's processed documents.
          </p>
        </div>
      </div>

      {sessionsOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0f172a]/40" onClick={() => setSessionsOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-80 flex-col bg-surface-container-lowest shadow-modal">
            <div className="flex h-14 items-center justify-between px-3">
              <p className="text-sm font-medium text-on-surface">Chats</p>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  createSession.mutate();
                }}
                disabled={createSession.isPending}
              >
                <Plus className="h-4 w-4" />
                New chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {sessionsQuery.data?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    navigate(`/chat/${s.id}`);
                    setSessionsOpen(false);
                  }}
                  className={cn(
                    'mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                    sessionId === s.id ? 'bg-primary/10 text-primary' : 'text-on-surface-variant',
                  )}
                >
                  <Bot className="h-4 w-4" />
                  <span className="truncate">{s.title || 'New chat'}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
