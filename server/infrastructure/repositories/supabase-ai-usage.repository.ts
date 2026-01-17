import type { IAIUsageRepository } from '@/server/domain/interfaces/repositories/ai-usage-repository.interface';
import type { AIUsage, CreateAIUsageInput, AnalyticsData } from '@/server/domain/entities/ai-usage';
import { createAdminClient } from '@/server/infrastructure/supabase/admin';

interface AIUsageRow {
  id: string;
  lead_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

function mapRowToAIUsage(row: AIUsageRow): AIUsage {
  return {
    id: row.id,
    leadId: row.lead_id,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseAIUsageRepository implements IAIUsageRepository {
  async create(usage: CreateAIUsageInput): Promise<AIUsage> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_usage')
      .insert({
        lead_id: usage.leadId,
        model: usage.model,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
      })
      .select()
      .single();

    if (error) throw error;

    return mapRowToAIUsage(data as AIUsageRow);
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_usage')
      .select('input_tokens, output_tokens');

    if (error) throw error;

    if (data.length === 0) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgInputTokensPerLead: 0,
        avgOutputTokensPerLead: 0,
        totalLeadsScored: 0,
      };
    }

    const totalInputTokens = data.reduce((sum: number, row: { input_tokens: number }) => sum + row.input_tokens, 0);
    const totalOutputTokens = data.reduce((sum: number, row: { output_tokens: number }) => sum + row.output_tokens, 0);
    const totalLeadsScored = data.length;

    return {
      totalInputTokens,
      totalOutputTokens,
      avgInputTokensPerLead: Math.round(totalInputTokens / totalLeadsScored),
      avgOutputTokensPerLead: Math.round(totalOutputTokens / totalLeadsScored),
      totalLeadsScored,
    };
  }
}
