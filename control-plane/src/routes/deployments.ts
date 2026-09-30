import { Router, Response } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth.js';
import { StateService } from '../services/state.js';
import { streamDeploymentEvents } from '../services/sse.js';
import { addBuildJob } from '../services/queue.js';
import { Redis } from 'ioredis';
import { config } from '../config.js';

export const deploymentsRouter = Router();
const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
redis.on('error', () => {});
const state = new StateService(redis);

const isOwnerOrDev = (projectOwnerId: string, reqUserId?: string) => {
  if (!reqUserId) return false;
  if (reqUserId === 'dev-user-local') return true;
  return projectOwnerId === reqUserId;
};

deploymentsRouter.get('/:id/events', auth as any, async (req: AuthenticatedRequest, res: Response) => {
  const deployment = await state.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  const project = await state.getProject(deployment.projectId as string);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  streamDeploymentEvents(req as any, res);
});

deploymentsRouter.use(auth as any);

deploymentsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.body.projectId;
  if (!projectId) {
    res.status(400).json({ error: 'Missing projectId' });
    return;
  }
  const project = await state.getProject(projectId);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const deployment = await state.createDeployment(project.id, { 
    initiator: req.userId || 'dev-user-local',
    branch: req.body.branch || 'main',
    commitMessage: req.body.commitMessage || 'Manual deployment'
  });
  await addBuildJob({
    deploymentId: deployment.id,
    gitUrl: project.gitUrl as string,
    projectId: project.id
  });
  res.status(202).json(deployment);
});

deploymentsRouter.get('/project/:projectId', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.projectId);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const deployments = await state.getDeploymentsByProject(req.params.projectId);
  res.json(deployments);
});

deploymentsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const deployment = await state.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const project = await state.getProject(deployment.projectId as string);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(deployment);
});

deploymentsRouter.get('/:id/logs', async (req: AuthenticatedRequest, res: Response) => {
  const deployment = await state.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const project = await state.getProject(deployment.projectId as string);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const logs = await state.getLogs(req.params.id);
  res.json(logs);
});

deploymentsRouter.post('/:id/rollback', async (req: AuthenticatedRequest, res: Response) => {
  const deployment = await state.getDeployment(req.params.id);
  if (!deployment || (deployment.status !== 'LIVE' && deployment.status !== 'ROLLED_BACK')) {
    res.status(400).json({ error: 'Cannot rollback to this deployment' });
    return;
  }
  
  const project = await state.getProject(deployment.projectId as string);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Not found' });
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
