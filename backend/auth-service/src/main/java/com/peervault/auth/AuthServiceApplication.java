package com.peervault.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * scanBasePackages = "com.peervault" so that {@code common}'s
 * {@code GlobalExceptionHandler} (a {@code @RestControllerAdvice}) is picked up automatically.
 */
@SpringBootApplication(scanBasePackages = "com.peervault")
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
