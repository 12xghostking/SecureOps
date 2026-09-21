export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type FindingStatus = 'Open' | 'InProgress' | 'Resolved' | 'FalsePositive' | 'Suppressed';
export type ScanType = 'SAST' | 'Secret' | 'Container' | 'IaC';
export type DeploymentStatus = 'Pending' | 'InProgress' | 'Succeeded' | 'Failed' | 'RolledBack';
export type PipelineStatus = 'Queued' | 'Running' | 'Success' | 'Failed' | 'Cancelled';
export type ApplicationTier = 'Tier1_MissionCritical' | 'Tier2_BusinessCore' | 'Tier3_Internal';
export type EnvironmentType = 'Development' | 'Staging' | 'Production';

export interface Application {
  id: string;
  name: string;
  description: string;
  repositoryUrl: string;
  ownerEmail: string;
  language: string;
  tier: ApplicationTier;
  isActive: boolean;
  createdAt: string;
  activeDeploymentsCount: number;
  openVulnerabilitiesCount: number;
  healthStatus: 'Healthy' | 'Degraded' | 'Critical';
}

export interface CreateApplicationRequest {
  name: string;
  description: string;
  repositoryUrl: string;
  ownerEmail: string;
  language: string;
  tier: ApplicationTier;
}

export interface Deployment {
  id: string;
  applicationId: string;
  applicationName: string;
  environmentId: string;
  environmentName: string;
  version: string;
  commitSha: string;
  triggeredBy: string;
  status: DeploymentStatus;
  startedAt: string;
  completedAt?: string;
  rollbackTargetVersion?: string;
  healthCheckPassed: boolean;
  statusMessage?: string;
}

export interface CreateDeploymentRequest {
  applicationId: string;
  environmentId: string;
  version: string;
  commitSha: string;
  triggeredBy: string;
}

export interface RollbackDeploymentRequest {
  deploymentId: string;
  targetVersion: string;
  performedBy: string;
}

export interface SecurityFinding {
  id: string;
  applicationId: string;
  applicationName: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  scanType: ScanType;
  tool: string;
  status: FindingStatus;
  filePath: string;
  lineNumber?: number;
  ruleId: string;
  cveId?: string;
  fixAvailable: boolean;
  remediationGuidance?: string;
  firstDetected: string;
  resolvedAt?: string;
  triagedBy?: string;
  triageNotes?: string;
}

export interface TriageFindingRequest {
  newStatus: FindingStatus;
  triagedBy: string;
  notes: string;
}

export interface SecuritySummary {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  openCount: number;
  resolvedCount: number;
  suppressedCount: number;
  findingsByTool: Record<string, number>;
  findingsByScanType: Record<string, number>;
}

export interface PipelineStage {
  name: string;
  status: 'Success' | 'Failed' | 'Running' | 'Pending' | 'Skipped';
  durationSeconds: number;
}

export interface PipelineRun {
  id: string;
  applicationId: string;
  applicationName: string;
  runNumber: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  trigger: string;
  status: PipelineStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  stages: PipelineStage[];
}

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  clusterName: string;
  region: string;
  isProduction: boolean;
  healthStatus: string;
  activeDeploymentsCount: number;
  createdAt: string;
}

export interface DashboardMetrics {
  totalApplications: number;
  activeDeployments: number;
  totalVulnerabilities: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  passingPipelinesPercentage: number;
  securityGateStatus: 'Passed' | 'Warning' | 'Blocked';
  recentDeployments: Deployment[];
  recentFindings: SecurityFinding[];
  environments: Environment[];
}
