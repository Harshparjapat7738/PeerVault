package com.peervault.gateway.config;

import com.peervault.common.security.JwtSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecurityBeansConfig {

    @Bean
    public JwtSupport jwtSupport(@Value("${jwt.secret}") String secret) {
        return new JwtSupport(secret);
    }
}
