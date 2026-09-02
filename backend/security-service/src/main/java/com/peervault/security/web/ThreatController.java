package com.peervault.security.web;

import com.peervault.common.dto.ThreatItemDto;
import com.peervault.security.mapper.SecurityMapper;
import com.peervault.security.repo.ThreatRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/threats")
public class ThreatController {

    private final ThreatRepository threatRepository;
    private final SecurityMapper mapper;

    public ThreatController(ThreatRepository threatRepository, SecurityMapper mapper) {
        this.threatRepository = threatRepository;
        this.mapper = mapper;
    }

    @GetMapping
    public List<ThreatItemDto> getThreats() {
        return threatRepository.findAll().stream().map(mapper::toDto).toList();
    }
}
