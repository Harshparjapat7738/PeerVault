package com.peervault.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Registered automatically in every service whose main application class scans base package
 * {@code com.peervault} (all of them do), so error shape is consistent across the whole mesh.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.getStatus())
                .body(new ErrorResponse(Instant.now(), ex.getStatus().value(), ex.getErrorCode(), ex.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(Instant.now(), HttpStatus.BAD_REQUEST.value(), "VALIDATION_FAILED", message, request.getRequestURI()));
    }

    /**
     * Deliberately does NOT echo {@code ex.getMessage()}/the stack trace back to the client — unlike
     * {@link ApiException}'s message (always a controlled, safe-to-show string authored by this
     * codebase) or bean-validation's field errors, an arbitrary uncaught exception's message can
     * contain internal details (a Mongo/Kafka error, a raw file path, a class/package name) that
     * shouldn't leave the server. The full exception (with stack trace) is still logged server-side,
     * tagged with a short reference id also returned to the client — "meaningful error, not a bare
     * 500" without leaking internals; support/logs can find the matching server-side entry from the
     * reference id alone.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        log.error("Unhandled exception [ref={}] on {} {}", traceId, request.getMethod(), request.getRequestURI(), ex);
        String message = "An unexpected error occurred. Reference: " + traceId + ". Please try again or contact support.";
        return ResponseEntity.internalServerError()
                .body(new ErrorResponse(Instant.now(), HttpStatus.INTERNAL_SERVER_ERROR.value(), "INTERNAL_ERROR", message, request.getRequestURI()));
    }
}
