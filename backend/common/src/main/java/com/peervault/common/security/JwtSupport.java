package com.peervault.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * Shared HMAC-SHA256 JWT issuance/verification used by auth-service (issuer) and api-gateway (verifier).
 * The signing secret is never hardcoded — it is injected via {@code jwt.secret}, sourced through Config
 * Server's Vault-backed property source.
 */
public class JwtSupport {

    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_TOKEN_VERSION = "tokenVersion";
    public static final String CLAIM_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final SecretKey key;

    public JwtSupport(String base64Secret) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
    }

    public String generateToken(String subjectUserId, String email, long tokenVersion, String type, long ttlSeconds) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + ttlSeconds * 1000);
        var builder = Jwts.builder()
                .subject(subjectUserId)
                .claim(CLAIM_TOKEN_VERSION, tokenVersion)
                .claim(CLAIM_TYPE, type)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key);
        if (email != null) {
            builder.claim(CLAIM_EMAIL, email);
        }
        return builder.compact();
    }

    public String generateAccessToken(String userId, String email, long tokenVersion, long ttlSeconds) {
        return generateToken(userId, email, tokenVersion, TYPE_ACCESS, ttlSeconds);
    }

    public String generateRefreshToken(String userId, long tokenVersion, long ttlSeconds) {
        return generateToken(userId, null, tokenVersion, TYPE_REFRESH, ttlSeconds);
    }

    /**
     * @throws JwtException if the token is malformed, expired, or fails signature verification.
     */
    public Claims parseAndValidate(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
