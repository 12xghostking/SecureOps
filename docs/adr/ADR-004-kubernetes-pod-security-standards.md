# ADR-004: Kubernetes Pod Security Standards & Zero-Trust Network Policies

## Status
Accepted

## Context
Default Kubernetes cluster deployments permit root container execution, privilege escalation, writable root filesystems, and uninhibited cross-namespace network communication (flat network). If a web application pod is compromised via remote code execution, an attacker can pivot across the entire cluster, modify container binaries, or access backend databases.

## Decision
We adopted the highest tier of Kubernetes hardening across all workloads:

1. **Pod Security Standards (PSS) `restricted` Profile**:
   - Workload namespaces are annotated with `pod-security.kubernetes.io/enforce: restricted`.
   - PodSpecs explicitly configure:
     - `runAsNonRoot: true` with dedicated unprivileged UIDs (`10001` for .NET, `10101` for Nginx).
     - `allowPrivilegeEscalation: false`.
     - `readOnlyRootFilesystem: true` (ephemeral `/tmp` mounted via memory-backed `emptyDir`).
     - `capabilities: drop: ["ALL"]`.
     - `seccompProfile: type: RuntimeDefault`.
     - `automountServiceAccountToken: false` (prevents pods from querying the Kubernetes API).
2. **Zero-Trust Network Policies**:
   - `default-deny-all` blocks all inbound and outbound pod traffic.
   - Specific microsegmentation policies allow only:
     - Web ingress on port 8080.
     - Web-to-API egress/ingress on port 5000.
     - API-to-Postgres (5432) and API-to-Redis (6379).
     - Cluster DNS resolution (port 53 UDP/TCP).

## Consequences

### Positive
- Prevents container breakout and host node privilege escalation.
- Eliminates lateral movement if an edge pod is compromised.
- Fully compliant with CIS Kubernetes Benchmark and NSA/CISA Kubernetes Hardening Guidance.

### Negative / Trade-offs
- Writable directories must be explicitly mounted via `emptyDir` volumes.
- Network policies require container network interfaces (CNI) supporting NetworkPolicy enforcement (e.g., Calico, Cilium, AWS VPC CNI with network policy enabled).
