import useSWR from "swr";
import { api } from "@/lib/api";
import { Project } from "@/types";

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(
    "/api/projects",
    api.getProjects,
    { refreshInterval: 5000 }
  );

  return {
    projects: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useProject(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Project>(
    id ? `/api/projects/${id}` : null,
    () => api.getProject(id),
    { refreshInterval: 5000 }
  );

  return {
    project: data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useDeployment(projectId: string, deploymentId: string) {
  const { data, error, isLoading, mutate } = useSWR<any>(
    projectId && deploymentId ? `/api/projects/${projectId}/deployments/${deploymentId}` : null,
    () => api.getDeployment(projectId, deploymentId),
    { refreshInterval: 5000 }
  );

  return {
    deployment: data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useDeployments(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    projectId ? `/api/projects/${projectId}/deployments` : null,
    () => api.getDeployments(projectId),
    { refreshInterval: 5000 }
  );

  return {
    deployments: data,
    isLoading,
    isError: error,
    mutate
  };
}
