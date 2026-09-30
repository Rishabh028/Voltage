# Voltage — Scope & Design Notes

## What's Included (MVP)

- **Full build pipeline**: git clone → framework detection → npm install → build → upload to S3/MinIO
- **Builder container**: Non-root, resource-limited, capability-dropped Docker container
- **Control plane**: REST API, BullMQ job queue, Docker orchestration, SSE log streaming
- **Reverse proxy**: Wildcard subdomain routing via Redis, S3 asset serving, LRU cache
- **Dashboard**: Next.js 14 with design token system, live terminal, routing constellation
- **Auth**: GitHub OAuth via NextAuth v5, JWT session strategy
- **State machine**: QUEUED → BUILDING → UPLOADING → LIVE | FAILED | TIMED_OUT | ROLLED_BACK
- **Rollback**: Re-point routing table to previous deployment (no rebuild)
- **Custom domains**: CNAME-based, stored in Redis, served by reverse proxy
- **Tests**: Webhook HMAC verification, Docker error paths, routing logic, path traversal

## What's Out of Scope for MVP

### Infrastructure
- **Egress proxy for builder containers**: The builder currently uses the default bridge network. A production deployment should add a Squid/Envoy sidecar with domain allowlisting (npm, yarn, github only). The `voltage-build-net` Docker network is created but not fully restricted.
- **gVisor/Kata runtime**: The builder uses standard `runc`. For untrusted builds, consider `runsc` (gVisor) or Kata Containers. The `Runtime` field is supported by dockerode but not configured.
- **Docker socket proxy**: The control plane mounts `/var/run/docker.sock` directly. Production should use `tecnativa/docker-socket-proxy` to restrict API surface.

### Features
- **Automatic webhook setup**: Users must manually configure GitHub webhooks. The MVP doesn't use GitHub App installation flow.
- **Preview deployments**: Only `main` branch builds. PR preview deploys are not implemented.
- **Build caching**: npm cache is not persisted between builds. Each builder container starts cold.
- **Log rotation / TTL**: Build logs are stored in Redis indefinitely. Production should set TTLs on `logs:*` keys.
- **Rate limiting**: No API rate limiting. Add express-rate-limit for production.
- **Multi-region**: Single-region deployment only.
- **Team/org support**: Single-user projects only. No team sharing.
- **API tokens**: Settings page shows "Coming soon" for API token management.
- **Monitoring/alerting**: No Prometheus metrics, health check alerting, or error tracking integration.

### Security
- **Webhook replay protection**: No timestamp validation on webhook payloads. GitHub sends `X-GitHub-Event` and delivery ID but we don't deduplicate.
- **CSRF**: NextAuth handles CSRF for auth routes. Other mutations rely on JWT bearer auth.
- **Content Security Policy**: No CSP headers on the dashboard (would need configuration for SSE connections).

## Architecture Decisions

### Why npm workspaces (not Turborepo)
Four services with distinct runtimes + one shared package. Turborepo's value (build caching, task graph) is minimal here. npm workspaces are built-in and zero-config. Can be layered on later.

### Why AutoRemove: false
Docker's `--rm` flag (AutoRemove: true) deletes the container immediately on exit, including all logs. We need to inspect exit codes and collect stdout/stderr after the container finishes. The control plane manages cleanup in a `finally` block.

### Why raw http module for the reverse proxy (not Express)
The reverse proxy is on the hot path for every request to deployed sites. Express adds ~1ms of middleware overhead per request. The proxy only needs routing + S3 fetch — no session, no body parsing, no middleware stack.

### Why SSE (not WebSocket)
SSE is simpler to implement, scale, and debug. Build logs are a one-directional stream. SSE works through any HTTP proxy, reconnects automatically, and the browser API (EventSource) handles retry. WebSocket would add complexity for no benefit here.

### Why Redis (not PostgreSQL)
The data model is key-value and hash-based. Redis is fast enough for routing lookups on every proxy request. The routing table (HGET) and log streaming (RPUSH + PUBLISH) map naturally to Redis primitives. PostgreSQL would add latency on the proxy hot path and complexity for what's essentially a cache + pub/sub system.

## Known Limitations

1. **Windows development**: Docker socket mounting doesn't work natively on Windows. Use Docker Desktop with WSL2 backend. The control plane's Docker orchestration requires Linux containers.
2. **Next.js static export only**: The builder forces `output: 'export'` for Next.js projects. SSR/ISR deployments would require a Node.js runtime per deployment, which is out of scope.
3. **Single-host**: All services run on one VM. Scaling the proxy or control plane requires manual setup.
4. **MinIO for local dev**: MinIO emulates S3 but has subtle differences (no presigned URL posting from browser, listing pagination). Production should use Cloudflare R2.
