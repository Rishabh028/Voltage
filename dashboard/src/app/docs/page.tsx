"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Zap, 
  BookOpen, 
  Terminal, 
  GitBranch, 
  Globe, 
  Lock, 
  Bot, 
  Copy, 
  Check, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quickstart");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const navSections = [
    { id: "overview", label: "Architecture Overview", icon: Layers },
    { id: "quickstart", label: "Quickstart (Under 60s)", icon: Zap },
    { id: "git-previews", label: "Git & PR Previews", icon: GitBranch },
    { id: "domains-dns", label: "Custom Domains & SSL", icon: Globe },
    { id: "secrets-env", label: "Encrypted Secrets & Env", icon: Lock },
    { id: "agent-mcp", label: "Voltage CLI & Agentic MCP", icon: Bot },
    { id: "api-reference", label: "V1 REST API Reference", icon: Server },
  ];

  return (
    <div className="min-h-screen bg-transparent text-text-primary flex flex-col selection:bg-accent-signal/30">
      {/* ── Docs Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border-hairline bg-canvas/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-accent-signal/15 border border-accent-signal/30 flex items-center justify-center text-accent-signal">
                <Zap className="w-4 h-4 fill-accent-signal" />
              </div>
              <span className="font-mono font-bold text-xl tracking-tight text-text-primary">
                Voltage
              </span>
              <span className="text-xs font-mono uppercase bg-surface-raised px-2 py-0.5 rounded border border-border-hairline text-text-secondary">
                Docs
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/templates">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary text-xs font-mono">
                Templates
              </Button>
            </Link>
            <Link href="/projects">
              <Button size="sm" className="bg-accent-signal text-canvas hover:bg-accent-signal/90 text-xs font-mono font-semibold">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary font-semibold mb-3">
              Guides & References
            </h3>
            <nav className="space-y-1">
              {navSections.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-mono text-xs text-left transition-colors",
                      isActive 
                        ? "bg-accent-signal/15 text-accent-signal font-semibold border border-accent-signal/30" 
                        : "text-text-secondary hover:text-text-primary hover:bg-surface"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-hairline space-y-2">
            <h4 className="text-xs font-mono font-semibold text-text-primary flex items-center">
              <Bot className="w-3.5 h-3.5 mr-1.5 text-accent-signal" />
              AI Agent Ready
            </h4>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Connect Cursor, Claude Code, or Antigravity directly to Voltage using our Model Context Protocol server.
            </p>
            <button 
              onClick={() => setActiveSection("agent-mcp")}
              className="text-[11px] font-mono text-accent-signal hover:underline flex items-center pt-1"
            >
              Setup MCP Server →
            </button>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 max-w-4xl bg-surface border border-border-hairline rounded-xl p-6 md:p-10 space-y-12">
          {/* Section: Overview */}
          {activeSection === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border-hairline pb-6">
                <span className="text-xs font-mono text-accent-signal uppercase tracking-wider">Architecture</span>
                <h1 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-1">
                  Voltage Platform Architecture
                </h1>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Voltage is a production-ready, multi-tenant cloud deployment platform built on Docker container isolation, Redis routing, PostgreSQL state management, and Let&apos;s Encrypt automated TLS.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-lg bg-surface-raised border border-border-hairline space-y-2">
                  <h4 className="font-mono text-sm font-semibold text-text-primary flex items-center">
                    <Server className="w-4 h-4 mr-2 text-accent-signal" /> Control Plane API
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Express & Node.js backend managing organizations, environments, encrypted secrets (AES-256-GCM), deployments, and webhooks.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-surface-raised border border-border-hairline space-y-2">
                  <h4 className="font-mono text-sm font-semibold text-text-primary flex items-center">
                    <Terminal className="w-4 h-4 mr-2 text-blue-400" /> Isolated Build Workers
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Ephemeral Docker containers executing isolated builds with strict CPU/memory limits, buildpack detection, and live Redis log streaming.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-surface-raised border border-border-hairline space-y-2">
                  <h4 className="font-mono text-sm font-semibold text-text-primary flex items-center">
                    <Globe className="w-4 h-4 mr-2 text-purple-400" /> Dynamic Edge Routing
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    High-performance edge proxy resolving hostnames dynamically via Redis in sub-milliseconds without service restarts.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-surface-raised border border-border-hairline space-y-2">
                  <h4 className="font-mono text-sm font-semibold text-text-primary flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-state-success" /> Envelope Encryption
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Every environment secret is encrypted with AES-256-GCM at rest in PostgreSQL and only decrypted into ephemeral runner containers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Quickstart */}
          {activeSection === "quickstart" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="border-b border-border-hairline pb-6">
                <span className="text-xs font-mono text-accent-signal uppercase tracking-wider">Getting Started</span>
                <h1 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-1">
                  Deploy in Under 60 Seconds
                </h1>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Connect your GitHub repository and get live builds with zero configuration.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex space-x-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-accent-signal/20 text-accent-signal flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="font-mono text-base font-semibold text-text-primary">Connect Your Repository</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Go to the <Link href="/projects/new" className="text-accent-signal underline">New Project Wizard</Link> and paste your public or private GitHub repository URL.
                    </p>
                    <div className="p-3 bg-[#0B0D12] border border-border-hairline rounded-lg font-mono text-xs text-text-secondary">
                      https://github.com/my-org/my-nextjs-app
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-accent-signal/20 text-accent-signal flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="font-mono text-base font-semibold text-text-primary">Automatic Framework Detection</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Voltage automatically inspects your repository and detects your stack:
                    </p>
                    <ul className="text-xs font-mono text-text-secondary space-y-1 list-disc list-inside">
                      <li>Next.js → <span className="text-text-primary">npm run build & npm start</span></li>
                      <li>Vite / React → <span className="text-text-primary">npm run build & static edge sync</span></li>
                      <li>Python / FastAPI → <span className="text-text-primary">pip install -r requirements.txt & uvicorn</span></li>
                      <li>Dockerfile → <span className="text-text-primary">Multi-stage container build</span></li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-accent-signal/20 text-accent-signal flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="font-mono text-base font-semibold text-text-primary">Click &quot;Deploy&quot; & Stream Live Logs</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Your build job is queued on BullMQ, spun up in an isolated runner container, and your live URL is generated immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/projects/new">
                  <Button className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono text-xs font-semibold">
                    Launch New Project Now <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Section: Git & PR Previews */}
          {activeSection === "git-previews" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border-hairline pb-6">
                <span className="text-xs font-mono text-accent-signal uppercase tracking-wider">Automation</span>
                <h1 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-1">
                  GitHub Auto-Builds & PR Previews
                </h1>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Voltage natively handles GitHub webhook events to automate staging and production releases.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono text-text-secondary leading-relaxed">
                <h3 className="text-sm font-bold text-text-primary">Push Events on Default Branch</h3>
                <p>
                  When you push to <span className="text-text-primary">main</span> (or your default branch), Voltage triggers a production build:
                </p>
                <div className="p-3 bg-[#0B0D12] border border-border-hairline rounded-lg text-accent-signal">
                  POST /webhooks/github [x-github-event: push] → Status: QUEUED → Production Live
                </div>

                <h3 className="text-sm font-bold text-text-primary pt-4">Pull Request Preview Deployments</h3>
                <p>
                  When a pull request is opened or synchronized with new commits, Voltage provisions a deterministic preview domain:
                </p>
                <div className="p-3 bg-[#0B0D12] border border-border-hairline rounded-lg text-blue-400">
                  https://&#123;subdomain&#125;-pr-&#123;prNumber&#125;.voltage.localhost
                </div>
                <p>
                  When the pull request is closed or merged, the preview route is automatically deleted from Redis, keeping your routing table tidy.
                </p>
              </div>
            </div>
          )}

          {/* Section: Domains & DNS */}
          {activeSection === "domains-dns" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border-hairline pb-6">
                <span className="text-xs font-mono text-accent-signal uppercase tracking-wider">Networking</span>
                <h1 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-1">
                  Custom Domains & DNS Verification
                </h1>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Connect any custom domain with automated DNS resolution checks and TLS certificates.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono text-text-secondary leading-relaxed">
                <h3 className="text-sm font-bold text-text-primary">Configuring your DNS CNAME</h3>
                <p>
                  Add a CNAME record with your DNS registrar (Cloudflare, Route 53, Namecheap, etc.):
                </p>
                <div className="grid grid-cols-3 gap-2 p-3 bg-[#0B0D12] border border-border-hairline rounded-lg text-text-primary">
                  <span>Type: CNAME</span>
                  <span>Name: app (or @)</span>
                  <span>Target: cname.voltage.run</span>
                </div>

                <h3 className="text-sm font-bold text-text-primary pt-4">Instant DNS Verification API</h3>
                <p>
                  Once configured, verify ownership through the dashboard or programmatically:
                </p>
                <div className="p-3 bg-[#0B0D12] border border-border-hairline rounded-lg text-state-success">
                  POST /v1/domains/&#123;id&#125;/verify → &#123; verified: true, certStatus: &quot;issued&quot; &#125;
                </div>
              </div>
            </div>
          )}

          {/* Section: Secrets & Env */}
          {activeSection === "secrets-env" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border-hairline pb-6">
                <span className="text-xs font-mono text-accent-signal uppercase tracking-wider">Security</span>
                <h1 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-1">
                  Envelope Encryption (AES-256-GCM)
                </h1>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Every environment variable is secured with envelope encryption at rest.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono text-text-secondary leading-relaxed">
                <p>
                  Secrets are never stored in plaintext in the database or exposed in build logs.
                  Each value uses a cryptographic binary structure:
                </p>
                <div className="p-3 bg-[#0B0D12] border border-border-hairline rounded-lg text-purple-400">
                  [12-byte IV nonce] + [16-byte Auth Tag] + [AES-256 Ciphertext] → PostgreSQL BYTEA
                </div>
                <p>
                  Environment variables are strictly separated between <span className="text-text-primary">production</span> and <span className="text-text-primary">preview</span> environments.
                </p>
              </div>
            </div>
          )}

          {/* Section: Agentic MCP */}
          {activeSection === "agent-mcp" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border-hairline pb-6">
                <span className="text-xs font-mono text-accent-signal uppercase tracking-wider">Agent Stack</span>
                <h1 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-1">
                  Voltage CLI & Model Context Protocol
                </h1>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Control deployments via terminal or connect autonomous AI coding agents directly.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono text-text-secondary leading-relaxed">
                <h3 className="text-sm font-bold text-text-primary">Voltage CLI</h3>
                <div className="p-3 bg-[#0B0D12] border border-border-hairline rounded-lg text-text-primary flex items-center justify-between">
                  <span>npx voltage-cli deploy</span>
                  <button onClick={() => handleCopy("npx voltage-cli deploy", "cli")} className="text-text-secondary hover:text-text-primary">
                    {copiedCode === "cli" ? <Check className="w-3.5 h-3.5 text-state-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-text-primary pt-4">Cursor / Windsurf / Claude Code MCP Config</h3>
                <p>Add to your MCP settings file (<span className="text-text-primary">claude_desktop_config.json</span>):</p>
                <pre className="p-4 bg-[#0B0D12] border border-border-hairline rounded-lg text-text-secondary overflow-x-auto">
{`{
  "mcpServers": {
    "voltage": {
      "command": "node",
      "args": ["control-plane/dist/mcp-server.js"],
      "env": {
        "VOLTAGE_API_URL": "http://localhost:3001"
      }
    }
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Section: API Reference */}
          {activeSection === "api-reference" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border-hairline pb-6">
                <span className="text-xs font-mono text-accent-signal uppercase tracking-wider">API Spec</span>
                <h1 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-1">
                  V1 REST API Reference
                </h1>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Complete programmatic interface for projects, deployments, domains, and billing.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-surface-raised border border-border-hairline rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-emerald-400 font-bold mr-2">GET</span>
                    <span className="text-text-primary">/v1/projects</span>
                  </div>
                  <span className="text-text-secondary">List all projects</span>
                </div>

                <div className="p-3 bg-surface-raised border border-border-hairline rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-blue-400 font-bold mr-2">POST</span>
                    <span className="text-text-primary">/v1/projects</span>
                  </div>
                  <span className="text-text-secondary">Create a new project</span>
                </div>

                <div className="p-3 bg-surface-raised border border-border-hairline rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-blue-400 font-bold mr-2">POST</span>
                    <span className="text-text-primary">/v1/deployments/:id/rollback</span>
                  </div>
                  <span className="text-text-secondary">Zero-downtime rollback</span>
                </div>

                <div className="p-3 bg-surface-raised border border-border-hairline rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-blue-400 font-bold mr-2">POST</span>
                    <span className="text-text-primary">/v1/domains/:id/verify</span>
                  </div>
                  <span className="text-text-secondary">DNS CNAME verification</span>
                </div>

                <div className="p-3 bg-surface-raised border border-border-hairline rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-emerald-400 font-bold mr-2">GET</span>
                    <span className="text-text-primary">/v1/orgs/:id/usage</span>
                  </div>
                  <span className="text-text-secondary">Monthly build minutes & limits</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
