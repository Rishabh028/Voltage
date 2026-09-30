import { Router, Response } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth.js';
import { StateService } from '../services/state.js';
import { Redis } from 'ioredis';
import { config } from '../config.js';
import { z } from 'zod';

export const environmentsRouter = Router();
const redis = new Redis(config.REDIS_URL);
const state = new StateService(redis);

environmentsRouter.use(auth as any);

const createEnvSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/i, 'Invalid environment name')
});

const putEnvVarsSchema = z.record(z.string(), z.string());

// List project environments
environmentsRouter.get('/projects/:id/environments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = await state.getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const envs = await state.getEnvironments(req.params.id);
    res.json(envs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

// Create project environment
environmentsRouter.post('/projects/:id/environments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = createEnvSchema.parse(req.body);
    const project = await state.getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const env = await state.createEnvironment(req.params.id, name);
    res.status(201).json(env);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid input' });
  }
});

// List masked environment variables for an environment
environmentsRouter.get('/environments/:id/env-vars', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vars = await state.getEnvVars(req.params.id, true);
    res.json(vars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch environment variables' });
  }
});

// Bulk upsert environment variables (encrypted at rest)
environmentsRouter.put('/environments/:id/env-vars', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vars = putEnvVarsSchema.parse(req.body);
    const updated = await state.setEnvVars(req.params.id, vars);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid input' });
  }
});

// Delete an environment variable by key
environmentsRouter.delete('/environments/:id/env-vars/:key', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await state.deleteEnvVar(req.params.id, req.params.key);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete environment variable' });
  }
});
