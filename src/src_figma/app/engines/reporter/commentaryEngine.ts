import { resolveMood, type MoodState } from "../../../../engines/moodEngine";
import type {
  NotabilityPlayContext,
  NotabilityResult,
} from "../../../../engines/notabilityScorer";
import type { BeatReporter } from "../../../../types/reporter";
import type { NarrativeIntensity } from "../../../../types/reporterPreferences";
import type { CompetitionType } from "../../../../utils/gameStorage";
import {
  callGrokChatCompletion,
  type GrokChatMessage,
  type ReporterProxyInvoke,
} from "./grokClient";
import {
  logLlmCall,
  type LlmUsageLogInput,
} from "./usageLogger";
import type { ReporterContext } from "./reporterContext";
import {
  buildCommentarySystemPrompt,
  buildCommentaryUserMessage,
  buildBetweenInningSummarySystemPrompt,
  buildBetweenInningSummaryUserMessage,
  type HalfInningEventSummary,
  buildPreambleSystemPrompt,
  buildPreambleUserMessage,
} from "./promptBuilder";

const DEFAULT_TEMPERATURE = 0.7;

export interface CommentaryEngineConfig {
  model: string;
  intensity: NarrativeIntensity;
  temperature?: number;
  gameId?: string;
  mode?: CompetitionType;
  reporter?: BeatReporter;
  invokeImpl?: ReporterProxyInvoke;
  logUsage?: typeof logLlmCall;
}

export interface CommentaryInput {
  play: NotabilityPlayContext;
  notability: NotabilityResult;
  reporter: BeatReporter;
  mood: MoodState;
  context: ReporterContext;
  boxScore?: Record<string, unknown>;
}

export interface CommentaryResult {
  text: string | null;
  error?: string;
  skipped: boolean;
  inputTokens: number;
  outputTokens: number;
}

export interface BetweenInningSummaryInput {
  context: ReporterContext;
  mood: MoodState;
  halfInningJustEnded: { inning: number; halfInning: "TOP" | "BOTTOM" };
  halfInningEvents: HalfInningEventSummary[];
  previousNarrativeSoFar: string;
}

export interface BetweenInningSummaryResult {
  popupText: string | null;
  updatedNarrativeSoFar: string;
  skipped: boolean;
  error?: string;
  inputTokens: number;
  outputTokens: number;
}

export interface CommentaryEngine {
  generateCommentary(input: CommentaryInput): Promise<CommentaryResult>;
  generatePreamble(
    reporterContext: ReporterContext,
    mood: MoodState,
  ): Promise<CommentaryResult>;
  generateBetweenInningSummary(
    input: BetweenInningSummaryInput,
  ): Promise<BetweenInningSummaryResult>;
  getNarrativeSoFar(): string;
  resetNarrative(): void;
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function condenseForNarrative(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = splitSentences(cleaned);

  if (sentences.length === 0) return cleaned;
  return sentences.slice(0, 2).join(" ").trim();
}

function mergeNarrative(existing: string, commentary: string): string {
  const combined = [existing.trim(), condenseForNarrative(commentary)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const sentences = splitSentences(combined);

  if (sentences.length === 0) return combined;
  return sentences.slice(-3).join(" ").trim();
}

function toUsageLogInput(params: {
  config: CommentaryEngineConfig;
  inputTokens: number;
  outputTokens: number;
  purpose?: LlmUsageLogInput["purpose"];
}): LlmUsageLogInput {
  return {
    model: params.config.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    gameId: params.config.gameId,
    mode: params.config.mode,
    intensity: params.config.intensity,
    purpose: params.purpose ?? "commentary",
  };
}

function parseBetweenInningSummaryPayload(text: string): {
  popupText: string | null;
  narrativeText: string | null;
  parseFailed: boolean;
} {
  try {
    const parsed = JSON.parse(text) as {
      popup?: unknown;
      narrative?: unknown;
    };

    if (
      typeof parsed.popup === "string" &&
      parsed.popup.trim() &&
      typeof parsed.narrative === "string" &&
      parsed.narrative.trim()
    ) {
      return {
        popupText: parsed.popup.trim(),
        narrativeText: parsed.narrative.trim(),
        parseFailed: false,
      };
    }
  } catch {
    // handled below
  }

  return {
    popupText: text.trim() || null,
    narrativeText: null,
    parseFailed: true,
  };
}

export class GrokCommentaryEngine implements CommentaryEngine {
  private readonly config: CommentaryEngineConfig;

  private readonly logUsageImpl: typeof logLlmCall;

  private gameNarrativeSoFar = "";

  constructor(config: CommentaryEngineConfig) {
    this.config = {
      ...config,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    };
    this.logUsageImpl = config.logUsage ?? logLlmCall;
  }

  getNarrativeSoFar(): string {
    return this.gameNarrativeSoFar;
  }

  resetNarrative(): void {
    this.gameNarrativeSoFar = "";
  }

  async generatePreamble(
    reporterContext: ReporterContext,
    mood: MoodState,
  ): Promise<CommentaryResult> {
    const moodLabel = resolveMood(mood);
    const messages: GrokChatMessage[] = [
      {
        role: "system",
        content: buildPreambleSystemPrompt(
          this.config.reporter,
          moodLabel,
          reporterContext,
        ),
      },
      {
        role: "user",
        content: buildPreambleUserMessage(reporterContext),
      },
    ];

    return this.executeChatCompletion(messages, {
      failureLogPrefix:
        "[reporter:commentary] Game preamble generation failed; skipping preamble.",
    });
  }

  async generateCommentary(input: CommentaryInput): Promise<CommentaryResult> {
    if (!input.notability.shouldComment) {
      return {
        text: null,
        skipped: true,
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    const moodLabel = resolveMood(input.mood);
    const systemPrompt = [
      buildCommentarySystemPrompt(
        input.reporter,
        moodLabel,
        this.gameNarrativeSoFar,
        input.context,
      ),
      `Notability cue: This play triggered commentary because the scorer flagged ${input.notability.reason}.`,
    ].join("\n\n");
    const userPrompt = buildCommentaryUserMessage(
      input.play,
      input.notability,
      input.boxScore,
    );
    const messages: GrokChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const result = await this.executeChatCompletion(messages, {
      failureLogPrefix:
        "[reporter:commentary] Commentary generation failed; skipping play.",
    });

    if (!result.skipped && result.text) {
      this.gameNarrativeSoFar = mergeNarrative(
        this.gameNarrativeSoFar,
        result.text,
      );
    }

    return result;
  }

  async generateBetweenInningSummary(
    input: BetweenInningSummaryInput,
  ): Promise<BetweenInningSummaryResult> {
    const previousNarrative = this.gameNarrativeSoFar;
    const moodLabel = resolveMood(input.mood);
    const messages: GrokChatMessage[] = [
      {
        role: "system",
        content: buildBetweenInningSummarySystemPrompt(
          this.config.reporter,
          moodLabel,
          input.context,
          input.previousNarrativeSoFar,
        ),
      },
      {
        role: "user",
        content: buildBetweenInningSummaryUserMessage(
          input.halfInningJustEnded,
          input.halfInningEvents,
          input.previousNarrativeSoFar,
        ),
      },
    ];

    try {
      const response = await callGrokChatCompletion({
        model: this.config.model,
        messages,
        intensity: this.config.intensity,
        purpose: "between_inning_summary",
        temperature: 0.6,
        gameId: this.config.gameId,
        mode: this.config.mode,
        invokeImpl: this.config.invokeImpl,
      });

      try {
        await this.logUsageImpl(
          toUsageLogInput({
            config: this.config,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            purpose: "between_inning_summary",
          }),
        );
      } catch (error) {
        console.warn(
          "[reporter:commentary] Failed to log between-inning summary LLM usage.",
          error,
        );
      }

      if (!response.text) {
        this.gameNarrativeSoFar = previousNarrative;
        return {
          popupText: null,
          updatedNarrativeSoFar: this.gameNarrativeSoFar,
          skipped: true,
          error: "Grok response was empty.",
          inputTokens: 0,
          outputTokens: 0,
        };
      }

      const parsed = parseBetweenInningSummaryPayload(response.text);
      if (parsed.parseFailed || !parsed.narrativeText) {
        console.warn(
          "[reporter:commentary] Between-inning summary did not return valid JSON; using raw popup text and preserving narrative.",
          response.text,
        );
        this.gameNarrativeSoFar = previousNarrative;
        return {
          popupText: parsed.popupText,
          updatedNarrativeSoFar: this.gameNarrativeSoFar,
          skipped: false,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
        };
      }

      this.gameNarrativeSoFar = parsed.narrativeText;
      return {
        popupText: parsed.popupText,
        updatedNarrativeSoFar: this.gameNarrativeSoFar,
        skipped: false,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        "[reporter:commentary] Between-inning summary generation failed; skipping summary.",
        message,
      );
      this.gameNarrativeSoFar = previousNarrative;

      return {
        popupText: null,
        updatedNarrativeSoFar: this.gameNarrativeSoFar,
        skipped: true,
        error: message,
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  }

  private async executeChatCompletion(
    messages: GrokChatMessage[],
    options: { failureLogPrefix: string },
  ): Promise<CommentaryResult> {
    try {
      const response = await callGrokChatCompletion({
        model: this.config.model,
        messages,
        intensity: this.config.intensity,
        purpose: "commentary",
        temperature: this.config.temperature,
        gameId: this.config.gameId,
        mode: this.config.mode,
        invokeImpl: this.config.invokeImpl,
      });

      try {
        await this.logUsageImpl(
          toUsageLogInput({
            config: this.config,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
          }),
        );
      } catch (error) {
        console.warn(
          "[reporter:commentary] Failed to log commentary LLM usage.",
          error,
        );
      }

      return {
        text: response.text,
        skipped: false,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(options.failureLogPrefix, message);

      return {
        text: null,
        error: message,
        skipped: true,
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  }
}
