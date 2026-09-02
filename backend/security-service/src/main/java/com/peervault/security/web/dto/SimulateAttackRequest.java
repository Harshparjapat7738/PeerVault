package com.peervault.security.web.dto;

/** Body for {@code POST /api/v1/security/simulate-ransomware-attack}; both fields optional. */
public record SimulateAttackRequest(String deviceId, String deviceName) {
}
