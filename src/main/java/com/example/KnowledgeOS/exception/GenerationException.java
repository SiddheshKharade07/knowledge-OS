package com.example.KnowledgeOS.exception;

/**
 * Raised when the LLM provider fails to produce a usable answer. The message is
 * intentionally safe for end users: provider payloads, URLs and credentials must
 * never leak into API responses.
 */
public class GenerationException extends RuntimeException {

    public GenerationException(String message) {
        super(message);
    }

    public GenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
