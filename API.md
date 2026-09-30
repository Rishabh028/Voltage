# 📖 Voltage REST API Reference

The Voltage Control Plane exposes a comprehensive REST API for managing organizations, projects, deployments, custom domains, and encrypted environment variables.

**Base URL**: `http://localhost:3001` (or your production control plane domain)  
**Authentication**: `Authorization: Bearer <TOKEN>` (or `Bearer dev-token` during local development)

---

## 1. Projects API

### List Projects
```http
GET /v1/projects
```
**Response (200 OK)**:
```json
[
  {
    "id": "a7a575a7-0469-df62-4a5b-9d0d21ecaa11",
    "ownerId": "dev-user-local",
    "name": "seatlock",
    "gitUrl": "https://github.com/seatlock/seatlock",
    "subdomain": "seatlock",
    "framework": "nextjs",
    "status": "LIVE",
    "createdAt": 1790711073203
  }
]
```

### Create Project
```http
POST /v1/projects
Content-Type: application/json

{
  "name": "my-portfolio",
  "gitUrl": "https://github.com/username/portfolio",
  "buildCommand": "npm run build",
  "rootDirectory": "."
}
```
**Response (201 Created)**:
```json
{
  "id": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
  "name": "my-portfolio",
  "subdomain": "my-portfolio",
  "status": "PENDING"
}
```

### Get Project Details
```http
GET /v1/projects/:id
```

### Update Project
```http
PATCH /v1/projects/:id
Content-Type: application/json

{
  "name": "portfolio-redesign",
  "buildCommand": "npm run build:prod"
}
```

### Delete Project
```http
DELETE /v1/projects/:id
```
**Response (204 No Content)**

---

## 2. Deployments API

### Trigger a Deployment
```http
POST /v1/deployments
Content-Type: application/json

{
  "projectId": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
  "branch": "main",
  "commitMessage": "Production release"
}
```
**Response (202 Accepted)**:
```json
{
  "id": "a86fe663-9fea-9c97-d0b1-960785d209ed",
  "projectId": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
  "status": "BUILDING",
  "branch": "main",
  "isProduction": true,
  "createdAt": 1790711073283
}
```

### Get Deployment Status
```http
GET /v1/deployments/:id
```
**Response (200 OK)**:
```json
{
  "id": "a86fe663-9fea-9c97-d0b1-960785d209ed",
  "status": "LIVE",
  "duration": "14.2s",
  "previewUrl": "http://my-portfolio.localhost:3001"
}
```

### Stream Live Build Logs (SSE)
```http
GET /v1/deployments/:id/events
Accept: text/event-stream
```
**Stream Output**:
```
data: {"ts":1790711073290,"log":"[VOLTAGE] Initializing native edge build pipeline"}
data: {"ts":1790711074120,"log":"[CLONE] Resolving repository source..."}
data: {"ts":1790711077500,"log":"[BUILD] Production build compiled successfully."}
data: {"ts":1790711078100,"log":"[LIVE] Production URL: http://my-portfolio.localhost:3001"}
```

### Get Historic Logs
```http
GET /v1/deployments/:id/logs
```

### Rollback to Deployment
```http
POST /v1/deployments/:id/rollback
```
**Response (200 OK)**:
```json
{
  "success": true
}
```

---

## 3. Domains API

### List Project Domains
```http
GET /v1/projects/:projectId/domains
```

### Add Custom Domain
```http
POST /v1/projects/:projectId/domains
Content-Type: application/json

{
  "hostname": "app.example.com"
}
```

### Verify Domain DNS Records
```http
POST /v1/domains/:id/verify
```

---

## 4. Environments & Secrets API

### List Environment Variables
```http
GET /v1/projects/:projectId/env
```

### Set Encrypted Variable
```http
POST /v1/projects/:projectId/env
Content-Type: application/json

{
  "key": "DATABASE_URL",
  "value": "postgresql://user:pass@db.example.com/prod",
  "target": ["production", "preview"]
}
```
*(Values are automatically encrypted with AES-256-GCM before storage)*

---

## 5. Webhooks API

### GitHub Webhook Ingestion
```http
POST /v1/webhooks
X-GitHub-Event: push
X-Hub-Signature-256: sha256=...
Content-Type: application/json

{
  "ref": "refs/heads/main",
  "repository": {
    "full_name": "username/portfolio"
  },
  "head_commit": {
    "id": "7f8e901",
    "message": "fix: update layout styling"
  }
}
```
Automatically queues and executes edge deployments for connected repositories.
