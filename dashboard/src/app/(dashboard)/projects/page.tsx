"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";
import { RoutingConstellation } from "@/components/constellation/RoutingConstellation";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Github } from "lucide-react";

export default function ProjectsPage() {
  const { projects, isLoading } = useProjects();

  if (isLoading) return <div className="animate-pulse bg-surface-raised h-64 rounded-xl w-full" />;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Projects</h1>
          <p className="text-text-secondary text-sm">Manage your deployed applications</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-text-primary text-canvas hover:bg-text-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length > 0 && <RoutingConstellation projects={projects} />}

      {(!projects || projects.length === 0) ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-text-secondary/30 transition-colors cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="font-mono text-lg group-hover:text-accent-signal transition-colors">
                      {project.name}
                    </CardTitle>
                    <StatusPill status={project.status} />
                  </div>
                  <CardDescription className="flex items-center text-xs font-mono">
                    <Github className="w-3 h-3 mr-1" />
                    {project.gitUrl.split('/').slice(-2).join('/')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-text-secondary bg-canvas border border-border-hairline rounded px-2.5 py-1 font-mono inline-flex items-center space-x-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${project.status === "LIVE" ? "bg-state-success" : "bg-state-pending"}`} />
                    <span>{project.subdomain}.voltage.app</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
