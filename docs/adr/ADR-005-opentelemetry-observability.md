# ADR-005: OpenTelemetry Observability, Structured Logging, and Distributed Correlation

## Status
Accepted

## Context
Troubleshooting microservice incidents across complex DevSecOps architectures requires unified observability: distributed traces, Prometheus metrics, and structured logs. Without request-level correlation IDs, isolating security gate blocks, slow database transactions, or failed rollbacks across distributed components is nearly impossible.

## Decision
We implemented a standardized observability architecture leveraging **OpenTelemetry** and **Serilog**:

1. **Distributed Correlation ID Propagation**:
   - `CorrelationIdMiddleware` inspects incoming HTTP requests for `X-Correlation-Id`.
   - If present, it adopts and echoes it in response headers; if absent, it generates a cryptographically random UUID.
   - The correlation ID is pushed into Serilog's `LogContext` and attached to all outgoing OpenTelemetry trace spans.
2. **Prometheus Metrics Endpoint**:
   - `OpenTelemetry.Exporter.Prometheus.AspNetCore` exposes live metrics at `/metrics`.
   - Captures runtime metrics (GC collection counts, heap allocations, thread pool queue lengths) and ASP.NET Core HTTP server metrics (request duration, status code distributions, active requests).
3. **Structured RFC 7807 Error Responses**:
   - `ExceptionHandlingMiddleware` transforms unhandled server exceptions into RFC 7807 `application/problem+json` envelopes.
   - Every error response includes `instance`, `status`, `title`, `detail`, `traceId`, and `correlationId` for client-to-backend traceability.

## Consequences

### Positive
- Instant end-to-end trace correlation from browser client to backend services and database operations.
- Native Prometheus scraping compatibility without proprietary agent requirements.
- Standardized, machine-readable API error contracts preventing stack trace leakage.

### Negative / Trade-offs
- Slight memory footprint increase for OpenTelemetry in-process metrics aggregators.
