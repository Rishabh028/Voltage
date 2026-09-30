import { DeploymentStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: DeploymentStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-250 font-mono",
        {
          "bg-state-pending/10 text-state-pending border border-state-pending/20": status === "PENDING",
          "bg-accent-signal/10 text-accent-signal border border-accent-signal/20 animate-pulse": status === "BUILDING",
          "bg-state-success/10 text-state-success border border-state-success/20": status === "LIVE",
          "bg-state-error/10 text-state-error border border-state-error/20": status === "FAILED",
          "bg-muted text-muted-foreground border border-border": status === "SUPERSEDED" || status === "ROLLED_BACK",
        },
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", {
        "bg-state-pending": status === "PENDING",
        "bg-accent-signal": status === "BUILDING",
        "bg-state-success": status === "LIVE",
        "bg-state-error": status === "FAILED",
        "bg-muted-foreground": status === "SUPERSEDED" || status === "ROLLED_BACK",
      })} />
      {status}
    </div>
  );
}
