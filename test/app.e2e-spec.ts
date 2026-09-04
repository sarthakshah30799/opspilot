import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter.js';
import { FIXTURE_TENANT_IDS } from './../src/common/constants/tenants.js';

describe('OpsPilot API (e2e)', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /analyze happy path', async () => {
    const res = await request(app.getHttpServer())
      .post(
        `/api/v1/tenants/${FIXTURE_TENANT_IDS.ONE}/incidents/e2e-1/analyze`,
      )
      .send({
        message: 'payments-api 502 after deployment',
        severity: 'P1',
        service: 'payments-api',
      })
      .expect(200);

    expect(res.body.tenantId).toBe(FIXTURE_TENANT_IDS.ONE);
    expect(res.body.requiresHumanApproval).toBe(true);
  });
});
