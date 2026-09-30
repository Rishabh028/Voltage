"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Zap, 
  ArrowRight, 
  GitBranch, 
  Globe, 
  Cpu, 
  Database, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Server, 
  GitPullRequest,
  Lock,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import BlurText from "@/components/ui/BlurText";
import SectionAtmosphere, {
  HERO_BACKGROUND_VIDEO,
  OTHER_SECTIONS_BACKGROUND_VIDEO,
  FOOTER_BACKGROUND_VIDEO,
} from "@/components/ui/SectionAtmosphere";

export default function LandingPage() {
  const router = useRouter();
  const [gitUrl, setGitUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"deploy" | "pr" | "domains" | "agent">("deploy");
  const [copiedCmd, setCopiedCmd] = useState(false);

  const otherSectionsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  // 2nd video fade-out before reaching footer
  const { scrollYProgress: otherProgress } = useScroll({
    target: otherSectionsRef,
    offset: ["start start", "end end"],
  });
  const video2Opacity = useTransform(otherProgress, [0, 0.7, 0.95], [1, 1, 0]);

  // Footer transition: slowly gets lighter as you scroll into and view it
  const { scrollYProgress: footerProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });

  const footerLuminance = useTransform(footerProgress, [0, 0.45, 0.95], [0.25, 0.6, 0.95]);
  const footerVideoOpacity = useTransform(footerProgress, [0, 0.45, 1], [0.12, 0.4, 0.7]);
  const footerGlowOpacity = useTransform(footerProgress, [0, 0.5, 1], [0, 0.5, 0.95]);
  const footerGlowScale = useTransform(footerProgress, [0, 1], [0.85, 1.15]);
  const footerContentY = useTransform(footerProgress, [0, 1], [25, 0]);

  const handleStartDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (gitUrl.trim()) {
      router.push(`/projects/new?gitUrl=${encodeURIComponent(gitUrl.trim())}`);
    } else {
      router.push("/projects/new");
    }
  };

  const copyCliCommand = () => {
    navigator.clipboard.writeText("npx voltage-cli deploy");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="min-h-screen bg-transparent text-text-primary flex flex-col selection:bg-accent-signal/30">
      {/* ── Global Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border-hairline bg-canvas/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-accent-signal/15 border border-accent-signal/30 flex items-center justify-center text-accent-signal group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 fill-accent-signal" />
              </div>
              <span className="font-mono font-bold text-xl tracking-tight text-text-primary">
                Voltage
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-text-secondary">
              <a href="#features" className="hover:text-text-primary transition-colors">Products</a>
              <a href="#simulator" className="hover:text-text-primary transition-colors">Architecture</a>
              <Link href="/templates" className="hover:text-text-primary transition-colors">Templates</Link>
              <Link href="/docs" className="hover:text-text-primary transition-colors">Documentation</Link>
              <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
                Sign In
              </Button>
            </Link>
            <Link href="/projects">
              <Button size="sm" className="bg-text-primary text-canvas hover:bg-text-primary/90 font-mono text-xs font-semibold px-4">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 border-b border-border-hairline">
          {/* Section 1 Atmosphere: 1st background ONLY in hero section */}
          <SectionAtmosphere
            videoSrc={HERO_BACKGROUND_VIDEO}
            withTopScrim={false}
            withBottomScrim={true}
            accentGlow={true}
          />

          <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full liquid-glass text-xs font-mono text-text-secondary mb-8 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-accent-signal animate-pulse" />
              <span>Voltage 2.0 is live</span>
              <span className="text-accent-signal font-semibold">The Cloud for Builders & Agents →</span>
            </div>

            <BlurText
              text="Deploy & scale any app or agent in seconds."
              className="text-4xl sm:text-6xl md:text-7xl font-bold font-mono tracking-tight text-text-primary max-w-4xl mx-auto leading-[1.08]"
            />

            <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              The modern developer cloud inspired by Render & Vercel. Push code to Git and get automated buildpack builds, PR preview environments, global edge routing, and automated SSL certificates.
            </p>

            {/* Quick Deploy Box */}
            <form onSubmit={handleStartDeploy} className="mt-10 max-w-xl mx-auto flex flex-col sm:flex-row gap-3 liquid-glass p-2 rounded-xl shadow-2xl">
              <Input
                placeholder="https://github.com/username/repository"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                className="bg-transparent border-0 focus-visible:ring-0 font-mono text-sm placeholder:text-text-secondary/60 text-text-primary flex-1"
              />
              <Button type="submit" className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono font-semibold text-sm px-6 h-10 shrink-0">
                Deploy Now <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-text-secondary">
              <span className="text-text-secondary/60">Popular starters:</span>
              <Link href="/templates" className="hover:text-text-primary flex items-center transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-signal mr-1.5" /> Next.js 14
              </Link>
              <Link href="/templates" className="hover:text-text-primary flex items-center transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5" /> Vite + React
              </Link>
              <Link href="/templates" className="hover:text-text-primary flex items-center transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" /> FastAPI
              </Link>
              <Link href="/templates" className="hover:text-text-primary flex items-center transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" /> Dockerfile
              </Link>
            </div>
          </div>
        </section>

        {/* ── Other Sections: 2nd Video Atmosphere (Simulator through Pricing) ── */}
        <div ref={otherSectionsRef} className="relative">
          {/* Sticky 2nd Video Atmosphere Layer with Dynamic Scroll Fade-Out */}
          <div
            className="sticky top-0 h-screen w-full pointer-events-none -z-10 overflow-hidden"
            style={{ marginBottom: "-100vh" }}
          >
            <motion.div style={{ opacity: video2Opacity }} className="w-full h-full">
              <SectionAtmosphere
                videoSrc={OTHER_SECTIONS_BACKGROUND_VIDEO}
                withTopScrim={true}
                withBottomScrim={true}
                accentGlow={false}
              />
            </motion.div>
          </div>

          <div className="relative z-10">
            {/* ── Interactive Live Simulator ── */}
            <section id="simulator" className="py-20 border-b border-border-hairline bg-surface/40 backdrop-blur-xs">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-xs font-mono uppercase tracking-widest text-accent-signal font-semibold">
                Autonomous Architecture
              </h2>
              <h3 className="text-3xl font-bold font-mono tracking-tight text-text-primary mt-2">
                Engineered for speed, isolation & scale.
              </h3>
              <p className="text-text-secondary text-sm mt-3">
                Select an architectural capability below to preview how Voltage automates your deployment lifecycle.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {[
                { id: "deploy", label: "Git Push to Deploy", icon: GitBranch },
                { id: "pr", label: "PR Preview Environments", icon: GitPullRequest },
                { id: "domains", label: "Custom Domains & SSL", icon: Globe },
                { id: "agent", label: "Agentic MCP Deployment", icon: Bot },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all",
                      activeTab === tab.id
                        ? "bg-accent-signal text-canvas font-semibold shadow-lg shadow-accent-signal/20"
                        : "bg-surface-raised border border-border-hairline text-text-secondary hover:text-text-primary hover:bg-surface"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Terminal Window Widget */}
            <div className="bg-[#0B0D12] border border-border-hairline rounded-xl overflow-hidden shadow-2xl max-w-4xl mx-auto font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-hairline bg-surface/40">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-text-secondary ml-2 text-[11px]">voltage-runner // {activeTab}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                  <span className="text-state-success text-[11px]">LIVE PIPELINE</span>
                </div>
              </div>

              <div className="p-6 space-y-2 text-text-secondary min-h-[300px]">
                {activeTab === "deploy" && (
                  <>
                    <p className="text-text-primary font-semibold">$ git push origin main</p>
                    <p className="text-accent-signal">[WEBHOOK] Received GitHub push event on refs/heads/main (commit 9d4ef82)</p>
                    <p className="text-blue-400">[STAGE: CLONE] Fetching git repository at 34.2 MB/s...</p>
                    <p className="text-blue-400">[STAGE: DETECT] Auto-detected framework: Next.js 14 (App Router)</p>
                    <p>[BUILD] Running user build script: npm run build</p>
                    <p>[BUILD] Creating optimized production build...</p>
                    <p className="text-state-success">✓ Compiled successfully in 4.2s (8 static pages, 3 dynamic routes)</p>
                    <p>[UPLOAD] Syncing build artifacts to S3-compatible edge storage...</p>
                    <p className="text-accent-signal">[ROUTING] Binding active route: acme-app.voltage.localhost → dep-9d4ef82</p>
                    <div className="mt-4 p-3 rounded bg-state-success/10 border border-state-success/30 text-state-success flex items-center justify-between">
                      <span>✓ Deployment Ready: https://acme-app.voltage.localhost</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </>
                )}

                {activeTab === "pr" && (
                  <>
                    <p className="text-text-primary font-semibold">$ gh pr create --title &quot;feat: redesign checkout flow&quot;</p>
                    <p className="text-accent-signal">[WEBHOOK] GitHub Pull Request #42 opened by @developer</p>
                    <p>[PREVIEW] Assigning deterministic preview subdomain: acme-app-pr-42.voltage.localhost</p>
                    <p className="text-blue-400">[STAGE: BUILD] Building branch &apos;feat/checkout&apos; in isolated sandbox container...</p>
                    <p>[RUNTIME] Injected preview environment variables (IS_PREVIEW=true)</p>
                    <p className="text-state-success">✓ Isolated container ready. Route mapped in Redis routing table.</p>
                    <div className="mt-4 p-3 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-between">
                      <span>🔗 Ephemeral PR Preview: https://acme-app-pr-42.voltage.localhost</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] text-text-secondary/70 pt-2">Note: Route will be automatically torn down from Redis when PR #42 is closed or merged.</p>
                  </>
                )}

                {activeTab === "domains" && (
                  <>
                    <p className="text-text-primary font-semibold">$ voltage domains add app.mybrand.com</p>
                    <p>[DNS] Querying DNS CNAME records for app.mybrand.com...</p>
                    <p className="text-state-pending">→ Found CNAME target: cname.voltage.run [VALID]</p>
                    <p className="text-blue-400">[ACME] Requesting automatic TLS/SSL Certificate from Let&apos;s Encrypt...</p>
                    <p className="text-state-success">✓ TLS Certificate issued (Expires in 90 days, auto-renew enabled)</p>
                    <p className="text-accent-signal">[PROXY] High-performance routing configured for custom domain.</p>
                    <div className="mt-4 p-3 rounded bg-state-success/10 border border-state-success/30 text-state-success flex items-center justify-between">
                      <span>🔒 SSL Active: https://app.mybrand.com</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </>
                )}

                {activeTab === "agent" && (
                  <>
                    <p className="text-text-primary font-semibold">&lt;agent&gt; Call voltage_mcp.deploy_project(repo: &quot;fastapi-agent&quot;) &lt;/agent&gt;</p>
                    <p className="text-purple-400">[MCP] Autonomous AI coding agent connected via Model Context Protocol</p>
                    <p>[ORCHESTRATOR] Provisioning PostgreSQL instance & generating DATABASE_URL</p>
                    <p>[SECRETS] AES-256-GCM envelope encryption generated for credentials</p>
                    <p className="text-state-success">✓ Agent deployment initiated autonomously. Logs streamed back to IDE.</p>
                    <div className="mt-4 p-3 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-between">
                      <span>⚡ Agent Endpoint: https://fastapi-agent.voltage.localhost</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Product Suite Matrix (Render & Vercel Primitives) ── */}
        <section id="features" className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-accent-signal font-semibold">
              Complete Cloud Primitives
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-text-primary mt-2">
              Everything you need to build, deploy & scale.
            </h3>
            <p className="text-text-secondary text-sm mt-3">
              One platform replacing complex AWS, Docker, and Kubernetes setups with effortless developer joy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl liquid-glass hover:border-accent-signal/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-accent-signal/10 border border-accent-signal/30 flex items-center justify-center text-accent-signal mb-4 group-hover:scale-105 transition-transform">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-mono font-bold text-lg text-text-primary">Web Services</h4>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Deploy full-stack Node.js, Python, Go, Rust, or Docker apps with zero downtime deployments and automated health checks.
              </p>
            </div>

            <div className="p-6 rounded-xl liquid-glass hover:border-accent-signal/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="font-mono font-bold text-lg text-text-primary">Static Sites & Edge CDN</h4>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Ultra-fast global edge distribution for Next.js, React, Vite, and Astro with automated Brotli compression and cache invalidation.
              </p>
            </div>

            <div className="p-6 rounded-xl liquid-glass hover:border-accent-signal/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <h4 className="font-mono font-bold text-lg text-text-primary">PR Preview Environments</h4>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Every pull request automatically gets a dedicated preview URL. Collaborate with teammates and preview changes before merging to main.
              </p>
            </div>

            <div className="p-6 rounded-xl liquid-glass hover:border-accent-signal/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-mono font-bold text-lg text-text-primary">Managed PostgreSQL</h4>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Production-ready PostgreSQL database with Prisma ORM migrations, connection pooling, automated backups, and encrypted secrets.
              </p>
            </div>

            <div className="p-6 rounded-xl liquid-glass hover:border-accent-signal/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="font-mono font-bold text-lg text-text-primary">Redis & Key-Value</h4>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Ultra-low latency memory store power for routing meshes, pub/sub log streaming, rate-limiting, and distributed session states.
              </p>
            </div>

            <div className="p-6 rounded-xl liquid-glass hover:border-accent-signal/40 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-mono font-bold text-lg text-text-primary">AES-256 Envelope Encryption</h4>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Secrets are never saved in plaintext. AES-256-GCM envelope encryption keeps environment variables secure at rest and in transit.
              </p>
            </div>
          </div>
        </section>

        {/* ── CLI & Agentic Section ── */}
        <section className="py-20 border-t border-b border-border-hairline bg-surface/30">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-accent-signal mb-4">
                <Bot className="w-4 h-4" />
                <span>Agentic Infrastructure</span>
              </div>
              <h3 className="text-3xl font-bold font-mono tracking-tight text-text-primary">
                Built for human developers and AI coding agents.
              </h3>
              <p className="mt-4 text-text-secondary text-sm leading-relaxed">
                Deploy through the dashboard, GitHub webhooks, the Voltage CLI, or AI assistants like Claude, Cursor, and Windsurf via Model Context Protocol (MCP).
              </p>
              <div className="mt-6 space-y-3 font-mono text-xs">
                <div className="flex items-center space-x-2 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-state-success" />
                  <span>Interactive terminal streaming via Redis pub/sub</span>
                </div>
                <div className="flex items-center space-x-2 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-state-success" />
                  <span>One-click instant rollbacks with zero downtime</span>
                </div>
                <div className="flex items-center space-x-2 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-state-success" />
                  <span>Native MCP tools for creating projects & managing envs</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0B0D12] border border-border-hairline rounded-xl p-5 font-mono text-xs shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-hairline text-text-secondary">
                <span>Terminal Quickstart</span>
                <button onClick={copyCliCommand} className="hover:text-text-primary flex items-center">
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-state-success mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  <span>{copiedCmd ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-text-secondary/80"># 1. Install or run the Voltage CLI</p>
              <p className="text-accent-signal">$ npx voltage-cli deploy</p>
              <p className="text-text-secondary/80 mt-3"># 2. Or trigger via Model Context Protocol</p>
              <p className="text-purple-400">$ voltage-mcp --server-port 3001</p>
              <p className="text-text-secondary/80 mt-3"># 3. View live build streaming</p>
              <p className="text-state-success">✓ Project successfully linked and deployed to edge mesh.</p>
            </div>
          </div>
        </section>

        {/* ── Transparent Pricing ── */}
        <section id="pricing" className="py-24 max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-accent-signal font-semibold">
              Pricing
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-text-primary mt-2">
              Predictable, builder-friendly pricing.
            </h3>
            <p className="text-text-secondary text-sm mt-3">
              Start free. Upgrade as your applications and teams grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Hobby Tier */}
            <div className="rounded-2xl liquid-glass p-8 flex flex-col justify-between">
              <div>
                <h4 className="font-mono text-lg font-bold text-text-primary">Hobby</h4>
                <p className="text-text-secondary text-xs mt-1">For personal apps & side projects</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-bold font-mono text-text-primary">$0</span>
                  <span className="text-text-secondary text-xs ml-1 font-mono">/ month</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs font-mono text-text-secondary">
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> 100 build minutes / month</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Up to 3 active projects</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> 100 GB global bandwidth</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Free custom domains & SSL</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Community Discord support</li>
                </ul>
              </div>
              <Link href="/projects/new" className="mt-8 block">
                <Button variant="outline" className="w-full font-mono text-xs">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-2xl border-2 border-accent-signal liquid-glass-strong p-8 flex flex-col justify-between relative shadow-xl shadow-accent-signal/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent-signal text-canvas font-mono text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <h4 className="font-mono text-lg font-bold text-text-primary">Pro</h4>
                <p className="text-text-secondary text-xs mt-1">For scaling startups and professional teams</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-bold font-mono text-accent-signal">$20</span>
                  <span className="text-text-secondary text-xs ml-1 font-mono">/ month</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs font-mono text-text-primary">
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> 1,000 build minutes / month</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Unlimited active projects</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> 5 concurrent build runners</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Automated PR preview environments</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> 1,000 GB global edge bandwidth</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Team collaboration & RBAC</li>
                </ul>
              </div>
              <Link href="/settings/billing" className="mt-8 block">
                <Button className="w-full bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono text-xs font-semibold">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="rounded-2xl liquid-glass p-8 flex flex-col justify-between">
              <div>
                <h4 className="font-mono text-lg font-bold text-text-primary">Enterprise</h4>
                <p className="text-text-secondary text-xs mt-1">Dedicated cloud with compliance & SLA</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-3xl font-bold font-mono text-text-primary">Custom</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs font-mono text-text-secondary">
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Dedicated ARM / x86 compute runners</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> 99.99% uptime SLA</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Custom VPC & private networking</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> SOC2, HIPAA, & audit log exports</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-accent-signal mr-2" /> Dedicated support engineer & Slack</li>
                </ul>
              </div>
              <a href="mailto:enterprise@voltage.run" className="mt-8 block">
                <Button variant="outline" className="w-full font-mono text-xs">
                  Contact Enterprise
                </Button>
              </a>
            </div>
          </div>
        </section>
          </div>
        </div>

        {/* ── Call To Action Banner: Transition Bridge from #000000 to #14191E ── */}
        <section
          className="relative py-24 border-t border-border-hairline overflow-hidden z-10"
          style={{
            background: "linear-gradient(to bottom, #000000 0%, #080C10 50%, #14191E 100%)",
          }}
        >
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h3 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-text-primary">
              Ready to ship on autonomous cloud infrastructure?
            </h3>
            <p className="text-text-secondary text-sm mt-4 max-w-xl mx-auto">
              Join thousands of developers and AI agents deploying with instant Git push automation.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/projects/new">
                <Button className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-mono font-semibold px-8 h-11">
                  Start Building Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" className="font-mono px-6 h-11 border-border-hairline text-text-secondary hover:text-text-primary">
                  Read Documentation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Rich Footer with Dynamic Illuminating Transition ("Slowly Gets Lighter") ── */}
      <footer
        ref={footerRef}
        className="relative overflow-hidden border-t border-border-hairline py-20 text-xs text-text-secondary z-20 transition-colors duration-1000"
        style={{
          background: "linear-gradient(to bottom, #14191E 0%, #0d1217 60%, #07090c 100%)",
        }}
      >
        {/* Dynamic Lightening Atmospheric Video Layer */}
        <motion.div
          style={{ opacity: footerVideoOpacity }}
          className="absolute inset-0 pointer-events-none -z-10 transition-opacity duration-700"
        >
          <SectionAtmosphere
            videoSrc={FOOTER_BACKGROUND_VIDEO}
            withTopScrim={true}
            withBottomScrim={false}
            opacity={1}
            objectPosition="object-bottom"
          />
        </motion.div>

        {/* Dynamic Luminous Horizon Bloom that Slowly Gets Lighter */}
        <motion.div
          style={{
            opacity: footerGlowOpacity,
            scale: footerGlowScale,
          }}
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[850px] sm:w-[1300px] h-[380px] rounded-full blur-[140px] z-0 transition-opacity duration-700"
          aria-hidden="true"
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.25) 0%, rgba(56, 189, 248, 0.16) 40%, transparent 70%)",
            }}
          />
        </motion.div>

        {/* Foreground Grass / Horizon Asset Overlay from Prompt */}
        <motion.img
          src="https://res.cloudinary.com/dy5er7kv5/image/upload/q_auto/f_auto/v1780586778/cta-bg_mlwy5s.png"
          alt=""
          aria-hidden="true"
          style={{ opacity: footerLuminance }}
          className="pointer-events-none select-none absolute left-0 right-0 bottom-[-20px] sm:bottom-[-40px] md:bottom-[-60px] w-full object-cover z-0 transition-opacity duration-700"
        />

        {/* Subtle Bottom Grounding Scrim */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 z-0"
          style={{
            background:
              "linear-gradient(to top, rgba(7, 9, 12, 0.92) 0%, rgba(13, 18, 23, 0.4) 50%, transparent 100%)",
          }}
        />

        {/* Animated Footer Content (Gently rises and reveals as it illuminates) */}
        <motion.div style={{ y: footerContentY }} className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-accent-signal" />
                <span className="font-mono font-bold text-lg text-text-primary">Voltage</span>
              </div>
              <p className="text-xs text-text-secondary max-w-sm leading-relaxed font-sans">
                The autonomous cloud deployment platform for modern developers and AI agents.
                Built on Next.js, PostgreSQL, Redis, and isolated container runners.
              </p>
              <div className="flex items-center space-x-2 text-state-success font-mono pt-2">
                <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                <span>All Systems Operational (99.99%)</span>
              </div>
            </div>

            <div>
              <h5 className="font-mono font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-3">Products</h5>
              <ul className="space-y-2 font-mono">
                <li><Link href="/projects" className="hover:text-text-primary transition-colors">Web Services</Link></li>
                <li><Link href="/projects" className="hover:text-text-primary transition-colors">Static Sites</Link></li>
                <li><Link href="/projects" className="hover:text-text-primary transition-colors">PostgreSQL</Link></li>
                <li><Link href="/projects" className="hover:text-text-primary transition-colors">Redis Key-Value</Link></li>
                <li><Link href="/templates" className="hover:text-text-primary transition-colors">Templates</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-mono font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-3">Developers</h5>
              <ul className="space-y-2 font-mono">
                <li><Link href="/docs" className="hover:text-text-primary transition-colors">Documentation</Link></li>
                <li><Link href="/docs" className="hover:text-text-primary transition-colors">API Reference</Link></li>
                <li><Link href="/docs" className="hover:text-text-primary transition-colors">Voltage CLI</Link></li>
                <li><Link href="/docs" className="hover:text-text-primary transition-colors">Agentic MCP</Link></li>
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-text-primary transition-colors">GitHub Repository</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-mono font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-3">Platform</h5>
              <ul className="space-y-2 font-mono">
                <li><Link href="/settings/billing" className="hover:text-text-primary transition-colors">Pricing & Plans</Link></li>
                <li><Link href="/settings" className="hover:text-text-primary transition-colors">Settings</Link></li>
                <li><Link href="/login" className="hover:text-text-primary transition-colors">Sign In</Link></li>
                <li><span className="text-text-secondary/60">Privacy Policy</span></li>
                <li><span className="text-text-secondary/60">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 mt-12 border-t border-border-hairline flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono">
            <p>© 2026 Voltage Inc. All rights reserved.</p>
            <p className="mt-2 sm:mt-0 text-text-secondary/70">Engineered for production workloads.</p>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}
