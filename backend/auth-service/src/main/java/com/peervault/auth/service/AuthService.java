package com.peervault.auth.service;

import com.peervault.auth.dto.AuthResponse;
import com.peervault.auth.dto.TokenPairResponse;
import com.peervault.auth.model.User;
import com.peervault.auth.repository.UserRepository;
import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.UserLookupDto;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.common.security.JwtSupport;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtSupport jwtSupport;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${jwt.access-ttl-seconds}")
    private long accessTtlSeconds;

    @Value("${jwt.refresh-ttl-seconds}")
    private long refreshTtlSeconds;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtSupport jwtSupport,
                        KafkaTemplate<String, Object> kafkaTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtSupport = jwtSupport;
        this.kafkaTemplate = kafkaTemplate;
    }

    public AuthResponse register(String email, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists.");
        }

        Instant now = Instant.now();
        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .tokenVersion(0L)
                .mfaEnabled(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        userRepository.save(user);

        String accessToken = jwtSupport.generateAccessToken(user.getId(), user.getEmail(), user.getTokenVersion(), accessTtlSeconds);
        String refreshToken = jwtSupport.generateRefreshToken(user.getId(), user.getTokenVersion(), refreshTtlSeconds);

        publish(AuditEventType.AUTH, AuditSeverity.INFO, "User (" + email + ")", "Account Registered",
                "New PeerVault control-plane account created.");

        return new AuthResponse(user.getId(), user.getEmail(), accessToken, refreshToken);
    }

    public AuthResponse login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.unauthorized("INVALID_CREDENTIALS", "Invalid email or password."));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw ApiException.unauthorized("INVALID_CREDENTIALS", "Invalid email or password.");
        }

        String accessToken = jwtSupport.generateAccessToken(user.getId(), user.getEmail(), user.getTokenVersion(), accessTtlSeconds);
        String refreshToken = jwtSupport.generateRefreshToken(user.getId(), user.getTokenVersion(), refreshTtlSeconds);

        publish(AuditEventType.AUTH, AuditSeverity.INFO, "User (" + email + ")", "Login Successful",
                "User authenticated with email and password.");

        return new AuthResponse(user.getId(), user.getEmail(), accessToken, refreshToken);
    }

    public TokenPairResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwtSupport.parseAndValidate(refreshToken);
        } catch (JwtException e) {
            throw ApiException.unauthorized("INVALID_TOKEN", "Refresh token is invalid or expired.");
        }

        if (!JwtSupport.TYPE_REFRESH.equals(claims.get(JwtSupport.CLAIM_TYPE, String.class))) {
            throw ApiException.unauthorized("WRONG_TOKEN_TYPE", "Token supplied is not a refresh token.");
        }

        String userId = claims.getSubject();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("INVALID_TOKEN", "User no longer exists."));

        // Trade-off: access tokens are short-TTL, so we don't bother tracking per-request revocation
        // for them individually — only refresh-token renewal is gated on tokenVersion. Logout bumps
        // tokenVersion, which invalidates every outstanding refresh token for the user in one write;
        // any access tokens already issued simply expire naturally within jwt.access-ttl-seconds.
        Long tokenVersionClaim = claims.get(JwtSupport.CLAIM_TOKEN_VERSION, Long.class);
        if (tokenVersionClaim == null || tokenVersionClaim != user.getTokenVersion()) {
            throw ApiException.unauthorized("TOKEN_REVOKED", "Refresh token has been revoked.");
        }

        String newAccessToken = jwtSupport.generateAccessToken(user.getId(), user.getEmail(), user.getTokenVersion(), accessTtlSeconds);
        String newRefreshToken = jwtSupport.generateRefreshToken(user.getId(), user.getTokenVersion(), refreshTtlSeconds);

        return new TokenPairResponse(newAccessToken, newRefreshToken);
    }

    public void logout(String headerUserId, String fallbackRefreshToken) {
        String userId = headerUserId;

        if (userId == null || userId.isBlank()) {
            if (fallbackRefreshToken == null || fallbackRefreshToken.isBlank()) {
                throw ApiException.unauthorized("UNAUTHENTICATED", "Unable to identify user for logout.");
            }
            try {
                Claims claims = jwtSupport.parseAndValidate(fallbackRefreshToken);
                userId = claims.getSubject();
            } catch (JwtException e) {
                throw ApiException.unauthorized("INVALID_TOKEN", "Refresh token is invalid or expired.");
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));

        user.setTokenVersion(user.getTokenVersion() + 1);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        publish(AuditEventType.AUTH, AuditSeverity.INFO, "User (" + user.getEmail() + ")", "Logout",
                "All outstanding refresh tokens for this account were invalidated.");
    }

    /**
     * Internal-only, service-to-service lookup (e.g. share-service resolving a share target's
     * email to a userId) — called directly via Eureka, never through the gateway, so it isn't
     * gated by the JWT filter the way every gateway-routed endpoint is.
     */
    public UserLookupDto lookupByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "No account with email " + email));
        return new UserLookupDto(user.getId(), user.getEmail());
    }

    private void publish(AuditEventType eventType, AuditSeverity severity, String actor, String action, String details) {
        DomainEvent event = DomainEvent.of(eventType, severity, null, null, actor, action, details, true);
        kafkaTemplate.send(KafkaTopics.AUTH_EVENTS, event.eventId(), event);
    }
}
