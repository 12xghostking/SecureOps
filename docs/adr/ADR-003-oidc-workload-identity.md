# ADR-003: Zero-Secret CI/CD via OIDC Workload Identity Federation

## Status
Accepted

## Context
Storing static cloud credentials (such as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or Azure Service Principal secrets) in CI/CD secret vaults is a primary source of enterprise credential theft and cloud account compromise. Static secrets lack expiration dates, have broad permissions, and require constant manual rotation.

## Decision
We decided to eliminate all static cloud credentials in favor of **OpenID Connect (OIDC) Workload Identity Federation**:

1. GitHub Actions acts as an OIDC Identity Provider (`token.actions.githubusercontent.com`).
2. Workflows declare `permissions: id-token: write` to request short-lived, cryptographically signed JSON Web Tokens (JWTs).
3. Cloud Security Token Services (AWS STS, Azure AD, GCP STS) validate the JWT signature against GitHub's public JWKS.
4. Cloud IAM roles enforce strict Subject (`sub`) claim conditions:
   ```json
   "StringLike": {
     "token.actions.githubusercontent.com:sub": [
       "repo:organization/SecureOps:environment:production",
       "repo:organization/SecureOps:ref:refs/heads/main"
     ]
   }
   ```
5. The runner receives temporary cloud credentials with a 1-hour Time-To-Live (TTL).

## Consequences

### Positive
- Zero long-lived cloud credentials stored in GitHub repository secrets.
- Automatic credential expiration after 60 minutes.
- Fine-grained role assumption restricted strictly to repository, environment, and branch boundaries.
- Comprehensive cloud audit logging (AWS CloudTrail / Azure Activity Log) tagging actions to specific GitHub Run IDs and commit SHAs.

### Negative / Trade-offs
- Requires initial OIDC Provider configuration in cloud IAM.
- Workflows cannot run offline against real cloud infrastructure without active identity provider reachability.
