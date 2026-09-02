package com.peervault.file.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.event.DomainEvent;
import com.peervault.file.dto.SandboxValidateRequest;
import com.peervault.file.dto.SandboxValidateResponse;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.nio.file.Path;

/**
 * Real canonicalization/path-traversal detection powering {@code FileExplorer.tsx}'s "Storage Agent
 * Sandbox & Traversal Barrier" widget — mirrors the Rust storage agent's sandbox layer described in the
 * architecture doc. Stateless: doesn't require device context, just root + candidate path.
 */
@Service
public class SandboxService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public SandboxService(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public SandboxValidateResponse validate(SandboxValidateRequest req) {
        Path root = Path.of(req.rootPath()).normalize();
        Path resolved = root.resolve(req.candidatePath()).normalize();

        boolean escapesRoot = !resolved.startsWith(root);
        String candidatePath = req.candidatePath();
        boolean hitsDenylist = candidatePath.contains("..")
                || candidatePath.startsWith("/etc")
                || candidatePath.startsWith("C:\\Windows")
                || candidatePath.contains("~/.ssh");

        boolean allowed = !escapesRoot && !hitsDenylist;

        String reason = allowed
                ? "Access Authorized. Path strictly contained within sandbox boundaries."
                : "Security Alert: Path Traversal Denied. Requested path resolves outside configured allowed sandbox root.";

        if (!allowed) {
            kafkaTemplate.send(KafkaTopics.FILE_EVENTS, DomainEvent.of(
                    AuditEventType.SANDBOX_VIOLATION,
                    AuditSeverity.WARNING,
                    null,
                    null,
                    "System Sandbox Daemon",
                    "Path Traversal Attempt Blocked (" + candidatePath + ")",
                    "Remote command attempted canonical escape \"" + candidatePath + "\". Blocked by Rust Agent Sandbox Layer.",
                    false
            ));
        }

        return new SandboxValidateResponse(allowed, resolved.toString(), reason);
    }
}
