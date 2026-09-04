FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -q -pl api-gateway -am -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/api-gateway/target/api-gateway.jar app.jar
EXPOSE 8080
# Shell form (not exec-array) so ${PORT} actually expands. Render assigns a dynamic $PORT and
# routes traffic only to that port; config-repo/api-gateway.yml pins server.port to a fixed 8080
# for local/docker-compose use, so it can't be relied on here. A --server.port command-line arg
# outranks both that remote Config Server value and any OS env var in Spring's property-source
# order, so this reliably wins. Falls back to 8080 when $PORT is unset (local `docker run`,
# docker-compose — unchanged behavior, since neither sets PORT).
ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT:-8080}"]
