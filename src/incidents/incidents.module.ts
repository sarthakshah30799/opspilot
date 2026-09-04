import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { TenantModule } from '../tenant/tenant.module.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';

@Module({
  imports: [AiModule, TenantModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
