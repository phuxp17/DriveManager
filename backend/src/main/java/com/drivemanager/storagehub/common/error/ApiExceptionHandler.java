package com.drivemanager.storagehub.common.error;

import java.util.NoSuchElementException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import com.drivemanager.storagehub.auth.EmailAlreadyRegisteredException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import com.drivemanager.storagehub.item.ItemNotFoundException;
import com.drivemanager.storagehub.item.UploadCapacityExceededException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler({
            IllegalArgumentException.class,
            HttpMessageNotReadableException.class,
            BindException.class,
            MethodArgumentNotValidException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    ResponseEntity<ApiError> handleIllegalArgument() {
        return ResponseEntity.badRequest().body(ApiError.of(400, "VALIDATION_ERROR", "The request is invalid."));
    }

    @ExceptionHandler({NoHandlerFoundException.class, ItemNotFoundException.class})
    ResponseEntity<ApiError> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of(404, "NOT_FOUND", "The requested resource was not found."));
    }

    @ExceptionHandler(com.drivemanager.storagehub.common.ratelimit.RateLimitExceededException.class)
    ResponseEntity<ApiError> handleRateLimit(com.drivemanager.storagehub.common.ratelimit.RateLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(org.springframework.http.HttpHeaders.RETRY_AFTER, "60")
                .body(ApiError.of(429, "RATE_LIMIT_EXCEEDED", ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> handleMaxUploadSize() {
        return ResponseEntity.badRequest()
                .body(ApiError.of(400, "VALIDATION_ERROR", "File size exceeds maximum allowed limit."));
    }

    @ExceptionHandler(UploadCapacityExceededException.class)
    ResponseEntity<ApiError> handleUploadCapacity() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(org.springframework.http.HttpHeaders.RETRY_AFTER, "5")
                .body(ApiError.of(503, "UPLOAD_CAPACITY_EXCEEDED", "Upload capacity is temporarily unavailable."));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<ApiError> handleVersionConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(409, "VERSION_CONFLICT", "The item changed. Reload before updating."));
    }

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    ResponseEntity<ApiError> handleDuplicateEmail() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(409, "EMAIL_ALREADY_REGISTERED", "An account already uses this email."));
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> handleAuthenticationFailure() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(401, "INVALID_CREDENTIALS", "Email or password is incorrect."));
    }

    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<ApiError> handleMissing() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of(404, "NOT_FOUND", "The requested resource was not found."));
    }

    @ExceptionHandler(OrganizationConflictException.class)
    ResponseEntity<ApiError> handleConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiError.of(409, "CONFLICT", "The request conflicts with current state."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        log.error("Unhandled request failure of type {}", exception.getClass().getName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of(500, "INTERNAL_ERROR", "An unexpected error occurred."));
    }
}
