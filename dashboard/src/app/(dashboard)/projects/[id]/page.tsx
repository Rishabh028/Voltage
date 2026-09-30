"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveTerminal } from "@/components/terminal/LiveTerminal";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { 
  GitBranch, 
  GitCommit, 
  Clock, 
  Play, 
  ExternalLink, 
  Globe, 
  Settings as SettingsIcon, 
  Terminal, 
  Eye, 
  Loader2,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { StageTracker } from "@/components/terminal/StageTracker";

import { useProject, useDeployments } from "@/hooks/useProjects";
import { useDeploymentStream } from "@/hooks/useDeploymentStream";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const { project, isLoading, mutate: mutateProject } = useProject(params.id);
  const { deployments, isLoading: isDeploymentsLoading, mutate: mutateDeployments } = useDeployments(params.id);
  const [activeTab, setActiveTab] = useState<"terminal" | "preview">("terminal");
  const [isDeploying, setIsDeploying] = useState(false);

  const currentDeployment = deployments?.[0];

  const { logs, status: streamStatus, stages } = useDeploymentStream(
    currentDeployment?.id || "",
    currentDeployment?.status,
    () => {
      mutateDeployments();
      mutateProject();
    }
  );

  if (isLoading || !project) {
    return <div className="animate-pulse bg-surface-raised h-full rounded-xl w-full min-h-[500px]" />;
  }

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      await api.triggerDeploy(project.id);
      await mutateDeployments();
      await mutateProject();
      setActiveTab("terminal");
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeploying(false);
    }
  };

  const effectiveStatus = (streamStatus === "LIVE" ? "LIVE" : (currentDeployment?.status || project.status || "PENDING")) as any;
  const isLive = effectiveStatus === "LIVE";
  const durationText = currentDeployment?.duration || (effectiveStatus === "LIVE" ? "3.8s" : effectiveStatus === "BUILDING" ? "Running..." : "-");

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-text-primary">{project.name}</h1>
            <StatusPill status={effectiveStatus} />
          </div>
          <a 
            href={`http://localhost:3001/sites/${project.subdomain}/`} 
            target="_blank" 
            rel="noreferrer" 
            className="text-text-secondary text-sm flex items-center hover:text-accent-signal transition-colors group mt-1"
          >
            <span className="font-mono text-xs bg-surface-raised px-2.5 py-1 rounded border border-border-hairline group-hover:border-accent-signal/50 flex items-center">
              <span className={cn("w-1.5 h-1.5 rounded-full mr-2", isLive ? "bg-state-success animate-pulse" : "bg-state-pending")} />
              {project.subdomain}.localhost:3001
            </span>
            <ExternalLink className="w-3.5 h-3.5 ml-2 text-text-secondary group-hover:text-accent-signal transition-colors" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a href={`http://localhost:3001/sites/${project.subdomain}/`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="border-border-hairline text-state-success hover:bg-state-success/10 border-state-success/30">
              <Globe className="w-4 h-4 mr-2" /> Visit Site
            </Button>
          </a>
          <Link href={`/projects/${project.id}/domains`}>
            <Button variant="outline" className="border-border-hairline text-text-secondary hover:text-text-primary">
              <Globe className="w-4 h-4 mr-2" /> Domains
            </Button>
          </Link>
          <Link href={`/projects/${project.id}/settings`}>
            <Button variant="outline" className="border-border-hairline text-text-secondary hover:text-text-primary">
              <SettingsIcon className="w-4 h-4 mr-2" /> Settings
            </Button>
          </Link>
          <Button 
            className="bg-text-primary text-canvas hover:bg-text-primary/90 min-w-[100px]" 
            onClick={handleDeploy}
            disabled={isDeploying || streamStatus === "BUILDING"}
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Deploy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[460px]">
        {/* Left 2 Cols: Stages + Interactive Terminal/Preview */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <StageTracker stages={stages} />

          {/* View Tab Switcher */}
          <div className="flex items-center justify-between border-b border-border-hairline pb-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("terminal")}
                className={cn(
                  "flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-lg transition-colors",
                  activeTab === "terminal" 
                    ? "bg-surface-raised text-text-primary border border-border-hairline" 
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Build Terminal</span>
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-lg transition-colors",
                  activeTab === "preview" 
                    ? "bg-surface-raised text-text-primary border border-border-hairline" 
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Site Preview</span>
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            </div>

            {activeTab === "preview" && (
              <a 
                href={`/preview/${project.subdomain}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-mono text-text-secondary hover:text-text-primary flex items-center space-x-1"
              >
                <span>Open full window</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>

          {/* Content Pane */}
          <div className="flex-1 min-h-[360px] relative">
            {activeTab === "terminal" ? (
              currentDeployment ? (
                <LiveTerminal 
                  deploymentId={currentDeployment.id} 
                  initialStatus={currentDeployment.status}
                  logs={logs}
                  status={streamStatus}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-secondary font-mono text-sm border border-border-hairline rounded-xl bg-[#0B0D12] p-8 space-y-3">
                  <Terminal className="w-8 h-8 text-text-secondary/50" />
                  <p>No deployments yet. Click "Deploy" to launch your first build.</p>
                </div>
              )
            ) : (
              <div className="h-full rounded-xl overflow-hidden border border-border-hairline bg-[#0B0D12] flex flex-col shadow-2xl min-h-[460px]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#12151C] border-b border-border-hairline text-xs font-mono text-text-secondary">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-text-primary">{project.subdomain}.localhost:3001</span>
                  </div>
                  <a 
                    href={`http://localhost:3001/sites/${project.subdomain}/`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="hover:text-accent-signal transition-colors flex items-center"
                  >
                    Open <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <iframe
                  src={`http://localhost:3001/sites/${project.subdomain}/`}
                  title="Live Preview"
                  className="w-full flex-1 border-0 bg-white min-h-[400px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Current Deployment Metadata & History */}
        <div className="space-y-6 flex flex-col overflow-hidden">
          <Card className="shrink-0 border-border-hairline bg-surface-raised/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary uppercase tracking-wider font-mono">Current Deployment</CardTitle>
              {currentDeployment && (
                <span className={cn(
                  "text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold",
                  currentDeployment.isProduction !== false 
                    ? "bg-state-success/15 text-state-success border border-state-success/30" 
                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                )}>
                  {currentDeployment.isProduction !== false ? "Production" : "Preview"}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center"><GitBranch className="w-4 h-4 mr-2" /> Branch</span>
                <span className="font-mono text-text-primary">{currentDeployment?.branch || "main"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center"><GitCommit className="w-4 h-4 mr-2" /> Commit</span>
                <span className="font-mono text-text-primary">{currentDeployment?.commitSha?.substring(0, 7) || "7f8e901"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center"><Globe className="w-4 h-4 mr-2" /> Live URL</span>
                <a 
                  href={`http://localhost:3001/sites/${project.subdomain}/`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-mono text-xs text-accent-signal hover:underline flex items-center"
                >
                  {project.subdomain}.localhost:3001
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center"><Clock className="w-4 h-4 mr-2" /> Duration</span>
                <span className="font-mono text-text-primary">{durationText}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col overflow-hidden border-border-hairline bg-surface-raised/40">
            <CardHeader className="shrink-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary uppercase tracking-wider font-mono">Deployment History</CardTitle>
            </CardHeader>
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableBody>
                  {deployments?.map(dep => (
                    <TableRow key={dep.id} className="cursor-pointer group hover:bg-surface-raised/50 border-border-hairline">
                      <TableCell className="py-3">
                        <Link href={`/projects/${project.id}/deployments/${dep.id}`} className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-semibold text-text-primary">{dep.commitSha?.substring(0, 7) || "main"}</span>
                            <span className={cn(
                              "text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-semibold",
                              dep.isProduction !== false 
                                ? "bg-state-success/15 text-state-success" 
                                : "bg-blue-500/15 text-blue-400"
                            )}>
                              {dep.isProduction !== false ? "PROD" : "PR"}
                            </span>
                          </div>
                          {dep.commitMessage && (
                            <span className="text-xs text-text-secondary line-clamp-1">{dep.commitMessage}</span>
                          )}
                          <span className="text-[11px] text-text-secondary/70">{new Date(dep.createdAt).toLocaleString()}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <StatusPill status={dep.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
