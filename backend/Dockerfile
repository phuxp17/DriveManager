FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn --batch-mode dependency:go-offline
COPY src src
RUN mvn --batch-mode -DskipTests package && cp target/*.jar /tmp/app.jar

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl && addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=build /tmp/app.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=6 \
    CMD curl --fail --silent http://localhost:8080/actuator/health >/dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
