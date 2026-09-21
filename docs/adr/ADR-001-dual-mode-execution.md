# ADR-001: Zero-Friction Dual-Mode Execution Architecture

## Status
Accepted

## Context
Developers, evaluators, and automated CI runners have diverse development environments. Requiring an active Docker daemon, live Kubernetes cluster, or paid cloud database just to test or debug an API microservice creates friction and onboarding delays. Conversely, relying solely on local in-memory mocks fails to validate real Linux container behaviors, network policies, and production relational database semantics.

## Decision
We adopted a **Zero-Friction Dual-Mode Execution Architecture**:

1. **Mode 1: Host Development with Automatic Fallback (Zero Dependency)**
   - Developers can run `dotnet run --project src/SecureOps.Api` and `npm run dev` directly on the host machine.
   - If PostgreSQL is absent or unreachable on `localhost:5432`, the EF Core provider configuration gracefully falls back to local SQLite (`secureops.db`) or InMemory, allowing instant offline development without requiring Docker.
2. **Mode 2: Containerized Dev & Production Simulation (Docker Compose / Kubernetes)**
   - Running `docker compose up --build` launches the complete multi-tier topology: hardened Alpine-based .NET 8 API, unprivileged Nginx React SPA, PostgreSQL 16 on port 5433 (preventing port collision with local Windows services), and Redis 7.
   - Kubernetes Kustomize manifests (`infrastructure/kubernetes/base` and `overlays`) reflect identical service contracts with production-grade pod security standards.

## Consequences

### Positive
- Onboarding time reduced to under 60 seconds (`dotnet run` or `docker compose up`).
- 100% reproducible test environments across Windows, macOS, and Linux runners.
- Elimination of external cloud dependency requirements for local portfolio testing.

### Negative / Trade-offs
- Requires maintaining SQLite compatibility (e.g. `DateTimeOffsetToStringConverter` for EF Core query translations).
- Requires conditional connection string parsing in `SecureOps.Infrastructure/DependencyInjection.cs`.
