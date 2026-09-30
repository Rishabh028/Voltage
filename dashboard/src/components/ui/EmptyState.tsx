import { TerminalSquare } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  onAction?: () => void;
}

export function EmptyState({ onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-hairline rounded-lg bg-surface/50">
      <div className="bg-surface-raised p-4 rounded-full mb-4 ring-1 ring-border-hairline">
        <TerminalSquare className="w-8 h-8 text-accent-signal" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">No projects found</h3>
      <div className="font-mono text-sm text-text-secondary bg-canvas px-3 py-2 rounded ring-1 ring-border-hairline mb-6">
        <span className="text-accent-signal">$</span> voltage deploy &lt;git-url&gt;
      </div>
      <Button onClick={onAction} className="bg-accent-signal text-white hover:bg-accent-signal/90 hover:scale-102 transition-all">
        Connect a repo
      </Button>
    </div>
  );
}
