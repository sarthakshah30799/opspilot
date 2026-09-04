import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type {
  DeploymentRecord,
  PackManifest,
  RunbookDocument,
  ServiceHealthRecord,
  TenantFixtureData,
} from './types.js';

@Injectable()
export class DataPackService implements OnModuleInit {
  private readonly logger = new Logger(DataPackService.name);
  private manifest!: PackManifest;
  private readonly tenants = new Map<string, TenantFixtureData>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const packPath = path.resolve(
      this.config.get<string>('DATA_PACK_PATH') ?? './candidate-pack',
    );
    await this.loadPack(packPath);
  }

  getManifest(): PackManifest {
    return this.manifest;
  }

  getDataPackVersion(): string {
    return this.manifest.version ?? this.manifest.packId;
  }

  listTenantIds(): string[] {
    return [...this.tenants.keys()];
  }

  assertTenant(tenantId: string): void {
    if (!this.tenants.has(tenantId)) {
      throw new NotFoundException(`Unknown tenant: ${tenantId}`);
    }
  }

  getTenant(tenantId: string): TenantFixtureData {
    this.assertTenant(tenantId);
    return this.tenants.get(tenantId)!;
  }

  getServiceHealth(
    tenantId: string,
    service: string,
  ): ServiceHealthRecord | null {
    const tenant = this.getTenant(tenantId);
    return (
      tenant.serviceHealth.find((s) => s.service === service) ?? null
    );
  }

  getRecentDeployments(
    tenantId: string,
    service: string,
  ): DeploymentRecord[] {
    const tenant = this.getTenant(tenantId);
    return tenant.deployments
      .filter((d) => d.service === service)
      .sort(
        (a, b) =>
          new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime(),
      );
  }

  getActiveRunbooks(tenantId: string): RunbookDocument[] {
    return this.getTenant(tenantId).runbooks.filter((r) => r.active);
  }

  getAllRunbooks(tenantId: string): RunbookDocument[] {
    return this.getTenant(tenantId).runbooks;
  }

  private async loadPack(packPath: string) {
    const manifestPath = path.join(packPath, 'manifest.json');
    const raw = await fs.readFile(manifestPath, 'utf8');
    this.manifest = JSON.parse(raw) as PackManifest;

    const tenantsRoot = path.join(packPath, 'tenants');
    const tenantDirs = await fs.readdir(tenantsRoot, { withFileTypes: true });

    for (const entry of tenantDirs) {
      if (!entry.isDirectory()) continue;
      const tenantId = entry.name;
      const tenantPath = path.join(tenantsRoot, tenantId);
      const runbooks = await this.loadRunbooks(tenantId, tenantPath);
      const serviceHealth = await this.readJsonArray<ServiceHealthRecord>(
        path.join(tenantPath, 'service-health.json'),
        'services',
      );
      const deployments = await this.readJsonArray<DeploymentRecord>(
        path.join(tenantPath, 'deployments.json'),
        'deployments',
      );

      this.tenants.set(tenantId, {
        tenantId,
        runbooks,
        serviceHealth,
        deployments,
      });
    }

    this.logger.log(
      `Loaded data pack ${this.getDataPackVersion()} with tenants: ${this.listTenantIds().join(', ')}`,
    );
  }

  private async loadRunbooks(
    tenantId: string,
    tenantPath: string,
  ): Promise<RunbookDocument[]> {
    const runbooksDir = path.join(tenantPath, 'runbooks');
    let files: string[] = [];
    try {
      files = (await fs.readdir(runbooksDir)).filter((f) => f.endsWith('.md'));
    } catch {
      this.logger.warn(`No runbooks directory for ${tenantId}`);
      return [];
    }

    const parsed: Omit<RunbookDocument, 'active'>[] = [];
    for (const fileName of files) {
      const content = await fs.readFile(path.join(runbooksDir, fileName), 'utf8');
      const documentId = fileName.replace(/\.md$/i, '');
      const versionMatch = documentId.match(/^(.*)-v(\d+)$/i);
      const stem = versionMatch ? versionMatch[1] : documentId;
      const version = versionMatch ? Number(versionMatch[2]) : null;
      parsed.push({
        tenantId,
        documentId,
        fileName,
        stem,
        version,
        content,
      });
    }

    return this.markActive(tenantId, parsed);
  }

  /**
   * Active policy:
   * 1) If manifest.activeDocuments[tenant][stem] is set, that documentId is active.
   * 2) Else, among same stem with -vN filenames, highest N is active.
   * 3) Documents without a version suffix are active unless superseded by a versioned peer stem.
   */
  private markActive(
    tenantId: string,
    docs: Omit<RunbookDocument, 'active'>[],
  ): RunbookDocument[] {
    const overrides = this.manifest.activeDocuments?.[tenantId] ?? {};
    const byStem = new Map<string, Omit<RunbookDocument, 'active'>[]>();
    for (const doc of docs) {
      const list = byStem.get(doc.stem) ?? [];
      list.push(doc);
      byStem.set(doc.stem, list);
    }

    const result: RunbookDocument[] = [];
    for (const [stem, group] of byStem) {
      const overrideId = overrides[stem];
      let activeId: string | undefined = overrideId;
      if (!activeId) {
        const versioned = group.filter((g) => g.version !== null);
        if (versioned.length > 0) {
          activeId = versioned.sort(
            (a, b) => (b.version ?? 0) - (a.version ?? 0),
          )[0].documentId;
        } else {
          activeId = group[0]?.documentId;
        }
      }
      for (const doc of group) {
        result.push({ ...doc, active: doc.documentId === activeId });
      }
    }
    return result;
  }

  private async readJsonArray<T>(
    filePath: string,
    key: string,
  ): Promise<T[]> {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed[key];
      return Array.isArray(value) ? (value as T[]) : [];
    } catch {
      this.logger.warn(`Missing or unreadable fixture: ${filePath}`);
      return [];
    }
  }
}
