"use client";

import Link from "next/link";
import { LiveTerminal } from "@/components/terminal/LiveTerminal";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, GitBranch, GitCommit, Clock, RotateCcw } from "lucide-react";

import { useProject, useDeployment } from "@/hooks/useProjects";
import { api } from "@/lib/api";

export default function DeploymentDetail({ params }: { params: { id: string, deploymentId: string } }) {
  const { project, isLoading: isProjectLoading } = useProject(params.id);
  const { deployment, isLoading: isDeploymentLoading, mutate } = useDeployment(params.id, params.deploymentId);

  if (isProjectLoading || isDeploymentLoading || !project || !deployment) {
    return <div className="animate-pulse bg-surface-raised h-full rounded-xl w-full min-h-[500px]" />;
  }

  const handleRollback = async () => {
    try {
      await api.rollback(params.id, params.deploymentId);
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex items-center space-x-4 shrink-0">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold font-mono tracking-tight">Deployment</h1>
            <StatusPill status={deployment.status} />
          </div>
          <p className="text-text-secondary text-sm font-mono mt-1">{deployment.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[400px]">
        <div className="lg:col-span-3 flex flex-col h-full min-h-[400px]">
          <LiveTerminal deploymentId={deployment.id} initialStatus={deployment.status} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-text-secondary uppercase tracking-wider">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center"><GitBranch className="w-4 h-4 mr-2" /> Branch</span>
                <span className="font-mono">{deployment.branch || "-"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center"><GitCommit className="w-4 h-4 mr-2" /> Commit</span>
                <span className="font-mono">{deployment.commitSha?.substring(0, 7) || "-"}</span>
              </div>
              {deployment.status === "LIVE" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary flex items-center">Live Preview</span>
                  <a 
                    href={`/preview/${project.subdomain}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="font-mono text-xs text-accent-signal hover:underline"
                  >
                    {project.subdomain}.voltage.app ↗
                  </a>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center"><Clock className="w-4 h-4 mr-2" /> Duration</span>
                <span className="font-mono">{deployment.duration || (deployment.status === "BUILDING" ? "Running..." : "3.8s")}</span>
              </div>
            </CardContent>
          </Card>

          {deployment.status === "LIVE" && (
            <Card className="border-state-pending/20">
              <CardContent className="pt-6">
                <Button variant="outline" className="w-full border-border-hairline hover:border-state-pending hover:text-state-pending" onClick={handleRollback}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Rollback to here
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
