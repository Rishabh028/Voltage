"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Sliders, Check, RefreshCw } from "lucide-react";

export function GeneralSettings({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [startCommand, setStartCommand] = useState("");
  const [rootDirectory, setRootDirectory] = useState(".");
  const [framework, setFramework] = useState("nextjs");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const project = await api.getProject(projectId);
      if (project) {
        setName(project.name || "");
        setBuildCommand(project.buildCommand || "");
        setStartCommand(project.startCommand || "");
        setRootDirectory(project.rootDirectory || ".");
        setFramework(project.framework || "nextjs");
      }
    } catch (err) {
      console.error("Failed to load project settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProject(projectId, {
        name,
        buildCommand,
        startCommand,
        rootDirectory,
        framework,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to update project settings", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-secondary font-mono text-sm">Loading project configuration...</div>;
  }

  return (
    <form onSubmit={handleSave}>
      <Card className="border-border-hairline bg-surface">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Sliders className="w-5 h-5 mr-2 text-accent-signal" />
            Build & Development Settings
          </CardTitle>
          <CardDescription>
            Configure how your repository is compiled, built, and executed by the isolated builder containers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-secondary block">Project Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-canvas font-mono text-xs max-w-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-secondary block">Framework Preset</label>
            <select
              value={framework}
              onChange={e => setFramework(e.target.value)}
              className="bg-canvas border border-border-hairline rounded-md px-3 py-2 text-xs font-mono text-text-primary max-w-lg w-full focus:outline-none focus:ring-1 focus:ring-accent-signal"
            >
              <option value="nextjs">Next.js (Static / Standalone)</option>
              <option value="vite">Vite (React, Vue, Svelte)</option>
              <option value="static">Static HTML / Jamstack</option>
              <option value="generic">Node.js / Generic</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-secondary block">Build Command</label>
            <Input
              placeholder="e.g. npm run build, npx next build"
              value={buildCommand}
              onChange={e => setBuildCommand(e.target.value)}
              className="bg-canvas font-mono text-xs max-w-lg"
            />
            <p className="text-[11px] text-text-secondary font-mono">
              Overrides default framework detection command if specified.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-secondary block">Root Directory</label>
            <Input
              placeholder="."
              value={rootDirectory}
              onChange={e => setRootDirectory(e.target.value)}
              className="bg-canvas font-mono text-xs max-w-lg"
            />
            <p className="text-[11px] text-text-secondary font-mono">
              Directory where source files are located (useful for monorepos).
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border-hairline pt-4">
          <span className="text-xs font-mono text-text-secondary">
            {success && (
              <span className="text-state-success flex items-center">
                <Check className="w-3.5 h-3.5 mr-1" /> Settings updated successfully!
              </span>
            )}
          </span>
          <Button
            type="submit"
            disabled={saving}
            className="bg-accent-signal hover:bg-accent-signal/90 text-white text-xs font-mono"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
