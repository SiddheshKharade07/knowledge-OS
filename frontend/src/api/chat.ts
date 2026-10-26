import { http } from './client';
import type { ChatMessageResponse, ChatSession, SendChatMessageRequest } from './types';

export type SendChatMessagePayload = {
  sessionId?: number | null;
  message: string;
};

export const chatApi = {
  listSessions: async (): Promise<ChatSession[]> => {
    const res = await http.get<ChatSession[]>('/v1/chat/sessions');
    return res.data;
  },
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
  renameSessionPut: async (sessionId: number, title: string): Promise<ChatSession> => {
    const res = await http.put<ChatSession>(`/v1/chat/sessions/${sessionId}`, { title });
    return res.data;
  },
  deleteSession: async (sessionId: number): Promise<void> => {
    await http.delete(`/v1/chat/sessions/${sessionId}`);
  },
  sendMessage: async (payload: SendChatMessagePayload): Promise<ChatMessageResponse> => {
    const body: SendChatMessageRequest = {
      sessionId: payload.sessionId ?? null,
      message: payload.message,
    };
    const res = await http.post<ChatMessageResponse>('/v1/chat/messages', body);
    return res.data;
  },
  streamMessage: async (
    payload: SendChatMessagePayload,
    handlers: {
      onMeta?: (data: any) => void;
      onContent?: (chunk: string) => void;
      onCitations?: (citations: any[]) => void;
      onDone?: (data: any) => void;
      onError?: (err: string) => void;
    },
    signal?: AbortSignal,
  ) => {
    const body: SendChatMessageRequest = {
      sessionId: payload.sessionId ?? null,
      message: payload.message,
    };
    const token = localStorage.getItem('knowledgeos.token');
    const res = await fetch((import.meta.env.VITE_API_BASE_URL ?? '/api') + '/v1/chat/messages/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      let message = res.status === 401 ? 'Your session has expired. Please sign in again.' : 'Failed to start stream';
      try {
        const payload = await res.json();
        if (payload?.message) message = payload.message;
      } catch {
        // Response was not JSON; keep the default message.
      }
      throw new Error(message);
    }
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('No stream reader');
    }
    const decoder = new TextDecoder();
    let buffer = '';

    const dispatch = (raw: string) => {
      const lines = raw.split('\n');
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (dataLines.length === 0) return;
      // Per the SSE spec multiple data lines are joined with a newline.
      const dataLine = dataLines.join('\n');
      try {
        const parsed = JSON.parse(dataLine);
        if (event === 'meta' && handlers.onMeta) handlers.onMeta(parsed);
        else if (event === 'content' && handlers.onContent) {
          if (typeof parsed === 'string') handlers.onContent(parsed);
          else if (typeof parsed?.content === 'string') handlers.onContent(parsed.content);
        } else if (event === 'citations' && handlers.onCitations) {
          if (Array.isArray(parsed)) handlers.onCitations(parsed);
          else if (Array.isArray(parsed?.citations)) handlers.onCitations(parsed.citations);
        } else if (event === 'done' && handlers.onDone) handlers.onDone(parsed);
        else if (event === 'error' && handlers.onError) handlers.onError(typeof parsed === 'string' ? parsed : parsed?.message || 'Stream error');
      } catch {
        if (event === 'content' && handlers.onContent) handlers.onContent(dataLine);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        dispatch(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    }
    if (buffer.trim()) {
      dispatch(buffer);
    }
  },
  sendMessageAlt: async (payload: SendChatMessagePayload): Promise<ChatMessageResponse> => {
    const body: SendChatMessageRequest = {
      sessionId: payload.sessionId ?? null,
      message: payload.message,
    };
    const res = await http.post<ChatMessageResponse>('/v1/chat/query', body);
    return res.data;
  },
};
