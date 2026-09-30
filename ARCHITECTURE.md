# 🏛️ Voltage Architecture & Technical Specification

This document provides a deep architectural walkthrough of the **Voltage** cloud deployment platform, covering the design patterns, runtime components, routing mechanics, and fault-tolerance strategies.

---

## 1. High-Level Architecture Overview

Voltage is designed around a decoupled, service-oriented architecture comprising four primary tiers:

```
┌────────────────────────────────────────────────────────┐
│                   Developer Client                     │
│         (Browser Dashboard, CLI, GitHub Webhook)       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Edge Routing & Reverse Proxy Tier           │
│  - Hostname & Subdomain Extraction (*.localhost:3001)  │
│  - Path Routing (/sites/:subdomain/*)                  │
│  - Static Asset MIME Resolution & SPA Fallbacks        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Control Plane Service Tier               │
│  - REST API Engine (Express, Zod, JWT)                 │
│  - Native Builder Pipeline (Zero-Docker child_process) │
│  - SSE Build Log Fan-out (EventEmitter & Redis pubsub) │
│  - Circuit-Breaker State Store (Postgres & Disk JSON)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Storage & Artifact Tier               │
│  - Deployment Bundles (storage/deployments/<id>/)      │
│  - Build Workspaces (storage/builds/<id>/)             │
│  - Persistent Metadata (storage/state.json)            │
└────────────────────────────────────────────────────────┘
```

---

## 2. Native Edge Builder Engine

The builder engine (`control-plane/src/services/native-builder.ts`) automates repository compilation without requiring Docker daemon privileges:

### Pipeline Execution Stages:
1. **Source Resolution**:
   - Remote repositories are shallow cloned via `git clone --depth 1 <gitUrl> .`.
   - Local directory paths (e.g. `C:\Users\...\SeatLock`) are detected and mirrored into an isolated workspace directory (`storage/builds/<deploymentId>/`).
2. **Framework & Monorepo Auto-Discovery**:
   - Inspects workspace for frontend monorepo subdirectories (`packages/frontend`, `frontend`, `client`).
   - Parses `package.json` to identify dependencies:
     - **Next.js**: Automatically handles App Router & Pages Router.
     - **Vite / React / Vue**: Standard bundle detection.
     - **Static HTML**: Static serving mode without build script.
3. **Dependency Installation**:
   - Executes `npm install --prefer-offline --no-audit --no-fund` in the target package root.
4. **Compilation & Artifact Extraction**:
   - Runs `npm run build` or custom `buildCommand`.
   - Locates output directories in order of precedence: `out/`, `dist/`, `build/`, `.next/`.
   - For Next.js projects:
     - Pre-rendered static HTML pages are extracted from `.next/server/app` or `.next/server/pages`.
     - Client JavaScript and CSS chunks are mapped into `_next/static/`.
     - Static assets from `public/` are unified into the bundle root.
5. **Deployment Manifest & Routing Activation**:
   - Writes `manifest.json` containing `deploymentId`, `projectId`, `subdomain`, and timestamp.
   - Transitions deployment status to `LIVE` and registers active routes in the Edge Router.

---

## 3. Dynamic Edge Site Server & Subdomain Routing

The Edge Site Server (`control-plane/src/services/site-server.ts`) handles incoming HTTP traffic for all deployed web applications:

### Dual Routing Modes:

#### A. Subdomain Host Routing (`http://<subdomain>.localhost:3001`)
- Modern browsers (Chrome, Edge, Firefox) treat `*.localhost` as a special top-level domain and automatically resolve all subdomains to IPv4 `127.0.0.1` and IPv6 `::1`.
- When a request arrives at `http://seatlock.localhost:3001`:
  1. The middleware parses `req.headers.host`, extracting subdomain `seatlock`.
  2. Resolves `activeDeploymentId` via in-memory lookup, route map, or filesystem `manifest.json`.
  3. Serves the static assets directly from `storage/deployments/<deploymentId>/`.

#### B. Direct Path Routing (`http://localhost:3001/sites/<subdomain>/`)
- Fallback path router for environments where wildcard subdomains are restricted.
- All asset requests are routed to the corresponding deployment directory.

### Asset Serving & SPA Fallback Logic:
1. **Exact File Match**: If `path.join(deploymentDir, reqPath)` is a valid file, streams file with `mime-types` header and `Cache-Control`.
2. **HTML Extension Resolution**: If `/about` is requested and `about.html` exists, serves HTML with UTF-8 charset.
3. **SPA Fallback**: If no static file matches (client-side routed paths like `/dashboard` or `/settings`), serves root `index.html` to enable client-side routers (React Router, Next.js client router) to mount cleanly.

---

## 4. Persistent State Engine & Offline Circuit Breaker

The state service (`control-plane/src/services/state.ts`) implements enterprise-grade resilience:

```mermaid
flowchart LR
    Request["State Operation"] --> CB{"Circuit Breaker: Is DB Online?"}
    CB -->|Yes| DB["PostgreSQL / Prisma Query (600ms timeout)"]
    DB -->|Success| Save["Sync to inMem & storage/state.json"]
    DB -->|Timeout / Offline| Trip["Trip Circuit Breaker (Offline for 60s)"]
    Trip --> Fallback["In-Memory & storage/state.json Store"]
    CB -->|No (Tripped)| Fallback
```

- **Immediate Responsiveness**: When PostgreSQL or Redis is offline (e.g. during local offline development), requests execute within sub-5ms latency rather than hanging on unreachable socket timeouts.
- **Persistent Disk Snapshot**: Every project creation, deployment update, and route registration is synchronized to `storage/state.json`. Deployments and settings persist across dev server reboots and IDE sessions.
- **Offline Redis Guard**: Redis commands are shielded with `this.redis.status === 'ready'` checks to prevent command buffering.

---

## 5. Real-Time Log Fan-Out & SSE Architecture

Build output is streamed line-by-line from the builder process to the developer console:

1. **Child Process Emitter**: `runCommand` hooks into `child.stdout` and `child.stderr`, parsing lines on `\n`.
2. **In-Process Fan-Out**: Logs emit to Node.js `EventEmitter` keyed by `log:${deploymentId}`.
3. **SSE Connection**: The dashboard opens an EventSource connection at `/v1/deployments/:id/events`.
4. **Heartbeat & Reconnection**: Periodic `: heartbeat\n\n` comments keep HTTP connections open across proxies and timeouts.

---

## 6. Secrets & Environment Management

Environment variables are protected with symmetric authenticated encryption:
- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode).
- **Key Derivation**: 256-bit secret key configured via `JWT_SECRET` / `ENCRYPTION_KEY`.
- **Integrity Verification**: Each secret stores a 12-byte initialization vector (`iv`), ciphertext, and a 16-byte authentication tag (`tag`). Any unauthorized tampering triggers authentication rejection before decryption.
