"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Copy, Check, Globe, Trash2, RefreshCw, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Domain } from "@/types";

export default function DomainsPage({ params }: { params: { id: string } }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [domainValue, setDomainValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: domains, error, isLoading, mutate } = useSWR<Domain[]>(
    params.id ? `/v1/projects/${params.id}/domains` : null,
    () => api.getDomains(params.id),
    { refreshInterval: 5000 }
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainValue.trim()) return;

    setIsAdding(true);
    setMessage(null);
    try {
      await api.addDomain(params.id, domainValue.trim());
      setDomainValue("");
      mutate();
      setMessage({ type: 'success', text: 'Domain added. Please configure your DNS CNAME record below and click Verify.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add domain' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domainIdOrHostname: string) => {
    setVerifyingId(domainIdOrHostname);
    setMessage(null);
    try {
      const res = await api.verifyDomain(domainIdOrHostname);
      if (res.verified) {
        setMessage({ type: 'success', text: 'Domain verified successfully! SSL certificate provisioned.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'DNS CNAME not found or not propagated yet.' });
      }
      mutate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'DNS verification failed' });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domainIdOrHostname: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    try {
      await api.removeDomain(params.id, domainIdOrHostname);
      mutate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove domain' });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      <div className="flex items-center space-x-4">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Domains</h1>
          <p className="text-text-secondary text-sm mt-1">Manage custom domains & automated SSL for your project</p>
        </div>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-lg flex items-center space-x-3 text-sm font-mono border",
          message.type === 'success' 
            ? "bg-state-success/10 border-state-success/30 text-state-success" 
            : "bg-state-error/10 border-state-error/30 text-state-error"
        )}>
          {message.type === 'success' ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Custom Domain</CardTitle>
          <CardDescription>Connect a domain or subdomain you own to this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="flex space-x-3">
            <Input 
              placeholder="e.g. app.yourdomain.com" 
              value={domainValue}
              onChange={(e) => setDomainValue(e.target.value)}
              className="max-w-md font-mono"
              disabled={isAdding}
            />
            <Button 
              type="submit" 
              className="bg-text-primary text-canvas hover:bg-text-primary/90"
              disabled={isAdding || !domainValue.trim()}
            >
              {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Domain
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading && (
          <div className="p-8 text-center text-text-secondary font-mono animate-pulse">
            Loading domains...
          </div>
        )}

        {domains?.map((domain, index) => {
          const hostname = domain.hostname || domain.domain;
          const isDefault = index === 0 && hostname.endsWith('.voltage.localhost');
          const targetCname = domain.cnameTarget || "cname.voltage.run";

          return (
            <Card key={domain.id || hostname} className={cn("overflow-hidden", !domain.verified && "border-state-pending/40")}>
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "p-2 rounded-full", 
                    domain.verified ? "bg-state-success/10 text-state-success" : "bg-state-pending/10 text-state-pending"
                  )}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-mono font-medium text-lg">{hostname}</h3>
                      {isDefault && (
                        <span className="text-xs bg-surface-raised px-2 py-0.5 rounded text-text-secondary border border-border-hairline">
                          Default
                        </span>
                      )}
                      {domain.verified && (
                        <span className="text-xs bg-state-success/10 text-state-success px-2 py-0.5 rounded border border-state-success/20 flex items-center">
                          <ShieldCheck className="w-3 h-3 mr-1" /> SSL Issued
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm mt-1 flex items-center", domain.verified ? "text-state-success" : "text-state-pending")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full mr-2", domain.verified ? "bg-state-success" : "bg-state-pending animate-pulse")} />
                      {domain.verified ? "Active & Verified" : "Pending DNS Verification"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {!domain.verified && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(domain.id)}
                      disabled={verifyingId === domain.id}
                      className="border-state-pending/40 text-state-pending hover:bg-state-pending/10 hover:text-state-pending"
                    >
                      {verifyingId === domain.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Verify DNS
                    </Button>
                  )}

                  {!isDefault && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(domain.id)}
                      className="text-text-secondary hover:text-state-error hover:bg-state-error/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {!domain.verified && (
                <div className="bg-surface-raised border-t border-border-hairline p-6 space-y-3">
                  <p className="text-sm text-text-secondary">
                    To point your domain to Voltage, add a <span className="text-text-primary font-mono font-semibold">CNAME</span> record at your DNS provider (Cloudflare, GoDaddy, Route53, etc.):
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-canvas border border-border-hairline rounded-md p-3 flex items-center justify-between">
                      <div className="flex space-x-4 font-mono text-sm">
                        <span className="text-text-secondary w-16">Record</span>
                        <span className="text-text-primary font-medium">CNAME</span>
                      </div>
                    </div>
                    <div className="bg-canvas border border-border-hairline rounded-md p-3 flex items-center justify-between">
                      <div className="flex space-x-4 font-mono text-sm">
                        <span className="text-text-secondary w-16">Target</span>
                        <span className="text-text-primary font-mono">{targetCname}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(targetCname)}>
                        {copied === targetCname ? <Check className="w-4 h-4 text-state-success" /> : <Copy className="w-4 h-4 text-text-secondary" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
