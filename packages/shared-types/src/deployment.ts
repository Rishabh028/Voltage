/** Deployment lifecycle states — strict state machine */
export type DeploymentStatus =
  | 'QUEUED'
  | 'BUILDING'
  | 'UPLOADING'
  | 'LIVE'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'ROLLED_BACK';

/** Valid state transitions */
export const VALID_TRANSITIONS: Record<DeploymentStatus, DeploymentStatus[]> = {
  QUEUED: ['BUILDING', 'FAILED'],
  BUILDING: ['UPLOADING', 'FAILED', 'TIMED_OUT'],
  UPLOADING: ['LIVE', 'FAILED'],
  LIVE: ['ROLLED_BACK'],
  FAILED: [],
  TIMED_OUT: [],
  ROLLED_BACK: [],
};

/** Build stage identifiers emitted by the builder container */
export type BuildStage = 'clone' | 'install' | 'build' | 'upload';

/** Log level for structured log lines */
export type LogLevel = 'info' | 'error' | 'warn' | 'debug';

/** A single structured log line from a build */
export interface LogLine {
  timestamp: string;
  deploymentId: string;
  stage: BuildStage;
  level: LogLevel;
  message: string;
}

/** Deployment record stored in Redis */
export interface Deployment {
  id: string;
  projectId: string;
  status: DeploymentStatus;
  commitSha: string;
  branch: string;
  createdAt: string;
  finishedAt: string | null;
  failureReason: string | null;
  /** Duration in milliseconds */
  duration: number | null;
}

/** Project record stored in Redis */
export interface Project {
  id: string;
  name: string;
  gitUrl: string;
  ownerId: string;
  subdomain: string;
  createdAt: string;
}

/** Route mapping: hostname → deploymentId */
export interface Route {
  hostname: string;
  deploymentId: string;
  projectId: string;
}

/** Custom domain attached to a project */
export interface CustomDomain {
  domain: string;
  projectId: string;
  verified: boolean;
  createdAt: string;
}

/** User record */
export interface User {
  id: string;
  githubId: string;
  name: string;
  avatarUrl: string;
  email: string | null;
  createdAt: string;
}

/** Manifest written alongside deployed assets */
export interface DeploymentManifest {
  deploymentId: string;
  projectId: string;
  files: ManifestFile[];
  framework: 'nextjs' | 'static' | 'vite' | 'generic';
  outputDir: string;
  isSPA: boolean;
  createdAt: string;
}

export interface ManifestFile {
  path: string;
  size: number;
  hash: string;
}
