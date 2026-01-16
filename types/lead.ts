export type LeadStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Lead {
  id: string;
  account_name: string;
  lead_first_name: string;
  lead_last_name: string;
  lead_job_title: string;
  account_domain: string;
  account_employee_range: string;
  account_industry: string | null;
  score: number | null;
  status: LeadStatus;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface LeadInsert {
  account_name: string;
  lead_first_name: string;
  lead_last_name: string;
  lead_job_title: string;
  account_domain: string;
  account_employee_range: string;
  account_industry?: string | null;
}
