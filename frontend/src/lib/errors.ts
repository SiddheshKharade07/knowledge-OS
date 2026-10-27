/**
 * User-facing error model for chat failures.
 *
 * Every message rendered in the UI goes through this module so raw provider
 * payloads, stack traces, SQL errors, keys and tokens can never reach the user.
 */

export type ChatFailurePhase = 'pre-stream' | 'in-stream';

export interface ChatFailure {
  code: string;
  message: string;
  retryable: boolean;
  phase: ChatFailurePhase;
  httpStatus?: number;
  sessionId?: number | null;
  userMessageId?: number | null;
}

export const CHAT_ERROR_MESSAGES = {
  network: 'Unable to connect to KnowledgeOS. Check your internet connection and try again.',
  auth: 'Your session has expired. Please sign in again.',
  forbidden: 'You do not have access to this conversation.',
  notFound: 'This conversation could not be found. It may have been deleted.',
  rateLimited: 'The AI service is temporarily rate-limited. Please try again shortly.',
  providerUnavailable:
    'The AI service is temporarily unavailable. Your conversation has been preserved. Please try again.',
  timeout: 'The response took too long to generate. Please try again.',
  generationFailed: 'Something went wrong while generating the response. Please try again.',
  interrupted: 'The response was interrupted before completion. You can retry your message.',
  emptyResponse: 'The AI service returned an empty response. Please try again.',
  retrievalFailed: 'KnowledgeOS could not search your documents right now. Please try again.',
  busy: 'KnowledgeOS is handling too many responses right now. Please try again in a moment.',
  unexpected:
    'Something went wrong. Please try again. If the problem continues, contact your administrator.',
  stopped: 'Generation stopped. The response may be incomplete.',
} as const;

/** Errors that must never be shown verbatim even if a server sends them. */
const UNSAFE_PATTERN =
  /(exception|stack ?trace|sqlexception|psqlexception|select .* from|insert into|bearer |api[_-]?key|secret|token|password|at [\w.$]+\([\w.]+:\d+\))/i;

function safeServerMessage(message?: string | null): string | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 240) return null;
  if (UNSAFE_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function failureForCode(
  code: string,
  options: {
    message?: string | null;
    phase: ChatFailurePhase;
    httpStatus?: number;
    sessionId?: number | null;
    userMessageId?: number | null;
  },
): ChatFailure {
  const base = {
    code,
    phase: options.phase,
    httpStatus: options.httpStatus,
    sessionId: options.sessionId ?? null,
    userMessageId: options.userMessageId ?? null,
  };

  switch (code) {
    case 'network':
      return { ...base, message: CHAT_ERROR_MESSAGES.network, retryable: true };
    case 'auth':
    case 'unauthorized':
      return { ...base, message: CHAT_ERROR_MESSAGES.auth, retryable: false };
    case 'forbidden':
    case 'access_denied':
      return { ...base, message: CHAT_ERROR_MESSAGES.forbidden, retryable: false };
    case 'session_not_found':
    case 'not_found':
      return { ...base, message: CHAT_ERROR_MESSAGES.notFound, retryable: false };
    case 'rate_limited':
      return { ...base, message: CHAT_ERROR_MESSAGES.rateLimited, retryable: true };
    case 'provider_unavailable':
      return { ...base, message: CHAT_ERROR_MESSAGES.providerUnavailable, retryable: true };
    case 'timeout':
      return { ...base, message: CHAT_ERROR_MESSAGES.timeout, retryable: true };
    case 'empty_response':
      return { ...base, message: CHAT_ERROR_MESSAGES.emptyResponse, retryable: true };
    case 'retrieval_failed':
      return { ...base, message: CHAT_ERROR_MESSAGES.retrievalFailed, retryable: true };
    case 'service_busy':
      return { ...base, message: CHAT_ERROR_MESSAGES.busy, retryable: true };
    case 'interrupted':
      return { ...base, message: CHAT_ERROR_MESSAGES.interrupted, retryable: true };
    case 'generation_failed':
      return { ...base, message: CHAT_ERROR_MESSAGES.generationFailed, retryable: true };
    case 'invalid_request': {
      const serverMessage = safeServerMessage(options.message);
      return {
        ...base,
        message: serverMessage ?? 'The message could not be processed. Please try again.',
        retryable: false,
      };
    }
    case 'stopped':
      return { ...base, message: CHAT_ERROR_MESSAGES.stopped, retryable: true };
    default:
      return { ...base, message: CHAT_ERROR_MESSAGES.unexpected, retryable: true };
  }
}

export function failureForStatus(
  status: number,
  options: { message?: string | null; sessionId?: number | null; userMessageId?: number | null } = {},
): ChatFailure {
  const base = {
    httpStatus: status,
    phase: 'pre-stream' as const,
    sessionId: options.sessionId ?? null,
    userMessageId: options.userMessageId ?? null,
  };

  if (status === 401) {
    return { ...base, code: 'auth', message: CHAT_ERROR_MESSAGES.auth, retryable: false };
  }
  if (status === 403) {
    return { ...base, code: 'forbidden', message: CHAT_ERROR_MESSAGES.forbidden, retryable: false };
  }
  if (status === 404) {
    return { ...base, code: 'not_found', message: CHAT_ERROR_MESSAGES.notFound, retryable: false };
  }
  if (status === 408 || status === 504) {
    return { ...base, code: 'timeout', message: CHAT_ERROR_MESSAGES.timeout, retryable: true };
  }
  if (status === 429) {
    return { ...base, code: 'rate_limited', message: CHAT_ERROR_MESSAGES.rateLimited, retryable: true };
  }
  if (status === 502 || status === 503) {
    return {
      ...base,
      code: 'provider_unavailable',
      message: CHAT_ERROR_MESSAGES.providerUnavailable,
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      ...base,
      code: 'unexpected',
      message: CHAT_ERROR_MESSAGES.unexpected,
      retryable: true,
    };
  }
  if (status === 400 || status === 422) {
    const serverMessage = safeServerMessage(options.message);
    return {
      ...base,
      code: 'invalid_request',
      message: serverMessage ?? 'The message could not be processed. Please try again.',
      retryable: false,
    };
  }
  return {
    ...base,
    code: 'unexpected',
    message: CHAT_ERROR_MESSAGES.unexpected,
    retryable: true,
  };
}

/** Error thrown by the streaming client. */
export class ChatStreamError extends Error {
  readonly failure: ChatFailure;

  constructor(failure: ChatFailure) {
    super(failure.message);
    this.name = 'ChatStreamError';
    this.failure = failure;
  }

  get code(): string {
    return this.failure.code;
  }

  get retryable(): boolean {
    return this.failure.retryable;
  }

  get phase(): ChatFailurePhase {
    return this.failure.phase;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : (error as { name?: string } | null)?.name === 'AbortError';
}

export function toChatFailure(
  error: unknown,
  fallback: { sessionId?: number | null; userMessageId?: number | null; phase?: ChatFailurePhase } = {},
): ChatFailure {
  if (error instanceof ChatStreamError) {
    return error.failure;
  }

  const maybe = error as { name?: string; message?: string; code?: string } | null;

  if (maybe?.name === 'AbortError') {
    return failureForCode('stopped', {
      phase: fallback.phase ?? 'in-stream',
      sessionId: fallback.sessionId,
      userMessageId: fallback.userMessageId,
    });
  }

  if (
    maybe?.name === 'TypeError' ||
    maybe?.code === 'ERR_NETWORK' ||
    (maybe?.message ? /network error|failed to fetch|load failed/i.test(maybe.message) : false)
  ) {
    return failureForCode('network', {
      phase: fallback.phase ?? 'pre-stream',
      sessionId: fallback.sessionId,
      userMessageId: fallback.userMessageId,
    });
  }

  return failureForCode('unexpected', {
    phase: fallback.phase ?? 'pre-stream',
    sessionId: fallback.sessionId,
    userMessageId: fallback.userMessageId,
  });
}
