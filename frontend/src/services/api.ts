import type {
  Application,
  CreateApplicationRequest,
  Deployment,
  CreateDeploymentRequest,
  RollbackDeploymentRequest,
  SecurityFinding,
  TriageFindingRequest,
  SecuritySummary,
  PipelineRun,
  Environment,
  DashboardMetrics
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = 'API Request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.title || JSON.stringify(errJson);
    } catch {
      errorDetail = res.statusText;
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: async (): Promise<{ status: string; service: string }> => {
    return fetchJson<{ status: string; service: string }>('/health');
  },

  // Dashboard
  getMetrics: async (): Promise<DashboardMetrics> => {
    return fetchJson<DashboardMetrics>(`${API_BASE}/dashboard/metrics`);
  },

  // Applications
  getApplications: async (): Promise<Application[]> => {
    return fetchJson<Application[]>(`${API_BASE}/applications`);
  },

  getApplicationById: async (id: string): Promise<Application> => {
    return fetchJson<Application>(`${API_BASE}/applications/${id}`);
  },

  createApplication: async (req: CreateApplicationRequest): Promise<Application> => {
    return fetchJson<Application>(`${API_BASE}/applications`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // Deployments
  getDeployments: async (appId?: string, envId?: string): Promise<Deployment[]> => {
    const params = new URLSearchParams();
    if (appId) params.append('applicationId', appId);
    if (envId) params.append('environmentId', envId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Deployment[]>(`${API_BASE}/deployments${query}`);
  },

  createDeployment: async (req: CreateDeploymentRequest): Promise<Deployment> => {
    return fetchJson<Deployment>(`${API_BASE}/deployments`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  rollbackDeployment: async (id: string, req: RollbackDeploymentRequest): Promise<Deployment> => {
    return fetchJson<Deployment>(`${API_BASE}/deployments/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // Security Findings
  getSecurityFindings: async (
    severity?: string,
    status?: string,
    scanType?: string,
    appId?: string
  ): Promise<SecurityFinding[]> => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (status) params.append('status', status);
    if (scanType) params.append('scanType', scanType);
    if (appId) params.append('applicationId', appId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<SecurityFinding[]>(`${API_BASE}/security/findings${query}`);
  },

  getSecuritySummary: async (): Promise<SecuritySummary> => {
    return fetchJson<SecuritySummary>(`${API_BASE}/security/summary`);
  },

  triageFinding: async (id: string, req: TriageFindingRequest): Promise<SecurityFinding> => {
    return fetchJson<SecurityFinding>(`${API_BASE}/security/findings/${id}/triage`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // Pipelines
  getPipelines: async (appId?: string): Promise<PipelineRun[]> => {
    const params = new URLSearchParams();
    if (appId) params.append('applicationId', appId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<PipelineRun[]>(`${API_BASE}/pipelines${query}`);
  },

  // Environments
  getEnvironments: async (): Promise<Environment[]> => {
    return fetchJson<Environment[]>(`${API_BASE}/environments`);
  },
};
