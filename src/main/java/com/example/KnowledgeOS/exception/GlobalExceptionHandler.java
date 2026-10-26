package com.example.KnowledgeOS.exception;

import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

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
        ApiError apiError = new ApiError(HttpStatus.UNAUTHORIZED, "Authentication failed: " + exception.getMessage());
        log.error(apiError.toString(), exception);
        return ResponseEntity.status(apiError.status()).body(apiError);
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ApiError> handleJwtException(JwtException exception) {
        ApiError apiError = new ApiError(HttpStatus.UNAUTHORIZED, "Invalid JWT token: " + exception.getMessage());
        log.error(apiError.toString(), exception);
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
}
