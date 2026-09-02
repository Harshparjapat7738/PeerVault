package com.peervault.transfer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;

/**
 * GridFS is transfer-service's relay-mode blob store (Task 6): real binary storage backed by the
 * same MongoDB instance every service already uses, rather than standing up a new MinIO/S3
 * dependency — see backend/claude.md for the reasoning. Defined explicitly rather than relying on
 * Spring Boot to autoconfigure one, matching this module's existing pattern of explicit
 * {@code @Configuration} beans for infra ({@code RestClientConfig}).
 */
@Configuration
public class GridFsConfig {

    @Bean
    public GridFsTemplate gridFsTemplate(MongoDatabaseFactory mongoDatabaseFactory, MongoTemplate mongoTemplate) {
        return new GridFsTemplate(mongoDatabaseFactory, mongoTemplate.getConverter());
    }
}
