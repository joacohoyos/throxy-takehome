export type LeadStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Lead {
  id: string;
  accountName: string;
  leadFirstName: string;
  leadLastName: string;
  leadJobTitle: string;
  accountDomain: string;
  accountEmployeeRange: string;
  accountIndustry: string | null;
  score: number | null;
  status: LeadStatus;
  errorMessage: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface CreateLeadInput {
  accountName: string;
  leadFirstName: string;
  leadLastName: string;
  leadJobTitle: string;
  accountDomain: string;
  accountEmployeeRange: string;
  accountIndustry?: string | null;
}

export interface FindLeadsOptions {
  sortBy?: 'score' | 'created_at' | 'account_name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProgressStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  error: number;
}
