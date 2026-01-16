import { start } from 'workflow/api';
import type { IQueueService } from '@/server/domain/interfaces/services/queue-service.interface';
import { scoreLeadWorkflow } from '@/features/scoring/workflows/score-lead.workflow';

export class WorkflowQueueService implements IQueueService {
  async enqueueLeads(leadIds: string[]): Promise<void> {
    const jobs = leadIds.map((leadId) => start(scoreLeadWorkflow, [leadId]));

    await Promise.all(jobs);
  }
}
