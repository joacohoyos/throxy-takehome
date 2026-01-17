import { start } from "workflow/api";
import type { IQueueService } from "@/server/domain/interfaces/services/queue-service.interface";
import { scoreLeadWorkflowV1 } from "@/server/application/workflows/score-lead.workflow";

export class WorkflowQueueService implements IQueueService {
  async enqueueLeads(leadIds: string[]): Promise<void> {
    for (const leadId of leadIds) {
      await start(scoreLeadWorkflowV1, [leadId]);
    }
  }
}
