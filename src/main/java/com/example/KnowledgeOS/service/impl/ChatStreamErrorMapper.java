package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.exception.GenerationException;
import com.example.KnowledgeOS.exception.RagPipelineException;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.Locale;
import java.util.concurrent.TimeoutException;

/**
 * Maps internal failures to a stable, user-safe SSE error contract.
 *
 * <p>The returned message is shown verbatim in the UI, so it must never contain
 * provider payloads, stack traces, SQL, tokens or infrastructure details.</p>
 */
public final class ChatStreamErrorMapper {

    public record StreamFailure(String code, String message, boolean retryable) {
    }

    private ChatStreamErrorMapper() {
    }

    public static StreamFailure map(Throwable failure) {
        Throwable root = unwrap(failure);

        if (root instanceof ResourceNotFoundException) {
            return new StreamFailure(
                    "session_not_found",
                    "This conversation could not be found. It may have been deleted.",
                    false);
        }

        if (root instanceof GenerationException) {
            if (containsAny(normalizedMessage(root), "empty")) {
                return new StreamFailure(
                        "empty_response",
                        "The AI service returned an empty response. Please try again.",
                        true);
            }
            return new StreamFailure(
                    "generation_failed",
                    "Something went wrong while generating the response. Please try again.",
                    true);
        }

        if (root instanceof RagPipelineException) {
            return new StreamFailure(
                    "retrieval_failed",
                    "KnowledgeOS could not search your documents right now. Please try again.",
                    true);
        }

        Integer status = httpStatus(root);
        if (status != null) {
            if (status == 401 || status == 403) {
                return new StreamFailure(
                        "provider_unavailable",
                        "The AI service is temporarily unavailable. Your conversation has been preserved. Please try again.",
                        true);
            }
            if (status == 429) {
                return new StreamFailure(
                        "rate_limited",
                        "The AI service is temporarily rate-limited. Please try again shortly.",
                        true);
            }
            if (status >= 500) {
                return new StreamFailure(
                        "provider_unavailable",
                        "The AI service is temporarily unavailable. Your conversation has been preserved. Please try again.",
                        true);
            }
        }

        String message = normalizedMessage(root);

        if (root instanceof TimeoutException
                || root instanceof SocketTimeoutException
                || containsAny(message, "timeout", "timed out", "time out")) {
            return new StreamFailure(
                    "timeout",
                    "The response took too long to generate. Please try again.",
                    true);
        }

        if (containsAny(message, "rate limit", "rate-limit", "quota", "too many requests")) {
            return new StreamFailure(
                    "rate_limited",
                    "The AI service is temporarily rate-limited. Please try again shortly.",
                    true);
        }

        if (root instanceof ConnectException
                || containsAny(message, "connection refused", "connection reset", "connect timed out",
                        "failed to connect", "no route to host", "unknown host")) {
            return new StreamFailure(
                    "provider_unavailable",
                    "The AI service is temporarily unavailable. Your conversation has been preserved. Please try again.",
                    true);
        }

        return new StreamFailure(
                "generation_failed",
                "Something went wrong while generating the response. Please try again.",
                true);
    }

    public static boolean isClientDisconnect(Throwable failure) {
        Throwable current = failure;
        while (current != null) {
            String className = current.getClass().getName();
            if ("org.apache.catalina.connector.ClientAbortException".equals(className)
                    || "org.springframework.web.context.request.async.AsyncRequestNotUsableException".equals(className)) {
                return true;
            }
            String message = normalizedMessage(current);
            if (containsAny(message, "broken pipe", "connection was aborted", "connection aborted",
                    "response not usable", "connection reset by peer", "stream closed")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static Throwable unwrap(Throwable failure) {
        Throwable current = failure;
        int guard = 0;
        while (current != null && current.getCause() != null && guard++ < 10) {
            current = current.getCause();
        }
        return current;
    }

    private static Integer httpStatus(Throwable failure) {
        Throwable current = failure;
        int guard = 0;
        while (current != null && guard++ < 10) {
            if (current instanceof WebClientResponseException webClientException) {
                return webClientException.getStatusCode().value();
            }
            if (current instanceof RestClientResponseException restClientException) {
                return restClientException.getStatusCode().value();
            }
            current = current.getCause();
        }
        return null;
    }

    private static String normalizedMessage(Throwable failure) {
        String message = failure.getMessage();
        return message == null ? "" : message.toLowerCase(Locale.ROOT);
    }

    private static boolean containsAny(String haystack, String... needles) {
        for (String needle : needles) {
            if (haystack.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
