"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Lock, Plus, Trash2, Check, RefreshCw } from "lucide-react";

interface EnvVarItem {
  id?: string;
  key: string;
  value: string;
}

export function EnvironmentSettings({ projectId }: { projectId: string }) {
  const [environments, setEnvironments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>("");
  const [envVars, setEnvVars] = useState<EnvVarItem[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadEnvironments();
  }, [projectId]);

  useEffect(() => {
    if (selectedEnvId) {
      loadVars(selectedEnvId);
    }
  }, [selectedEnvId]);

  const loadEnvironments = async () => {
    try {
      setLoading(true);
      const envs = await api.getEnvironments(projectId);
      setEnvironments(envs);
      if (envs.length > 0) {
        setSelectedEnvId(envs[0].id);
      }
    } catch (err) {
      console.error("Failed to load environments", err);
    } finally {
      setLoading(false);
    }
  };

  const loadVars = async (envId: string) => {
    try {
      const vars = await api.getEnvVars(envId);
      setEnvVars(vars.map(v => ({ id: v.id, key: v.key, value: v.value })));
    } catch (err) {
      console.error("Failed to load env vars", err);
    }
  };

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setEnvVars(prev => [...prev, { key: newKey.trim().toUpperCase(), value: newValue }]);
    setNewKey("");
    setNewValue("");
  };

  const handleDelete = async (key: string) => {
    if (!selectedEnvId) return;
    try {
      await api.deleteEnvVar(selectedEnvId, key);
      setEnvVars(prev => prev.filter(item => item.key !== key));
    } catch (err) {
      console.error("Failed to delete variable", err);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedEnvId) return;
    try {
      setSaving(true);
      const payload: Record<string, string> = {};
      for (const item of envVars) {
        payload[item.key] = item.value;
      }
      if (newKey.trim() && newValue.trim()) {
        payload[newKey.trim().toUpperCase()] = newValue;
        setNewKey("");
        setNewValue("");
      }
      await api.setEnvVars(selectedEnvId, payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      await loadVars(selectedEnvId);
    } catch (err) {
      console.error("Failed to save variables", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-secondary font-mono text-sm">Loading environments...</div>;
  }

  return (
    <Card className="border-border-hairline bg-surface">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Lock className="w-5 h-5 mr-2 text-accent-signal" />
          Environment Variables & Secrets
        </CardTitle>
        <CardDescription>
          Secrets are encrypted at rest with AES-256-GCM and injected securely into isolated build containers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Environment Selector Tabs */}
        <div className="flex space-x-2 border-b border-border-hairline pb-3">
          {environments.map(env => (
            <button
              key={env.id}
              onClick={() => setSelectedEnvId(env.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                selectedEnvId === env.id
                  ? "bg-accent-signal text-white"
                  : "bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-canvas"
              }`}
            >
              {env.name.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Existing Variables List */}
        <div className="space-y-3">
          {envVars.length === 0 ? (
            <p className="text-xs font-mono text-text-secondary italic">No environment variables defined yet.</p>
          ) : (
            envVars.map(item => (
              <div
                key={item.key}
                className="flex items-center space-x-3 bg-canvas border border-border-hairline rounded-md p-2 text-sm font-mono"
              >
                <div className="w-1/3 font-semibold text-text-primary truncate">{item.key}</div>
                <div className="flex-1 text-text-secondary tracking-widest truncate">{item.value}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.key)}
                  className="text-text-secondary hover:text-state-error hover:bg-state-error/10 h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add New Variable Row */}
        <div className="pt-2 border-t border-border-hairline">
          <div className="text-xs font-mono text-text-secondary mb-2">Add New Secret</div>
          <div className="flex space-x-3">
            <Input
              placeholder="VARIABLE_NAME"
              value={newKey}
              onChange={e => setNewKey(e.target.value.toUpperCase())}
              className="w-1/3 bg-canvas font-mono text-xs"
            />
            <Input
              placeholder="Value"
              type="password"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              className="flex-1 bg-canvas font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
              disabled={!newKey.trim() || !newValue.trim()}
              className="text-xs font-mono"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-border-hairline">
          <span className="text-xs text-text-secondary font-mono">
            {savedSuccess && (
              <span className="text-state-success flex items-center">
                <Check className="w-3.5 h-3.5 mr-1" /> Secrets encrypted and saved successfully!
              </span>
            )}
          </span>
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-accent-signal hover:bg-accent-signal/90 text-white text-xs font-mono"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                Encrypting...
              </>
            ) : (
              "Save All Variables"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
