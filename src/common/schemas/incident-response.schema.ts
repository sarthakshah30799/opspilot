import { z } from 'zod';

export const CitationSchema = z.object({
  documentId: z.string(),
  section: z.string(),
  reason: z.string(),
});

export const ToolUsedSchema = z.object({
  name: z.string(),
  status: z.enum(['success', 'error', 'skipped', 'timeout']),
});

export const IncidentAnalysisResponseSchema = z.object({
  conversationId: z.string(),
  tenantId: z.string(),
  dataPackVersion: z.string(),
  summary: z.string(),
  severity: z.string(),
  recommendedAction: z.string(),
  actionPlan: z.array(z.string()),
  requiresHumanApproval: z.boolean(),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()),
  missingInformation: z.array(z.string()),
  citations: z.array(CitationSchema),
  toolsUsed: z.array(ToolUsedSchema),
});

export type IncidentAnalysisResponse = z.infer<
  typeof IncidentAnalysisResponseSchema
>;

/** Schema for model-produced fields before request metadata is applied. */
export const ModelIncidentOutputSchema = z.object({
  summary: z.string(),
  severity: z.string().optional(),
  recommendedAction: z.string(),
  actionPlan: z.array(z.string()),
  requiresHumanApproval: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  citations: z.array(CitationSchema).default([]),
});

export type ModelIncidentOutput = z.infer<typeof ModelIncidentOutputSchema>;
