import { NextRequest, NextResponse } from 'next/server';
import type { LeadsResponse, ApiError } from '@/types/api';
import type { Lead } from '@/types/lead';
import type { Lead as DomainLead } from '@/server/domain/entities/lead';
import { SupabaseLeadRepository } from '@/server/infrastructure/repositories/supabase-lead.repository';
import { GetLeadsQuery } from '@/server/application/queries/get-leads.query';

function mapDomainLeadToApiLead(lead: DomainLead): Lead {
  return {
    id: lead.id,
    account_name: lead.accountName,
    lead_first_name: lead.leadFirstName,
    lead_last_name: lead.leadLastName,
    lead_job_title: lead.leadJobTitle,
    account_domain: lead.accountDomain,
    account_employee_range: lead.accountEmployeeRange,
    account_industry: lead.accountIndustry,
    score: lead.score,
    status: lead.status,
    error_message: lead.errorMessage,
    created_at: lead.createdAt.toISOString(),
    processed_at: lead.processedAt?.toISOString() ?? null,
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<LeadsResponse | ApiError>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') as 'score' | 'created_at' | 'account_name' | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    const repository = new SupabaseLeadRepository();
    const query = new GetLeadsQuery(repository);

    const result = await query.execute({
      sortBy: sortBy ?? 'score',
      sortOrder: sortOrder ?? 'desc',
    });

    return NextResponse.json({
      leads: result.leads.map(mapDomainLeadToApiLead),
      total: result.total,
    });
  } catch (error) {
    console.error('Get leads error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch leads',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
