"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { EnvironmentSettings } from "@/components/settings/EnvironmentSettings";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Sliders, Lock, AlertTriangle } from "lucide-react";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<"general" | "env" | "danger">("general");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProject = async () => {
    if (deleteConfirm !== "delete this project") return;
    try {
      setIsDeleting(true);
      await api.deleteProject(projectId);
      router.push("/projects");
    } catch (err) {
      console.error("Failed to delete project", err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight">Project Settings</h1>
        <p className="text-text-secondary text-sm mt-1 font-mono">
          Configure project build options, encrypted secrets, and lifecycle settings
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex space-x-2 border-b border-border-hairline pb-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center px-4 py-2 text-xs font-mono rounded-md transition-all ${
            activeTab === "general"
              ? "bg-surface-raised text-text-primary border border-border-hairline font-semibold"
              : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 mr-2" />
          General
        </button>

        <button
          onClick={() => setActiveTab("env")}
          className={`flex items-center px-4 py-2 text-xs font-mono rounded-md transition-all ${
            activeTab === "env"
              ? "bg-surface-raised text-text-primary border border-border-hairline font-semibold"
              : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
          }`}
        >
          <Lock className="w-3.5 h-3.5 mr-2 text-accent-signal" />
          Environment Variables
        </button>

        <button
          onClick={() => setActiveTab("danger")}
          className={`flex items-center px-4 py-2 text-xs font-mono rounded-md transition-all ${
            activeTab === "danger"
              ? "bg-state-error/10 text-state-error border border-state-error/30 font-semibold"
              : "text-text-secondary hover:text-state-error hover:bg-state-error/5"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-2" />
          Danger Zone
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "general" && <GeneralSettings projectId={projectId} />}
      {activeTab === "env" && <EnvironmentSettings projectId={projectId} />}
      {activeTab === "danger" && (
        <Card className="border-state-error/30 bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center text-state-error text-lg">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Delete Project
            </CardTitle>
            <CardDescription>
              Permanently remove this project, all previous deployment artifacts, domains, and environment secrets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-state-error/5 border border-state-error/20 rounded-lg p-4">
              <p className="text-xs font-mono text-text-secondary mb-3">
                This action is irreversible. All historical build logs and S3 deployment assets will be removed.
              </p>
              <label className="text-xs font-mono text-text-secondary block mb-2">
                Type <span className="text-text-primary font-bold select-all">delete this project</span> to confirm:
              </label>
              <div className="flex space-x-3">
                <Input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="delete this project"
                  className="max-w-xs bg-canvas border-state-error/20 text-xs font-mono"
                />
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== "delete this project" || isDeleting}
                  onClick={handleDeleteProject}
                  className="bg-state-error hover:bg-state-error/90 text-white text-xs font-mono"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete Project"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
