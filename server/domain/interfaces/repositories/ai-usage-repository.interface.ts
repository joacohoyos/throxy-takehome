import type { AIUsage, CreateAIUsageInput, AnalyticsData } from '../../entities/ai-usage';

export interface IAIUsageRepository {
  create(usage: CreateAIUsageInput): Promise<AIUsage>;
  getAnalytics(): Promise<AnalyticsData>;
}
