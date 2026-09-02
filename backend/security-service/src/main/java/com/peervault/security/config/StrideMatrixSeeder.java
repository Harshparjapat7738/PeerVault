package com.peervault.security.config;

import com.peervault.common.dto.StrideCategory;
import com.peervault.common.dto.ThreatStatus;
import com.peervault.security.domain.ThreatEntry;
import com.peervault.security.repo.ThreatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the {@code threats} collection with the canonical 6-row STRIDE matrix on first startup, if
 * empty. Every field below is transcribed verbatim from {@code STRIDE_THREAT_MATRIX} in
 * {@code src/data/initialData.ts} — the frontend renders this text directly, so nothing here is
 * paraphrased.
 */
@Component
public class StrideMatrixSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StrideMatrixSeeder.class);

    private final ThreatRepository threatRepository;

    public StrideMatrixSeeder(ThreatRepository threatRepository) {
        this.threatRepository = threatRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (threatRepository.count() > 0) {
            log.info("threats collection already seeded ({} rows) — skipping STRIDE matrix seed", threatRepository.count());
            return;
        }

        List<ThreatEntry> matrix = List.of(
                new ThreatEntry(
                        "stride_s",
                        StrideCategory.SPOOFING,
                        "Rogue Device Spoofing & Fake Node Injection",
                        "Device Registry & Agent Handshake",
                        "An attacker attempts to register a rogue device using a cloned identifier or hostname.",
                        "Forged device metadata, MAC address spoofing, unauthorized API calls.",
                        "Enforce asymmetric ECDSA P-256 / Ed25519 device keypairs stored in OS Secure Enclave. Ephemeral 120s pairing PIN with out-of-band QR attestation.",
                        ThreatStatus.MITIGATED,
                        "Continuous Real-time"
                ),
                new ThreatEntry(
                        "stride_t",
                        StrideCategory.TAMPERING,
                        "In-Transit File Alteration / Man-in-the-Middle",
                        "P2P Data Channel & Relay Service",
                        "Malicious actor or compromised relay server attempts to inject bytes or modify transferred files.",
                        "BGP hijacking, rogue TURN relay interception, active packet manipulation.",
                        "Noise Protocol Framework / TLS 1.3 with chunk-level SHA-256 integrity verification. Zero-knowledge encrypted relay (relay sees only ciphertext).",
                        ThreatStatus.MITIGATED,
                        "Continuous Real-time"
                ),
                new ThreatEntry(
                        "stride_r",
                        StrideCategory.REPUDIATION,
                        "Denied Remote Action / Unauthorized File Deletion",
                        "Audit Subsystem & Policy Engine",
                        "A user or compromised device claims they did not initiate a remote delete or sensitive file read.",
                        "Unsigned requests, log deletion, lack of cryptographic nonces.",
                        "Every remote command carries a cryptographic signature bound to the device session token, logged to an immutable hash-chained audit ledger.",
                        ThreatStatus.MITIGATED,
                        "Active Hash-Chaining"
                ),
                new ThreatEntry(
                        "stride_i",
                        StrideCategory.INFORMATION_DISCLOSURE,
                        "Central Control Plane Raw File Leakage",
                        "Control Plane Database & API Gateway",
                        "Central server compromise exposes private files, full filesystem structures, or credentials.",
                        "SQL injection on control plane, server-side data exfiltration.",
                        "Strict separation of Control Plane vs Data Plane. Central database stores zero plaintext file data. End-to-end encrypted device-to-device streaming.",
                        ThreatStatus.MITIGATED,
                        "Zero-Knowledge Verified"
                ),
                new ThreatEntry(
                        "stride_d",
                        StrideCategory.DENIAL_OF_SERVICE,
                        "Ransomware Mass Deletion & Disk Exhaustion",
                        "Storage Agent Filesystem Engine",
                        "Ransomware on a paired node attempts to delete 50,000 files across all mesh devices simultaneously.",
                        "Automated rapid remote delete API flood, huge file upload spam.",
                        "Destructive Action Shield: Soft-delete quarantine (30-day trash bin), rate limiter cap (max 20 deletes/min), automatic anomaly circuit breaker.",
                        ThreatStatus.MITIGATED,
                        "Shield Enabled"
                ),
                new ThreatEntry(
                        "stride_e",
                        StrideCategory.ELEVATION_OF_PRIVILEGE,
                        "Path Traversal & Symlink Sandbox Escape",
                        "Local Storage Agent Daemon",
                        "Remote command issues `../../etc/shadow` or creates a symlink pointing to sensitive OS directories.",
                        "Dot-dot-slash traversal, junction point redirection, symlink dereferencing.",
                        "Agent strictly canonicalizes all paths locally before I/O. Forbidden system directories (/etc, C:\\Windows, ~/.ssh) hard-blocked at kernel boundary.",
                        ThreatStatus.MITIGATED,
                        "Sandbox Active"
                )
        );

        threatRepository.saveAll(matrix);
        log.info("Seeded {} STRIDE threat matrix rows into 'threats' collection", matrix.size());
    }
}
