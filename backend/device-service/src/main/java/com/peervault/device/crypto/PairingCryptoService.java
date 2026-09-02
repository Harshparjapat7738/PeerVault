package com.peervault.device.crypto;

import org.springframework.stereotype.Component;

import java.security.InvalidAlgorithmParameterException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Real cryptographic pairing primitives — a genuine EC (P-256 / secp256r1) keypair, a SHA-256
 * fingerprint of the public key, and a SecureRandom 6-digit PIN. Not simulated strings.
 */
@Component
public class PairingCryptoService {

    private final SecureRandom secureRandom = new SecureRandom();

    public record PairingMaterial(String pairingCode, String fingerprint, String ephemeralPublicKeyBase64,
                                   String qrPayload) {
    }

    public PairingMaterial generate() {
        KeyPair keyPair = generateEcKeyPair();
        byte[] encodedPublicKey = keyPair.getPublic().getEncoded();

        String fingerprint = fingerprintOf(encodedPublicKey);
        String ephemeralPublicKeyBase64 = Base64.getEncoder().encodeToString(encodedPublicKey);
        String pairingCode = generatePin();
        String qrPayload = "peervault://pair?code=" + pairingCode + "&fp=" + fingerprint;

        return new PairingMaterial(pairingCode, fingerprint, ephemeralPublicKeyBase64, qrPayload);
    }

    private KeyPair generateEcKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
            generator.initialize(new ECGenParameterSpec("secp256r1"));
            return generator.generateKeyPair();
        } catch (NoSuchAlgorithmException | InvalidAlgorithmParameterException e) {
            throw new IllegalStateException("EC keypair generation is unavailable in this JVM", e);
        }
    }

    private String fingerprintOf(byte[] encodedPublicKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(encodedPublicKey);
            String hex = HexFormat.of().formatHex(hash);
            return "SHA256:" + hex.substring(0, 16) + "..." + hex.substring(hex.length() - 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable in this JVM", e);
        }
    }

    private String generatePin() {
        int pin = 100000 + secureRandom.nextInt(900000);
        return Integer.toString(pin);
    }
}
