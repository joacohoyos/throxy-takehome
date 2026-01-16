export interface IQueueService {
  enqueueLeads(leadIds: string[]): Promise<void>;
}
