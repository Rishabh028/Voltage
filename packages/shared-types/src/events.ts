import type { DeploymentStatus, LogLine, BuildStage } from './deployment.js';

/** SSE event types sent from control plane to dashboard */
export type SSEEvent =
  | SSELogEvent
  | SSEStatusEvent
  | SSEStageEvent
  | SSEHeartbeatEvent;

export interface SSELogEvent {
  type: 'log';
  data: LogLine;
}

export interface SSEStatusEvent {
  type: 'status';
  data: {
    deploymentId: string;
    status: DeploymentStatus;
    timestamp: string;
    failureReason?: string;
  };
}

export interface SSEStageEvent {
  type: 'stage';
  data: {
    deploymentId: string;
    stage: BuildStage;
    status: 'started' | 'completed' | 'failed';
    timestamp: string;
  };
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat';
  data: {
    timestamp: string;
  };
}

/** Shape of data sent in the SSE `data:` field (JSON stringified) */
export type SSEEventData = SSEEvent['data'];
