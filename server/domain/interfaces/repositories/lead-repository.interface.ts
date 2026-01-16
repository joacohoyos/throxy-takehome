import type {
  Lead,
  LeadStatus,
  CreateLeadInput,
  FindLeadsOptions,
  ProgressStats,
} from '../../entities/lead';

export interface ILeadRepository {
  findById(id: string): Promise<Lead | null>;
  findAll(options?: FindLeadsOptions): Promise<{ leads: Lead[]; total: number }>;
  findPendingIds(): Promise<string[]>;
  create(leads: CreateLeadInput[]): Promise<Lead[]>;
  updateStatus(id: string, status: LeadStatus, errorMessage?: string): Promise<void>;
  updateScore(id: string, score: number): Promise<void>;
  getProgressStats(): Promise<ProgressStats>;
  findCompleted(): Promise<Lead[]>;
}
