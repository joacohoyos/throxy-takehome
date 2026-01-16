import type { Lead } from '../../entities/lead';

export interface ScoringResult {
  score: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface IScoringService {
  scoreLead(lead: Lead): Promise<ScoringResult>;
}
