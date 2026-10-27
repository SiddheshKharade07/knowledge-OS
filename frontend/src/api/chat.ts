import { http, API_BASE_URL } from './client';
import type { ChatMessageResponse, ChatSession, Citation, SendChatMessageRequest } from './types';
import {
  ChatStreamError,
  isAbortError,
  failureForCode,
  failureForStatus,
  toChatFailure,
  type ChatFailure,
} from '../lib/errors';

export type SendChatMessagePayload = {
  sessionId?: number | null;
  message: string;
  /** Set when retrying a failed generation for an already persisted user message. */
  userMessageId?: number | null;
};

export type StreamMeta = {
  sessionId: number;
  userMessageId: number;
  title?: string | null;
};

export type StreamDone = {
  messageId: number;
  sessionId: number;
  title?: string | null;
};

export type StreamHandlers = {
  onMeta?: (meta: StreamMeta) => void;
  onContent?: (chunk: string) => void;
  onCitations?: (citations: Citation[]) => void;
  onDone?: (done: StreamDone) => void;
};

type SseMessage = { event: string; data: string };

type DispatchResult =
  | { type: 'continue' }
  | { type: 'done'; done: StreamDone }
  | { type: 'error'; failure: ChatFailure };

/**
 * Parses a raw SSE block into event/data fields. Comment lines (`:`) and
 * unknown fields are ignored, as required by the SSE spec.
 */
function parseSseBlock(block: string): SseMessage | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export const chatApi = {
  listSessions: async (): Promise<ChatSession[]> => {
    const res = await http.get<ChatSession[]>('/v1/chat/sessions');
    return res.data;
  },
  /**
   * Creates (or reuses) a draft session. The UI no longer calls this when the
   * user clicks "New chat": a conversation is created lazily on first message.
   */
  createSession: async (): Promise<ChatSession> => {
    const res = await http.post<ChatSession>('/v1/chat/sessions');
    return res.data;
  },
  getSession: async (sessionId: number): Promise<ChatSession> => {
    const res = await http.get<ChatSession>(`/v1/chat/sessions/${sessionId}`);
    return res.data;
  },
  renameSession: async (sessionId: number, title: string): Promise<ChatSession> => {
    const res = await http.patch<ChatSession>(`/v1/chat/sessions/${sessionId}`, { title });
    return res.data;
  },
  deleteSession: async (sessionId: number): Promise<void> => {
    await http.delete(`/v1/chat/sessions/${sessionId}`);
  },
  sendMessage: async (payload: SendChatMessagePayload): Promise<ChatMessageResponse> => {
    const body: SendChatMessageRequest = {
      sessionId: payload.sessionId ?? null,
      message: payload.message,
      userMessageId: payload.userMessageId ?? null,
    };
    const res = await http.post<ChatMessageResponse>('/v1/chat/messages', body);
    return res.data;
  },
  /**
   * Streams an assistant answer.
   *
   * Resolves only when the server sent the terminal `done` event. Any other
   * outcome (HTTP error, SSE `error` event, premature EOF, network failure)
   * rejects with a {@link ChatStreamError} carrying a safe, user-facing message.
   * An explicit user abort rejects with the original AbortError.
   */
  streamMessage: async (
    payload: SendChatMessagePayload,
    handlers: StreamHandlers,
    signal?: AbortSignal,
  ): Promise<StreamDone> => {
    const body: SendChatMessageRequest = {
      sessionId: payload.sessionId ?? null,
      message: payload.message,
      userMessageId: payload.userMessageId ?? null,
    };

    const token = localStorage.getItem('knowledgeos.token');
    const failureContext = {
      sessionId: payload.sessionId ?? null,
      userMessageId: payload.userMessageId ?? null,
    };

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/v1/chat/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ChatStreamError(toChatFailure(error, { ...failureContext, phase: 'pre-stream' }));
    }

    if (!res.ok) {
      let serverMessage: string | null = null;
      try {
        const parsed = (await res.json()) as { message?: string };
        serverMessage = parsed?.message ?? null;
      } catch {
        // Body was not JSON; the status code is what matters.
      }
      throw new ChatStreamError(failureForStatus(res.status, { message: serverMessage, ...failureContext }));
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new ChatStreamError(failureForCode('interrupted', { ...failureContext, phase: 'pre-stream' }));
    }

    const decoder = new TextDecoder();
    let buffer = '';

    const invoke = (fn: (() => void) | undefined) => {
      if (!fn) return;
      try {
        fn();
      } catch (error) {
        // A rendering bug in a handler must not corrupt the stream protocol.
        console.error('Chat stream handler failed', error);
      }
    };

    const dispatch = (block: string): DispatchResult => {
      const message = parseSseBlock(block);
      if (!message) return { type: 'continue' };
      const parsed = safeJsonParse(message.data);

      switch (message.event) {
        case 'meta': {
          const data = parsed as Partial<StreamMeta> | null;
          if (data && typeof data === 'object' && typeof data.sessionId === 'number') {
            const meta: StreamMeta = {
              sessionId: data.sessionId,
              userMessageId: typeof data.userMessageId === 'number' ? data.userMessageId : -1,
              title: data.title ?? null,
            };
            invoke(() => handlers.onMeta?.(meta));
          }
          return { type: 'continue' };
        }
        case 'content': {
          if (typeof parsed === 'string') {
            invoke(() => handlers.onContent?.(parsed));
          } else if (parsed && typeof parsed === 'object') {
            const content = (parsed as { content?: unknown }).content;
            if (typeof content === 'string') {
              invoke(() => handlers.onContent?.(content));
            }
          }
          return { type: 'continue' };
        }
        case 'citations': {
          const list = Array.isArray(parsed)
            ? (parsed as Citation[])
            : Array.isArray((parsed as { citations?: unknown })?.citations)
              ? ((parsed as { citations: Citation[] }).citations)
              : [];
          invoke(() => handlers.onCitations?.(list));
          return { type: 'continue' };
        }
        case 'done': {
          const data = parsed as Partial<StreamDone> | null;
          if (!data || typeof data !== 'object' || typeof data.sessionId !== 'number') {
            return {
              type: 'error',
              failure: failureForCode('interrupted', { ...failureContext, phase: 'in-stream' }),
            };
          }
          const done: StreamDone = {
            messageId: typeof data.messageId === 'number' ? data.messageId : -1,
            sessionId: data.sessionId,
            title: data.title ?? null,
          };
          invoke(() => handlers.onDone?.(done));
          return { type: 'done', done };
        }
        case 'error': {
          const data = (parsed ?? {}) as {
            code?: string;
            message?: string;
            retryable?: boolean;
            sessionId?: number;
          };
          return {
            type: 'error',
            failure: failureForCode(data.code ?? 'generation_failed', {
              message: data.message,
              phase: 'in-stream',
              sessionId: data.sessionId ?? payload.sessionId ?? null,
              userMessageId: payload.userMessageId ?? null,
            }),
          };
        }
        default:
          return { type: 'continue' };
      }
    };

    try {
      for (;;) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');

        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const result = dispatch(block);
          if (result.type === 'done') {
            await reader.cancel().catch(() => undefined);
            return result.done;
          }
          if (result.type === 'error') {
            await reader.cancel().catch(() => undefined);
            throw new ChatStreamError(result.failure);
          }
          boundary = buffer.indexOf('\n\n');
        }
      }

      // Some servers omit the final blank line before closing the stream.
      if (buffer.trim()) {
        const result = dispatch(buffer);
        if (result.type === 'done') return result.done;
        if (result.type === 'error') throw new ChatStreamError(result.failure);
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (error instanceof ChatStreamError) throw error;
      throw new ChatStreamError(toChatFailure(error, { ...failureContext, phase: 'in-stream' }));
    }

    // A normal network EOF is *not* success: the protocol requires `done`.
    throw new ChatStreamError(failureForCode('interrupted', { ...failureContext, phase: 'in-stream' }));
  },
};
