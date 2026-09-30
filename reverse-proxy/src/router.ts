import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { config } from './config.js';

const redis = new Redis(config.REDIS_URL);

const cache = new LRUCache<string, string | null>({
  max: config.CACHE_MAX_ENTRIES,
  ttl: config.CACHE_TTL_MS,
});

function normalizeHostname(hostname: string): string {
  return hostname.split(':')[0].toLowerCase();
}

export async function resolve(rawHostname: string): Promise<string | null> {
  const hostname = normalizeHostname(rawHostname);
  
  if (cache.has(hostname)) {
    return cache.get(hostname)!;
  }

  let deploymentId: string | null = null;

  try {
    const redisId = await redis.hget('routes', hostname);
    deploymentId = redisId || null;
  } catch (error) {
    console.error(`Redis error resolving hostname \${hostname}:`, error);
  }

  cache.set(hostname, deploymentId);
  return deploymentId;
}

export function invalidate(rawHostname: string): void {
  const hostname = normalizeHostname(rawHostname);
  cache.delete(hostname);
}

// For testing purposes
export function _clearCache() {
  cache.clear();
}
