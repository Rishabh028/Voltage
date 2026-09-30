import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { IncomingMessage, ServerResponse } from 'http';
import * as mime from 'mime-types';
import { LRUCache } from 'lru-cache';
import { config } from './config.js';
import { render404 } from './pages/404.js';

const s3 = new S3Client({
  region: config.S3_REGION,
  endpoint: config.S3_ENDPOINT,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

const manifestCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 60000, // 1 minute
});

function sanitizePath(path: string): string | null {
  // Decode the path first to catch encoded traversal attempts
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null; // Malformed encoding
  }

  // Block all traversal patterns (decoded and raw)
  const traversalPatterns = ['../', '..\\', '%2e%2e', '%2E%2E', '%2e%2E', '%2E%2e', '\0'];
  for (const pattern of traversalPatterns) {
    if (path.includes(pattern) || decoded.includes(pattern)) {
      return null;
    }
  }

  // Block absolute paths
  if (decoded.startsWith('/') && decoded.length > 1 && decoded[1] === '/') {
    return null;
  }

  // Block null bytes
  if (decoded.includes('\0') || path.includes('%00')) {
    return null;
  }

  // Remove query params and fragment
  let cleanPath = decoded.split('?')[0].split('#')[0];

  // Remove leading slash
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  // Normalize backslashes to forward slashes
  cleanPath = cleanPath.replace(/\\/g, '/');

  // Reject if still contains ..
  if (cleanPath.includes('..')) {
    return null;
  }

  // Empty path means root, so index.html
  if (cleanPath === '') {
    cleanPath = 'index.html';
  }

  return cleanPath;
}

async function getManifest(deploymentId: string): Promise<any | null> {
  if (manifestCache.has(deploymentId)) {
    return manifestCache.get(deploymentId);
  }

  try {
    const cmd = new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: `deployments/\${deploymentId}/manifest.json`,
    });
    
    const response = await s3.send(cmd);
    if (!response.Body) return null;
    
    const str = await response.Body.transformToString();
    const manifest = JSON.parse(str);
    manifestCache.set(deploymentId, manifest);
    return manifest;
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return null;
    }
    console.error(`Error fetching manifest for deployment \${deploymentId}:`, error);
    return null;
  }
}

export async function serveAsset(req: IncomingMessage, res: ServerResponse, deploymentId: string, rawPath: string): Promise<void> {
  const path = sanitizePath(rawPath);
  
  if (!path) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Invalid Path');
    return;
  }

  const manifest = await getManifest(deploymentId);
  
  let targetPath = path;
  
  // If manifest exists, we can be smart
  if (manifest) {
    const isSPA = manifest.isSPA === true;
    const files = manifest.files || [];
    
    // Check if the requested file is exactly in the manifest
    const isFileMatch = files.includes(targetPath);
    
    if (!isFileMatch) {
      if (isSPA) {
        // Simple heuristic: if it doesn't look like a file (no extension), serve index.html
        if (!targetPath.includes('.') || !files.includes(targetPath)) {
          targetPath = 'index.html';
        }
      } else {
        // Not SPA and no file match -> 404
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(render404(req.headers.host || 'unknown'));
        return;
      }
    }
  }

  try {
    const cmd = new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: `deployments/\${deploymentId}/\${targetPath}`,
    });

    const response = await s3.send(cmd);
    
    if (!response.Body) {
      throw new Error("Empty body");
    }

    const contentType = mime.lookup(targetPath) || 'application/octet-stream';
    
    // Cache headers
    let cacheControl = 'public, max-age=31536000, immutable';
    // If it's index.html or doesn't have a hash-like pattern, no-cache
    if (targetPath === 'index.html' || !/\\.[0-9a-fA-F]{8,}\\.(js|css|woff2?|png|jpg|jpeg|gif|webp)$/.test(targetPath)) {
      cacheControl = 'no-cache, no-store, must-revalidate';
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'X-Deployment-Id': deploymentId,
      ...(response.ContentLength && { 'Content-Length': response.ContentLength.toString() }),
      ...(response.ETag && { 'ETag': response.ETag }),
    });

    // Stream the body to the response
    (response.Body as any).pipe(res);
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(render404(req.headers.host || 'unknown'));
    } else {
      console.error(`Error serving asset \${targetPath} for deployment \${deploymentId}:`, error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
}

// For testing
export function _clearManifestCache() {
  manifestCache.clear();
}
