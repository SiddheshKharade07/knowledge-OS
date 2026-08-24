package com.example.KnowledgeOS.exception;

public class RagPipelineException extends RuntimeException {
    public RagPipelineException(String message) {
        super(message);
    }

    public RagPipelineException(String message, Throwable cause) {
        super(message, cause);
    }
}
