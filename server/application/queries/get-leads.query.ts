import type { ILeadRepository } from '@/server/domain/interfaces/repositories/lead-repository.interface';
import type { Lead, FindLeadsOptions } from '@/server/domain/entities/lead';

export interface GetLeadsResult {
  leads: Lead[];
  total: number;
}

export class GetLeadsQuery {
  constructor(private leadRepository: ILeadRepository) {}

  async execute(options?: FindLeadsOptions): Promise<GetLeadsResult> {
    return this.leadRepository.findAll(options);
  }
}
