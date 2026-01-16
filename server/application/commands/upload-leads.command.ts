import type { ILeadRepository } from '@/server/domain/interfaces/repositories/lead-repository.interface';
import type { IQueueService } from '@/server/domain/interfaces/services/queue-service.interface';
import type { CreateLeadInput, Lead } from '@/server/domain/entities/lead';
import type { CsvRow } from '@/types/csv';

export interface UploadLeadsResult {
  leads: Lead[];
  count: number;
  leadIds: string[];
}

function mapCsvRowToLeadInput(row: CsvRow): CreateLeadInput {
  return {
    accountName: row.account_name,
    leadFirstName: row.lead_first_name,
    leadLastName: row.lead_last_name,
    leadJobTitle: row.lead_job_title ?? '',
    accountDomain: row.account_domain,
    accountEmployeeRange: row.account_employee_range,
    accountIndustry: row.account_industry ?? null,
  };
}

export class UploadLeadsCommand {
  constructor(
    private leadRepository: ILeadRepository,
    private queueService?: IQueueService
  ) {}

  async execute(rows: CsvRow[]): Promise<UploadLeadsResult> {
    if (rows.length === 0) {
      throw new Error('No leads to upload');
    }

    const leadInputs = rows.map(mapCsvRowToLeadInput);
    const leads = await this.leadRepository.create(leadInputs);
    const leadIds = leads.map((lead) => lead.id);

    if (this.queueService) {
      await this.queueService.enqueueLeads(leadIds);
    }

    return {
      leads,
      count: leads.length,
      leadIds,
    };
  }
}
