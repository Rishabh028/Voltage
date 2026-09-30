import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBuild } from '../services/docker-orchestrator.js';

// Mock dependencies
vi.mock('ioredis', () => {
  const Redis = vi.fn();
  Redis.prototype.multi = vi.fn().mockReturnThis();
  Redis.prototype.hset = vi.fn().mockReturnThis();
  Redis.prototype.exec = vi.fn().mockResolvedValue([]);
  Redis.prototype.hgetall = vi.fn().mockResolvedValue({ status: 'QUEUED' });
  return { Redis };
});

vi.mock('../services/state.js', () => {
  return {
    StateService: vi.fn().mockImplementation(() => ({
      updateDeploymentStatus: vi.fn().mockResolvedValue({}),
      appendLog: vi.fn().mockResolvedValue({}),
      getProject: vi.fn().mockResolvedValue({ id: 'proj1', buildCommand: '' }),
      getDeployment: vi.fn().mockResolvedValue({ id: 'dep1', isProduction: true }),
      getDecryptedEnvForProject: vi.fn().mockResolvedValue({})
    }))
  };
});

vi.mock('../services/usage.js', () => ({
  recordUsage: vi.fn().mockResolvedValue({})
}));

const mocks = vi.hoisted(() => {
  return {
    mockWait: vi.fn(),
    mockAttach: vi.fn(),
    mockStart: vi.fn(),
    mockRemove: vi.fn(),
    mockKill: vi.fn(),
    mockDemuxStream: vi.fn(),
  };
});

vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      createContainer: vi.fn().mockResolvedValue({
        attach: mocks.mockAttach,
        start: mocks.mockStart,
        wait: mocks.mockWait,
        remove: mocks.mockRemove,
        kill: mocks.mockKill
      }),
      modem: {
        demuxStream: mocks.mockDemuxStream
      }
    }))
  };
});

describe('docker-orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Successful build -> logs collected -> container removed', async () => {
    mocks.mockAttach.mockResolvedValue({});
    mocks.mockStart.mockResolvedValue({});
    mocks.mockWait.mockResolvedValue({ StatusCode: 0 });
    
    await runBuild({ id: 'job1', data: { deploymentId: 'dep1', gitUrl: 'git.com', projectId: 'proj1' } });
    
    expect(mocks.mockStart).toHaveBeenCalled();
    expect(mocks.mockWait).toHaveBeenCalled();
    expect(mocks.mockRemove).toHaveBeenCalled();
  });

  it('OOM kill (exit 137) -> FAILED status', async () => {
    mocks.mockAttach.mockResolvedValue({});
    mocks.mockStart.mockResolvedValue({});
    mocks.mockWait.mockResolvedValue({ StatusCode: 137 });
    
    await expect(runBuild({ id: 'job1', data: { deploymentId: 'dep1', gitUrl: 'git.com', projectId: 'proj1' } })).rejects.toThrow('OOM_KILL');
    expect(mocks.mockRemove).toHaveBeenCalled();
  });

  it('Non-zero exit -> FAILED status', async () => {
    mocks.mockAttach.mockResolvedValue({});
    mocks.mockStart.mockResolvedValue({});
    mocks.mockWait.mockResolvedValue({ StatusCode: 1 });
    
    await expect(runBuild({ id: 'job1', data: { deploymentId: 'dep1', gitUrl: 'git.com', projectId: 'proj1' } })).rejects.toThrow('BUILD_FAILED_CODE_1');
    expect(mocks.mockRemove).toHaveBeenCalled();
  });
});
