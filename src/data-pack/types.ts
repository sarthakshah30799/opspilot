export interface PackManifest {
  packId: string;
  version: string;
  description?: string;
  tenants: string[];
  activeDocuments?: Record<string, Record<string, string>>;
}

export interface ServiceHealthRecord {
  service: string;
  status: string;
  errorRate: number;
  latencyMs: number;
  observedAt: string;
}

export interface DeploymentRecord {
  service: string;
  version: string;
  deployedAt: string;
  deployedBy: string;
  status: string;
}

export interface RunbookDocument {
  tenantId: string;
  documentId: string;
  fileName: string;
  stem: string;
  version: number | null;
  active: boolean;
  content: string;
}

export interface TenantFixtureData {
  tenantId: string;
  runbooks: RunbookDocument[];
  serviceHealth: ServiceHealthRecord[];
  deployments: DeploymentRecord[];
}
