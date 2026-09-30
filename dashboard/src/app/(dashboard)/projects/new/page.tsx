"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Terminal, 
  Github, 
  Zap, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  FolderGit2, 
  AlertCircle, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Lock,
  Sparkles,
  ExternalLink,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface EnvVarRow {
  id: string;
  key: string;
  value: string;
}

const FRAMEWORK_PRESETS: Record<
  string, 
  { name: string; icon: string; buildCommand: string; startCommand: string; defaultRoot: string }
> = {
  nextjs: {
    name: "Next.js",
    icon: "▲",
    buildCommand: "npm run build",
    startCommand: "npm start",
    defaultRoot: "."
  },
  vite: {
    name: "Vite / React SPA",
    icon: "⚡",
    buildCommand: "npm run build",
    startCommand: "npx serve -s dist -l 3000",
    defaultRoot: "."
  },
  python: {
    name: "FastAPI / Python",
    icon: "🐍",
    buildCommand: "pip install -r requirements.txt",
    startCommand: "uvicorn main:app --host 0.0.0.0 --port 8000",
    defaultRoot: "."
  },
  nodejs: {
    name: "Node.js / Express",
    icon: "⬢",
    buildCommand: "npm install && npm run build",
    startCommand: "node dist/index.js",
    defaultRoot: "."
  },
  astro: {
    name: "Astro Static",
    icon: "🚀",
    buildCommand: "npm run build",
    startCommand: "npx serve dist -l 3000",
    defaultRoot: "."
  },
  remix: {
    name: "Remix / React Router",
    icon: "💿",
    buildCommand: "npm run build",
    startCommand: "npm start",
    defaultRoot: "."
  },
  docker: {
    name: "Docker Container",
    icon: "🐳",
    buildCommand: "docker build -t app .",
    startCommand: "docker run -p 8080:8080 app",
    defaultRoot: "."
  },
  custom: {
    name: "Other / Custom",
    icon: "⚙️",
    buildCommand: "npm run build",
    startCommand: "npm start",
    defaultRoot: "."
  }
};

const SAMPLE_REPOS = [
  { name: "Next.js Starter", url: "https://github.com/vercel/next.js", framework: "nextjs" },
  { name: "FastAPI Service", url: "https://github.com/tiangolo/fastapi", framework: "python" },
  { name: "Node Express API", url: "https://github.com/expressjs/express", framework: "nodejs" },
  { name: "Astro Blog", url: "https://github.com/withastro/astro", framework: "astro" },
];

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gitUrl, setGitUrl] = useState(searchParams.get("gitUrl") || "");
  const [projectName, setProjectName] = useState(searchParams.get("name") || "");
  const [framework, setFramework] = useState(searchParams.get("framework") || "nextjs");
  const [rootDirectory, setRootDirectory] = useState(searchParams.get("rootDirectory") || ".");
  const [buildCommand, setBuildCommand] = useState(searchParams.get("buildCommand") || "npm run build");
  const [startCommand, setStartCommand] = useState(searchParams.get("startCommand") || "npm start");
  const [showAdvancedBuild, setShowAdvancedBuild] = useState(false);
  const [overrideCommands, setOverrideCommands] = useState(false);
  
  const [envVars, setEnvVars] = useState<EnvVarRow[]>([
    { id: "1", key: "NODE_ENV", value: "production" }
  ]);
  const [rawEnvModalOpen, setRawEnvModalOpen] = useState(false);
  const [rawEnvText, setRawEnvText] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deployStep, setDeployStep] = useState<string>("");

  // Auto-fill project name from Git URL if not user edited
  const handleGitUrlChange = (url: string) => {
    setGitUrl(url);
    if (!projectName || projectName === "my-project") {
      const parts = url.replace(/\.git$/, "").split("/").filter(Boolean);
      if (parts.length > 0) {
        const repoName = parts[parts.length - 1];
        setProjectName(repoName.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
      }
    }
  };

  // When framework changes, automatically update build/start defaults unless overridden
  const handleFrameworkChange = (newFw: string) => {
    setFramework(newFw);
    if (!overrideCommands && FRAMEWORK_PRESETS[newFw]) {
      setBuildCommand(FRAMEWORK_PRESETS[newFw].buildCommand);
      setStartCommand(FRAMEWORK_PRESETS[newFw].startCommand);
      setRootDirectory(FRAMEWORK_PRESETS[newFw].defaultRoot);
    }
  };

  // Add env var row
  const addEnvVar = () => {
    setEnvVars((prev) => [...prev, { id: Math.random().toString(36).substring(2, 9), key: "", value: "" }]);
  };

  // Remove env var row
  const removeEnvVar = (id: string) => {
    setEnvVars((prev) => prev.filter((r) => r.id !== id));
  };

  // Update env var row
  const updateEnvVar = (id: string, field: "key" | "value", val: string) => {
    setEnvVars((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row))
    );
  };

  // Parse bulk raw .env text into rows
  const handleImportRawEnv = () => {
    if (!rawEnvText.trim()) return;
    const lines = rawEnvText.split("\n");
    const newRows: EnvVarRow[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key) {
          newRows.push({ id: Math.random().toString(36).substring(2, 9), key, value });
        }
      }
    }
    if (newRows.length > 0) {
      setEnvVars((prev) => [...prev.filter((r) => r.key.trim() !== ""), ...newRows]);
    }
    setRawEnvText("");
    setRawEnvModalOpen(false);
  };

  // Handle Deploy Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = projectName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!cleanName) {
      setErrorMsg("Please specify a valid project name.");
      return;
    }
    if (!gitUrl.trim()) {
      setErrorMsg("Please provide a Git repository URL.");
      return;
    }

    setIsLoading(true);

    try {
      setDeployStep("Creating project space...");
      const newProject = await api.createProject({
        name: cleanName,
        gitUrl: gitUrl.trim(),
        buildCommand: buildCommand.trim(),
        startCommand: startCommand.trim(),
        rootDirectory: rootDirectory.trim() || ".",
        framework: framework
      });

      // Prepare env vars record
      const envRecord: Record<string, string> = {};
      for (const row of envVars) {
        if (row.key.trim()) {
          envRecord[row.key.trim()] = row.value;
        }
      }

      if (Object.keys(envRecord).length > 0) {
        setDeployStep("Encrypting environment variables (AES-256-GCM)...");
        try {
          const envs = await api.getEnvironments(newProject.id);
          const prodEnv = envs.find((e) => e.name === "production") || envs[0];
          if (prodEnv) {
            await api.setEnvVars(prodEnv.id, envRecord);
          }
        } catch (envErr) {
          console.warn("Non-fatal: failed to set env vars during init", envErr);
        }
      }

      setDeployStep("Enqueuing build & launching deployment container...");
      try {
        await api.triggerDeploy(newProject.id);
      } catch (deployErr) {
        console.warn("Auto-deploy trigger error:", deployErr);
      }

      // Navigate to project detail view
      router.push(`/projects/${newProject.id}`);
    } catch (err: any) {
      console.error("Project creation failed:", err);
      setErrorMsg(err.message || "Failed to create project. Please check network connection.");
      setIsLoading(false);
    }
  };

  const subdomainPreview = (projectName || "my-project").toLowerCase().replace(/[^a-z0-9-]/g, "-");

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-text-secondary mb-1">
            <Link href="/projects" className="hover:text-text-primary transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-text-primary">New Project</span>
          </div>
          <h1 className="text-3xl font-extrabold font-sans tracking-tight">
            Import Git Repository
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Deploy your code to Voltage with automatic builds, envelope-encrypted secrets, and custom subdomains.
          </p>
        </div>

        <Link href="/templates">
          <Button variant="outline" size="sm" className="font-mono text-xs border-border-hairline">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent-signal" />
            Browse Templates
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-state-error/10 border border-state-error/30 text-state-error flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="grow">
            <p className="font-semibold">Creation Error</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-state-error/70 hover:text-state-error text-xs font-mono">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Git Repository Input */}
        <Card className="bg-surface border-border-hairline">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 text-accent-signal">
              <FolderGit2 className="w-5 h-5" />
              <CardTitle className="text-base font-bold font-sans">1. Git Repository</CardTitle>
            </div>
            <CardDescription className="text-xs text-text-secondary">
              Connect any public or private Git repository URL (GitHub, GitLab, or raw Git).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-medium text-text-secondary flex items-center justify-between">
                <span>Repository URL</span>
                <span className="text-[11px] text-text-secondary/80">https://github.com/owner/repo</span>
              </label>
              <div className="relative">
                <Github className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="url"
                  required
                  placeholder="https://github.com/your-username/your-repository"
                  value={gitUrl}
                  onChange={(e) => handleGitUrlChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-sm font-mono placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-signal transition-colors"
                />
              </div>
            </div>

            {/* Quick Sample Chips */}
            <div className="pt-1">
              <span className="text-[11px] font-mono text-text-secondary block mb-1.5">
                Quick test with sample repositories:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_REPOS.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => {
                      handleGitUrlChange(sample.url);
                      handleFrameworkChange(sample.framework);
                    }}
                    className="px-2.5 py-1 text-xs font-mono bg-surface-raised border border-border-hairline rounded hover:border-accent-signal/50 hover:text-accent-signal transition-all flex items-center gap-1.5"
                  >
                    <span>{FRAMEWORK_PRESETS[sample.framework]?.icon}</span>
                    <span>{sample.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Project Identity & Subdomain */}
        <Card className="bg-surface border-border-hairline">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 text-accent-signal">
              <Layers className="w-5 h-5" />
              <CardTitle className="text-base font-bold font-sans">2. Project Identity</CardTitle>
            </div>
            <CardDescription className="text-xs text-text-secondary">
              Configure project name and instant public subdomain routing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-text-secondary">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="my-voltage-app"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-canvas border border-border-hairline rounded-lg text-sm font-mono focus:outline-none focus:border-accent-signal transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-text-secondary">
                  Target Subdomain Preview
                </label>
                <div className="px-3.5 py-2 bg-canvas/60 border border-border-hairline rounded-lg text-sm font-mono text-accent-signal truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-state-success shrink-0" />
                  <span className="truncate">{subdomainPreview}.voltage.app</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Framework Preset & Build Commands */}
        <Card className="bg-surface border-border-hairline">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-accent-signal">
                <Zap className="w-5 h-5" />
                <CardTitle className="text-base font-bold font-sans">3. Framework Preset & Build Settings</CardTitle>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedBuild(!showAdvancedBuild)}
                className="text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1"
              >
                <span>{showAdvancedBuild ? "Hide Settings" : "Custom Override"}</span>
                {showAdvancedBuild ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            <CardDescription className="text-xs text-text-secondary">
              Voltage auto-detects standard buildpacks and applies optimal production commands.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Framework Selector Pills */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-medium text-text-secondary">
                Framework Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(FRAMEWORK_PRESETS).map(([key, preset]) => {
                  const isSelected = framework === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleFrameworkChange(key)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-center space-x-2.5 ${
                        isSelected
                          ? "bg-accent-signal/10 border-accent-signal text-text-primary shadow-sm"
                          : "bg-canvas border-border-hairline text-text-secondary hover:border-text-secondary/40 hover:text-text-primary"
                      }`}
                    >
                      <span className="text-base">{preset.icon}</span>
                      <span className="text-xs font-mono font-medium truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Build Commands (Collapsible / Customizable) */}
            <div className="pt-2 space-y-4 border-t border-border-hairline">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="text-text-secondary">Root Directory</label>
                  <input
                    type="text"
                    value={rootDirectory}
                    onChange={(e) => {
                      setOverrideCommands(true);
                      setRootDirectory(e.target.value);
                    }}
                    placeholder="."
                    className="w-full px-3 py-2 bg-canvas border border-border-hairline rounded text-text-primary focus:outline-none focus:border-accent-signal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary">Build Command</label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => {
                      setOverrideCommands(true);
                      setBuildCommand(e.target.value);
                    }}
                    placeholder="npm run build"
                    className="w-full px-3 py-2 bg-canvas border border-border-hairline rounded text-text-primary focus:outline-none focus:border-accent-signal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary">Start Command</label>
                  <input
                    type="text"
                    value={startCommand}
                    onChange={(e) => {
                      setOverrideCommands(true);
                      setStartCommand(e.target.value);
                    }}
                    placeholder="npm start"
                    className="w-full px-3 py-2 bg-canvas border border-border-hairline rounded text-text-primary focus:outline-none focus:border-accent-signal"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Environment Variables */}
        <Card className="bg-surface border-border-hairline">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-accent-signal">
                <Lock className="w-5 h-5" />
                <CardTitle className="text-base font-bold font-sans">4. Environment Variables</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setRawEnvModalOpen(true)}
                  className="text-xs font-mono text-text-secondary hover:text-accent-signal transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Paste .env
                </button>
              </div>
            </div>
            <CardDescription className="text-xs text-text-secondary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-signal inline" />
              <span>Encrypted at rest using AES-256-GCM envelope encryption. Injected securely into runtime containers.</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {envVars.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="KEY (e.g. DATABASE_URL)"
                  value={row.key}
                  onChange={(e) => updateEnvVar(row.id, "key", e.target.value)}
                  className="w-1/2 px-3 py-2 bg-canvas border border-border-hairline rounded text-xs font-mono focus:outline-none focus:border-accent-signal uppercase"
                />
                <input
                  type="text"
                  placeholder="VALUE"
                  value={row.value}
                  onChange={(e) => updateEnvVar(row.id, "value", e.target.value)}
                  className="w-1/2 px-3 py-2 bg-canvas border border-border-hairline rounded text-xs font-mono focus:outline-none focus:border-accent-signal"
                />
                <button
                  type="button"
                  onClick={() => removeEnvVar(row.id)}
                  className="p-2 text-text-secondary hover:text-state-error rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEnvVar}
              className="mt-2 text-xs font-mono border-dashed border-border-hairline w-full"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Variable
            </Button>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-hairline">
          <div className="text-xs font-mono text-text-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-signal" />
            <span>Ready to orchestrate container & route domain</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <Link href="/projects" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto font-mono text-xs"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono text-xs font-bold px-6 h-10 shadow-lg shadow-accent-signal/20 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{deployStep || "Deploying..."}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Deploy Project</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Raw .env Import Modal */}
      {rawEnvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border-hairline rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-sans">Paste .env File Contents</h3>
              <button
                onClick={() => setRawEnvModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-sm font-mono"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              Paste newline-separated KEY=VALUE pairs. Lines starting with # are ignored.
            </p>
            <textarea
              rows={8}
              value={rawEnvText}
              onChange={(e) => setRawEnvText(e.target.value)}
              placeholder={`PORT=3000\nDATABASE_URL=postgresql://...\nAPI_KEY=sk_voltage_...`}
              className="w-full p-3 bg-canvas border border-border-hairline rounded-lg text-xs font-mono focus:outline-none focus:border-accent-signal"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRawEnvModalOpen(false)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleImportRawEnv}
                className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono text-xs font-semibold"
              >
                Parse & Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-surface-raised h-96 rounded-xl w-full" />}>
      <NewProjectForm />
    </Suspense>
  );
}