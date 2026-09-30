import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import crypto from 'crypto';
import express from 'express';
import http from 'http';

const MOCK_PROJ_UUID = '3f8a42b1-6a2c-47bc-8367-9c9890bc4ef7';
const MOCK_DEP_PROD_UUID = '11bf98bb-5d1b-4171-8848-6a56e7e0cc61';
const MOCK_DEP_PREV_UUID = '22cf98bb-5d1b-4171-8848-6a56e7e0cc62';

const mocks = vi.hoisted(() => ({
  mockCreateDeployment: vi.fn(),
  mockGetProjectByRepo: vi.fn(),
  mockRemoveRoute: vi.fn(),
  mockAddBuildJob: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => ({
    hset: vi.fn().mockResolvedValue(1),
    hget: vi.fn().mockResolvedValue(null),
    hdel: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK')
  }));
  return { Redis: MockRedis };
});

vi.mock('../services/state.js', () => {
  return {
    StateService: vi.fn(() => ({
      getProjectByRepo: mocks.mockGetProjectByRepo,
      createDeployment: mocks.mockCreateDeployment,
      removeRoute: mocks.mockRemoveRoute
    }))
  };
});

vi.mock('../services/queue.js', () => ({
  addBuildJob: mocks.mockAddBuildJob
}));

import { webhookRouter } from '../routes/webhooks.js';

describe('GitHub Webhooks & PR Preview Automation', () => {
  const secret = 'secret'; // matches config default
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.raw({ type: 'application/json' }));
    app.use('/webhooks', webhookRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockGetProjectByRepo.mockResolvedValue({
      id: MOCK_PROJ_UUID,
      name: 'my-site',
      subdomain: 'my-site',
      gitUrl: 'https://github.com/acme/my-site',
      repoFullName: 'acme/my-site',
      defaultBranch: 'main'
    });
  });

  function signPayload(body: string) {
    const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return `sha256=${hmac}`;
  }

  it('rejects requests with missing or invalid signature', async () => {
    const payload = JSON.stringify({ action: 'push' });
    const resNoSig = await fetch(`${baseUrl}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push'
      },
      body: payload
    });
    expect(resNoSig.status).toBe(401);

    const resBadSig = await fetch(`${baseUrl}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=invalidsig'
      },
      body: payload
    });
    expect(resBadSig.status).toBe(401);
  });

  it('triggers production build on push to default branch', async () => {
    const payloadObj = {
      repository: { full_name: 'acme/my-site' },
      ref: 'refs/heads/main',
      after: 'abc123456789',
      head_commit: { id: 'abc123456789', message: 'feat: add home' },
      pusher: { name: 'octocat' }
    };
    const payloadStr = JSON.stringify(payloadObj);

    mocks.mockCreateDeployment.mockResolvedValueOnce({
      id: MOCK_DEP_PROD_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'QUEUED',
      isProduction: true,
      branch: 'main'
    });

    const res = await fetch(`${baseUrl}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': signPayload(payloadStr)
      },
      body: payloadStr
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('queued');
    expect(body.isProduction).toBe(true);
    expect(mocks.mockCreateDeployment).toHaveBeenCalledWith(
      MOCK_PROJ_UUID,
      expect.objectContaining({
        commitSha: 'abc123456789',
        isProduction: true,
        branch: 'main'
      })
    );
    expect(mocks.mockAddBuildJob).toHaveBeenCalledWith({
      deploymentId: MOCK_DEP_PROD_UUID,
      gitUrl: 'https://github.com/acme/my-site',
      projectId: MOCK_PROJ_UUID
    });
  });

  it('ignores push to non-default branch', async () => {
    const payloadObj = {
      repository: { full_name: 'acme/my-site' },
      ref: 'refs/heads/feature-xyz',
      after: 'xyz987654321',
      head_commit: { id: 'xyz987654321', message: 'wip: feature' }
    };
    const payloadStr = JSON.stringify(payloadObj);

    const res = await fetch(`${baseUrl}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': signPayload(payloadStr)
      },
      body: payloadStr
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('ignored');
    expect(mocks.mockCreateDeployment).not.toHaveBeenCalled();
    expect(mocks.mockAddBuildJob).not.toHaveBeenCalled();
  });

  it('triggers preview deployment on pull_request opened', async () => {
    const payloadObj = {
      action: 'opened',
      repository: { full_name: 'acme/my-site' },
      pull_request: {
        number: 42,
        title: 'New Checkout Flow',
        head: { ref: 'feat/checkout', sha: 'headsha4242' }
      },
      sender: { login: 'alice' }
    };
    const payloadStr = JSON.stringify(payloadObj);

    mocks.mockCreateDeployment.mockResolvedValueOnce({
      id: MOCK_DEP_PREV_UUID,
      projectId: MOCK_PROJ_UUID,
      status: 'QUEUED',
      isProduction: false,
      previewUrl: 'my-site-pr-42.voltage.localhost'
    });

    const res = await fetch(`${baseUrl}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': signPayload(payloadStr)
      },
      body: payloadStr
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('queued');
    expect(body.isProduction).toBe(false);
    expect(body.previewUrl).toBe('my-site-pr-42.voltage.localhost');
    expect(mocks.mockCreateDeployment).toHaveBeenCalledWith(
      MOCK_PROJ_UUID,
      expect.objectContaining({
        commitSha: 'headsha4242',
        isProduction: false,
        branch: 'feat/checkout',
        previewUrl: 'my-site-pr-42.voltage.localhost'
      })
    );
    expect(mocks.mockAddBuildJob).toHaveBeenCalledWith({
      deploymentId: MOCK_DEP_PREV_UUID,
      gitUrl: 'https://github.com/acme/my-site',
      projectId: MOCK_PROJ_UUID
    });
  });

  it('de-registers preview route when pull_request is closed', async () => {
    const payloadObj = {
      action: 'closed',
      repository: { full_name: 'acme/my-site' },
      pull_request: {
        number: 42
      }
    };
    const payloadStr = JSON.stringify(payloadObj);

    const res = await fetch(`${baseUrl}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': signPayload(payloadStr)
      },
      body: payloadStr
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('closed');
    expect(body.previewUrl).toBe('my-site-pr-42.voltage.localhost');
    expect(mocks.mockRemoveRoute).toHaveBeenCalledWith('my-site-pr-42.voltage.localhost');
  });
});
