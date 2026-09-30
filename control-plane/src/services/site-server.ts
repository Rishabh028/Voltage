import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import mime from 'mime-types';
import { StateService } from './state.js';
import { config } from '../config.js';
import { Redis } from 'ioredis';
import { DEPLOYMENTS_DIR } from './native-builder.js';

const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
redis.on('error', () => {});
const state = new StateService(redis);

function serveFileFromDeployment(deploymentDir: string, reqPath: string, res: Response): boolean {
  let cleanPath = reqPath.split('?')[0].split('#')[0];
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
  if (cleanPath === '' || cleanPath.endsWith('/')) cleanPath += 'index.html';

  let filePath = path.join(deploymentDir, cleanPath);

  // 1. If exact file exists, serve it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  // 2. Check for .html extension (e.g. /dashboard -> /dashboard.html)
  if (fs.existsSync(filePath + '.html') && fs.statSync(filePath + '.html').isFile()) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    fs.createReadStream(filePath + '.html').pipe(res);
    return true;
  }

  // 3. SPA fallback: return index.html for client-side routing
  const indexHtmlPath = path.join(deploymentDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(indexHtmlPath).pipe(res);
    return true;
  }

  return false;
}

async function resolveDeployment(subdomain: string): Promise<string | null> {
  // A. Check in-memory/redis route by base domain
  let deploymentId = await state.getRoute(`${subdomain}.${config.BASE_DOMAIN}`);
  if (deploymentId) return deploymentId;

  // B. Check in-memory/redis route by localhost hostname
  deploymentId = await state.getRoute(`${subdomain}.localhost`);
  if (deploymentId) return deploymentId;

  // C. Check project record by subdomain
  const proj = await state.getProjectBySubdomain(subdomain);
  if (proj && proj.activeDeploymentId) {
    return proj.activeDeploymentId;
  }

  // D. Search storage/deployments manifests
  if (fs.existsSync(DEPLOYMENTS_DIR)) {
    const entries = fs.readdirSync(DEPLOYMENTS_DIR);
    for (const entry of entries) {
      const manifestPath = path.join(DEPLOYMENTS_DIR, entry, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (m.subdomain === subdomain || entry === subdomain) {
            return entry;
          }
        } catch (e) {}
      }
    }
  }

  return null;
}

function renderDeployingPage(subdomain: string, res: Response) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>${subdomain} - Voltage Edge</title></head>
<body style="font-family: monospace; background: #0A0D14; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="text-align: center; border: 1px solid rgba(255,255,255,0.1); padding: 2.5rem; border-radius: 1rem; background: rgba(255,255,255,0.03); max-width: 480px;">
    <h2 style="color: #34D399; margin-top: 0;">⚡ Voltage Edge Routing</h2>
    <p style="font-size: 1.1rem;">Project <strong>${subdomain}</strong> is provisioning or building.</p>
    <p style="color: rgba(255,255,255,0.5); font-size: 0.85rem; line-height: 1.5;">Check your Voltage dashboard build terminal for real-time progress. Refresh once the build completes.</p>
  </div>
</body>
</html>`);
}

export async function siteServerMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || '';
  const hostWithoutPort = host.split(':')[0].toLowerCase();

  // 1. Subdomain Host Routing: e.g. seatlock.localhost:3001 or myapp.voltage.localhost
  if (hostWithoutPort !== 'localhost' && hostWithoutPort !== '127.0.0.1' && !req.path.startsWith('/api') && !req.path.startsWith('/v1')) {
    const subdomain = hostWithoutPort.split('.')[0];
    const deploymentId = await resolveDeployment(subdomain);

    if (deploymentId) {
      const depDir = path.join(DEPLOYMENTS_DIR, deploymentId);
      if (fs.existsSync(depDir)) {
        const served = serveFileFromDeployment(depDir, req.path, res);
        if (served) return;
      }
    }

    renderDeployingPage(subdomain, res);
    return;
  }

  // 2. Direct Path Routing: /sites/:subdomain/*
  if (req.path.startsWith('/sites/')) {
    const segments = req.path.split('/').filter(Boolean); // ['sites', 'subdomain', ...]
    const subdomain = segments[1];
    const subPath = '/' + segments.slice(2).join('/');

    if (subdomain) {
      const deploymentId = await resolveDeployment(subdomain);

      if (deploymentId) {
        const depDir = path.join(DEPLOYMENTS_DIR, deploymentId);
        if (fs.existsSync(depDir)) {
          const served = serveFileFromDeployment(depDir, subPath, res);
          if (served) return;
        }
      }

      renderDeployingPage(subdomain, res);
      return;
    }
  }

  next();
}
