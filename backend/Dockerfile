# ============================================================================
# All-in-one image: builds and runs all 10 PeerVault Spring Boot services
# (eureka-server, config-server, api-gateway, auth-service, device-service,
# file-service, transfer-service, security-service, notification-service,
# share-service) as separate JVM processes inside a single container. See
# docker/start-all.sh for the startup order and process supervision.
#
# This image does NOT include Mongo, Redis, Kafka or Vault — those stay
# separate services. The ENV defaults below match the hostnames
# backend/docker-compose.yml's infra containers use, so this image works
# unmodified when run on that compose project's network; override any of
# them (`docker run -e ...`) to point at your own infra. Vault must already
# be unsealed and seeded (see docker/vault-init.sh) before config-server can
# start, since every service's spring.cloud.config.fail-fast=true means a
# missing config-server/Vault takes the whole container down.
#
# Build (from backend/):
#   docker build -t peervault-backend .
#
# Run against the infra containers from backend/docker-compose.yml (start
# those first: `docker compose up -d mongo redis kafka vault vault-init`,
# then run this on the same network):
#   docker run --network backend_default -p 8080:8080 peervault-backend
# ============================================================================

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -q \
    -pl eureka-server,config-server,api-gateway,auth-service,device-service,file-service,transfer-service,security-service,notification-service,share-service \
    -am -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /workspace/eureka-server/target/eureka-server.jar         ./eureka-server.jar
COPY --from=build /workspace/config-server/target/config-server.jar         ./config-server.jar
COPY --from=build /workspace/api-gateway/target/api-gateway.jar             ./api-gateway.jar
COPY --from=build /workspace/auth-service/target/auth-service.jar           ./auth-service.jar
COPY --from=build /workspace/device-service/target/device-service.jar       ./device-service.jar
COPY --from=build /workspace/file-service/target/file-service.jar           ./file-service.jar
COPY --from=build /workspace/transfer-service/target/transfer-service.jar   ./transfer-service.jar
COPY --from=build /workspace/security-service/target/security-service.jar   ./security-service.jar
COPY --from=build /workspace/notification-service/target/notification-service.jar ./notification-service.jar
COPY --from=build /workspace/share-service/target/share-service.jar         ./share-service.jar

# config-server's native composite backend reads from here (CONFIG_REPO_LOCATION below).
COPY config-repo /config-repo

COPY docker/start-all.sh ./start-all.sh
RUN chmod +x ./start-all.sh

# eureka-server and config-server run in-container, so those two point at localhost regardless of
# how this image is deployed. The rest mirror docker-compose.yml's x-common-env hostnames.
ENV EUREKA_URI=http://localhost:8761/eureka/ \
    CONFIG_SERVER_URI=http://localhost:8888 \
    CONFIG_REPO_LOCATION=file:/config-repo \
    VAULT_HOST=vault \
    VAULT_PORT=8200 \
    VAULT_SCHEME=http \
    VAULT_TOKEN=peervault-dev-root-token \
    KAFKA_BOOTSTRAP=kafka:9092 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    MONGODB_URI=mongodb://mongo:27017 \
    FRONTEND_ORIGIN=http://localhost:3000

# 8080 = api-gateway (the one intended public entry point); the rest are exposed for local
# debugging only — see docker-compose.yml's note on why they're loopback-only there.
EXPOSE 8080 8081 8082 8083 8084 8085 8086 8087 8761 8888

HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=12 \
    CMD bash -c '</dev/tcp/localhost/8080' || exit 1

ENTRYPOINT ["./start-all.sh"]
