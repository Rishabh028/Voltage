"use client";

import { useEffect, useRef } from "react";
import { useDeploymentStream } from "@/hooks/useDeploymentStream";
import { LogLine, DeploymentStatus } from "@/types";
import "./terminal.css";

interface LiveTerminalProps {
  deploymentId: string;
  initialStatus?: DeploymentStatus;
  logs?: LogLine[];
  status?: DeploymentStatus;
}

export function LiveTerminal({ deploymentId, initialStatus, logs: externalLogs, status: externalStatus }: LiveTerminalProps) {
  const internalStream = useDeploymentStream(deploymentId, initialStatus);
  const logs = externalLogs !== undefined ? externalLogs : internalStream.logs;
  const status = externalStatus !== undefined ? externalStatus : internalStream.status;

  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight > 10) {
        autoScrollRef.current = false;
      } else {
        autoScrollRef.current = true;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.innerHTML = '';
    
    logs.forEach(log => {
      const line = document.createElement("div");
      line.className = "terminal-line flex gap-3 text-sm font-mono py-0.5 whitespace-pre-wrap break-all";
      
      const timeSpan = document.createElement("span");
      timeSpan.className = "text-text-secondary/50 select-none shrink-0";
      const d = new Date(log.timestamp);
      timeSpan.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      
      const contentSpan = document.createElement("span");
      if (log.type === 'error') contentSpan.className = "text-state-error";
      else if (log.type === 'success') contentSpan.className = "text-state-success font-semibold";
      else if (log.type === 'warning') contentSpan.className = "text-state-pending";
      else contentSpan.className = "text-text-primary";
      
      contentSpan.textContent = log.content;
      
      line.appendChild(timeSpan);
      line.appendChild(contentSpan);
      container.appendChild(line);
    });
    
    if (status === "BUILDING" || status === "PENDING") {
      const cursor = document.createElement("div");
      cursor.className = "terminal-cursor mt-2";
      container.appendChild(cursor);
    }
    
    if (autoScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, status]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-border-hairline bg-[#0B0D12] shadow-2xl">
      <div className="flex items-center px-4 py-3 border-b border-border-hairline bg-[#12151C] shrink-0">
        <div className="flex space-x-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-state-error/80" />
          <div className="w-3 h-3 rounded-full bg-state-pending/80" />
          <div className="w-3 h-3 rounded-full bg-state-success/80" />
        </div>
        <div className="font-mono text-xs text-text-secondary truncate flex-1">
          Deployment ID: <span className="text-text-primary">{deploymentId}</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-text-secondary">Status:</span>
          <span className={status === "LIVE" ? "text-state-success font-semibold" : "text-accent-signal font-semibold"}>
            {status}
          </span>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* DOM nodes injected here */}
      </div>
    </div>
  );
}
