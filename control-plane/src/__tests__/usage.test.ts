import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordUsage, getOrgUsageSummary } from '../services/usage.js';
import { db } from '../services/db.js';

vi.mock('../services/db.js', () => ({
  db: {
    usageEvent: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    organization: {
      findUnique: vi.fn(),
      updateMany: vi.fn()
    }
  }
}));

const MOCK_ORG_UUID = '8fa2fa5a-b605-4cbf-8b27-bc5e634ccf3e';
const MOCK_PROJ_UUID = '3f8a42b1-6a2c-47bc-8367-9c9890bc4ef7';

describe('Usage Metering & Billing Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records build_minutes usage event successfully', async () => {
    vi.mocked(db.usageEvent.create).mockResolvedValueOnce({
      id: 1n,
      orgId: MOCK_ORG_UUID,
      projectId: MOCK_PROJ_UUID,
      type: 'build_minutes',
      quantity: 2.45,
      recordedAt: new Date()
    } as any);

    const event = await recordUsage(MOCK_ORG_UUID, MOCK_PROJ_UUID, 'build_minutes', 2.45);
    expect(db.usageEvent.create).toHaveBeenCalledWith({
      data: {
        orgId: MOCK_ORG_UUID,
        projectId: MOCK_PROJ_UUID,
        type: 'build_minutes',
        quantity: 2.45
      }
    });
    expect(event.quantity).toBe(2.45);
  });

  it('aggregates monthly usage and calculates free tier quotas correctly', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValueOnce({
      id: MOCK_ORG_UUID,
      name: 'Acme Corp',
      slug: 'acme',
      plan: 'free'
    } as any);

    vi.mocked(db.usageEvent.findMany).mockResolvedValueOnce([
      { id: 1n, type: 'build_minutes', quantity: 12.5, recordedAt: new Date() },
      { id: 2n, type: 'build_minutes', quantity: 7.5, recordedAt: new Date() },
      { id: 3n, type: 'bandwidth_gb', quantity: 1.2, recordedAt: new Date() },
      { id: 4n, type: 'compute_hours', quantity: 5.0, recordedAt: new Date() }
    ] as any);

    const summary = await getOrgUsageSummary(MOCK_ORG_UUID);

    expect(summary.orgId).toBe(MOCK_ORG_UUID);
    expect(summary.plan).toBe('free');
    expect(summary.usage.buildMinutes).toBe(20.0);
    expect(summary.usage.totalBuilds).toBe(2);
    expect(summary.usage.bandwidthGb).toBe(1.2);
    expect(summary.usage.computeHours).toBe(5.0);
    expect(summary.limits.buildMinutesLimit).toBe(100);
    expect(summary.limits.bandwidthGbLimit).toBe(100);
    expect(summary.limits.maxProjects).toBe(3);
  });

  it('returns pro tier limits when organization is on pro plan', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValueOnce({
      id: MOCK_ORG_UUID,
      name: 'Scale Corp',
      slug: 'scale',
      plan: 'pro'
    } as any);

    vi.mocked(db.usageEvent.findMany).mockResolvedValueOnce([]);

    const summary = await getOrgUsageSummary(MOCK_ORG_UUID);

    expect(summary.plan).toBe('pro');
    expect(summary.limits.buildMinutesLimit).toBe(1000);
    expect(summary.limits.bandwidthGbLimit).toBe(1000);
    expect(summary.limits.maxProjects).toBe(100);
    expect(summary.limits.concurrency).toBe(5);
  });
});
