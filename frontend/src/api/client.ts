import axios from 'axios';
import type { ApiErrorPayload } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiRequestError extends Error {
  readonly status?: string;
  readonly httpStatus?: number;
  readonly payload?: ApiErrorPayload;

  constructor(message: string, options: { status?: string; httpStatus?: number; payload?: ApiErrorPayload } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.httpStatus = options.httpStatus;
    this.payload = options.payload;
  }

  get isNetworkError(): boolean {
    return this.httpStatus === undefined;
  }
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('knowledgeos.token');
  if (token && typeof token === 'string') {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const payload = error.response.data as ApiErrorPayload | undefined;
        const message =
          payload?.message ??
          (Array.isArray(payload?.errors) ? payload.errors[0]?.message : undefined) ??
          error.message ??
          'Request failed';
        if (error.response.status === 401) {
          localStorage.removeItem('knowledgeos.token');
          localStorage.removeItem('knowledgeos.user');
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.replace('/login');
          }
        }
        const statusVal = typeof payload?.status === 'string' ? payload.status : String(error.response.status);
        throw new ApiRequestError(message, {
          status: String(statusVal),
          httpStatus: error.response.status,
          payload,
        });
      }
      throw new ApiRequestError('Cannot reach the KnowledgeOS backend. Make sure the API is running.');
    }
    throw error;
  },
);
