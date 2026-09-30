import { z } from 'zod';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgrespassword@localhost:5432/voltage?schema=public';
}

const envSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/voltage?schema=public'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().default('secret'),
  JWT_SECRET: z.string().default('secret'),
  ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  CONTROL_PLANE_PORT: z.coerce.number().default(3001),
  BUILD_TIMEOUT_MS: z.coerce.number().default(600000),
  BUILD_MEMORY_MB: z.coerce.number().default(512),
  BUILD_CPU_CORES: z.coerce.number().default(1),
  MAX_CONCURRENT_BUILDS: z.coerce.number().default(3),
  BUILDER_IMAGE: z.string().default('voltage-builder:latest'),
  BASE_DOMAIN: z.string().default('voltage.localhost'),
});

export const config = envSchema.parse({
  ...process.env,
  S3_ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY,
});
