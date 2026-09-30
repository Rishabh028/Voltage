import { Router, Response } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth.js';
import { StateService } from '../services/state.js';
import { Redis } from 'ioredis';
import { config } from '../config.js';
import { z } from 'zod';

export const orgsRouter = Router();
const redis = new Redis(config.REDIS_URL);
const state = new StateService(redis);

orgsRouter.use(auth as any);

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/i, 'Invalid slug format')
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member']).default('member')
});

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member'])
});

// List organizations for authenticated user
orgsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgs = await state.getOrganizationsForUser(req.userId!);
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Create an organization
orgsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, slug } = createOrgSchema.parse(req.body);
    const org = await state.createOrganization(req.userId!, name, slug.toLowerCase());
    res.status(201).json(org);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid input' });
  }
});

// List members of an organization
orgsRouter.get('/:id/members', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const members = await state.getOrgMembers(req.params.id);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization members' });
  }
});

// Invite / add a member to an organization
orgsRouter.post('/:id/invite', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, role } = inviteMemberSchema.parse(req.body);
    const member = await state.addOrgMember(req.params.id, email, role);
    res.status(201).json(member);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid input' });
  }
});

// Update member role
orgsRouter.patch('/:id/members/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = updateMemberSchema.parse(req.body);
    const updated = await state.updateOrgMemberRole(req.params.id, req.params.userId, role);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid input' });
  }
});
