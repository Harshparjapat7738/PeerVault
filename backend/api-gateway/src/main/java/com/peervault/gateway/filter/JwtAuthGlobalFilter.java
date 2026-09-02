package com.peervault.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peervault.common.exception.ErrorResponse;
import com.peervault.common.security.JwtSupport;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

/**
 * Validates the JWT access token on every request that isn't in the public allow-list, then forwards
 * {@code X-User-Id} / {@code X-User-Email} headers downstream so business services never have to
 * re-verify signatures themselves. Also enforces "Revoke All Ephemeral Tokens": security-service bumps a
 * {@code security:revoked-before} epoch-millis key in Redis, and any token issued before that instant is
 * rejected even if its own signature/expiry is still valid.
 */
@Component
public class JwtAuthGlobalFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthGlobalFilter.class);
    private static final String REVOKED_BEFORE_KEY = "security:revoked-before";

    private static final List<String> PUBLIC_PREFIXES = List.of(
            "/api/v1/auth/register",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/actuator"
    );

    private final JwtSupport jwtSupport;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public JwtAuthGlobalFilter(JwtSupport jwtSupport, ReactiveStringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.jwtSupport = jwtSupport;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public int getOrder() {
        return -100;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (isPublic(path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange, "MISSING_TOKEN", "Authorization header is required");
        }
        String token = authHeader.substring("Bearer ".length());

        Claims claims;
        try {
            claims = jwtSupport.parseAndValidate(token);
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Rejected token on {}: {}", path, ex.getMessage());
            return unauthorized(exchange, "INVALID_TOKEN", "Token is invalid or expired");
        }

        if (!JwtSupport.TYPE_ACCESS.equals(claims.get(JwtSupport.CLAIM_TYPE, String.class))) {
            return unauthorized(exchange, "WRONG_TOKEN_TYPE", "A refresh token cannot be used for API access");
        }

        return redisTemplate.opsForValue().get(REVOKED_BEFORE_KEY)
                .defaultIfEmpty("0")
                .flatMap(revokedBeforeMillis -> {
                    long revokedBefore = Long.parseLong(revokedBeforeMillis);
                    Instant issuedAt = claims.getIssuedAt().toInstant();
                    if (issuedAt.toEpochMilli() < revokedBefore) {
                        return unauthorized(exchange, "TOKEN_REVOKED", "All sessions were revoked after this token was issued");
                    }
                    ServerHttpRequest mutated = request.mutate()
                            .header("X-User-Id", claims.getSubject())
                            .header("X-User-Email", String.valueOf(claims.get(JwtSupport.CLAIM_EMAIL, String.class)))
                            .build();
                    return chain.filter(exchange.mutate().request(mutated).build());
                });
    }

    private boolean isPublic(String path) {
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String errorCode, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        ErrorResponse body = new ErrorResponse(Instant.now(), 401, errorCode, message, exchange.getRequest().getURI().getPath());
        byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(body);
        } catch (Exception e) {
            bytes = ("{\"errorCode\":\"" + errorCode + "\"}").getBytes(StandardCharsets.UTF_8);
        }
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}
