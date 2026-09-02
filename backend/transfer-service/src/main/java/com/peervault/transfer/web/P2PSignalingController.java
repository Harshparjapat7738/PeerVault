package com.peervault.transfer.web;

import com.peervault.common.dto.P2PInitiateResponseDto;
import com.peervault.transfer.service.P2PSignalingService;
import com.peervault.transfer.web.dto.P2PAnswerRequest;
import com.peervault.transfer.web.dto.P2PIceCandidateRequest;
import com.peervault.transfer.web.dto.P2PInitiateRequest;
import com.peervault.transfer.web.dto.P2POfferRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * WebRTC signaling for P2P_DIRECT transfers. Each relay endpoint just forwards its payload onto
 * Kafka ({@code P2PSignalingService}) and returns 202 — the actual delivery happens over
 * {@code /topic/webrtc/{transferId}} via notification-service, not in this response.
 */
@RestController
@RequestMapping("/api/v1/transfers/p2p")
@RequiredArgsConstructor
public class P2PSignalingController {

    private final P2PSignalingService p2pSignalingService;

    @PostMapping("/initiate")
    @ResponseStatus(HttpStatus.CREATED)
    public P2PInitiateResponseDto initiate(@Valid @RequestBody P2PInitiateRequest request) {
        return p2pSignalingService.initiate(request);
    }

    @PostMapping("/{transferId}/offer")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void offer(@PathVariable String transferId, @Valid @RequestBody P2POfferRequest request) {
        p2pSignalingService.relayOffer(transferId, request);
    }

    @PostMapping("/{transferId}/answer")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void answer(@PathVariable String transferId, @Valid @RequestBody P2PAnswerRequest request) {
        p2pSignalingService.relayAnswer(transferId, request);
    }

    @PostMapping("/{transferId}/ice-candidate")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void iceCandidate(@PathVariable String transferId, @Valid @RequestBody P2PIceCandidateRequest request) {
        p2pSignalingService.relayIceCandidate(transferId, request);
    }
}
