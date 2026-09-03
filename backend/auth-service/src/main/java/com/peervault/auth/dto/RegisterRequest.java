package com.peervault.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        /** Optional display name; null/blank is fine — never used for auth/lookup, purely cosmetic. */
        @Size(max = 120, message = "Name must be at most 120 characters") String name
) {
}
