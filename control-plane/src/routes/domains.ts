import { Router, Response } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth.js';
import { StateService } from '../services/state.js';
import { verifyDomainDns } from '../services/dns.js';
import { Redis } from 'ioredis';
import { config } from '../config.js';

export const domainsRouter = Router();
const redis = new Redis(config.REDIS_URL);
const state = new StateService(redis);

domainsRouter.use(auth as any);

const cnameTarget = `cname.${config.BASE_DOMAIN}`;

const isOwnerOrDev = (projectOwnerId: string, reqUserId?: string) => {
  if (!reqUserId) return false;
  if (reqUserId === 'dev-user-local') return true;
  return projectOwnerId === reqUserId;
};

// GET /projects/:id/domains
domainsRouter.get('/projects/:id/domains', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  
  const domains = await state.getDomains(project.id);
  res.json(domains.map(d => ({
    ...d,
    cnameTarget
  })));
});

// POST /projects/:id/domains
domainsRouter.post('/projects/:id/domains', async (req: AuthenticatedRequest, res: Response) => {
  const project = await state.getProject(req.params.id);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  
  const rawDomain = (req.body.domain || req.body.hostname || '').trim().toLowerCase();
  const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain) {
    res.status(400).json({ error: 'Domain required' });
    return;
  }
  
  const record = await state.addDomain(project.id, domain, false);
  
  res.status(201).json({
    id: record?.id,
    domain: record?.hostname || domain,
    hostname: record?.hostname || domain,
    verified: false,
    certStatus: 'pending',
    cnameTarget
  });
});

async function handleVerify(req: AuthenticatedRequest, res: Response) {
  const idOrHostname = req.params.id || req.params.domain;
  const domain = await state.getDomain(idOrHostname);
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  const project = await state.getProject(domain.projectId);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const isDnsValid = await verifyDomainDns(domain.hostname, cnameTarget);
  if (!isDnsValid) {
    res.status(400).json({
      verified: false,
      error: `DNS verification failed. Ensure CNAME points to ${cnameTarget}`
    });
    return;
  }

  const verified = await state.verifyDomain(domain.id);
  res.json({
    id: verified.id,
    domain: verified.hostname,
    hostname: verified.hostname,
    verified: true,
    certStatus: 'issued',
    message: 'Domain verified successfully. SSL certificate issued.'
  });
}

// POST /domains/:id/verify
domainsRouter.post('/domains/:id/verify', handleVerify);
domainsRouter.post('/:id/verify', handleVerify);

async function handleDelete(req: AuthenticatedRequest, res: Response) {
  const idOrHostname = req.params.id || req.params.domain;
  const domain = await state.getDomain(idOrHostname);
  if (!domain) {
    res.status(204).send();
    return;
  }

  const project = await state.getProject(domain.projectId);
  if (!project || !isOwnerOrDev(project.ownerId, req.userId)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await state.removeDomain(domain.projectId, domain.hostname);
  res.status(204).send();
}

// DELETE /domains/:id
domainsRouter.delete('/domains/:id', handleDelete);
domainsRouter.delete('/:id', handleDelete);
