package com.peervault.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Deliberately does NOT scan {@code com.peervault.common} — that package's {@code GlobalExceptionHandler}
 * is a Servlet-MVC {@code @RestControllerAdvice} and this gateway is a reactive WebFlux application.
 * {@link com.peervault.common.security.JwtSupport} is a plain class (not a bean), so it's used directly
 * from {@link com.peervault.gateway.config.SecurityBeansConfig} without any component scanning.
 */
@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
