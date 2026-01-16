import { createAdminClient } from "@/server/infrastructure/supabase/admin";
import type { Lead as DomainLead } from "@/server/domain/entities/lead";
import type { Lead } from "@/types/lead";

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

export interface LeadsUpdatedPayload {
  leads: Lead[];
}

const supabase = createAdminClient();
export async function broadcastLeadsUpdated(
  leads: DomainLead[],
): Promise<void> {
  if (leads.length === 0) return;

  const channel = supabase.channel("leads-updates");

  console.log(`Broadcasted leads-updated event for ${leads.length} leads`);
  await channel.httpSend("leads-updated", {
    leads: leads.map(mapDomainLeadToApiLead),
  } satisfies LeadsUpdatedPayload);
}
