FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -q -pl config-server -am -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/config-server/target/config-server.jar app.jar
# Bakes the native config source into the image so this Dockerfile is deployable standalone (e.g.
# as its own Render private service, per render.yaml) — without this, CONFIG_REPO_LOCATION's default
# (file:../config-repo, i.e. /config-repo from WORKDIR /app) points at nothing in the runtime image,
# and every downstream service's fail-fast config import would fail immediately. docker-compose still
# overrides CONFIG_REPO_LOCATION to this same path and bind-mounts the live ./config-repo over it
# read-only, so local dev is unaffected — edits there still take effect without an image rebuild.
COPY config-repo /config-repo
ENV CONFIG_REPO_LOCATION=file:/config-repo
EXPOSE 8888
ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT:-8888}"]
