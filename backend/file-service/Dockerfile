FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -q -pl file-service -am -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/file-service/target/file-service.jar app.jar
EXPOSE 8083
ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT:-8083}"]
