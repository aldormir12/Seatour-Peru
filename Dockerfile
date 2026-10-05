FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -B -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system seatour \
    && useradd --system --gid seatour --home-dir /app seatour \
    && mkdir -p /app/uploads/tours /app/uploads/embarcaciones \
    && chown -R seatour:seatour /app
WORKDIR /app
COPY --from=build --chown=seatour:seatour /workspace/target/*.jar /app/seatour.jar
USER seatour
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/seatour.jar"]
