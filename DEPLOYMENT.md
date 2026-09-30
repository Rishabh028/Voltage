# Voltage — Production Deployment Guide

This guide covers deploying Voltage to the free-tier infrastructure stack.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Cloudflare  │────▶│  Oracle ARM  │────▶│ Cloudflare  │
│  DNS + SSL   │     │  VM          │     │ R2          │
│  *.voltage.  │     │  - proxy     │     │ (assets)    │
│  site        │     │  - control   │     └─────────────┘
└─────────────┘     │  - redis     │
                    │  - caddy     │     ┌─────────────┐
                    └──────────────┘     │  Vercel     │
                                        │  (dashboard) │
                                        └─────────────┘
```

## Prerequisites

- Oracle Cloud free-tier account with ARM A1 Flex VM (4 OCPU, 24GB RAM)
- Cloudflare account with a domain (for wildcard DNS)
- Cloudflare R2 bucket (free tier: 10GB storage, 10M class B ops/month)
- Vercel account (for dashboard hosting)
- GitHub OAuth App (for user authentication)

## Step 1: Provision Oracle Cloud VM

1. Create an ARM A1.Flex instance with Oracle Linux or Ubuntu 22.04
2. Shape: 1-2 OCPUs, 6-12GB RAM (free tier allows up to 4 OCPUs / 24GB across all A1 instances)
3. Open ports in security list: 80, 443, 22
4. SSH in and install Docker:

```bash
# Ubuntu
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in
```

## Step 2: Configure Cloudflare DNS

1. Add your domain to Cloudflare
2. Create DNS records:
   - `A @ <VM-IP>` (proxied)
   - `A * <VM-IP>` (proxied) — wildcard for subdomains
3. SSL/TLS mode: **Full (Strict)**

## Step 3: Configure Cloudflare R2

1. Create an R2 bucket named `voltage-deployments`
2. Enable public access (or use custom domain for R2)
3. Generate R2 API tokens:
   - Create token with "Object Read & Write" permissions
   - Note the Access Key ID and Secret Access Key
   - Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

## Step 4: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. New OAuth App:
   - Application name: `Voltage`
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://dashboard.your-domain.com/api/auth/callback/github`
3. Note Client ID and generate Client Secret

## Step 5: Create GitHub Webhook (per repo)

1. In each connected repo: Settings → Webhooks → Add webhook
2. Payload URL: `https://your-domain.com/webhooks/github` (or control-plane URL)
3. Content type: `application/json`
4. Secret: Same as GITHUB_WEBHOOK_SECRET env var
5. Events: Just the push event

## Step 6: Deploy to VM

1. Clone the Voltage repo to the VM:
```bash
git clone https://github.com/your-username/voltage.git
cd voltage
```

2. Create `.env` from `.env.example`:
```bash
cp .env.example .env
nano .env
```

3. Fill in production values:
```env
REDIS_URL=redis://redis:6379
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=voltage-deployments
S3_ACCESS_KEY=<r2-access-key-id>
S3_SECRET_KEY=<r2-secret-access-key>
S3_REGION=auto
GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>
GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
JWT_SECRET=<random-64-char-hex>
NEXTAUTH_SECRET=<random-64-char-hex>
NEXTAUTH_URL=https://dashboard.your-domain.com
CONTROL_PLANE_URL=https://api.your-domain.com
BASE_DOMAIN=your-domain.com
```

4. Build the builder image:
```bash
docker build -t voltage-builder:latest ./builder-image
```

5. Start services with production compose:
```bash
docker compose -f docker-compose.prod.yml up -d
```

## Step 7: Configure TLS with Caddy

The `docker-compose.prod.yml` includes Caddy as a reverse proxy for TLS termination. It handles:
- Automatic HTTPS via Let's Encrypt
- Wildcard certificate via Cloudflare DNS challenge

Create `Caddyfile`:
```
{
    email your-email@example.com
}

# Control plane API
api.your-domain.com {
    reverse_proxy control-plane:3001
}

# Reverse proxy (wildcard subdomains)
*.your-domain.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy reverse-proxy:8080
}
```

## Step 8: Deploy Dashboard to Vercel

1. Push the `dashboard/` directory to a Git repo
2. Import to Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://api.your-domain.com`
   - `NEXTAUTH_URL=https://dashboard.your-domain.com`
   - `NEXTAUTH_SECRET=<same as .env>`
   - `GITHUB_CLIENT_ID=<same as .env>`
   - `GITHUB_CLIENT_SECRET=<same as .env>`

## Step 9: Smoke Test

```bash
# 1. Sign in via dashboard
# 2. Create a project with a public GitHub repo
# 3. Click Deploy
# 4. Watch build logs stream in real time
# 5. Once LIVE, visit <subdomain>.your-domain.com
# 6. Verify the site loads

# Manual verification:
curl -H "Host: test-project.your-domain.com" http://localhost:8080
```

## docker-compose.prod.yml

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory-policy noeviction --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis-data:/data
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
    environment:
      - CF_API_TOKEN=${CF_API_TOKEN}
    restart: unless-stopped

  control-plane:
    build: ./control-plane
    env_file: .env
    environment:
      - REDIS_URL=redis://redis:6379
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

  reverse-proxy:
    build: ./reverse-proxy
    env_file: .env
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

volumes:
  redis-data:
  caddy-data:
  caddy-config:
```

## Monitoring

### Health Checks
- Control plane: `GET http://localhost:3001/health`
- Reverse proxy: `GET http://localhost:8080/__voltage/health`
- Redis: `redis-cli ping`

### Logs
```bash
docker compose -f docker-compose.prod.yml logs -f control-plane
docker compose -f docker-compose.prod.yml logs -f reverse-proxy
```

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build containers fail to start | Docker socket not mounted | Check `docker.sock` volume in compose |
| Assets not loading | S3/R2 credentials wrong | Verify R2 access keys and endpoint |
| Webhook not firing | Wrong webhook URL or secret | Check GitHub webhook settings and GITHUB_WEBHOOK_SECRET |
| SSL errors | Cloudflare SSL mode not Full (Strict) | Set SSL mode in Cloudflare dashboard |
| Subdomain not resolving | Missing wildcard DNS | Add `A *` record in Cloudflare |
