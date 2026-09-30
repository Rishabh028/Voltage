import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from 'vitest';
import { StateService } from '../services/state.js';
import { Redis } from 'ioredis';
import { db } from '../services/db.js';

const MOCK_USER_UUID = 'e6b3fa10-244e-4b67-a068-0fb53bb09cf1';
const MOCK_ORG_UUID = '8fa2fa5a-b605-4cbf-8b27-bc5e634ccf3e';
const MOCK_PROJ_UUID = '3f8a42b1-6a2c-47bc-8367-9c9890bc4ef7';
const MOCK_DEP_UUID = '11bf98bb-5d1b-4171-8848-6a56e7e0cc61';
const MOCK_ENV_UUID = '77dfaa5b-014c-4cc3-92f7-be790cb94e09';

vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => {
    const redisInstance = {
      hset: vi.fn().mockResolvedValue(1),
      hget: vi.fn().mockResolvedValue(null),
      hgetall: vi.fn().mockResolvedValue({}),
      del: vi.fn().mockResolvedValue(1),
      lpush: vi.fn().mockResolvedValue(1),
      rpush: vi.fn().mockResolvedValue(1),
      lrange: vi.fn().mockResolvedValue([]),
      publish: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
      flushall: vi.fn().mockResolvedValue('OK'),
      multi: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
      hdel: vi.fn().mockResolvedValue(1)
    };
    
    const pipeline = {
      hset: vi.fn().mockReturnThis(),
      lpush: vi.fn().mockReturnThis(),
      rpush: vi.fn().mockReturnThis(),
      publish: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([])
    };
    
    redisInstance.multi.mockReturnValue(pipeline);
    
    return redisInstance;
  });
  return { Redis: MockRedis };
});

vi.mock('../services/db.js', () => {
  return {
    db: {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn()
      },
      organization: {
        create: vi.fn()
      },
      orgMember: {
        findFirst: vi.fn(),
        create: vi.fn()
      },
      project: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn()
      },
      environment: {
        findFirst: vi.fn(),
        create: vi.fn()
      },
      deployment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      },
      buildLog: {
        create: vi.fn(),
        findMany: vi.fn()
      },
      domain: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      }
    }
  };
});

describe('StateService', () => {
  let redis: Redis;
  let state: StateService;

  beforeAll(() => {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    state = new StateService(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Project CRUD works', async () => {
    // Mock user / org resolution
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: MOCK_USER_UUID, email: 'owner1@voltage.local', githubId: 'owner1' } as any);
    vi.mocked(db.orgMember.findFirst).mockResolvedValue({ organization: { id: MOCK_ORG_UUID, name: 'Personal Org', slug: 'owner1' } } as any);
    
    // Mock project create
    vi.mocked(db.project.create).mockResolvedValue({
      id: MOCK_PROJ_UUID,
      name: 'test-app',
      repoFullName: 'git.com/test-app',
      createdAt: new Date(),
      domains: [{ hostname: 'test-app.voltage.localhost' }]
    } as any);

    const project = await state.createProject('owner1', { name: 'test-app', gitUrl: 'http://git.com', subdomain: 'test-app' });
    expect(project.id).toBeDefined();

    // Mock project get
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: MOCK_PROJ_UUID,
      name: 'test-app',
      repoFullName: 'git.com/test-app',
      createdAt: new Date(),
      domains: [{ hostname: 'test-app.voltage.localhost' }],
      organization: { members: [{ userId: MOCK_USER_UUID, user: { id: MOCK_USER_UUID, githubId: 'owner1' } }] }
    } as any);

    const fetched = await state.getProject(project.id);
    expect(fetched?.name).toBe('test-app');

    // Mock list projects
    vi.mocked(db.project.findMany).mockResolvedValue([{
      id: MOCK_PROJ_UUID,
      name: 'test-app',
      repoFullName: 'git.com/test-app',
      createdAt: new Date(),
      domains: [{ hostname: 'test-app.voltage.localhost' }]
    }] as any);

    const byOwner = await state.getProjectsByOwner('owner1');
    expect(byOwner.length).toBe(1);

    // Mock delete
    await state.deleteProject(project.id, 'owner1');
    expect(db.project.delete).toHaveBeenCalled();
  });

  it('Deployment CRUD works', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: MOCK_USER_UUID, email: 'user1@voltage.local', githubId: 'user1' } as any);
    vi.mocked(db.orgMember.findFirst).mockResolvedValue({ organization: { id: MOCK_ORG_UUID, name: 'Personal Org', slug: 'user1' } } as any);
    vi.mocked(db.environment.findFirst).mockResolvedValue({ id: MOCK_ENV_UUID, projectId: MOCK_PROJ_UUID, name: 'production' } as any);

    vi.mocked(db.deployment.create).mockResolvedValue({
      id: MOCK_DEP_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'QUEUED',
      commitSha: 'sha1',
      createdAt: new Date()
    } as any);

    const deployment = await state.createDeployment(MOCK_PROJ_UUID, { initiator: 'user1', commitSha: 'sha1' });
    expect(deployment.id).toBeDefined();

    vi.mocked(db.deployment.findUnique).mockResolvedValue({
      id: MOCK_DEP_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'QUEUED',
      commitSha: 'sha1',
      createdAt: new Date()
    } as any);

    const fetched = await state.getDeployment(deployment.id);
    expect(fetched?.projectId).toBe(MOCK_PROJ_UUID);

    vi.mocked(db.deployment.findMany).mockResolvedValue([{
      id: MOCK_DEP_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'QUEUED',
      commitSha: 'sha1',
      createdAt: new Date()
    }] as any);

    const byProject = await state.getDeploymentsByProject(MOCK_PROJ_UUID);
    expect(byProject.length).toBe(1);
  });

  it('Valid state transitions succeed', async () => {
    vi.mocked(db.deployment.findUnique).mockResolvedValueOnce({
      id: MOCK_DEP_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'QUEUED',
      commitSha: 'sha1',
      createdAt: new Date()
    } as any);

    vi.mocked(db.deployment.update).mockResolvedValueOnce({
      id: MOCK_DEP_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'BUILDING',
      commitSha: 'sha1',
      createdAt: new Date()
    } as any);

    const updated = await state.updateDeploymentStatus(MOCK_DEP_UUID, 'BUILDING');
    expect(updated.status).toBe('BUILDING');
  });

  it('Invalid state transitions throw', async () => {
    vi.mocked(db.deployment.findUnique).mockResolvedValueOnce({
      id: MOCK_DEP_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'QUEUED',
      commitSha: 'sha1',
      createdAt: new Date()
    } as any);

    await expect(state.updateDeploymentStatus(MOCK_DEP_UUID, 'LIVE')).rejects.toThrow();
  });

  it('Log append and replay works', async () => {
    await state.appendLog(MOCK_DEP_UUID, 'log line 1');
    expect(db.buildLog.create).toHaveBeenCalled();
  });

  it('Route set/get works', async () => {
    await state.setRoute('test.domain.com', MOCK_DEP_UUID);
    vi.mocked(redis.hget).mockResolvedValueOnce(MOCK_DEP_UUID);
    const route = await state.getRoute('test.domain.com');
    expect(route).toBe(MOCK_DEP_UUID);
  });
});
