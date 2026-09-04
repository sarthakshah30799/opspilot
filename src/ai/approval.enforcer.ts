import { Injectable } from '@nestjs/common';
import { isConsequentialAction } from '../common/constants/consequential-actions.js';
import type { IncidentAnalysisResponse } from '../common/schemas/incident-response.schema.js';

@Injectable()
export class ApprovalEnforcer {
  enforce(
    response: IncidentAnalysisResponse,
  ): IncidentAnalysisResponse {
    if (isConsequentialAction(response.recommendedAction)) {
      return { ...response, requiresHumanApproval: true };
    }
    return response;
  }
}
