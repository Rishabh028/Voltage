"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { KeyRound, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  
  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your account and platform settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <KeyRound className="w-5 h-5 mr-2 text-accent-signal" />
            API Tokens
          </CardTitle>
          <CardDescription>Manage your personal access tokens for API and CLI access.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-surface-raised border border-border-hairline rounded-lg p-8 text-center">
            <p className="text-text-secondary font-mono text-sm">API token management coming soon</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-signal mr-2" />
              Billing & Usage
            </CardTitle>
            <CardDescription className="mt-1">
              View your monthly build minutes, bandwidth usage, and manage your subscription plan.
            </CardDescription>
          </div>
          <Link href="/settings/billing">
            <Button variant="outline" className="border-border-hairline">
              Manage Billing
            </Button>
          </Link>
        </CardHeader>
      </Card>

      <Card className="border-state-error/30">
        <CardHeader>
          <CardTitle className="flex items-center text-state-error">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-state-error/5 border border-state-error/20 rounded-lg p-4">
            <h4 className="font-semibold text-state-error mb-2 text-sm">Delete Account</h4>
            <p className="text-sm text-text-secondary mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-mono text-text-secondary block">
                Type <span className="text-text-primary select-all">delete my account</span> to confirm.
              </label>
              <div className="flex space-x-3">
                <Input 
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="max-w-md bg-canvas border-state-error/20 focus-visible:ring-state-error"
                />
                <Button 
                  variant="destructive"
                  disabled={deleteConfirm !== "delete my account"}
                  className="bg-state-error hover:bg-state-error/90 text-white"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
