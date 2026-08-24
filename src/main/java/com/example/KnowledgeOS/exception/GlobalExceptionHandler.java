package com.example.KnowledgeOS.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public record ErrorResponse(int status, String error, String message, List<String> details, Instant timestamp) {
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleDocumentNotFound(DocumentNotFoundException e) {
        return build(HttpStatus.NOT_FOUND, e.getMessage(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        List<String> details = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return build(HttpStatus.BAD_REQUEST, "Request validation failed", details);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        return build(HttpStatus.BAD_REQUEST, e.getMessage(), List.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException e) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "Uploaded file exceeds the maximum allowed size", List.of());
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ErrorResponse> handleStorage(StorageException e) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Document storage or ingestion failed", List.of(e.getMessage()));
    }

    @ExceptionHandler(RagPipelineException.class)
    public ResponseEntity<ErrorResponse> handlePipeline(RagPipelineException e) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "RAG pipeline failed", List.of(e.getMessage()));
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message, List<String> details) {
        return ResponseEntity.status(status)
                .body(new ErrorResponse(status.value(), status.getReasonPhrase(), message, details, Instant.now()));
    }
}
