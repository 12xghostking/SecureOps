# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /source

# Copy solution and csproj files for optimal layer caching
COPY SecureOps.slnx ./
COPY src/SecureOps.Domain/SecureOps.Domain.csproj src/SecureOps.Domain/
COPY src/SecureOps.Application/SecureOps.Application.csproj src/SecureOps.Application/
COPY src/SecureOps.Infrastructure/SecureOps.Infrastructure.csproj src/SecureOps.Infrastructure/
COPY src/SecureOps.Api/SecureOps.Api.csproj src/SecureOps.Api/
COPY tests/SecureOps.UnitTests/SecureOps.UnitTests.csproj tests/SecureOps.UnitTests/
COPY tests/SecureOps.IntegrationTests/SecureOps.IntegrationTests.csproj tests/SecureOps.IntegrationTests/

RUN dotnet restore src/SecureOps.Api/SecureOps.Api.csproj

# Copy source code and publish
COPY src/ src/
WORKDIR /source/src/SecureOps.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

# Hardened Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Create non-root user and group (UID/GID 10001)
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

COPY --from=build --chown=appuser:appgroup /app/publish ./

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0 \
    ASPNETCORE_ENVIRONMENT=Production

USER 10001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "SecureOps.Api.dll"]
