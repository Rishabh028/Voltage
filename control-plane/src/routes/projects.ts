import { Router, Response } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth.js';
import { StateService } from '../services/state.js';
import { Redis } from 'ioredis';
import { config } from '../config.js';
import { z } from 'zod';
import { addBuildJob } from '../services/queue.js';
import { streamDeploymentEvents } from '../services/sse.js';

export const projectsRouter = Router();
const redis = new Redis(config.REDIS_URL);
const state = new StateService(redis);

projectsRouter.use(auth as any);

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  gitUrl: z.string().min(1),
  buildCommand: z.string().optional(),
  startCommand: z.string().optional(),
  rootDirectory: z.string().optional(),
  framework: z.string().optional()
});

projectsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, gitUrl, buildCommand, startCommand, rootDirectory, framework } = createProjectSchema.parse(req.body);
    const subdomain = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const project = await state.createProject(req.userId!, { name, gitUrl, subdomain });
    if (buildCommand || startCommand || rootDirectory || framework) {
      await state.updateProject(project.id, { buildCommand, startCommand, rootDirectory, framework });
    }
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: 'Invalid input' });
  }
});

projectsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const projects = await state.getProjectsByOwner(req.userId!);
  res.json(projects);
});

const isOwnerOrDev = (projectOwnerId: string, reqUserId?: string) => {
  if (!reqUserId) return false;
  if (reqUserId === 'dev-user-local') return true;
  return projectOwnerId === reqUserId;
};

projectsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(project);
});

const patchProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  buildCommand: z.string().optional(),
  startCommand: z.string().optional(),
  rootDirectory: z.string().optional(),
  framework: z.string().optional()
});

projectsRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = await state.getProject(req.params.id);
    if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const data = patchProjectSchema.parse(req.body);
    const updated = await state.updateProject(req.params.id, data);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid input' });
  }
});

projectsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await state.deleteProject(req.params.id, req.userId!);
  res.status(204).send();
});

const triggerDeployHandler = async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  const deployment = await state.createDeployment(project.id, { initiator: req.userId! });
  await addBuildJob({
    deploymentId: deployment.id,
    gitUrl: project.gitUrl as string,
    projectId: project.id
  });
  
  res.status(202).json(deployment);
};

projectsRouter.post('/:id/deploy', triggerDeployHandler);
projectsRouter.post('/:id/deployments', triggerDeployHandler);

// GET /api/projects/:id/deployments
projectsRouter.get('/:id/deployments', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const deployments = await state.getDeploymentsByProject(req.params.id);
  res.json(deployments);
});

// GET /api/projects/:id/deployments/:deploymentId
projectsRouter.get('/:id/deployments/:deploymentId', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const deployment = await state.getDeployment(req.params.deploymentId);
  if (!deployment || deployment.projectId !== req.params.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(deployment);
});

// POST /api/projects/:id/deployments/:deploymentId/rollback
projectsRouter.post('/:id/deployments/:deploymentId/rollback', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const deployment = await state.getDeployment(req.params.deploymentId);
  if (!deployment || deployment.projectId !== req.params.id || (deployment.status !== 'LIVE' && deployment.status !== 'ROLLED_BACK')) {
    res.status(400).json({ error: 'Cannot rollback to this deployment' });
    return;
  }
  
  const hostname = `${project.subdomain}.${config.BASE_DOMAIN}`;
  const currentLive = await state.getRoute(hostname);
  
  if (currentLive && currentLive !== deployment.id) {
    await state.updateDeploymentStatus(currentLive, 'ROLLED_BACK').catch(() => {});
  }
  
  await state.setRoute(hostname, deployment.id);
  await state.updateDeploymentStatus(deployment.id, 'LIVE');
  
  res.json({ success: true });
});

// GET /api/projects/:id/deployments/:deploymentId/events
projectsRouter.get('/:id/deployments/:deploymentId/events', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const deployment = await state.getDeployment(req.params.deploymentId);
  if (!deployment || deployment.projectId !== req.params.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  req.params.id = req.params.deploymentId;
  streamDeploymentEvents(req as any, res);
});

