import type { ILeadRepository } from "@/server/domain/interfaces/repositories/lead-repository.interface";
import type { IAIUsageRepository } from "@/server/domain/interfaces/repositories/ai-usage-repository.interface";
import type { IScoringService } from "@/server/domain/interfaces/services/scoring-service.interface";

export interface ScoreLeadResult {
  leadId: string;
  score: number;
  inputTokens: number;
  outputTokens: number;
}

export class ScoreLeadCommand {
  constructor(
    private leadRepository: ILeadRepository,
    private aiUsageRepository: IAIUsageRepository,
    private scoringService: IScoringService,
  ) {}

  async execute(leadId: string): Promise<ScoreLeadResult> {
    const lead = await this.leadRepository.findById(leadId);

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    if (lead.status === "completed") {
      return {
        leadId,
        score: lead.score!,
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    await this.leadRepository.updateStatus(leadId, "processing");

    try {
      const result = await this.scoringService
        .scoreLead(lead)
        .catch((error) => {
          console.error(
            "Failed to score lead:",
            error instanceof Error ? error.message : error,
          );
          throw error;
        });

      await this.leadRepository.updateScore(leadId, result.score);

      await this.aiUsageRepository.create({
        leadId,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });

      return {
        leadId,
        score: result.score,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.leadRepository.updateStatus(leadId, "error", errorMessage);
      throw error;
    }
  }
}
