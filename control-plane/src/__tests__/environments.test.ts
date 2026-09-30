import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { StateService } from '../services/state.js';
import { Redis } from 'ioredis';
import { db } from '../services/db.js';
import { encryptSecret } from '../services/encryption.js';

const MOCK_PROJ_UUID = '3f8a42b1-6a2c-47bc-8367-9c9890bc4ef7';
const MOCK_ENV_UUID = '77dfaa5b-014c-4cc3-92f7-be790cb94e09';

vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => ({
    hset: vi.fn().mockResolvedValue(1),
    hget: vi.fn().mockResolvedValue(null),
    quit: vi.fn().mockResolvedValue('OK'),
  }));
  return { Redis: MockRedis };
});

vi.mock('../services/db.js', () => {
  return {
    db: {
      environment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn()
      },
      envVar: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn()
      }
    }
  };
});

describe('Environments & Encrypted Secrets', () => {
  let redis: Redis;
  let state: StateService;

  beforeAll(() => {
    redis = new Redis();
    state = new StateService(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves and auto-provisions production environment if none exists', async () => {
    vi.mocked(db.environment.findMany).mockResolvedValueOnce([]);
    vi.mocked(db.environment.create).mockResolvedValueOnce({
      id: MOCK_ENV_UUID,
      projectId: MOCK_PROJ_UUID,
      name: 'production',
      createdAt: new Date()
    } as any);

    const envs = await state.getEnvironments(MOCK_PROJ_UUID);
    expect(envs.length).toBe(1);
    expect(envs[0].name).toBe('production');
    expect(db.environment.create).toHaveBeenCalled();
  });

  it('creates custom environment', async () => {
    vi.mocked(db.environment.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.environment.create).mockResolvedValueOnce({
      id: 'preview-uuid-1234',
      projectId: MOCK_PROJ_UUID,
      name: 'preview',
      createdAt: new Date()
    } as any);

    const env = await state.createEnvironment(MOCK_PROJ_UUID, 'preview');
    expect(env.name).toBe('preview');
  });

  it('sets and encrypts environment variables', async () => {
    vi.mocked(db.envVar.upsert).mockResolvedValue({
      id: 'var-uuid',
      environmentId: MOCK_ENV_UUID,
      key: 'DATABASE_URL',
      valueEncrypted: Buffer.from('mock_encrypted'),
      createdAt: new Date()
    } as any);

    const saved = await state.setEnvVars(MOCK_ENV_UUID, {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db'
    });

    expect(saved.length).toBe(1);
    expect(saved[0].key).toBe('DATABASE_URL');
    expect(saved[0].value).toBe('••••••••'); // Masked in response
    expect(db.envVar.upsert).toHaveBeenCalled();
  });

  it('retrieves masked environment variables by default', async () => {
    vi.mocked(db.envVar.findMany).mockResolvedValueOnce([
      {
        id: 'var-1',
        environmentId: MOCK_ENV_UUID,
        key: 'API_KEY',
        valueEncrypted: encryptSecret('real_secret_token_123'),
        createdAt: new Date()
      }
    ] as any);

    const vars = await state.getEnvVars(MOCK_ENV_UUID, true);
    expect(vars.length).toBe(1);
    expect(vars[0].key).toBe('API_KEY');
    expect(vars[0].value).toBe('••••••••');
  });

  it('decrypts environment variables for runtime container injection', async () => {
    const rawSecret = 'stripe_sk_test_512345';
    const encryptedSecret = encryptSecret(rawSecret);

    vi.mocked(db.environment.findFirst).mockResolvedValueOnce({
      id: MOCK_ENV_UUID,
      projectId: MOCK_PROJ_UUID,
      name: 'production',
      createdAt: new Date()
    } as any);

    vi.mocked(db.envVar.findMany).mockResolvedValueOnce([
      {
        id: 'var-1',
        environmentId: MOCK_ENV_UUID,
        key: 'STRIPE_KEY',
        valueEncrypted: encryptedSecret,
        createdAt: new Date()
      }
    ] as any);

    const decryptedMap = await state.getDecryptedEnvForProject(MOCK_PROJ_UUID, 'production');
    expect(decryptedMap.STRIPE_KEY).toBe(rawSecret);
  });

  it('deletes environment variable', async () => {
    await state.deleteEnvVar(MOCK_ENV_UUID, 'OLD_KEY');
    expect(db.envVar.deleteMany).toHaveBeenCalledWith({
      where: { environmentId: MOCK_ENV_UUID, key: 'OLD_KEY' }
    });
  });
});
