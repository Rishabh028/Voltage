import { Project, Deployment, Domain } from "@/types";
import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  let token = "";
  try {
    const session = await getSession();
    token = session?.user?.id ? (session as any).apiToken : "";
  } catch (e) {
    // NextAuth session lookup fallback
  }

  // Fallback token for local development & seamless testing
  if (!token) {
    token = "dev-token-local";
  }
  
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.error || `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  getProjects: () => fetchWithAuth("/api/projects") as Promise<Project[]>,
  getProject: (id: string) => fetchWithAuth(`/api/projects/${id}`) as Promise<Project>,
  createProject: (data: { 
    name: string; 
    gitUrl: string; 
    buildCommand?: string; 
    startCommand?: string; 
    rootDirectory?: string; 
    framework?: string; 
  }) => 
    fetchWithAuth("/api/projects", { method: "POST", body: JSON.stringify(data) }) as Promise<Project>,
  
  triggerDeploy: (projectId: string) => 
    fetchWithAuth(`/api/projects/${projectId}/deployments`, { method: "POST" }) as Promise<Deployment>,
  getDeployments: (projectId: string) => 
    fetchWithAuth(`/api/projects/${projectId}/deployments`) as Promise<Deployment[]>,
  getDeployment: (projectId: string, deploymentId: string) => 
    fetchWithAuth(`/api/projects/${projectId}/deployments/${deploymentId}`) as Promise<Deployment>,
  rollback: (projectId: string, deploymentId: string) => 
    fetchWithAuth(`/api/projects/${projectId}/deployments/${deploymentId}/rollback`, { method: "POST" }) as Promise<Deployment>,
    
  getDomains: (projectId: string) => fetchWithAuth(`/v1/projects/${projectId}/domains`) as Promise<Domain[]>,
  addDomain: (projectId: string, domain: string) => 
    fetchWithAuth(`/v1/projects/${projectId}/domains`, { method: "POST", body: JSON.stringify({ domain }) }) as Promise<Domain>,
  verifyDomain: (domainIdOrHostname: string) =>
    fetchWithAuth(`/v1/domains/${domainIdOrHostname}/verify`, { method: "POST" }) as Promise<{ verified: boolean; message?: string; error?: string }>,
  removeDomain: (projectId: string, domainIdOrHostname: string) => 
    fetchWithAuth(`/v1/domains/${domainIdOrHostname}`, { method: "DELETE" }),

  updateProject: (id: string, data: Record<string, any>) =>
    fetchWithAuth(`/v1/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }) as Promise<Project>,
  deleteProject: (id: string) =>
    fetchWithAuth(`/v1/projects/${id}`, { method: "DELETE" }),

  getEnvironments: (projectId: string) =>
    fetchWithAuth(`/v1/projects/${projectId}/environments`) as Promise<Array<{ id: string; name: string; createdAt: string }>>,
  createEnvironment: (projectId: string, name: string) =>
    fetchWithAuth(`/v1/projects/${projectId}/environments`, { method: "POST", body: JSON.stringify({ name }) }),

  getEnvVars: (environmentId: string) =>
    fetchWithAuth(`/v1/environments/${environmentId}/env-vars`) as Promise<Array<{ id: string; key: string; value: string; createdAt: number }>>,
  setEnvVars: (environmentId: string, vars: Record<string, string>) =>
    fetchWithAuth(`/v1/environments/${environmentId}/env-vars`, { method: "PUT", body: JSON.stringify(vars) }),
  deleteEnvVar: (environmentId: string, key: string) =>
    fetchWithAuth(`/v1/environments/${environmentId}/env-vars/${encodeURIComponent(key)}`, { method: "DELETE" }),

  getOrgs: () => fetchWithAuth('/v1/orgs') as Promise<Array<{ id: string; name: string; slug: string; plan: string; role: string }>>,
  createOrg: (data: { name: string; slug: string }) =>
    fetchWithAuth('/v1/orgs', { method: "POST", body: JSON.stringify(data) }),

  getOrgUsage: (orgId: string) =>
    fetchWithAuth(`/v1/orgs/${orgId}/usage`),
  upgradePlan: (orgId: string, plan = 'pro') =>
    fetchWithAuth(`/v1/billing/orgs/${orgId}/upgrade`, { method: "POST", body: JSON.stringify({ plan }) }),
};
