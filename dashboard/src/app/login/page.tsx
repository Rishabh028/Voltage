"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Github, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const sequence = [
      "[ok] initializing voltage...",
      "[ok] connecting to deployment engine...",
      "[ok] ready"
    ];
    
    let step = 0;
    const interval = setInterval(() => {
      if (step < sequence.length) {
        const nextLine = sequence[step];
        if (nextLine) {
          setBootSequence(prev => [...prev, nextLine]);
        }
        step++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsReady(true), 400);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 font-mono text-sm text-text-secondary h-24 space-y-1">
          {bootSequence.filter(Boolean).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={line?.includes("ready") ? "text-state-success" : ""}
            >
              {line}
            </motion.div>
          ))}
          {!isReady && (
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-2 h-4 bg-accent-signal inline-block align-middle ml-1"
            />
          )}
        </div>

        <AnimatePresence>
          {isReady && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border-hairline rounded-xl p-8 shadow-2xl text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-surface-raised p-3 rounded-full ring-1 ring-border-hairline">
                  <Terminal className="w-8 h-8 text-accent-signal" />
                </div>
              </div>
              <h1 className="text-2xl font-bold font-mono text-text-primary tracking-tight mb-2">Voltage</h1>
              <p className="text-text-secondary mb-8 text-sm">Self-hosted deployment platform</p>
              
              <Button 
                onClick={() => signIn("github", { callbackUrl: "/projects" })}
                className="w-full bg-accent-signal text-white hover:bg-accent-signal/90 hover:scale-[1.02] active:scale-[0.98] transition-all h-12 text-base shadow-lg shadow-accent-signal/20"
              >
                <Github className="w-5 h-5 mr-2" />
                Continue with GitHub
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
