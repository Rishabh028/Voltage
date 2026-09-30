import { z } from 'zod';

const envSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('voltage-deployments'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_REGION: z.string().default('us-east-1'),
  PROXY_PORT: z.coerce.number().default(8080),
  BASE_DOMAIN: z.string().default('voltage.localhost'),
  CACHE_MAX_ENTRIES: z.coerce.number().default(1000),
  CACHE_TTL_MS: z.coerce.number().default(5000),
});

export const config = envSchema.parse(process.env.NODE_ENV === 'test' ? {
  ...process.env,
  S3_ACCESS_KEY: 'mock',
  S3_SECRET_KEY: 'mock'
} : process.env);
