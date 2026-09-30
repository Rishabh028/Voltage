"use client";

import { motion } from "framer-motion";
import { Stage } from "@/types";
import { Check, X, Loader2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export function StageTracker({ stages }: { stages: Stage[] }) {
  return (
    <div className="flex items-center space-x-2 md:space-x-4 bg-surface-raised p-3 rounded-lg border border-border-hairline overflow-x-auto">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex items-center shrink-0">
          <div className="flex items-center space-x-2">
            <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", {
              "text-text-secondary": stage.status === "pending",
              "text-accent-signal": stage.status === "active",
              "text-state-success bg-state-success/10": stage.status === "completed",
              "text-state-error bg-state-error/10": stage.status === "failed",
            })}>
              {stage.status === "pending" && <CircleDashed className="w-4 h-4" />}
              {stage.status === "active" && <Loader2 className="w-4 h-4 animate-spin" />}
              {stage.status === "completed" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1.2, 1] }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Check className="w-4 h-4" />
                </motion.div>
              )}
              {stage.status === "failed" && <X className="w-4 h-4" />}
            </div>
            <span className={cn("text-sm font-medium hidden sm:inline-block", {
              "text-text-secondary": stage.status === "pending",
              "text-text-primary": stage.status === "active" || stage.status === "completed",
              "text-state-error": stage.status === "failed",
            })}>
              {stage.name}
            </span>
          </div>
          {index < stages.length - 1 && (
            <div className="w-4 md:w-8 h-[1px] bg-border-hairline mx-2 md:mx-4" />
          )}
        </div>
      ))}
    </div>
  );
}
