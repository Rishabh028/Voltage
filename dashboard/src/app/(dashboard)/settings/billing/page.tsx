"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Zap, CheckCircle2, TrendingUp, HardDrive, Cpu, Clock, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { UsageSummary } from "@/types";

export default function BillingPage() {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  // Fetch organizations to get current org id
  const { data: orgs } = useSWR('/v1/orgs', api.getOrgs);
  const currentOrg = orgs?.[0];

  const { data: usageSummary, mutate } = useSWR<UsageSummary>(
    currentOrg?.id ? `/v1/orgs/${currentOrg.id}/usage` : null,
    () => api.getOrgUsage(currentOrg!.id),
    { refreshInterval: 10000 }
  );

  const plan = (usageSummary?.plan || currentOrg?.plan || 'free').toLowerCase();
  const isPro = plan === 'pro' || plan === 'enterprise';

  const buildMinutesUsed = usageSummary?.usage.buildMinutes || 0;
  const buildMinutesLimit = usageSummary?.limits.buildMinutesLimit || 100;
  const buildPercentage = Math.min(100, Math.round((buildMinutesUsed / buildMinutesLimit) * 100));

  const bandwidthUsed = usageSummary?.usage.bandwidthGb || 0;
  const bandwidthLimit = usageSummary?.limits.bandwidthGbLimit || 100;

  const handleUpgrade = async () => {
    if (!currentOrg) return;
    setIsUpgrading(true);
    setUpgradeSuccess(null);
    try {
      await api.upgradePlan(currentOrg.id, isPro ? 'free' : 'pro');
      await mutate();
      setUpgradeSuccess(isPro ? 'Switched to Free Tier' : 'Upgraded to Pro Plan successfully!');
    } catch (err: any) {
      alert(err.message || 'Upgrade failed');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      <div className="flex items-center space-x-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Billing & Usage</h1>
          <p className="text-text-secondary text-sm mt-1">
            Monitor resource usage, build minutes, and manage your subscription
          </p>
        </div>
      </div>

      {upgradeSuccess && (
        <div className="p-4 rounded-lg bg-state-success/10 border border-state-success/30 text-state-success font-mono text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{upgradeSuccess}</span>
        </div>
      )}

      {/* Plan Overview Card */}
      <Card className="border-accent-signal/30 bg-gradient-to-b from-surface-raised to-canvas">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <div className="flex items-center space-x-3">
              <CardTitle className="text-xl font-mono">
                {isPro ? "Pro Subscription" : "Hobby Free Plan"}
              </CardTitle>
              <span className={cn(
                "text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border",
                isPro 
                  ? "bg-accent-signal/20 text-accent-signal border-accent-signal/40" 
                  : "bg-surface-raised text-text-secondary border-border-hairline"
              )}>
                {plan.toUpperCase()}
              </span>
            </div>
            <CardDescription className="mt-1">
              Billing cycle: {usageSummary?.currentPeriodStart ? new Date(usageSummary.currentPeriodStart).toLocaleDateString() : 'Current Month'} – {usageSummary?.currentPeriodEnd ? new Date(usageSummary.currentPeriodEnd).toLocaleDateString() : 'End of Month'}
            </CardDescription>
          </div>
          <Button 
            onClick={handleUpgrade} 
            disabled={isUpgrading}
            className={isPro ? "border-border-hairline text-text-primary" : "bg-accent-signal text-canvas hover:bg-accent-signal/90 font-medium"}
            variant={isPro ? "outline" : "default"}
          >
            {isUpgrading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!isUpgrading && !isPro && <Sparkles className="w-4 h-4 mr-2" />}
            {isPro ? "Downgrade to Free" : "Upgrade to Pro ($20/mo)"}
          </Button>
        </CardHeader>
      </Card>

      {/* Resource Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center">
              <Clock className="w-4 h-4 mr-2 text-accent-signal" />
              Build Minutes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold font-mono tracking-tight">{buildMinutesUsed}</span>
              <span className="text-xs font-mono text-text-secondary">of {buildMinutesLimit} min</span>
            </div>
            <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border-hairline">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  buildPercentage > 85 ? "bg-state-error" : buildPercentage > 60 ? "bg-state-pending" : "bg-accent-signal"
                )}
                style={{ width: `${buildPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-text-secondary font-mono">
              {buildPercentage}% of monthly limit consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center">
              <HardDrive className="w-4 h-4 mr-2 text-blue-400" />
              Bandwidth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold font-mono tracking-tight">{bandwidthUsed}</span>
              <span className="text-xs font-mono text-text-secondary">of {bandwidthLimit} GB</span>
            </div>
            <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border-hairline">
              <div 
                className="h-full bg-blue-400 rounded-full"
                style={{ width: `${Math.min(100, Math.round((bandwidthUsed / bandwidthLimit) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-text-secondary font-mono">Global edge caching enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-state-success" />
              Total Deployments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold font-mono tracking-tight">
                {usageSummary?.usage.totalBuilds || 0}
              </span>
              <span className="text-xs font-mono text-text-secondary">builds this month</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-text-secondary pt-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>Concurrent slots: {usageSummary?.limits.concurrency || 1}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Features Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-mono">Plan Features Comparison</CardTitle>
          <CardDescription>Everything included in your current workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border-hairline">
              <span className="text-text-secondary">Monthly Build Minutes</span>
              <span className="font-mono text-text-primary font-medium">{isPro ? "1,000 mins" : "100 mins"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-hairline">
              <span className="text-text-secondary">Concurrent Builds</span>
              <span className="font-mono text-text-primary font-medium">{isPro ? "5 builds" : "1 build"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-hairline">
              <span className="text-text-secondary">Preview Deployments on PRs</span>
              <span className="font-mono text-state-success flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Included</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-hairline">
              <span className="text-text-secondary">Custom Domains & Automated SSL</span>
              <span className="font-mono text-state-success flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Included</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-secondary">Bandwidth</span>
              <span className="font-mono text-text-primary font-medium">{isPro ? "1,000 GB" : "100 GB"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
