import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve, invalidate, _clearCache } from '../router.js';
import Redis from 'ioredis';

vi.mock('ioredis', () => {
  const MockRedis = vi.fn();
  MockRedis.prototype.hget = vi.fn();
  return { default: MockRedis };
});

describe('Router', () => {
  let redisInstance: any;

  beforeEach(() => {
    _clearCache();
    vi.useFakeTimers();
    redisInstance = Redis.prototype;
    (redisInstance.hget as any).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('resolves known host to deployment ID', async () => {
    redisInstance.hget.mockResolvedValueOnce('dep-123');
    const result = await resolve('app.voltage.localhost');
    expect(result).toBe('dep-123');
    expect(redisInstance.hget).toHaveBeenCalledWith('routes', 'app.voltage.localhost');
  });

  it('returns null for unknown host', async () => {
    redisInstance.hget.mockResolvedValueOnce(null);
    const result = await resolve('unknown.voltage.localhost');
    expect(result).toBeNull();
  });

  it('normalizes hostname by stripping port and lowercasing', async () => {
    redisInstance.hget.mockResolvedValueOnce('dep-123');
    const result = await resolve('APP.Voltage.Localhost:8080');
    expect(result).toBe('dep-123');
    expect(redisInstance.hget).toHaveBeenCalledWith('routes', 'app.voltage.localhost');
  });

  it('uses LRU cache and avoids redis calls on hit', async () => {
    redisInstance.hget.mockResolvedValueOnce('dep-123');
    
    await resolve('test.localhost');
    expect(redisInstance.hget).toHaveBeenCalledTimes(1);

    await resolve('test.localhost');
    expect(redisInstance.hget).toHaveBeenCalledTimes(1); // Cached
  });

  it('expires cache after TTL', async () => {
    redisInstance.hget.mockResolvedValueOnce('dep-123');
    await resolve('test.localhost');
    expect(redisInstance.hget).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 5001); // Advance past TTL

    redisInstance.hget.mockResolvedValueOnce('dep-123');
    await resolve('test.localhost');
    expect(redisInstance.hget).toHaveBeenCalledTimes(2); // Fetched again
  });
  
  it('invalidate clears cache entry', async () => {
    redisInstance.hget.mockResolvedValueOnce('dep-123');
    await resolve('test.localhost');
    expect(redisInstance.hget).toHaveBeenCalledTimes(1);

    invalidate('test.localhost');

    redisInstance.hget.mockResolvedValueOnce('dep-123');
    await resolve('test.localhost');
    expect(redisInstance.hget).toHaveBeenCalledTimes(2);
  });
});
