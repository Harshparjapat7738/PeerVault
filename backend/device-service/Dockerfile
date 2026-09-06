FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -q -pl device-service -am -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/device-service/target/device-service.jar app.jar
EXPOSE 8082
ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT:-8082}"]
