import { FatalError, RetryableError } from "workflow";
import type { ScoreLeadResult } from "@/server/application/commands/score-lead.command";
import { ScoreLeadCommand } from "@/server/application/commands/score-lead.command";
import { SupabaseLeadRepository } from "@/server/infrastructure/repositories/supabase-lead.repository";
import { SupabaseAIUsageRepository } from "@/server/infrastructure/repositories/supabase-ai-usage.repository";
import { OpenAIScoringService } from "@/server/infrastructure/services/openai-scoring.service";

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  if (message.includes("rate limit") || message.includes("429")) {
    return true;
  }

  if ("status" in error && (error as { status: number }).status === 429) {
    return true;
  }

  if (
    "cause" in error &&
    error.cause &&
    typeof error.cause === "object" &&
    "status" in error.cause &&
    (error.cause as { status: number }).status === 429
  ) {
    return true;
  }

  return false;
}

function extractRetryAfter(error: unknown): string {
  if (error instanceof Error && "headers" in error) {
    const headers = (error as { headers?: Headers }).headers;
    const retryAfter = headers?.get?.("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return `${seconds}s`;
      }
    }
  }
  return "1m";
}

async function executeScoring(leadId: string): Promise<ScoreLeadResult> {
  "use step";

  const leadRepository = new SupabaseLeadRepository();
  const aiUsageRepository = new SupabaseAIUsageRepository();
  const scoringService = new OpenAIScoringService();

  const command = new ScoreLeadCommand(
    leadRepository,
    aiUsageRepository,
    scoringService,
  );

  try {
    return await command.execute(leadId);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Lead not found:")) {
      throw new FatalError(error.message);
    }

    if (isRateLimitError(error)) {
      const retryAfter = extractRetryAfter(error);
      throw new RetryableError("Rate limited by AI provider", {
        retryAfter,
      });
    }

    throw error;
  }
}

export async function scoreLeadWorkflow(
  leadId: string,
): Promise<ScoreLeadResult> {
  "use workflow";

  console.log(`Starting scoring workflow for lead ${leadId}`);

  const result = await executeScoring(leadId);

  console.log(
    `Completed scoring workflow for lead ${leadId}, score: ${result.score}`,
  );

  return result;
}
scoreLeadWorkflow.maxConcurrency = 1;
