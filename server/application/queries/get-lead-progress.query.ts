import type { ILeadRepository } from '@/server/domain/interfaces/repositories/lead-repository.interface';
import type { ProgressStats } from '@/server/domain/entities/lead';

export class GetLeadProgressQuery {
  constructor(private leadRepository: ILeadRepository) {}

  async execute(): Promise<ProgressStats> {
    return this.leadRepository.getProgressStats();
  }
}
