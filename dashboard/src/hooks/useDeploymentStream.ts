import { useState, useEffect, useRef } from "react";
import { LogLine, DeploymentStatus, Stage } from "@/types";

const COMPLETED_STAGES: Stage[] = [
  { id: "clone", name: "Clone", status: "completed" },
  { id: "install", name: "Install", status: "completed" },
  { id: "build", name: "Build", status: "completed" },
  { id: "upload", name: "Deploy", status: "completed" },
];

const INITIAL_PENDING_STAGES: Stage[] = [
  { id: "clone", name: "Clone", status: "active" },
  { id: "install", name: "Install", status: "pending" },
  { id: "build", name: "Build", status: "pending" },
  { id: "upload", name: "Deploy", status: "pending" },
];

const COMPLETED_MOCK_LOGS = [
  "[VOLTAGE] Initializing isolated edge build environment...",
  "[CLONE] Repository cloned successfully from origin/main.",
  "[INSTALL] Inspecting codebase and resolving framework buildpack (Next.js 14)...",
  "[INSTALL] Running npm ci --prefer-offline",
  "[INSTALL] Dependencies resolved cleanly. 420 packages installed in 1.8s.",
  "[BUILD] Executing build command: next build",
  "[BUILD] Creating an optimized production build...",
  "[BUILD] Static routes pre-rendered, serverless lambdas compiled.",
  "[BUILD] Artifact package ready: voltage-bundle-production.tar.gz",
  "[UPLOAD] Uploading artifacts to Voltage Edge CDN (320 edge locations)...",
  "[DEPLOY] Launching container and configuring global SSL route...",
  "Deployment complete."
];

export function useDeploymentStream(
  deploymentId: string,
  initialStatus?: DeploymentStatus,
  onComplete?: () => void
) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<DeploymentStatus>(initialStatus || "PENDING");
  const [stages, setStages] = useState<Stage[]>(
    initialStatus === "LIVE" ? COMPLETED_STAGES : INITIAL_PENDING_STAGES
  );
  const [isConnected, setIsConnected] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!deploymentId) return;

    // If already LIVE from backend, immediately populate completed logs and stages
    if (initialStatus === "LIVE") {
      setStatus("LIVE");
      setStages(COMPLETED_STAGES);
      setIsConnected(true);
      const now = Date.now();
      setLogs(
        COMPLETED_MOCK_LOGS.map((content, idx) => ({
          id: `log-${deploymentId}-${idx}`,
          timestamp: new Date(now - (COMPLETED_MOCK_LOGS.length - idx) * 350).toISOString(),
          content,
          type: idx === COMPLETED_MOCK_LOGS.length - 1 ? "success" : "info"
        }))
      );
      return;
    }

    // Active deployment or pending build
    setIsConnected(true);
    setStatus("BUILDING");
    completedRef.current = false;

    const streamLogs = [
      { text: "[VOLTAGE] Initializing isolated edge build environment...", stage: "clone", status: "active" as const },
      { text: "[CLONE] Repository cloned successfully from origin/main.", stage: "clone", status: "completed" as const },
      { text: "[INSTALL] Inspecting codebase and resolving framework buildpack (Next.js 14)...", stage: "install", status: "active" as const },
      { text: "[INSTALL] Dependencies resolved cleanly. 420 packages installed in 1.8s.", stage: "install", status: "completed" as const },
      { text: "[BUILD] Executing build command: next build", stage: "build", status: "active" as const },
      { text: "[BUILD] Creating an optimized production build...", stage: "build", status: "active" as const },
      { text: "[BUILD] Static routes pre-rendered, serverless lambdas compiled.", stage: "build", status: "completed" as const },
      { text: "[UPLOAD] Uploading artifacts to Voltage Edge CDN...", stage: "upload", status: "active" as const },
      { text: "[DEPLOY] Launching container and configuring global SSL route...", stage: "upload", status: "active" as const },
      { text: "Deployment complete.", stage: "upload", status: "completed" as const, success: true }
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < streamLogs.length) {
        const item = streamLogs[step];
        setLogs(prev => [
          ...prev,
          {
            id: `stream-${deploymentId}-${step}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            content: item.text,
            type: item.success ? "success" : "info"
          }
        ]);

        if (item.stage === "clone") {
          setStages([
            { id: "clone", name: "Clone", status: item.status },
            { id: "install", name: "Install", status: "pending" },
            { id: "build", name: "Build", status: "pending" },
            { id: "upload", name: "Deploy", status: "pending" },
          ]);
        } else if (item.stage === "install") {
          setStages([
            { id: "clone", name: "Clone", status: "completed" },
            { id: "install", name: "Install", status: item.status },
            { id: "build", name: "Build", status: item.status === "completed" ? "active" : "pending" },
            { id: "upload", name: "Deploy", status: "pending" },
          ]);
        } else if (item.stage === "build") {
          setStages([
            { id: "clone", name: "Clone", status: "completed" },
            { id: "install", name: "Install", status: "completed" },
            { id: "build", name: "Build", status: item.status },
            { id: "upload", name: "Deploy", status: item.status === "completed" ? "active" : "pending" },
          ]);
        } else if (item.stage === "upload") {
          if (item.status === "completed") {
            setStages(COMPLETED_STAGES);
            setStatus("LIVE");
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete?.();
            }
          } else {
            setStages([
              { id: "clone", name: "Clone", status: "completed" },
              { id: "install", name: "Install", status: "completed" },
              { id: "build", name: "Build", status: "completed" },
              { id: "upload", name: "Deploy", status: "active" },
            ]);
          }
        }

        step++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => {
      clearInterval(interval);
    };
  }, [deploymentId, initialStatus]);

  return { logs, status, stages, isConnected };
}
