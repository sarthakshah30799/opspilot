import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

/**
 * Deterministic chat model for DEMO_MODE / tests.
 * Pattern-matches prompt content and returns schema-shaped JSON.
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

  private citationFromEvidence(blob: string, reason: string) {
    const docMatch = blob.match(/documentId=([^\s]+)/);
    const sectionMatch = blob.match(/section=([^\n]+)/);
    return {
      documentId: docMatch?.[1] ?? 'unknown-document',
      section: sectionMatch?.[1]?.trim() ?? 'Rollback criteria',
      reason,
    };
  }

  private buildPayload(lower: string, blob: string) {
    const toolTimedOut =
      lower.includes('deployment_feed_timeout') ||
      lower.includes('temporarily_unavailable') ||
      lower.includes('"status": "timeout"');

    const missingEvidence =
      (lower.includes('slow') || lower.includes('slower')) &&
      !lower.includes('502') &&
      !lower.includes('error rate has now');

    const followUpImproved =
      lower.includes('dropped') ||
      lower.includes('below 2') ||
      lower.includes('stayed below 2') ||
      lower.includes('error rate has now');

    const unknownService =
      lower.includes('loyalty-api') || lower.includes('service=loyalty-api');

    if (unknownService) {
      return {
        summary:
          'No active runbook or telemetry was available for loyalty-api in this tenant pack.',
        severity: 'P2',
        recommendedAction: 'gather_more_information',
        actionPlan: [
          'Confirm the correct service identifier with the reporter.',
          'Locate an active runbook covering loyalty-api before recommending rollback thresholds.',
        ],
        requiresHumanApproval: false,
        confidence: 0.25,
        assumptions: [],
        missingInformation: [
          'Active loyalty-api runbook for this tenant',
          'Service health and deployment evidence for loyalty-api',
        ],
        citations: [],
      };
    }

    if (toolTimedOut) {
      return {
        summary:
          'Member portal appears degraded, but deployment evidence is unavailable due to a tool timeout.',
        severity: 'P1',
        recommendedAction: 'gather_more_information',
        actionPlan: [
          'Retry the deployment feed when it recovers.',
          'Continue monitoring member-portal health signals.',
          'Do not execute an immediate rollback without confirmed release correlation.',
        ],
        requiresHumanApproval: true,
        confidence: 0.3,
        assumptions: [],
        missingInformation: [
          'Recent deployment timing (deployment feed timed out)',
          'Confirmed correlation between a release and the timeouts',
        ],
        citations: blob.includes('documentId=')
          ? [
              this.citationFromEvidence(
                blob,
                'Active runbook still requires verified deployment correlation before rollback.',
              ),
            ]
          : [],
      };
    }

    if (missingEvidence) {
      return {
        summary:
          'Reported slowness alone is not enough to justify rollback for this tenant.',
        severity: 'P2',
        recommendedAction: 'gather_more_information',
        actionPlan: [
          'Confirm current error rate, latency, and dependency health.',
          'Check whether a recent tenant-owned deployment correlates with the symptom.',
          'Escalate to vendor paths if dependencies are the primary failure.',
        ],
        requiresHumanApproval: false,
        confidence: 0.4,
        assumptions: [],
        missingInformation: [
          'Sustained error-rate evidence above rollback thresholds',
          'Confirmed recent tenant-owned deployment correlation',
        ],
        citations: blob.includes('documentId=')
          ? [
              this.citationFromEvidence(
                blob,
                'Active policy requires stronger evidence before rollback.',
              ),
            ]
          : [],
      };
    }

    if (followUpImproved) {
      return {
        summary:
          'Updated telemetry shows the error rate has recovered below the rollback threshold; immediate rollback is less justified.',
        severity: 'P2',
        recommendedAction: 'continue_monitoring',
        actionPlan: [
          'Continue monitoring payments-api error rate and checkout success.',
          'Keep any drafted rollback request on hold unless the threshold is breached again.',
          'Document the recovery window for the incident record.',
        ],
        requiresHumanApproval: false,
        confidence: 0.74,
        assumptions: [
          'The reported sub-2% error rate is accurate and sustained.',
        ],
        missingInformation: [],
        citations: [
          this.citationFromEvidence(
            blob,
            'Active policy ties rollback to sustained elevated error rate after deployment.',
          ),
        ],
      };
    }

    const hasDeploySignal =
      lower.includes('deploy') ||
      lower.includes('release') ||
      lower.includes('502') ||
      lower.includes('rollback') ||
      lower.includes('error');

    if (hasDeploySignal) {
      return {
        summary:
          'Payments API degradation correlates with a recent release; prepare a rollback request under the active tenant policy.',
        severity: 'P1',
        recommendedAction: 'prepare_rollback',
        actionPlan: [
          'Confirm the elevated error rate is still present against the active threshold.',
          'Compare incident timing with the latest payments-api deployment.',
          'Prepare a rollback request for human approval.',
          'Notify the tenant incident contact.',
        ],
        requiresHumanApproval: false,
        confidence: 0.84,
        assumptions: [
          'The latest deployment is related to the current error increase.',
        ],
        missingInformation: [],
        citations: [
          this.citationFromEvidence(
            blob,
            'Defines the active rollback threshold and approval rule.',
          ),
        ],
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
