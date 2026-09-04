import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

/**
 * Deterministic chat model for DEMO_MODE / tests.
 * Pattern-matches the latest user content and returns schema-shaped JSON.
 */
export class DemoChatModel extends BaseChatModel {
  forceInvalidOutput = false;

  _llmType(): string {
    return 'demo-chat-model';
  }

  async _generate(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    if (this.forceInvalidOutput) {
      const text = 'not-valid-json{{{';
      return {
        generations: [{ text, message: new AIMessage(text) }],
      };
    }

    const blob = messages.map((m) => String(m.content ?? '')).join('\n');
    const lower = blob.toLowerCase();
    const payload = this.buildPayload(lower, blob);
    const text = JSON.stringify(payload);
    return {
      generations: [{ text, message: new AIMessage(text) }],
    };
  }

  private buildPayload(lower: string, blob: string) {
    const missingEvidence =
      lower.includes('slow') &&
      !lower.includes('error rate') &&
      !lower.includes('deploy') &&
      !lower.includes('502');

    const followUpImproved =
      lower.includes('dropped') ||
      lower.includes('below 2') ||
      lower.includes('1%') ||
      lower.includes('error rate has now');

    if (missingEvidence) {
      return {
        summary:
          'The report that payments are slow lacks concrete telemetry or deployment correlation.',
        severity: 'P2',
        recommendedAction: 'gather_more_information',
        actionPlan: [
          'Ask for current error rate and latency for payments-api.',
          'Confirm whether a recent deployment occurred.',
          'Identify which tenant-facing symptom is being observed.',
        ],
        requiresHumanApproval: false,
        confidence: 0.35,
        assumptions: [],
        missingInformation: [
          'Current error rate and latency metrics',
          'Recent deployment history confirmation',
          'Affected user volume / duration',
        ],
        citations: [],
      };
    }

    if (followUpImproved) {
      return {
        summary:
          'Updated context indicates the error rate has dropped substantially; immediate rollback is less justified.',
        severity: 'P2',
        recommendedAction: 'continue_monitoring',
        actionPlan: [
          'Continue monitoring payments-api error rate and latency.',
          'Keep the prior rollback request drafted but do not escalate execution.',
          'Document the recovery timeline for the incident record.',
        ],
        requiresHumanApproval: false,
        confidence: 0.72,
        assumptions: [
          'The reported 1% / sub-2% error rate is accurate and sustained.',
        ],
        missingInformation: [],
        citations: [
          {
            documentId: 'payments-v2',
            section: 'Rollback Criteria',
            reason:
              'Active policy ties rollback to sustained elevated error rate after deployment.',
          },
        ],
      };
    }

    const hasDeploySignal =
      lower.includes('deploy') ||
      lower.includes('502') ||
      lower.includes('rollback') ||
      lower.includes('error');

    if (hasDeploySignal) {
      const citations = [];
      if (blob.includes('Rollback Criteria') || blob.includes('payments-v2')) {
        citations.push({
          documentId: 'payments-v2',
          section: 'Rollback Criteria',
          reason:
            'Defines the active rollback threshold and approval rule.',
        });
      } else {
        citations.push({
          documentId: 'payments-v2',
          section: 'Rollback Criteria',
          reason:
            'Active payments runbook governs rollback after deployment-related incidents.',
        });
      }

      return {
        summary:
          'The payments API appears degraded following a recent deployment.',
        severity: 'P1',
        recommendedAction: 'prepare_rollback',
        actionPlan: [
          'Confirm that the elevated error rate is still present.',
          'Compare the incident start time with the latest deployment.',
          'Prepare a rollback request for human approval.',
          'Notify the tenant incident contact.',
        ],
        requiresHumanApproval: false,
        confidence: 0.84,
        assumptions: [
          'The latest deployment is related to the current error increase.',
        ],
        missingInformation: [],
        citations,
      };
    }

    return {
      summary:
        'Insufficient evidence to recommend a consequential operational action.',
      severity: 'P3',
      recommendedAction: 'gather_more_information',
      actionPlan: [
        'Clarify the affected service and symptoms.',
        'Collect health and deployment evidence before recommending action.',
      ],
      requiresHumanApproval: false,
      confidence: 0.4,
      assumptions: [],
      missingInformation: [
        'Clear symptom description',
        'Service health signals',
        'Deployment correlation',
      ],
      citations: [],
    };
  }
}
