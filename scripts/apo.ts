/**
 * Automatic Prompt Optimization (APO) Script
 *
 * Implements an OPRO-inspired optimization loop to iteratively improve
 * the lead scoring prompt using the evaluation dataset.
 *
 * Usage: pnpm apo
 * Resume: pnpm apo --resume
 */

import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { BASE_PROMPT } from "../features/scoring/lib/scoring-prompt";

// ============================================================================
// Types
// ============================================================================

interface EvalLead {
  name: string;
  title: string;
  company: string;
  linkedIn: string;
  employeeRange: string;
  expectedScore: number;
}

interface PromptCandidate {
  prompt: string;
  score: number; // MAE (lower is better)
  accuracy: number; // Percentage within ±1 tolerance
  iteration: number;
  predictions?: EvaluationResult["predictions"]; // Cached predictions for worst-case analysis
}

interface APOConfig {
  maxIterations: number;
  candidatesPerIteration: number;
  beamWidth: number;
  earlyStopThreshold: number;
  evalSubsetSize: number | null; // null = use all
}

interface EvaluationResult {
  mae: number;
  accuracy: number;
  predictions: Array<{
    lead: EvalLead;
    predicted: number;
    expected: number;
    error: number;
  }>;
}

interface APOReport {
  config: APOConfig;
  baselineScore: number;
  baselineAccuracy: number;
  iterations: Array<{
    iteration: number;
    candidates: Array<{
      score: number;
      accuracy: number;
      promptPreview: string;
    }>;
    bestScore: number;
    bestAccuracy: number;
  }>;
  finalBestPrompt: string;
  finalBestScore: number;
  finalBestAccuracy: number;
  improvement: number;
  totalLLMCalls: number;
}

interface APOCheckpoint {
  config: APOConfig;
  baselineScore: number;
  baselineAccuracy: number;
  beam: PromptCandidate[];
  completedIterations: number;
  previousBestScore: number;
  stagnantIterations: number;
  report: APOReport;
  timestamp: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: APOConfig = {
  maxIterations: 5,
  candidatesPerIteration: 2,
  beamWidth: 2,
  earlyStopThreshold: 0.05,
  evalSubsetSize: null, // Use all leads
};

const MODEL = openai("gpt-5-nano");

const OUTPUT_DIR = path.join(process.cwd(), "scripts", "output");
const CHECKPOINT_PATH = path.join(OUTPUT_DIR, "apo-checkpoint.json");

// ============================================================================
// Checkpoint Management
// ============================================================================

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function saveCheckpoint(checkpoint: APOCheckpoint): void {
  ensureOutputDir();
  checkpoint.timestamp = new Date().toISOString();
  // Strip predictions from beam to reduce checkpoint size
  const checkpointToSave = {
    ...checkpoint,
    beam: checkpoint.beam.map(({ predictions, ...rest }) => rest),
  };
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpointToSave, null, 2), "utf-8");
  console.log(`  [Checkpoint saved at iteration ${checkpoint.completedIterations}]`);
}

function loadCheckpoint(): APOCheckpoint | null {
  if (!fs.existsSync(CHECKPOINT_PATH)) {
    return null;
  }
  try {
    const content = fs.readFileSync(CHECKPOINT_PATH, "utf-8");
    return JSON.parse(content) as APOCheckpoint;
  } catch (error) {
    console.warn("Failed to load checkpoint:", error);
    return null;
  }
}

function clearCheckpoint(): void {
  if (fs.existsSync(CHECKPOINT_PATH)) {
    fs.unlinkSync(CHECKPOINT_PATH);
  }
}

// ============================================================================
// CSV Loading
// ============================================================================

function loadEvalSet(filePath: string): EvalLead[] {
  const csvContent = fs.readFileSync(filePath, "utf-8");
  const result = Papa.parse<{
    Name: string;
    Title: string;
    Company: string;
    LinkedIn: string;
    EmployeeRange: string;
    ExpectedScore: string;
  }>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row) => ({
    name: row.Name,
    title: row.Title,
    company: row.Company,
    linkedIn: row.LinkedIn,
    employeeRange: row.EmployeeRange,
    expectedScore: parseInt(row.ExpectedScore, 10),
  }));
}

// ============================================================================
// Lead Scoring
// ============================================================================

function buildLeadContext(lead: EvalLead): string {
  const nameParts = lead.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return `
## Lead Information
- **Name**: ${firstName} ${lastName}
- **Job Title**: ${lead.title}
- **Company**: ${lead.company}
- **Company Size**: ${lead.employeeRange}
`;
}

async function scoreLeadWithPrompt(
  prompt: string,
  lead: EvalLead,
): Promise<number> {
  const fullPrompt = `${prompt}

${buildLeadContext(lead)}`;

  try {
    const result = await generateText({
      model: MODEL,
      prompt: fullPrompt,
    });

    const text = result.text.trim();

    // Try to parse JSON response
    try {
      const json = JSON.parse(text);
      if (typeof json.score === "number") {
        return Math.max(0, Math.min(10, json.score));
      }
    } catch {
      // Try to extract number from text
      const match = text.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        return Math.max(0, Math.min(10, parseFloat(match[1])));
      }
    }

    console.warn(`Failed to parse score from: ${text}`);
    return 5; // Default middle score
  } catch (error) {
    console.error(`Error scoring lead ${lead.name}:`, error);
    return 5;
  }
}

// ============================================================================
// Evaluation
// ============================================================================

const CHUNK_SIZE = 25;

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function evaluatePrompt(
  prompt: string,
  evalSet: EvalLead[],
  subsetSize: number | null = null,
): Promise<EvaluationResult> {
  console.log(`Evaluating prompt on ${subsetSize ?? evalSet.length} leads...`);
  const leads = subsetSize ? evalSet.slice(0, subsetSize) : evalSet;
  const predictions: EvaluationResult["predictions"] = [];

  const chunks = chunk(leads, CHUNK_SIZE);

  for (const leadChunk of chunks) {
    const chunkResults = await Promise.all(
      leadChunk.map(async (lead) => {
        const predicted = await scoreLeadWithPrompt(prompt, lead);
        return {
          lead,
          predicted,
          expected: lead.expectedScore,
          error: Math.abs(predicted - lead.expectedScore),
        };
      }),
    );
    predictions.push(...chunkResults);
    console.log(`  Processed ${predictions.length}/${leads.length} leads...`);
  }

  const totalError = predictions.reduce((sum, p) => sum + p.error, 0);
  const mae = totalError / predictions.length;

  const withinTolerance = predictions.filter((p) => p.error <= 1).length;
  const accuracy = withinTolerance / predictions.length;

  return { mae, accuracy, predictions };
}

// ============================================================================
// Meta-Prompting
// ============================================================================

function buildMetaPrompt(
  history: PromptCandidate[],
  evalSample: EvalLead[],
  worstPredictions: EvaluationResult["predictions"],
): string {
  const sortedHistory = [...history].sort((a, b) => b.score - a.score); // Worst first, best last

  const historyText = sortedHistory
    .map(
      (h, i) =>
        `### Prompt ${i + 1} (MAE: ${h.score.toFixed(2)}, Accuracy: ${(h.accuracy * 100).toFixed(1)}%)
\`\`\`
${h.prompt.slice(0, 2000)}${h.prompt.length > 2000 ? "..." : ""}
\`\`\``,
    )
    .join("\n\n");

  const evalExamples = evalSample
    .map(
      (lead) =>
        `- ${lead.name} | ${lead.title} @ ${lead.company} (${lead.employeeRange}) → Expected: ${lead.expectedScore}`,
    )
    .join("\n");

  const worstCases = worstPredictions
    .slice(0, 10)
    .map(
      (p) =>
        `- ${p.lead.name} | ${p.lead.title} @ ${p.lead.company} (${p.lead.employeeRange})
  Expected: ${p.expected}, Predicted: ${p.predicted.toFixed(1)}, Error: ${p.error.toFixed(1)}`,
    )
    .join("\n");

  return `You are an expert at optimizing prompts for B2B lead scoring systems.

## Task
Your goal is to improve a lead scoring prompt to minimize the Mean Absolute Error (MAE) between predicted scores and expected scores. The scores range from 0-10.

## Current Prompt History (sorted by performance, BEST prompt is LAST)
${historyText}

## Evaluation Dataset Sample (with expected scores)
${evalExamples}

## Worst Predictions from Current Best Prompt
${worstCases}

## Analysis Instructions
1. Analyze why the current best prompt is making errors on the worst cases
2. Consider:
   - Is the prompt unclear about scoring criteria for certain roles/titles?
   - Are there company size considerations being missed?
   - Are there industry or department signals not being captured?
   - Is the scoring scale being applied inconsistently?

## Output Instructions
Generate an improved prompt that will produce more accurate scores. The prompt should:
1. Be comprehensive but clear
2. Include specific scoring guidelines
3. End with the instruction to respond with ONLY a JSON object: {"score": <number>}

Output ONLY the improved prompt text, no explanations or markdown formatting around it.`;
}

async function generateCandidatePrompts(
  history: PromptCandidate[],
  evalSet: EvalLead[],
  worstPredictions: EvaluationResult["predictions"],
  count: number,
): Promise<string[]> {
  const candidates: string[] = [];
  const evalSample = evalSet.slice(0, 15); // Sample for meta-prompt

  for (let i = 0; i < count; i++) {
    const metaPrompt = buildMetaPrompt(history, evalSample, worstPredictions);

    try {
      const result = await generateText({
        model: MODEL,
        prompt: metaPrompt,
        temperature: 0.7 + i * 0.1, // Vary temperature for diversity
      });

      candidates.push(result.text.trim());
    } catch (error) {
      console.error(`Error generating candidate ${i + 1}:`, error);
    }
  }

  return candidates;
}

// ============================================================================
// Main APO Loop
// ============================================================================

async function runAPO(
  config: APOConfig = DEFAULT_CONFIG,
  resumeFromCheckpoint: boolean = false,
): Promise<APOReport> {
  console.log("=".repeat(60));
  console.log("Automatic Prompt Optimization (APO)");
  console.log("=".repeat(60));
  console.log(`Config: ${JSON.stringify(config, null, 2)}\n`);

  // Load evaluation set
  const evalSetPath = path.join(process.cwd(), "eval_set.csv");
  const evalSet = loadEvalSet(evalSetPath);
  console.log(`Loaded ${evalSet.length} leads from eval_set.csv\n`);

  // Try to resume from checkpoint
  let checkpoint: APOCheckpoint | null = null;
  if (resumeFromCheckpoint) {
    checkpoint = loadCheckpoint();
    if (checkpoint) {
      console.log(`Resuming from checkpoint at iteration ${checkpoint.completedIterations}`);
      console.log(`Previous best MAE: ${checkpoint.previousBestScore.toFixed(3)}\n`);
    } else {
      console.log("No checkpoint found, starting fresh\n");
    }
  }

  // Initialize or restore state
  let report: APOReport;
  let beam: PromptCandidate[];
  let previousBestScore: number;
  let stagnantIterations: number;
  let startIteration: number;

  if (checkpoint) {
    report = checkpoint.report;
    beam = checkpoint.beam;
    previousBestScore = checkpoint.previousBestScore;
    stagnantIterations = checkpoint.stagnantIterations;
    startIteration = checkpoint.completedIterations + 1;

    // Re-evaluate best prompt to restore cached predictions (stripped from checkpoint)
    console.log("Re-evaluating best prompt to restore predictions cache...");
    const bestResult = await evaluatePrompt(
      beam[0].prompt,
      evalSet,
      config.evalSubsetSize,
    );
    beam[0].predictions = bestResult.predictions;
    report.totalLLMCalls += evalSet.length;
  } else {
    // Initialize report
    report = {
      config,
      baselineScore: 0,
      baselineAccuracy: 0,
      iterations: [],
      finalBestPrompt: BASE_PROMPT,
      finalBestScore: Infinity,
      finalBestAccuracy: 0,
      improvement: 0,
      totalLLMCalls: 0,
    };

    // Evaluate baseline
    console.log("Evaluating baseline prompt...");
    const baselineResult = await evaluatePrompt(
      BASE_PROMPT,
      evalSet,
      config.evalSubsetSize,
    );
    report.baselineScore = baselineResult.mae;
    report.baselineAccuracy = baselineResult.accuracy;
    report.totalLLMCalls += evalSet.length;

    console.log(`Baseline MAE: ${baselineResult.mae.toFixed(3)}`);
    console.log(
      `Baseline Accuracy (±1): ${(baselineResult.accuracy * 100).toFixed(1)}%\n`,
    );

    // Initialize beam with baseline
    beam = [
      {
        prompt: BASE_PROMPT,
        score: baselineResult.mae,
        accuracy: baselineResult.accuracy,
        iteration: 0,
        predictions: baselineResult.predictions,
      },
    ];

    previousBestScore = baselineResult.mae;
    stagnantIterations = 0;
    startIteration = 1;

    // Save initial checkpoint
    saveCheckpoint({
      config,
      baselineScore: report.baselineScore,
      baselineAccuracy: report.baselineAccuracy,
      beam,
      completedIterations: 0,
      previousBestScore,
      stagnantIterations,
      report,
      timestamp: new Date().toISOString(),
    });
  }

  // Main optimization loop
  for (let iteration = startIteration; iteration <= config.maxIterations; iteration++) {
    console.log("-".repeat(60));
    console.log(`Iteration ${iteration}/${config.maxIterations}`);
    console.log("-".repeat(60));

    // Get worst predictions from current best (using cached predictions)
    const currentBest = beam[0]; // beam is sorted, best is first
    const worstPredictions = [...(currentBest.predictions || [])].sort(
      (a, b) => b.error - a.error,
    );

    // Generate new candidate prompts
    console.log(`Generating ${config.candidatesPerIteration} candidates...`);
    const newPrompts = await generateCandidatePrompts(
      beam,
      evalSet,
      worstPredictions,
      config.candidatesPerIteration,
    );
    report.totalLLMCalls += config.candidatesPerIteration;

    // Evaluate candidates
    const iterationCandidates: APOReport["iterations"][0]["candidates"] = [];

    for (let i = 0; i < newPrompts.length; i++) {
      console.log(`Evaluating candidate ${i + 1}/${newPrompts.length}...`);
      const result = await evaluatePrompt(
        newPrompts[i],
        evalSet,
        config.evalSubsetSize,
      );
      report.totalLLMCalls += evalSet.length;

      beam.push({
        prompt: newPrompts[i],
        score: result.mae,
        accuracy: result.accuracy,
        iteration,
        predictions: result.predictions,
      });

      iterationCandidates.push({
        score: result.mae,
        accuracy: result.accuracy,
        promptPreview: newPrompts[i].slice(0, 200) + "...",
      });

      console.log(
        `  Candidate ${i + 1}: MAE=${result.mae.toFixed(3)}, Accuracy=${(result.accuracy * 100).toFixed(1)}%`,
      );
    }

    // Keep top K candidates (beam search)
    beam.sort((a, b) => a.score - b.score); // Sort by MAE (lower is better)
    beam = beam.slice(0, config.beamWidth);

    const bestInBeam = beam[0];
    console.log(`\nBest in beam: MAE=${bestInBeam.score.toFixed(3)}`);

    report.iterations.push({
      iteration,
      candidates: iterationCandidates,
      bestScore: bestInBeam.score,
      bestAccuracy: bestInBeam.accuracy,
    });

    // Check for convergence
    const improvement = previousBestScore - bestInBeam.score;
    if (improvement < config.earlyStopThreshold) {
      stagnantIterations++;
      console.log(
        `Improvement: ${improvement.toFixed(4)} (stagnant: ${stagnantIterations})`,
      );
    } else {
      stagnantIterations = 0;
      console.log(`Improvement: ${improvement.toFixed(4)}`);
    }

    previousBestScore = bestInBeam.score;

    // Save checkpoint after each iteration
    saveCheckpoint({
      config,
      baselineScore: report.baselineScore,
      baselineAccuracy: report.baselineAccuracy,
      beam,
      completedIterations: iteration,
      previousBestScore,
      stagnantIterations,
      report,
      timestamp: new Date().toISOString(),
    });

    // Early stopping check
    if (stagnantIterations >= 2) {
      console.log("\nEarly stopping: No significant improvement\n");
      break;
    }
  }

  // Finalize results
  const finalBest = beam[0];
  report.finalBestPrompt = finalBest.prompt;
  report.finalBestScore = finalBest.score;
  report.finalBestAccuracy = finalBest.accuracy;
  report.improvement = report.baselineScore - finalBest.score;

  // Print final results
  console.log("=".repeat(60));
  console.log("OPTIMIZATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`Baseline MAE: ${report.baselineScore.toFixed(3)}`);
  console.log(`Final MAE: ${report.finalBestScore.toFixed(3)}`);
  console.log(`Improvement: ${report.improvement.toFixed(3)}`);
  console.log(
    `Final Accuracy (±1): ${(report.finalBestAccuracy * 100).toFixed(1)}%`,
  );
  console.log(`Total LLM calls: ${report.totalLLMCalls}`);

  // Clear checkpoint on successful completion
  clearCheckpoint();

  return report;
}

// ============================================================================
// Output
// ============================================================================

function saveResults(report: APOReport): void {
  ensureOutputDir();

  // Save optimized prompt
  const promptPath = path.join(OUTPUT_DIR, "optimized-prompt.txt");
  fs.writeFileSync(promptPath, report.finalBestPrompt, "utf-8");
  console.log(`\nSaved optimized prompt to: ${promptPath}`);

  // Save full report
  const reportPath = path.join(OUTPUT_DIR, "apo-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Saved full report to: ${reportPath}`);
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  try {
    // Parse CLI arguments for config overrides
    const args = process.argv.slice(2);
    const config: APOConfig = { ...DEFAULT_CONFIG };
    let resume = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--resume") {
        resume = true;
        continue;
      }

      const key = arg?.replace("--", "");
      const value = args[i + 1];
      if (key && value && !value.startsWith("--")) {
        switch (key) {
          case "iterations":
            config.maxIterations = parseInt(value, 10);
            i++;
            break;
          case "candidates":
            config.candidatesPerIteration = parseInt(value, 10);
            i++;
            break;
          case "beam":
            config.beamWidth = parseInt(value, 10);
            i++;
            break;
          case "subset":
            config.evalSubsetSize = parseInt(value, 10);
            i++;
            break;
        }
      }
    }

    const report = await runAPO(config, resume);
    saveResults(report);

    console.log("\nDone!");
  } catch (error) {
    console.error("APO failed:", error);
    process.exit(1);
  }
}

main();
