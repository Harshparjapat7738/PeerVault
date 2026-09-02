package com.peervault.transfer.config;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * A {@link RestClient.Builder} decorated with {@link LoadBalanced} so URIs built with the Eureka
 * service id as the hostname (e.g. {@code http://device-service/...}) are resolved by Spring Cloud
 * LoadBalancer to whatever instance is currently registered, rather than treated as a literal DNS name.
 */
@Configuration
public class RestClientConfig {

    @Bean
    @LoadBalanced
    public RestClient.Builder loadBalancedRestClientBuilder() {
        return RestClient.builder();
    }
}
