import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module.js';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import { OpsToolsService } from '../tools/ops-tools.service.js';
import { ConversationStore } from '../conversation/conversation.store.js';
import { IncidentOrchestrator } from '../ai/incident-orchestrator.service.js';
import { DataPackService } from '../data-pack/data-pack.service.js';
import { FIXTURE_TENANT_IDS } from '../common/constants/tenants.js';

describe('OpsPilot', () => {
  let app: INestApplication<App>;
  let retrieval: RetrievalService;
  let tools: OpsToolsService;
  let conversations: ConversationStore;
  let orchestrator: IncidentOrchestrator;
  let dataPack: DataPackService;

  beforeAll(async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DATA_PACK_PATH = './candidate-pack';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    retrieval = app.get(RetrievalService);
    tools = app.get(OpsToolsService);
    conversations = app.get(ConversationStore);
    orchestrator = app.get(IncidentOrchestrator);
    dataPack = app.get(DataPackService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('candidate pack loading', () => {
    it('loads official pack identity and tenants', () => {
      expect(dataPack.getPackId()).toBe('OPSPILOT-ALPHA-2026-09');
      expect(dataPack.getTraceMarker()).toBe('ALPHA-9C7F-RETAIL-HEALTH');
      expect(dataPack.listTenantIds().sort()).toEqual([
        FIXTURE_TENANT_IDS.HARBOR,
        FIXTURE_TENANT_IDS.NORTHSTAR,
      ]);
    });

    it('marks active runbooks from front matter document ids', () => {
      const active = dataPack.getActiveRunbooks(FIXTURE_TENANT_IDS.NORTHSTAR);
      expect(
        active.some((r) => r.documentId === 'northstar-payments-v2'),
      ).toBe(true);
      expect(
        active.some((r) => r.documentId === 'northstar-payments-v1'),
      ).toBe(false);
    });
  });

  describe('tenant isolation', () => {
    it('does not retrieve harbor markers for northstar', async () => {
      const chunks = await retrieval.retrieve(
        FIXTURE_TENANT_IDS.NORTHSTAR,
        'payments rollback criteria checkout',
        { k: 6, activeOnly: true },
      );
      const blob = chunks.map((c) => c.content).join('\n');
      expect(chunks.length).toBeGreaterThan(0);
      expect(
        chunks.every(
          (c) => c.metadata.tenantId === FIXTURE_TENANT_IDS.NORTHSTAR,
        ),
      ).toBe(true);
      expect(
        chunks.every((c) =>
          String(c.metadata.documentId).startsWith('northstar'),
        ),
      ).toBe(true);
      expect(blob.toLowerCase()).not.toContain('harbor-owned');
      expect(blob.toLowerCase()).not.toContain('clinical operations');
    });

    it('keeps conversation history isolated by tenant', () => {
      conversations.append(FIXTURE_TENANT_IDS.HARBOR, 'shared-incident', {
        role: 'user',
        content: 'secret harbor context',
        createdAt: new Date().toISOString(),
      });
      expect(
        conversations.get(FIXTURE_TENANT_IDS.NORTHSTAR, 'shared-incident'),
      ).toEqual([]);
      expect(
        conversations.get(FIXTURE_TENANT_IDS.HARBOR, 'shared-incident'),
      ).toHaveLength(1);
    });
  });

  describe('tool scope', () => {
    it('returns only the requested tenant health fixture', async () => {
      const northstar = await tools.getServiceHealth(
        FIXTURE_TENANT_IDS.NORTHSTAR,
        FIXTURE_TENANT_IDS.NORTHSTAR,
        'payments-api',
      );
      const harbor = await tools.getServiceHealth(
        FIXTURE_TENANT_IDS.HARBOR,
        FIXTURE_TENANT_IDS.HARBOR,
        'payments-api',
      );

      expect(northstar.status).toBe('success');
      expect(harbor.status).toBe('success');
      expect(
        (northstar.data as { errorRatePercent: number }).errorRatePercent,
      ).toBe(8.6);
      expect(
        (harbor.data as { errorRatePercent: number }).errorRatePercent,
      ).toBe(2.1);
    });

    it('rejects cross-tenant tool calls', async () => {
      const result = await tools.getServiceHealth(
        FIXTURE_TENANT_IDS.NORTHSTAR,
        FIXTURE_TENANT_IDS.HARBOR,
        'payments-api',
      );
      expect(result.status).toBe('error');
      expect(result.error).toBe('tenant_mismatch');
    });

    it('honors tool-status.json timeout for harbor member-portal deployments', async () => {
      const result = await tools.getRecentDeployments(
        FIXTURE_TENANT_IDS.HARBOR,
        FIXTURE_TENANT_IDS.HARBOR,
        'member-portal',
      );
      expect(result.status).toBe('timeout');
      expect(result.errorCode).toBe('DEPLOYMENT_FEED_TIMEOUT');
    });
  });

  describe('structured output', () => {
    it('converts invalid model output into a safe fallback', async () => {
      orchestrator.enableInvalidDemoOutput(true);
      try {
        const result = await orchestrator.analyze({
          tenantId: FIXTURE_TENANT_IDS.NORTHSTAR,
          conversationId: 'invalid-output-test',
          message: 'payments API 502 after deployment',
          severity: 'P1',
          service: 'payments-api',
        });
        expect(result.requiresHumanApproval).toBe(true);
        expect(result.confidence).toBe(0);
        expect(result.recommendedAction).toBe('escalate_to_human');
        expect(result.citations).toEqual([]);
        expect(result.packId).toBe('OPSPILOT-ALPHA-2026-09');
        expect(result.traceMarker).toBe('ALPHA-9C7F-RETAIL-HEALTH');
      } finally {
        orchestrator.enableInvalidDemoOutput(false);
      }
    });
  });

  describe('API happy path', () => {
    it('analyzes sample incident alpha-01 end-to-end', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/tenants/${FIXTURE_TENANT_IDS.NORTHSTAR}/incidents/alpha-conv-01/analyze`,
        )
        .send({
          message:
            "Checkout began returning 502 responses shortly after today's payments release. Multiple customers cannot complete orders. Should we roll back?",
          severity: 'P1',
          service: 'payments-api',
        })
        .expect(200);

      expect(res.body.tenantId).toBe(FIXTURE_TENANT_IDS.NORTHSTAR);
      expect(res.body.conversationId).toBe('alpha-conv-01');
      expect(res.body.packId).toBe('OPSPILOT-ALPHA-2026-09');
      expect(res.body.traceMarker).toBe('ALPHA-9C7F-RETAIL-HEALTH');
      expect(res.body.dataPackVersion).toBe('OPSPILOT-ALPHA-2026-09');
      expect(res.body.recommendedAction).toBe('prepare_rollback');
      expect(res.body.requiresHumanApproval).toBe(true);
      expect(res.body.confidence).toBeGreaterThan(0.5);
      expect(
        res.body.toolsUsed.some(
          (t: { name: string; status: string }) =>
            t.name === 'get_service_health' && t.status === 'success',
        ),
      ).toBe(true);
      expect(
        res.body.citations.some(
          (c: { documentId: string }) =>
            c.documentId === 'northstar-payments-v2',
        ),
      ).toBe(true);
    });

    it('rejects unknown tenants', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tenants/unknown-tenant/incidents/x/analyze')
        .send({
          message: 'test',
          severity: 'P1',
          service: 'payments-api',
        })
        .expect(404);
    });
  });
});
