package com.peervault.file.controller;

import com.peervault.file.dto.SandboxValidateRequest;
import com.peervault.file.dto.SandboxValidateResponse;
import com.peervault.file.service.SandboxService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sandbox")
public class SandboxController {

    private final SandboxService sandboxService;

    public SandboxController(SandboxService sandboxService) {
        this.sandboxService = sandboxService;
    }

    @PostMapping("/validate-path")
    public SandboxValidateResponse validatePath(@Valid @RequestBody SandboxValidateRequest req) {
        return sandboxService.validate(req);
    }
}
