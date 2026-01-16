export interface AIUsage {
  id: string;
  leadId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  createdAt: Date;
}

export interface CreateAIUsageInput {
  leadId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface AnalyticsData {
  totalInputTokens: number;
  totalOutputTokens: number;
  avgInputTokensPerLead: number;
  avgOutputTokensPerLead: number;
  totalLeadsScored: number;
  totalCost: number;
}
