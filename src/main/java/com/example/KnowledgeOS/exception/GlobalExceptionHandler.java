package com.example.KnowledgeOS.exception;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.io.IOException;
import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleResourceNotFoundException(ResourceNotFoundException exception) {
        ApiError apiError = new ApiError(HttpStatus.NOT_FOUND, exception.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(apiError);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> handleBadRequest(BadRequestException exception) {
        ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST, exception.getMessage());
        log.error(apiError.toString(), exception);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(apiError);
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<ApiError> handleDocumentNotFound(DocumentNotFoundException e) {
        ApiError apiError = new ApiError(HttpStatus.NOT_FOUND, e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(apiError);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleNotValid(MethodArgumentNotValidException exception) {

        List<ApiFieldError> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new ApiFieldError(fieldError.getField(), fieldError.getDefaultMessage()))
                .toList();

        ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST, "input validation failed", errors);
        log.error(apiError.toString(), exception);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(apiError);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException e) {
        ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST, e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(apiError);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSize(MaxUploadSizeExceededException e) {
        ApiError apiError = new ApiError(HttpStatus.PAYLOAD_TOO_LARGE, "uploaded file exceeds the maximum allowed size");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(apiError);
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ApiError> handleStorage(StorageException e) {
        ApiError apiError = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Document storage or ingestion failed");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(apiError);
    }

    @ExceptionHandler(RagPipelineException.class)
    public ResponseEntity<ApiError> handlePipeline(RagPipelineException e) {
        ApiError apiError = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "RAG pipeline failed");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(apiError);
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<ApiError> handleUsernameNotFoundException(UsernameNotFoundException exception) {
        ApiError apiError = new ApiError(HttpStatus.NOT_FOUND, "username not found with username: " + exception.getMessage());
        log.error(apiError.toString(), exception);
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler({AuthenticationException.class, org.springframework.security.authentication.AuthenticationCredentialsNotFoundException.class})
    public ResponseEntity<ApiError> handleAuthenticationException(Exception exception) {
        ApiError apiError = new ApiError(HttpStatus.UNAUTHORIZED, "Authentication failed. Please sign in again.");
        log.warn("Authentication failure: {}", exception.getMessage());
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ApiError> handleJwtException(JwtException exception) {
        ApiError apiError = new ApiError(HttpStatus.UNAUTHORIZED, "Invalid or expired token. Please sign in again.");
        log.warn("JWT validation failure: {}", exception.getMessage());
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDeniedException(AccessDeniedException exception) {
        ApiError apiError = new ApiError(HttpStatus.FORBIDDEN, "Access denied Insufficient permissions");
        log.error(apiError.toString(), exception);
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ApiError> handleAuthorizationDeniedException(AuthorizationDeniedException exception) {
        ApiError apiError = new ApiError(HttpStatus.FORBIDDEN, "Access denied Insufficient permissions");
        log.error(apiError.toString(), exception);
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler(GenerationException.class)
    public ResponseEntity<ApiError> handleGeneration(GenerationException exception) {
        ApiError apiError = new ApiError(
                HttpStatus.BAD_GATEWAY,
                "The AI service could not generate a response. Please try again.");
        log.error("Answer generation failed", exception);
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableMessage(HttpMessageNotReadableException exception) {
        ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST, "Malformed request body");
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException exception) {
        ApiError apiError = new ApiError(HttpStatus.NOT_FOUND, "Resource not found");
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    /**
     * A browser that stops a streaming response (Stop, navigating away, closing the
     * tab) leaves the socket unwritable. The response is already committed as
     * {@code text/event-stream}, so there is no body to write: log it quietly and
     * let the container close the connection instead of trying to render JSON.
     */
    @ExceptionHandler(IOException.class)
    public void handleClientAbort(IOException exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            log.debug("Client disconnected while the response was being written: {}", exception.getMessage());
        } else {
            log.warn("I/O failure before the response was committed: {}", exception.getMessage());
        }
    }

    /**
     * Last-resort handler. Internal exception details (SQL, provider payloads, stack
     * traces) must never reach the client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception, HttpServletResponse response) {
        if (response.isCommitted()) {
            // Nothing can be written any more (typically a stream that already started).
            log.debug("Suppressed error after the response was committed: {}", exception.getMessage());
            return null;
        }
        ApiError apiError = new ApiError(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Something went wrong. Please try again. If the problem continues, contact your administrator.");
        log.error("Unhandled exception", exception);
        return ResponseEntity.status(apiError.status()).body(apiError);
    }
}
