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
  sendMessageAlt: async (payload: SendChatMessagePayload): Promise<ChatMessageResponse> => {
    const body: SendChatMessageRequest = {
      sessionId: payload.sessionId ?? null,
      message: payload.message,
    };
    const res = await http.post<ChatMessageResponse>('/v1/chat/query', body);
    return res.data;
  },
};
