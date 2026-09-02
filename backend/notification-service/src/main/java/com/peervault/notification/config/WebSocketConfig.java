package com.peervault.notification.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket configuration. Exposes two endpoints — {@code /ws} (general mesh events) and
 * {@code /ws/webrtc} (WebRTC signaling, Task 5) — both proxied straight through by the api-gateway's
 * {@code lb:ws://notification-service} route (its predicate is {@code Path=/ws/**}, so no gateway
 * change was needed for the second endpoint), and sharing one simple in-memory broker fanning
 * messages out under {@code /topic/**}. A client connected to either endpoint can subscribe to any
 * {@code /topic/*} destination — the broker isn't scoped per endpoint — so the second endpoint
 * exists for a clean semantic/connection-lifecycle split, not because the broker requires it. This
 * service only ever pushes server -> client, so {@code /app} is declared for completeness but has
 * no {@code @MessageMapping} consumers.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${peervault.frontend-origin}")
    private String frontendOrigin;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS fallback; plain-WS/STOMP clients can also connect to /ws directly without the SockJS
        // handshake if the frontend later uses a raw STOMP client.
        registry.addEndpoint("/ws")
                .setAllowedOrigins(frontendOrigin)
                .withSockJS();

        registry.addEndpoint("/ws/webrtc")
                .setAllowedOrigins(frontendOrigin)
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
