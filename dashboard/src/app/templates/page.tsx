"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Terminal, 
  Search, 
  Sparkles, 
  ArrowRight, 
  Github, 
  Layers, 
  Cpu, 
  Server, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Check, 
  ExternalLink,
  Code2,
  Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface Template {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: "Full Stack" | "Frontend" | "Backend & APIs" | "AI & Microservices" | "Containers";
  framework: string;
  gitUrl: string;
  buildCommand: string;
  startCommand: string;
  rootDirectory: string;
  badge: string;
  iconBg: string;
  tags: string[];
  stars: string;
  features: string[];
  envVars?: Array<{ key: string; description: string; defaultVal?: string }>;
}

const TEMPLATES: Template[] = [
  {
    id: "nextjs-app-router",
    title: "Next.js 14 App Router",
    subtitle: "React Server Components & Tailwind CSS",
    description: "Production full-stack web application with Next.js 14 App Router, Server Actions, React 18, and optimized edge caching.",
    category: "Full Stack",
    framework: "nextjs",
    gitUrl: "https://github.com/vercel/next.js",
    buildCommand: "npm run build",
    startCommand: "npm start",
    rootDirectory: ".",
    badge: "Most Popular",
    iconBg: "bg-black text-white border-white/20",
    tags: ["Next.js 14", "React", "TypeScript", "Tailwind CSS"],
    stars: "124k",
    features: ["Streaming SSR with Suspense", "Server Actions data mutations", "Image & font optimization built-in"],
    envVars: [
      { key: "DATABASE_URL", description: "PostgreSQL connection string", defaultVal: "postgresql://postgres:voltage@postgres:5432/main" },
      { key: "NEXTAUTH_SECRET", description: "Cryptographic secret for sessions", defaultVal: "voltage-secure-jwt-key" }
    ]
  },
  {
    id: "vite-react-spa",
    title: "Vite + React 18 SPA",
    subtitle: "Lightning-Fast Edge Static Frontend",
    description: "Ultra-fast client-side React single page application with Tailwind CSS, Lucide icons, and zero-latency CDN edge delivery.",
    category: "Frontend",
    framework: "vite",
    gitUrl: "https://github.com/vitejs/vite",
    buildCommand: "npm run build",
    startCommand: "npx serve -s dist -l 3000",
    rootDirectory: ".",
    badge: "Instant Deploy",
    iconBg: "bg-purple-950 text-purple-400 border-purple-500/30",
    tags: ["Vite", "React", "Tailwind CSS", "SPA"],
    stars: "71k",
    features: ["Sub-second Hot Module Replacement", "Edge CDN global static distribution", "Clean client-side routing fallback"],
    envVars: [
      { key: "VITE_API_BASE_URL", description: "Public backend API URL", defaultVal: "https://api.voltage.app" }
    ]
  },
  {
    id: "fastapi-python",
    title: "FastAPI Python Microservice",
    subtitle: "Modern Async Python ASGI REST API",
    description: "High-performance Python 3.11 backend with Pydantic v2 validation, automated Swagger OpenAPI docs, and async I/O.",
    category: "Backend & APIs",
    framework: "python",
    gitUrl: "https://github.com/tiangolo/fastapi",
    buildCommand: "pip install -r requirements.txt",
    startCommand: "uvicorn main:app --host 0.0.0.0 --port 8000",
    rootDirectory: ".",
    badge: "High Performance",
    iconBg: "bg-emerald-950 text-emerald-400 border-emerald-500/30",
    tags: ["Python 3.11", "FastAPI", "Uvicorn", "Pydantic"],
    stars: "76k",
    features: ["Async non-blocking concurrency", "Interactive Swagger UI at /docs", "Native Python type hints validation"],
    envVars: [
      { key: "APP_ENV", description: "Environment mode", defaultVal: "production" },
      { key: "REDIS_URL", description: "Redis connection URI", defaultVal: "redis://default:voltage@redis:6379" }
    ]
  },
  {
    id: "express-node-api",
    title: "Express.js REST API",
    subtitle: "Node.js Microservice with Prisma ORM",
    description: "Clean, battle-tested Node.js backend with Express, Prisma ORM, CORS security middleware, and healthcheck telemetry.",
    category: "Backend & APIs",
    framework: "nodejs",
    gitUrl: "https://github.com/expressjs/express",
    buildCommand: "npm install && npm run build",
    startCommand: "node dist/index.js",
    rootDirectory: ".",
    badge: "Zero Config",
    iconBg: "bg-amber-950 text-amber-400 border-amber-500/30",
    tags: ["Node.js", "Express", "TypeScript", "Prisma"],
    stars: "64k",
    features: ["Robust JSON middleware pipeline", "Zero-downtime process restart", "Prisma ORM migrations on build"],
    envVars: [
      { key: "PORT", description: "Server listening port", defaultVal: "3000" },
      { key: "DATABASE_URL", description: "PostgreSQL connection string", defaultVal: "postgresql://postgres:voltage@postgres:5432/main" }
    ]
  },
  {
    id: "astro-content-site",
    title: "Astro 4 Content Engine",
    subtitle: "Zero-JS Default Static & MDX Site",
    description: "Modern content-driven website and docs engine featuring Astro Island architecture, Markdown/MDX, and 100/100 Lighthouse score.",
    category: "Frontend",
    framework: "astro",
    gitUrl: "https://github.com/withastro/astro",
    buildCommand: "npm run build",
    startCommand: "npx serve dist -l 3000",
    rootDirectory: ".",
    badge: "100 Lighthouse",
    iconBg: "bg-orange-950 text-orange-400 border-orange-500/30",
    tags: ["Astro", "Markdown", "MDX", "SSG"],
    stars: "46k",
    features: ["Zero client-side JS by default", "Islands of interactivity", "Pre-rendered static HTML at edge"],
    envVars: [
      { key: "PUBLIC_SITE_URL", description: "Canonical site URL", defaultVal: "https://my-blog.voltage.app" }
    ]
  },
  {
    id: "docker-universal",
    title: "Multi-Stage Docker Container",
    subtitle: "Run Any Language, Binary or Runtime",
    description: "Universal multi-stage Dockerfile starter with unprivileged user security, layer caching, and automatic port binding.",
    category: "Containers",
    framework: "docker",
    gitUrl: "https://github.com/docker-library/golang",
    buildCommand: "docker build -t app .",
    startCommand: "docker run -p 8080:8080 app",
    rootDirectory: ".",
    badge: "Universal",
    iconBg: "bg-cyan-950 text-cyan-400 border-cyan-500/30",
    tags: ["Docker", "Alpine", "Multi-Stage", "Any Runtime"],
    stars: "50k",
    features: ["Containerized isolation with cgroups", "Port 80/8080 dynamic routing", "Non-root user security context"],
    envVars: [
      { key: "PORT", description: "Internal container port", defaultVal: "8080" }
    ]
  },
  {
    id: "langchain-ai-agent",
    title: "LangChain & MCP Agent API",
    subtitle: "Autonomous Agent with Streaming SSE",
    description: "Production AI agent microservice supporting Anthropic & OpenAI streaming, Model Context Protocol (MCP) server tools, and async execution.",
    category: "AI & Microservices",
    framework: "python",
    gitUrl: "https://github.com/langchain-ai/langchain",
    buildCommand: "pip install -r requirements.txt",
    startCommand: "python server.py",
    rootDirectory: ".",
    badge: "Agent Ready",
    iconBg: "bg-indigo-950 text-indigo-400 border-indigo-500/30",
    tags: ["AI Agents", "Python", "MCP Protocol", "Streaming SSE"],
    stars: "92k",
    features: ["Server-Sent Events token streaming", "Tool-calling MCP server integration", "Encrypted API key injection"],
    envVars: [
      { key: "OPENAI_API_KEY", description: "OpenAI or Gemini API Token", defaultVal: "sk-proj-..." },
      { key: "MCP_SERVER_ENABLED", description: "Enable MCP Tool Endpoint", defaultVal: "true" }
    ]
  },
  {
    id: "remix-fullstack",
    title: "Remix / React Router v7",
    subtitle: "Web Standards Nested Fullstack App",
    description: "Modern full-stack web framework focused on web standards, robust nested routing, parallel data loaders, and zero waterfalls.",
    category: "Full Stack",
    framework: "remix",
    gitUrl: "https://github.com/remix-run/remix",
    buildCommand: "npm run build",
    startCommand: "npm start",
    rootDirectory: ".",
    badge: "Edge Ready",
    iconBg: "bg-blue-950 text-blue-400 border-blue-500/30",
    tags: ["Remix", "TypeScript", "Loaders", "Mutations"],
    stars: "29k",
    features: ["Zero-waterfall parallel data loading", "Native HTML form submissions", "Automated error boundary fallbacks"],
    envVars: [
      { key: "SESSION_SECRET", description: "Cookie signing secret", defaultVal: "super-secret-remix-voltage" }
    ]
  }
];

const CATEGORIES = ["All Templates", "Full Stack", "Frontend", "Backend & APIs", "AI & Microservices", "Containers"] as const;

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All Templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((template) => {
      const matchesCategory =
        selectedCategory === "All Templates" || template.category === selectedCategory;
      const matchesSearch =
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-transparent text-text-primary selection:bg-accent-signal selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border-hairline bg-canvas/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-signal flex items-center justify-center shadow-[0_0_15px_rgba(255,92,0,0.3)]">
                <Terminal className="w-4 h-4 text-canvas" />
              </div>
              <span className="text-xl font-bold font-mono tracking-tight text-text-primary">
                Voltage
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link href="/projects" className="text-text-secondary hover:text-text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/templates" className="text-accent-signal font-semibold transition-colors">
                Templates
              </Link>
              <Link href="/docs" className="text-text-secondary hover:text-text-primary transition-colors">
                Documentation
              </Link>
              <Link href="/settings/billing" className="text-text-secondary hover:text-text-primary transition-colors">
                Pricing
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/projects/new">
              <Button className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono text-xs font-semibold px-4 h-9">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Import Custom Git
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-hairline bg-surface text-xs font-mono text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-accent-signal" />
            <span>Pre-built, Production-Hardened Starters</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-sans">
            Deploy in Seconds with <span className="text-accent-signal">Templates</span>
          </h1>
          <p className="text-lg text-text-secondary">
            Jumpstart full-stack web applications, edge APIs, static sites, or AI agent services.
            Every template includes automatic SSL, envelope-encrypted environment variables, and branch previews.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search templates, frameworks, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border-hairline rounded-lg text-sm font-mono placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-signal transition-colors"
              />
            </div>

            {/* Total count badge */}
            <div className="text-xs font-mono text-text-secondary self-start sm:self-center">
              Showing <span className="text-text-primary font-semibold">{filteredTemplates.length}</span> templates
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-accent-signal text-canvas font-semibold shadow-sm"
                      : "bg-surface border border-border-hairline text-text-secondary hover:text-text-primary hover:border-text-secondary/40"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const deployParams = new URLSearchParams({
              template: template.id,
              name: template.id,
              gitUrl: template.gitUrl,
              framework: template.framework,
              buildCommand: template.buildCommand,
              startCommand: template.startCommand,
              rootDirectory: template.rootDirectory
            }).toString();

            return (
              <Card
                key={template.id}
                className="bg-surface border border-border-hairline hover:border-text-secondary/40 transition-all duration-200 flex flex-col justify-between group hover:shadow-lg hover:shadow-black/20"
              >
                <div>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={`p-2.5 rounded-lg border font-mono text-sm font-bold ${template.iconBg}`}>
                        {template.framework === "nextjs" && "▲"}
                        {template.framework === "vite" && "⚡"}
                        {template.framework === "python" && "🐍"}
                        {template.framework === "nodejs" && "⬢"}
                        {template.framework === "astro" && "🚀"}
                        {template.framework === "docker" && "🐳"}
                        {template.framework === "remix" && "💿"}
                      </div>
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-raised border border-border-hairline text-accent-signal">
                        {template.badge}
                      </span>
                    </div>

                    <CardTitle className="text-lg font-bold font-sans group-hover:text-accent-signal transition-colors">
                      {template.title}
                    </CardTitle>
                    <p className="text-xs font-mono text-text-secondary">
                      {template.subtitle}
                    </p>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4">
                    <CardDescription className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {template.description}
                    </CardDescription>

                    {/* Features checklist */}
                    <div className="space-y-1.5 pt-1">
                      {template.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center text-[11px] text-text-secondary">
                          <Check className="w-3.5 h-3.5 text-accent-signal mr-1.5 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-mono bg-canvas border border-border-hairline rounded text-text-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <div className="p-5 pt-0 border-t border-border-hairline/60 mt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors flex items-center"
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1" />
                    Details
                  </button>

                  <Link href={`/projects/new?${deployParams}`} className="grow flex justify-end">
                    <Button
                      size="sm"
                      className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono text-xs font-semibold px-4 h-8 transition-all"
                    >
                      Deploy
                      <ArrowRight className="w-3 h-3 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty state if search returned no results */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border-hairline rounded-xl bg-surface/40 space-y-3">
            <Boxes className="w-10 h-10 text-text-secondary mx-auto opacity-50" />
            <h3 className="text-base font-semibold font-sans">No matching templates found</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto font-mono">
              Try adjusting your search query or choose a different category.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("All Templates");
                setSearchQuery("");
              }}
              className="font-mono text-xs"
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Architectural Pillars Callout */}
        <div className="border border-border-hairline rounded-2xl bg-surface/50 p-8 sm:p-10 space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-bold font-sans">
              Built on Voltage Cloud Primitives
            </h2>
            <p className="text-sm text-text-secondary">
              Every starter template inherits our resilient edge routing and orchestration platform automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-surface border border-border-hairline text-accent-signal">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold font-mono">Instant Free SSL</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Automatic HTTPS provisioning and renewal for standard subdomains and custom domains.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-surface border border-border-hairline text-accent-signal">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold font-mono">Envelope Encryption</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                AES-256-GCM secret protection with rotating keys and zero plaintext leak in logs.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-surface border border-border-hairline text-accent-signal">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold font-mono">PR Previews</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Isolated staging environments generated for every Pull Request before merging to production.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-surface border border-border-hairline text-accent-signal">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold font-mono">Zero Downtime</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Atomic switchover between builds with instant one-click rollback if healthchecks fail.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Quick Details Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border-hairline rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-sans">{selectedTemplate.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-border-hairline text-accent-signal">
                    {selectedTemplate.category}
                  </span>
                </div>
                <p className="text-xs font-mono text-text-secondary">{selectedTemplate.subtitle}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {selectedTemplate.description}
            </p>

            {/* Build Specifications */}
            <div className="space-y-2 bg-canvas border border-border-hairline rounded-lg p-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-border-hairline/50">
                <span className="text-text-secondary">Framework</span>
                <span className="font-semibold text-text-primary">{selectedTemplate.framework}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-hairline/50">
                <span className="text-text-secondary">Build Command</span>
                <span className="text-accent-signal">{selectedTemplate.buildCommand}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-hairline/50">
                <span className="text-text-secondary">Start Command</span>
                <span className="text-accent-signal">{selectedTemplate.startCommand}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Root Directory</span>
                <span className="text-text-primary">{selectedTemplate.rootDirectory}</span>
              </div>
            </div>

            {/* Required Environment Variables Preview */}
            {selectedTemplate.envVars && selectedTemplate.envVars.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold font-mono text-text-secondary uppercase tracking-wider">
                  Environment Variables
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {selectedTemplate.envVars.map((env) => (
                    <div
                      key={env.key}
                      className="flex items-center justify-between bg-surface-raised px-3 py-1.5 rounded border border-border-hairline font-mono text-xs"
                    >
                      <span className="text-text-primary font-bold">{env.key}</span>
                      <span className="text-[11px] text-text-secondary truncate max-w-[200px]">
                        {env.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-hairline">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
                className="font-mono text-xs"
              >
                Close
              </Button>
              <Link
                href={`/projects/new?${new URLSearchParams({
                  template: selectedTemplate.id,
                  name: selectedTemplate.id,
                  gitUrl: selectedTemplate.gitUrl,
                  framework: selectedTemplate.framework,
                  buildCommand: selectedTemplate.buildCommand,
                  startCommand: selectedTemplate.startCommand,
                  rootDirectory: selectedTemplate.rootDirectory
                }).toString()}`}
              >
                <Button
                  size="sm"
                  className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono text-xs font-semibold px-4"
                >
                  Deploy This Template
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="border-t border-border-hairline bg-surface/30 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-accent-signal" />
            <span className="font-mono text-xs text-text-secondary">
              Voltage Cloud PaaS &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center space-x-6 text-xs font-mono text-text-secondary">
            <Link href="/docs" className="hover:text-text-primary transition-colors">Docs</Link>
            <Link href="/templates" className="hover:text-text-primary transition-colors">Templates</Link>
            <Link href="/projects" className="hover:text-text-primary transition-colors">Dashboard</Link>
            <Link href="/settings/billing" className="hover:text-text-primary transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}