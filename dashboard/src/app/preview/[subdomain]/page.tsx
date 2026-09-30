"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Globe, 
  ArrowLeft, 
  ExternalLink, 
  Check, 
  Copy, 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCw, 
  Activity, 
  ShieldCheck, 
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PreviewPage({ params }: { params: { subdomain: string } }) {
  const subdomain = params.subdomain || "app";
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);

  const formattedName = subdomain
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const directSiteUrl = `http://localhost:3001/sites/${subdomain}/`;
  const subdomainUrl = `http://${subdomain}.localhost:3001`;

  const copyUrl = () => {
    navigator.clipboard.writeText(directSiteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col font-sans selection:bg-accent-signal selection:text-black">
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-50 bg-[#0B0D13]/90 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
            </Button>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">Live Preview</span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
            <Globe className="w-3 h-3 text-white/50" />
            <span className="text-white/90">{subdomain}.localhost:3001</span>
            <button onClick={copyUrl} className="text-white/40 hover:text-white transition-colors ml-1" title="Copy live URL">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Device Mode Switcher */}
        <div className="hidden md:flex items-center space-x-1 bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1 ${
              device === "desktop" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white"
            }`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">100%</span>
          </button>
          <button
            onClick={() => setDevice("tablet")}
            className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1 ${
              device === "tablet" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white"
            }`}
            title="Tablet View"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">768px</span>
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1 ${
              device === "mobile" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white"
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">390px</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:text-white hover:bg-white/10 font-mono transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Edge Telemetry</span>
          </button>
          <button 
            onClick={() => setKey(k => k + 1)}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Reload Frame"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <a 
            href={directSiteUrl}
            target="_blank" 
            rel="noreferrer"
            className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 transition-all font-mono shadow-md"
          >
            <span>Visit Live</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Collapsible Edge Telemetry Drawer */}
      {showMetrics && (
        <div className="bg-[#0B0E17] border-b border-white/10 px-6 py-4 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-white/40 block mb-1">Direct Live Path</span>
              <a href={directSiteUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline truncate block">
                /sites/{subdomain}/
              </a>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-white/40 block mb-1">Subdomain Route</span>
              <span className="text-white truncate block">{subdomain}.localhost:3001</span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-white/40 block mb-1">Edge Status</span>
              <span className="text-emerald-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                Active & Serving
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-white/40 block mb-1">Edge POP</span>
              <span className="text-white">iad1 (Local Edge Node)</span>
            </div>
          </div>
        </div>
      )}

      {/* Frame Container */}
      <main className="flex-1 flex justify-center items-start p-4 md:p-6 bg-[#040609] overflow-auto">
        <div 
          key={key}
          style={{
            width: device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px",
            maxWidth: "100%",
            transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
          className="min-h-[820px] rounded-2xl border border-white/10 bg-[#0A0D14] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* App Header */}
          <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between bg-[#10141D]">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-md bg-emerald-400/20 text-emerald-400 flex items-center justify-center font-bold font-mono text-xs">
                {formattedName.charAt(0)}
              </div>
              <div>
                <h1 className="font-bold text-xs tracking-tight text-white">{formattedName}</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono text-white/60">
              <a 
                href={directSiteUrl} 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-white transition-colors flex items-center"
              >
                <span>{subdomain}.localhost:3001</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>

          {/* REAL Live Deployed Application Frame */}
          <div className="flex-1 w-full bg-white relative flex flex-col">
            <iframe
              src={directSiteUrl}
              title={`${subdomain} live deployment`}
              className="w-full flex-1 border-0 min-h-[780px]"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
