import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../tenant/tenant.guard.js';
import { AnalyzeIncidentDto } from './dto/analyze-incident.dto.js';
import { IncidentsService } from './incidents.service.js';

@Controller('api/v1/tenants/:tenantId/incidents')
@UseGuards(TenantGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post(':conversationId/analyze')
  @HttpCode(200)
  analyze(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: AnalyzeIncidentDto,
  ) {
    return this.incidentsService.analyze(tenantId, conversationId, body);
  }
}
