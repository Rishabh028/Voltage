export type DeploymentStatus = 'PENDING' | 'BUILDING' | 'LIVE' | 'FAILED' | 'ROLLED_BACK' | 'SUPERSEDED';

export interface Project {
  id: string;
  name: string;
  gitUrl: string;
  subdomain: string;
  buildCommand?: string;
  startCommand?: string;
  rootDirectory?: string;
  framework?: string;
  createdAt: string;
  status: DeploymentStatus;
  lastDeployTime?: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  commitSha: string;
  commitMessage?: string;
  branch: string;
  status: DeploymentStatus;
  isProduction?: boolean;
  previewUrl?: string;
  createdAt: string;
  duration?: number;
}

export interface Domain {
  id: string;
  domain: string;
  hostname?: string;
  projectId?: string;
  verified: boolean;
  certStatus?: string;
  cnameTarget?: string;
  isDefault?: boolean;
  createdAt?: number;
}

export interface UsageSummary {
  orgId: string;
  plan: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  usage: {
    buildMinutes: number;
    bandwidthGb: number;
    computeHours: number;
    totalBuilds: number;
  };
  limits: {
    buildMinutesLimit: number;
    bandwidthGbLimit: number;
    maxProjects: number;
    concurrency: number;
  };
}

export interface LogLine {
  id: string;
  timestamp: string;
  content: string;
  type: 'info' | 'error' | 'success' | 'warning';
}

export interface Stage {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}
