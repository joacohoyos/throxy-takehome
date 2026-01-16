import type { ILeadRepository } from '@/server/domain/interfaces/repositories/lead-repository.interface';
import type {
  Lead,
  LeadStatus,
  CreateLeadInput,
  FindLeadsOptions,
  ProgressStats,
} from '@/server/domain/entities/lead';
import { createAdminClient } from '@/server/infrastructure/supabase/admin';

interface LeadRow {
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

function mapRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    accountName: row.account_name,
    leadFirstName: row.lead_first_name,
    leadLastName: row.lead_last_name,
    leadJobTitle: row.lead_job_title,
    accountDomain: row.account_domain,
    accountEmployeeRange: row.account_employee_range,
    accountIndustry: row.account_industry,
    score: row.score,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
    processedAt: row.processed_at ? new Date(row.processed_at) : null,
  };
}

function mapInputToRow(input: CreateLeadInput) {
  return {
    account_name: input.accountName,
    lead_first_name: input.leadFirstName,
    lead_last_name: input.leadLastName,
    lead_job_title: input.leadJobTitle,
    account_domain: input.accountDomain,
    account_employee_range: input.accountEmployeeRange,
    account_industry: input.accountIndustry ?? null,
  };
}

export class SupabaseLeadRepository implements ILeadRepository {
  async findById(id: string): Promise<Lead | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return mapRowToLead(data as LeadRow);
  }

  async findAll(options: FindLeadsOptions = {}): Promise<{ leads: Lead[]; total: number }> {
    const {
      sortBy = 'score',
      sortOrder = 'desc',
      limit = 100,
      offset = 0,
    } = options;

    const supabase = createAdminClient();

    const sortColumn = sortBy === 'score' ? 'score' : sortBy === 'account_name' ? 'account_name' : 'created_at';

    const { data, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending: sortOrder === 'asc', nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      leads: (data as LeadRow[]).map(mapRowToLead),
      total: count ?? 0,
    };
  }

  async findPendingIds(): Promise<string[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .eq('status', 'pending');

    if (error) throw error;

    return data.map((row) => row.id);
  }

  async create(leads: CreateLeadInput[]): Promise<Lead[]> {
    const supabase = createAdminClient();
    const rows = leads.map(mapInputToRow);

    const { data, error } = await supabase
      .from('leads')
      .upsert(rows, {
        onConflict: 'lead_first_name,lead_last_name,lead_job_title,account_name',
        ignoreDuplicates: true,
      })
      .select();

    if (error) throw error;

    return (data as LeadRow[]).map(mapRowToLead);
  }

  async updateStatus(id: string, status: LeadStatus, errorMessage?: string): Promise<void> {
    const supabase = createAdminClient();
    const update: Record<string, unknown> = { status };

    if (errorMessage !== undefined) {
      update.error_message = errorMessage;
    }

    if (status === 'completed' || status === 'error') {
      update.processed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('leads')
      .update(update)
      .eq('id', id);

    if (error) throw error;
  }

  async updateScore(id: string, score: number): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('leads')
      .update({
        score,
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getProgressStats(): Promise<ProgressStats> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('leads')
      .select('status');

    if (error) throw error;

    const stats: ProgressStats = {
      total: data.length,
      pending: 0,
      processing: 0,
      completed: 0,
      error: 0,
    };

    for (const row of data) {
      const status = row.status as LeadStatus;
      stats[status]++;
    }

    return stats;
  }

  async findCompleted(): Promise<Lead[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'completed')
      .order('score', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return (data as LeadRow[]).map(mapRowToLead);
  }
}
