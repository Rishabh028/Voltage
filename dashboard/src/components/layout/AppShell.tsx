"use client";

import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col bg-transparent text-text-primary">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <motion.main
          className="flex-1 overflow-y-auto p-4 md:p-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto max-w-6xl h-full">{children}</div>
        </motion.main>
      </div>
    </div>
  );
}
