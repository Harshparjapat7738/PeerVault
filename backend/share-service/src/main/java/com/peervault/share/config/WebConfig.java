package com.peervault.share.config;

import com.peervault.common.dto.ShareStatus;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * {@code ShareStatus}'s wire representation (via {@code @JsonValue}/{@code @JsonCreator}) is
 * lowercase ("pending"), matching every JSON body/response in the mesh — but Spring MVC's default
 * enum {@code @RequestParam} conversion falls back to {@code Enum.valueOf()} (case-sensitive
 * constant names, "PENDING"), which never runs the {@code @JsonCreator} used for request bodies.
 * Without this, {@code ?status=pending} on {@code GET /api/v1/share/requests/{sent,received}}
 * would 400 even though "pending" is exactly what {@code ShareStatus} serializes to everywhere
 * else. Registering the converter keeps query-param filtering consistent with the wire format.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, ShareStatus.class, ShareStatus::fromWire);
    }
}
