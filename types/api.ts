import type { Lead } from './lead';

export interface UploadResponse {
  success: boolean;
  count: number;
  leadIds: string[];
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export interface ProgressResponse {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  error: number;
}

export interface AnalyticsResponse {
  totalInputTokens: number;
  totalOutputTokens: number;
  avgInputTokensPerLead: number;
  avgOutputTokensPerLead: number;
  totalLeadsScored: number;
}

export interface ApiError {
  error: string;
  details?: string;
}
