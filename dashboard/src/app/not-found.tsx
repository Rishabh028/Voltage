import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="h-screen w-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-black font-mono text-text-primary/10 tracking-tighter select-none">404</h1>
        <div className="space-y-2">
          <p className="text-xl font-mono text-text-primary">Page not found</p>
          <p className="text-sm text-text-secondary">The route you requested does not exist in the platform.</p>
        </div>
        <Link href="/projects" className="inline-block pt-4">
          <Button className="bg-accent-signal text-white hover:bg-accent-signal/90 font-mono">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
