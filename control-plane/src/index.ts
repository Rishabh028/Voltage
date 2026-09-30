import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { worker } from './services/queue.js';
import { Redis } from 'ioredis';
import { webhookRouter } from './routes/webhooks.js';
import { projectsRouter } from './routes/projects.js';
import { deploymentsRouter } from './routes/deployments.js';
import { domainsRouter } from './routes/domains.js';
import { environmentsRouter } from './routes/environments.js';
import { orgsRouter } from './routes/orgs.js';
import { billingRouter } from './routes/billing.js';
import { db } from './services/db.js';
import { siteServerMiddleware } from './services/site-server.js';

const app = express();

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));
app.use(siteServerMiddleware);

app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRouter);
app.use('/v1/webhooks', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// V1 API routes (as specified in Master Spec §5)
app.use('/v1/projects', projectsRouter);
app.use('/v1/deployments', deploymentsRouter);
app.use('/v1/domains', domainsRouter);
app.use('/v1/orgs', orgsRouter);
app.use('/v1/billing', billingRouter);
app.use('/v1', domainsRouter);
app.use('/v1', environmentsRouter);
app.use('/v1', billingRouter);

// Backwards compatibility aliases
app.use('/api/projects', projectsRouter);
app.use('/api/deployments', deploymentsRouter);
app.use('/api/domains', domainsRouter);
app.use('/api/orgs', orgsRouter);
app.use('/api/billing', billingRouter);
app.use('/api', domainsRouter);
app.use('/api', environmentsRouter);
app.use('/api', billingRouter);

const server = app.listen(config.CONTROL_PLANE_PORT, '0.0.0.0', () => {
  console.log(`Control plane running on port ${config.CONTROL_PLANE_PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  server.close();
  await worker.close();
  const redis = new Redis(config.REDIS_URL);
  await redis.quit();
  await db.$disconnect();
  process.exit(0);
});
