# Security Policy

Voltage takes the security and integrity of user deployments, edge proxies, and environment secrets with the utmost seriousness.

---

## Supported Versions

Security updates and patches are actively maintained for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability or potential risk within Voltage:

1. **Do NOT disclose the issue publicly** via GitHub Issues, Discussions, or social media.
2. Email a detailed vulnerability report to the repository maintainer or open a private [GitHub Security Advisory](https://github.com/Rishabh028/Voltage/security/advisories/new).
3. Include the following details in your report:
   - Type of vulnerability (e.g., remote code execution, secret exposure, proxy bypass, path traversal).
   - Step-by-step reproduction steps or proof-of-concept (PoC).
   - Affected service (`control-plane`, `edge-router`, `dashboard`, `cli`).
   - Potential impact on production clusters or edge workloads.

---

## Response Timeline

- **Initial Acknowledgment**: Within 24-48 hours.
- **Triage & Assessment**: Within 3 business days.
- **Fix & Patch Deployment**: Critical severity vulnerabilities are prioritized for immediate hotfix releases.

---

## Security Architecture & Best Practices

Voltage implements defense-in-depth principles:

1. **Secret Encryption**: All environment variables and sensitive configuration values are encrypted at rest using AES-256-GCM.
2. **Build Isolation**: Containerless and worker builds run in scoped sandbox directories with restricted filesystem and network access.
3. **Dual-Stack Proxy Boundaries**: The edge router validates Host headers against registered routing tables to prevent HTTP host header injection and cache poisoning attacks.
4. **Header Sanitization**: Reverse proxy requests automatically strip internal headers and inject security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).
