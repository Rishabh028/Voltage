"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/useProjects";
import { Terminal, Settings, Globe } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { projects } = useProjects();

  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-border-hairline bg-surface-raised p-4 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Projects
        </h2>
        <div className="space-y-1">
          {projects?.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith(`/projects/${project.id}`)
                  ? "bg-accent-signal/10 text-accent-signal"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              <span
                className={cn("w-2 h-2 rounded-full", {
                  "bg-state-pending": project.status === "PENDING",
                  "bg-accent-signal": project.status === "BUILDING",
                  "bg-state-success": project.status === "LIVE",
                  "bg-state-error": project.status === "FAILED",
                  "bg-muted-foreground": project.status === "SUPERSEDED" || project.status === "ROLLED_BACK",
                })}
              />
              <span className="truncate">{project.name}</span>
            </Link>
          ))}
          {projects?.length === 0 && (
            <p className="text-xs text-text-secondary px-3 py-2 font-mono">No projects yet</p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-border-hairline space-y-1">
        <Link
          href="/templates"
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/templates" ? "bg-accent-signal/10 text-accent-signal" : "text-text-secondary hover:text-text-primary hover:bg-surface"
          )}
        >
          <span className="text-xs">⚡</span>
          <span>Templates</span>
        </Link>
        <Link
          href="/docs"
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname.startsWith("/docs") ? "bg-accent-signal/10 text-accent-signal" : "text-text-secondary hover:text-text-primary hover:bg-surface"
          )}
        >
          <span className="text-xs">📖</span>
          <span>Documentation</span>
        </Link>
        <Link
          href="/settings/billing"
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings/billing" ? "bg-accent-signal/10 text-accent-signal" : "text-text-secondary hover:text-text-primary hover:bg-surface"
          )}
        >
          <span className="text-xs">💳</span>
          <span>Billing & Usage</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings" ? "bg-accent-signal/10 text-accent-signal" : "text-text-secondary hover:text-text-primary hover:bg-surface"
          )}
        >
          <Settings className="w-4 h-4 text-text-secondary" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
