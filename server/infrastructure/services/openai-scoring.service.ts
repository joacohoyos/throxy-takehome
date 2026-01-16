import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type {
  IScoringService,
  ScoringResult,
} from "@/server/domain/interfaces/services/scoring-service.interface";
import type { Lead } from "@/server/domain/entities/lead";
import { buildScoringPrompt } from "@/features/scoring/lib/scoring-prompt";

const MODEL_ID = "gpt-5-nano";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export class OpenAIScoringService implements IScoringService {
  async scoreLead(lead: Lead): Promise<ScoringResult> {
    const prompt = buildScoringPrompt(lead);

    const { text, usage } = await generateText({
      model: openai(MODEL_ID),
      prompt,
    });

    const score = this.parseScore(text);

    return {
      score,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      model: MODEL_ID,
    };
  }

  private parseScore(text: string): number {
    try {
      const cleaned = text
        .trim()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
      const parsed = JSON.parse(cleaned);

      if (typeof parsed.score === "number") {
        return Math.max(0, Math.min(10, Math.round(parsed.score * 10) / 10));
      }
    } catch {
      const match = text.match(/["']?score["']?\s*:\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const score = parseFloat(match[1]);
        return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
      }
    }

    throw new Error(`Failed to parse score from AI response: ${text}`);
  }
}
