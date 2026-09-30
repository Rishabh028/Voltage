"use client";

import Link from "next/link";
import { Terminal } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="h-14 border-b border-border-hairline bg-surface flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-accent-signal" />
          <span className="font-mono font-bold text-accent-signal text-lg tracking-tight">Voltage</span>
        </Link>
        <nav className="hidden md:flex space-x-5 text-sm font-medium">
          <Link href="/projects" className="text-text-secondary hover:text-text-primary transition-colors">
            Projects
          </Link>
          <Link href="/templates" className="text-text-secondary hover:text-text-primary transition-colors">
            Templates
          </Link>
          <Link href="/docs" className="text-text-secondary hover:text-text-primary transition-colors">
            Docs
          </Link>
          <Link href="/settings/billing" className="text-text-secondary hover:text-text-primary transition-colors">
            Usage & Billing
          </Link>
        </nav>
      </div>
      <div className="flex items-center space-x-3">
        <Link href="/projects/new">
          <Button size="sm" className="bg-accent-signal text-canvas hover:bg-accent-signal/90 font-medium font-mono text-xs h-8">
            + New Project
          </Button>
        </Link>
        <Link href="/settings" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          Settings
        </Link>
        {session?.user && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-accent-signal/20 border border-accent-signal/50 flex items-center justify-center text-accent-signal font-mono text-xs">
              {session.user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-text-secondary text-xs h-8">
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
