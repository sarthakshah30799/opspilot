import { Injectable } from '@nestjs/common';
import { IncidentOrchestrator } from '../ai/incident-orchestrator.service.js';
import type { AnalyzeIncidentDto } from './dto/analyze-incident.dto.js';

@Injectable()
export class IncidentsService {
  constructor(private readonly orchestrator: IncidentOrchestrator) {}

  analyze(
    tenantId: string,
    conversationId: string,
    dto: AnalyzeIncidentDto,
  ) {
    return this.orchestrator.analyze({
      tenantId,
      conversationId,
      message: dto.message,
      severity: dto.severity,
      service: dto.service,
    });
  }
}
