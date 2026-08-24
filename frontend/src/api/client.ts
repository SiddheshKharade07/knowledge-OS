import axios from 'axios';
import type { ApiErrorPayload } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiRequestError extends Error {
  readonly status?: number;
  readonly payload?: ApiErrorPayload;

  constructor(message: string, status?: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }

  get isNetworkError(): boolean {
    return this.status === undefined;
  }
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const payload = error.response.data as ApiErrorPayload | undefined;
        throw new ApiRequestError(
          payload?.message ?? error.message,
          error.response.status,
          payload,
        );
      }
      throw new ApiRequestError(
        'Cannot reach the KnowledgeOS backend. Make sure the API is running.',
      );
    }
    throw error;
  },
);
