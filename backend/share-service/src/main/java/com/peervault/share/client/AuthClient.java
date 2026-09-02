package com.peervault.share.client;

import com.peervault.common.dto.UserLookupDto;
import com.peervault.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Eureka-resolved REST client to auth-service's internal {@code /users/lookup} endpoint — resolves
 * a {@code targetEmail} to a userId when a share request addresses someone by email rather than a
 * known userId.
 */
@Service
@RequiredArgsConstructor
public class AuthClient {

    private final RestClient.Builder loadBalancedRestClientBuilder;

    public UserLookupDto lookupByEmail(String email) {
        try {
            return loadBalancedRestClientBuilder.build()
                    .get()
                    .uri("http://auth-service/api/v1/auth/users/lookup?email={email}", email)
                    .retrieve()
                    .body(UserLookupDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw ApiException.notFound("TARGET_USER_NOT_FOUND", "No account with email " + email);
        }
    }
}
