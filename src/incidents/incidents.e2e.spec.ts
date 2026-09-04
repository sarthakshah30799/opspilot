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
import { FIXTURE_TENANT_IDS } from '../common/constants/tenants.js';

describe('OpsPilot', () => {
  let app: INestApplication<App>;
  let retrieval: RetrievalService;
  let tools: OpsToolsService;
  let conversations: ConversationStore;
  let orchestrator: IncidentOrchestrator;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('tenant isolation', () => {
    it('does not retrieve tenant-two runbook markers for tenant-one', async () => {
      const chunks = await retrieval.retrieve(
        FIXTURE_TENANT_IDS.ONE,
        'payments rollback criteria',
        { k: 6, activeOnly: false },
      );
      const blob = chunks.map((c) => c.content).join('\n');
      expect(blob).toContain('TENANT_ONE_UNIQUE_MARKER_ALPHA');
      expect(blob).not.toContain('TENANT_TWO_UNIQUE_MARKER_BETA');
      expect(
        chunks.every((c) => c.metadata.tenantId === FIXTURE_TENANT_IDS.ONE),
      ).toBe(true);
    });

    it('keeps conversation history isolated by tenant', () => {
      conversations.append(FIXTURE_TENANT_IDS.TWO, 'shared-incident', {
        role: 'user',
        content: 'secret other-tenant context',
        createdAt: new Date().toISOString(),
      });
      expect(
        conversations.get(FIXTURE_TENANT_IDS.ONE, 'shared-incident'),
      ).toEqual([]);
      expect(
        conversations.get(FIXTURE_TENANT_IDS.TWO, 'shared-incident'),
      ).toHaveLength(1);
    });
  });

  describe('tool scope', () => {
    it('returns only the requested tenant health fixture', async () => {
      const one = await tools.getServiceHealth(
        FIXTURE_TENANT_IDS.ONE,
        FIXTURE_TENANT_IDS.ONE,
        'payments-api',
      );
      const two = await tools.getServiceHealth(
        FIXTURE_TENANT_IDS.TWO,
        FIXTURE_TENANT_IDS.TWO,
        'payments-api',
      );

      expect(one.status).toBe('success');
      expect(two.status).toBe('success');
      expect((one.data as { errorRate: number }).errorRate).toBe(8.4);
      expect((two.data as { errorRate: number }).errorRate).toBe(0.4);
    });

    it('rejects cross-tenant tool calls', async () => {
      const result = await tools.getServiceHealth(
        FIXTURE_TENANT_IDS.ONE,
        FIXTURE_TENANT_IDS.TWO,
        'payments-api',
      );
      expect(result.status).toBe('error');
      expect(result.error).toBe('tenant_mismatch');
    });
  });

  describe('structured output', () => {
    it('converts invalid model output into a safe fallback', async () => {
      orchestrator.enableInvalidDemoOutput(true);
      try {
        const result = await orchestrator.analyze({
          tenantId: FIXTURE_TENANT_IDS.ONE,
          conversationId: 'invalid-output-test',
          message: 'payments API 502 after deployment',
          severity: 'P1',
          service: 'payments-api',
        });
        expect(result.requiresHumanApproval).toBe(true);
        expect(result.confidence).toBe(0);
        expect(result.recommendedAction).toBe('escalate_to_human');
        expect(result.citations).toEqual([]);
        expect(result.missingInformation.length).toBeGreaterThan(0);
      } finally {
        orchestrator.enableInvalidDemoOutput(false);
      }
    });
  });

  describe('API happy path', () => {
    it('analyzes a representative incident end-to-end', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/tenants/${FIXTURE_TENANT_IDS.ONE}/incidents/incident-123/analyze`,
        )
        .send({
          message:
            "The payments API started returning 502 errors shortly after today's deployment. This is affecting checkout for multiple users.",
          severity: 'P1',
          service: 'payments-api',
        })
        .expect(200);

      expect(res.body.tenantId).toBe(FIXTURE_TENANT_IDS.ONE);
      expect(res.body.conversationId).toBe('incident-123');
      expect(res.body.dataPackVersion).toBeTruthy();
      expect(res.body.recommendedAction).toBe('prepare_rollback');
      expect(res.body.requiresHumanApproval).toBe(true);
      expect(res.body.confidence).toBeGreaterThan(0.5);
      expect(Array.isArray(res.body.actionPlan)).toBe(true);
      expect(Array.isArray(res.body.toolsUsed)).toBe(true);
      expect(
        res.body.toolsUsed.some(
          (t: { name: string; status: string }) =>
            t.name === 'get_service_health' && t.status === 'success',
        ),
      ).toBe(true);
      expect(
        res.body.citations.some(
          (c: { documentId: string }) => c.documentId === 'payments-v2',
        ),
      ).toBe(true);
    });

    it('rejects non-UUID tenant ids', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tenants/tenant-one/incidents/x/analyze')
        .send({
          message: 'test',
          severity: 'P1',
          service: 'payments-api',
        })
        .expect(400);
    });

    it('rejects unknown tenant UUIDs', async () => {
      await request(app.getHttpServer())
        .post(
          '/api/v1/tenants/550e8400-e29b-41d4-a716-446655449999/incidents/x/analyze',
        )
        .send({
          message: 'test',
          severity: 'P1',
          service: 'payments-api',
        })
        .expect(404);
    });
  });
});
