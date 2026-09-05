export interface PackManifestTenant {
  tenantId: string;
  displayName?: string;
  timezone?: string;
  services?: string[];
}

export interface PackManifest {
  packId: string;
  version: string;
  traceMarker?: string;
  referenceTime?: string;
  dataClassification?: string;
  description?: string;
  tenants: PackManifestTenant[] | string[];
  fixtureFilesPerTenant?: string[];
  /** Optional override map; official pack uses runbook front matter instead. */
  activeDocuments?: Record<string, Record<string, string>>;
}

export interface ServiceHealthRecord {
  service: string;
  status: string;
  observedAt?: string;
  windowMinutes?: number;
  errorRatePercent?: number;
  p95LatencyMs?: number;
  freshnessThresholdMinutes?: number;
  /** Legacy fallback fields */
  errorRate?: number;
  latencyMs?: number;
  [key: string]: unknown;
}

export interface DeploymentRecord {
  service: string;
  version: string;
  deployedAt: string;
  status: string;
  deploymentId?: string;
  completedAt?: string;
  changeSummary?: string;
  rollbackArtifactAvailable?: boolean;
  initiatedBy?: string;
  deployedBy?: string;
  [key: string]: unknown;
}

export type RunbookStatus = 'active' | 'superseded' | 'draft' | string;

export interface RunbookFrontMatter {
  documentId?: string;
  tenantId?: string;
  service?: string;
  status?: RunbookStatus;
  version?: string | number;
  effectiveDate?: string;
  supersedes?: string;
  supersededBy?: string;
  approvalRequired?: boolean;
  [key: string]: unknown;
}

export interface RunbookDocument {
  tenantId: string;
  documentId: string;
  fileName: string;
  stem: string;
  version: number | null;
  active: boolean;
  status: RunbookStatus;
  service?: string;
  approvalRequired?: boolean;
  /** Markdown body without YAML front matter */
  content: string;
  frontMatter: RunbookFrontMatter;
}

export interface ToolStatusOverride {
  tool: string;
  service?: string;
  status: string;
  errorCode?: string;
  message?: string;
}

export interface ToolStatusConfig {
  tenantId: string;
  defaultStatus: string;
  overrides: ToolStatusOverride[];
}

export interface TenantFixtureData {
  tenantId: string;
  runbooks: RunbookDocument[];
  serviceHealth: ServiceHealthRecord[];
  deployments: DeploymentRecord[];
  toolStatus: ToolStatusConfig;
}
