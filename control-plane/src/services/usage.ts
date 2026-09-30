import { db } from './db.js';

export type UsageType = 'build_minutes' | 'bandwidth_gb' | 'compute_hours';

export interface PlanLimits {
  buildMinutesLimit: number;
  bandwidthGbLimit: number;
  maxProjects: number;
  concurrency: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    buildMinutesLimit: 100,
    bandwidthGbLimit: 100,
    maxProjects: 3,
    concurrency: 1
  },
  pro: {
    buildMinutesLimit: 1000,
    bandwidthGbLimit: 1000,
    maxProjects: 100,
    concurrency: 5
  },
  enterprise: {
    buildMinutesLimit: 10000,
    bandwidthGbLimit: 5000,
    maxProjects: 1000,
    concurrency: 20
  }
};

export async function recordUsage(
  orgId: string | null,
  projectId: string | null,
  type: UsageType,
  quantity: number
) {
  return db.usageEvent.create({
    data: {
      orgId: orgId || undefined,
      projectId: projectId || undefined,
      type,
      quantity: Math.max(0, quantity)
    }
  });
}

export async function getOrgUsageSummary(orgId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const org = await db.organization.findUnique({
    where: { id: orgId }
  });

  const plan = (org?.plan || 'free').toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const events = await db.usageEvent.findMany({
    where: {
      OR: [
        { orgId },
        { project: { orgId } }
      ],
      recordedAt: {
        gte: startOfMonth
      }
    }
  });

  let buildMinutes = 0;
  let bandwidthGb = 0;
  let computeHours = 0;
  let totalBuilds = 0;

  for (const event of events) {
    if (event.type === 'build_minutes') {
      buildMinutes += event.quantity;
      totalBuilds += 1;
    } else if (event.type === 'bandwidth_gb') {
      bandwidthGb += event.quantity;
    } else if (event.type === 'compute_hours') {
      computeHours += event.quantity;
    }
  }

  return {
    orgId,
    plan,
    currentPeriodStart: startOfMonth.toISOString(),
    currentPeriodEnd: endOfMonth.toISOString(),
    usage: {
      buildMinutes: Math.round(buildMinutes * 100) / 100,
      bandwidthGb: Math.round(bandwidthGb * 100) / 100,
      computeHours: Math.round(computeHours * 100) / 100,
      totalBuilds
    },
    limits
  };
}
