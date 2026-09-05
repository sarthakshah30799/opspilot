import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { parseMarkdownFrontMatter } from './front-matter.js';
import type {
  DeploymentRecord,
  PackManifest,
  RunbookDocument,
  RunbookFrontMatter,
  RunbookStatus,
  ServiceHealthRecord,
  TenantFixtureData,
  ToolStatusConfig,
  ToolStatusOverride,
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

  getPackId(): string {
    return this.manifest.packId;
  }

  getTraceMarker(): string {
    return this.manifest.traceMarker ?? this.manifest.packId;
  }

  getDataPackVersion(): string {
    return this.manifest.packId;
  }

  getReferenceTime(): string | undefined {
    return this.manifest.referenceTime;
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
    return tenant.serviceHealth.find((s) => s.service === service) ?? null;
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

  getToolOverride(
    tenantId: string,
    toolName: string,
    service: string,
  ): ToolStatusOverride | null {
    const { toolStatus } = this.getTenant(tenantId);
    return (
      toolStatus.overrides.find(
        (o) =>
          o.tool === toolName &&
          (o.service === undefined || o.service === service),
      ) ?? null
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
      const toolStatus = await this.readToolStatus(tenantId, tenantPath);

      this.tenants.set(tenantId, {
        tenantId,
        runbooks,
        serviceHealth,
        deployments,
        toolStatus,
      });
    }

    this.logger.log(
      `Loaded data pack ${this.getPackId()} (${this.getTraceMarker()}) with tenants: ${this.listTenantIds().join(', ')}`,
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
      const raw = await fs.readFile(path.join(runbooksDir, fileName), 'utf8');
      const { frontMatter, body } = parseMarkdownFrontMatter(raw);
      const meta = frontMatter as RunbookFrontMatter;
      const fileDocumentId = fileName.replace(/\.md$/i, '');
      const documentId =
        typeof meta.documentId === 'string' && meta.documentId.length > 0
          ? meta.documentId
          : fileDocumentId;

      const versionMatch = fileDocumentId.match(/^(.*)-v(\d+)$/i);
      const stem = versionMatch ? versionMatch[1] : fileDocumentId;
      const fileVersion = versionMatch ? Number(versionMatch[2]) : null;
      const metaVersion =
        typeof meta.version === 'number'
          ? meta.version
          : typeof meta.version === 'string'
            ? Number.parseFloat(meta.version)
            : null;
      const version =
        metaVersion !== null && !Number.isNaN(metaVersion)
          ? metaVersion
          : fileVersion;

      const status: RunbookStatus =
        typeof meta.status === 'string' ? meta.status : 'active';

      parsed.push({
        tenantId,
        documentId,
        fileName,
        stem,
        version,
        status,
        service: typeof meta.service === 'string' ? meta.service : undefined,
        approvalRequired:
          typeof meta.approvalRequired === 'boolean'
            ? meta.approvalRequired
            : undefined,
        content: body,
        frontMatter: meta,
      });
    }

    return this.markActive(tenantId, parsed);
  }

  /**
   * Active policy (official pack first):
   * 1) Front matter `status: active` wins for that document.
   * 2) Else if no front-matter statuses, use manifest.activeDocuments or highest -vN.
   * Only `active` documents drive recommendations; superseded/draft stay indexed but filtered.
   */
  private markActive(
    tenantId: string,
    docs: Omit<RunbookDocument, 'active'>[],
  ): RunbookDocument[] {
    const hasExplicitStatus = docs.some(
      (d) => typeof d.frontMatter.status === 'string',
    );

    if (hasExplicitStatus) {
      return docs.map((doc) => ({
        ...doc,
        active: doc.status === 'active',
      }));
    }

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
        result.push({
          ...doc,
          active: doc.documentId === activeId,
          status: doc.documentId === activeId ? 'active' : 'superseded',
        });
      }
    }
    return result;
  }

  private async readToolStatus(
    tenantId: string,
    tenantPath: string,
  ): Promise<ToolStatusConfig> {
    const filePath = path.join(tenantPath, 'tool-status.json');
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as ToolStatusConfig;
      return {
        tenantId,
        defaultStatus: parsed.defaultStatus ?? 'available',
        overrides: Array.isArray(parsed.overrides) ? parsed.overrides : [],
      };
    } catch {
      return { tenantId, defaultStatus: 'available', overrides: [] };
    }
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
