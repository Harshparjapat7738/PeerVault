package com.peervault.auth.controller;

import com.peervault.auth.dto.AuthResponse;
import com.peervault.auth.dto.LoginRequest;
import com.peervault.auth.dto.LogoutRequest;
import com.peervault.auth.dto.RefreshRequest;
import com.peervault.auth.dto.RegisterRequest;
import com.peervault.auth.dto.TokenPairResponse;
import com.peervault.auth.service.AuthService;
import com.peervault.common.dto.UserLookupDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request.email(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request.email(), request.password()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenPairResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody(required = false) LogoutRequest request) {
        String fallbackRefreshToken = request == null ? null : request.refreshToken();
        authService.logout(userId, fallbackRefreshToken);
        return ResponseEntity.noContent().build();
    }

    /** Internal-only: called service-to-service (e.g. by share-service), never via the gateway. */
    @GetMapping("/users/lookup")
    public UserLookupDto lookupByEmail(@RequestParam String email) {
        return authService.lookupByEmail(email);
    }
}
