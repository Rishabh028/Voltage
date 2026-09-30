"use client";

import { motion } from "framer-motion";
import { Project } from "@/types";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function RoutingConstellation({ projects }: { projects: Project[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-48 md:h-64 w-full bg-surface-raised rounded-xl animate-pulse" />;

  const radius = 100;
  const center = { x: 200, y: 120 };

  return (
    <div className="w-full h-48 md:h-64 bg-surface-raised rounded-xl border border-border-hairline flex items-center justify-center overflow-hidden relative">
      <div className="sm:hidden flex items-center space-x-2">
        {projects.slice(0, 5).map(p => (
          <div key={p.id} className={cn("w-3 h-3 rounded-full", {
            "bg-state-pending": p.status === "PENDING",
            "bg-accent-signal": p.status === "BUILDING",
            "bg-state-success": p.status === "LIVE",
            "bg-state-error": p.status === "FAILED",
            "bg-muted-foreground": p.status === "SUPERSEDED" || p.status === "ROLLED_BACK",
          })} />
        ))}
      </div>
      
      <svg className="hidden sm:block w-[400px] h-[240px]" viewBox="0 0 400 240">
        {/* Lines */}
        {projects.map((project, i) => {
          const angle = (i / projects.length) * Math.PI * 2;
          const x = center.x + radius * Math.cos(angle);
          const y = center.y + radius * Math.sin(angle);
          
          return (
            <motion.line
              key={`line-${project.id}`}
              x1={center.x}
              y1={center.y}
              x2={x}
              y2={y}
              stroke="var(--border-hairline)"
              strokeWidth="1.5"
              strokeDasharray={project.status === "BUILDING" ? "4 4" : "none"}
              initial={false}
              animate={{
                strokeDashoffset: project.status === "BUILDING" ? [0, -8] : 0,
              }}
              transition={{
                duration: 1,
                repeat: project.status === "BUILDING" ? Infinity : 0,
                ease: "linear"
              }}
            />
          );
        })}

        {/* Center Node */}
        <circle cx={center.x} cy={center.y} r="24" fill="var(--bg-surface)" stroke="var(--border-hairline)" strokeWidth="2" />
        <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" className="font-mono text-[10px] font-bold">
          VOLTAGE
        </text>

        {/* Project Nodes */}
        {projects.map((project, i) => {
          const angle = (i / projects.length) * Math.PI * 2;
          const x = center.x + radius * Math.cos(angle);
          const y = center.y + radius * Math.sin(angle);
          
          let color = "var(--muted-foreground)";
          if (project.status === "LIVE") color = "var(--state-success)";
          if (project.status === "FAILED") color = "var(--state-error)";
          if (project.status === "PENDING") color = "var(--state-pending)";
          if (project.status === "BUILDING") color = "var(--accent-signal)";

          return (
            <g key={project.id}>
              {project.status === "BUILDING" && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r="12"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="2"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1, scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              {project.status === "LIVE" && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="1"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.4, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={project.status === "SUPERSEDED" ? "6" : "8"}
                fill={color}
              />
              <text x={x} y={y + 20} textAnchor="middle" fill="var(--text-secondary)" className="font-mono text-[9px]">
                {project.subdomain}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
