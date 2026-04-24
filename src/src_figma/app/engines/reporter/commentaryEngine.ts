import type { MoodState } from "../../../../engines/moodEngine";
import type {
  NotabilityPlayContext,
  NotabilityResult,
} from "../../../../engines/notabilityScorer";
import type {
  BeatReporter,
  HistoricalFactRecord,
} from "../../../../types/reporter";
import type { AtBatEvent } from "../../../../utils/eventLog";
import type { NarrativeIntensity } from "../../../../types/reporterPreferences";
import type { CompetitionType } from "../../../../utils/gameStorage";
import {
  callGrokChatCompletion,
  type GrokChatMessage,
  type GrokJsonSchemaResponseFormat,
  type ReporterProxyInvoke,
} from "./grokClient";
import {
  callClaudeMessages,
  type ClaudeProxyInvoke,
} from "./claudeClient";
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
  buildPostGameColumnSystemPrompt,
  buildPostGameColumnUserMessage,
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
  invokeImpl?: ReporterProxyInvoke;
  /**
   * Optional Claude edge-function invoker, used by generatePostGameColumn.
   * Defaults to the real supabase.functions.invoke("claude-column", ...) path
   * via claudeClient.ts. Tests pass a mock.
   */
  claudeInvokeImpl?: ClaudeProxyInvoke;
  /**
   * Claude Sonnet model id used for post-game columns. Defaults to
   * "claude-sonnet-4-6" per G4 deploy fix.
   */
  claudeModel?: string;
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

export interface PreambleInput {
  context: ReporterContext;
  mood: MoodState;
  reporter: BeatReporter;
  reporterTeam: "home";
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
  reporter: BeatReporter;
  reporterTeam: "home" | "away";
  inning: number;
  inningEvents: AtBatEvent[];
  previousNarrativeSoFar: string;
  historicalFact?: HistoricalFactRecord | null;
}

export interface BetweenInningSummaryResult {
  popupText: string | null;
  updatedNarrativeSoFar: string;
  historicalLeadIn: string | null;
  skipped: boolean;
  error?: string;
  inputTokens: number;
  outputTokens: number;
}

export interface PostGameColumnInput {
  context: ReporterContext;
  reporter: BeatReporter;
  reporterTeam: "home" | "away";
  finalScore: { home: number; away: number };
  allInningEvents: AtBatEvent[];
  narrativeSoFar: string;
}

export interface PostGameColumnResult {
  headline: string | null;
  body: string | null;
  skipped: boolean;
  error?: string;
  inputTokens: number;
  outputTokens: number;
}

export interface CommentaryEngine {
  generateCommentary(input: CommentaryInput): Promise<CommentaryResult>;
  generatePreamble(input: PreambleInput): Promise<CommentaryResult>;
  generateBetweenInningSummary(
    input: BetweenInningSummaryInput,
  ): Promise<BetweenInningSummaryResult>;
  generatePostGameColumn(
    input: PostGameColumnInput,
  ): Promise<PostGameColumnResult>;
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
  historicalLeadIn: string | null;
  parseFailed: boolean;
} {
  try {
    const parsed = JSON.parse(text) as {
      popup?: unknown;
      narrative?: unknown;
      historicalLeadIn?: unknown;
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
        historicalLeadIn:
          typeof parsed.historicalLeadIn === "string" &&
          parsed.historicalLeadIn.trim()
            ? parsed.historicalLeadIn.trim()
            : null,
        parseFailed: false,
      };
    }
  } catch {
    // fall through to regex recovery path
  }

  // Recovery path: strict JSON parse failed (commonly because the response was
  // truncated mid-generation at max_tokens). Try to extract the popup field
  // via regex so the user doesn't see raw `{"popup":"..."` text in the feed.
  // Handles escaped quotes within the popup string.
  const popupMatch = text.match(
    /"popup"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );
  const narrativeMatch = text.match(
    /"narrative"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );
  const historicalLeadInMatch = text.match(
    /"historicalLeadIn"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );

  if (popupMatch && popupMatch[1]) {
    const extractedPopup = decodeRecoveredJsonString(popupMatch[1]).trim();
    const extractedNarrative = narrativeMatch?.[1]
      ? decodeRecoveredJsonString(narrativeMatch[1]).trim()
      : null;
    const extractedHistoricalLeadIn = historicalLeadInMatch?.[1]
      ? decodeRecoveredJsonString(historicalLeadInMatch[1]).trim()
      : null;
    return {
      popupText: extractedPopup || null,
      narrativeText: extractedNarrative,
      historicalLeadIn: extractedHistoricalLeadIn || null,
      // Mark parseFailed=true IF narrative is missing — the engine uses this
      // signal to preserve the previous narrative cache rather than clobber
      // it with a truncated fragment.
      parseFailed: !extractedNarrative,
    };
  }

  return {
    popupText: text.trim() || null,
    narrativeText: null,
    historicalLeadIn: null,
    parseFailed: true,
  };
}

const BETWEEN_INNING_RESPONSE_FORMAT: GrokJsonSchemaResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "between_inning_summary",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        popup: { type: "string" },
        narrative: { type: "string" },
        historicalLeadIn: { type: "string" },
      },
      required: ["popup", "narrative", "historicalLeadIn"],
    },
  },
};

function parsePostGameColumnPayload(text: string): {
  headline: string | null;
  body: string | null;
  parseFailed: boolean;
} {
  try {
    const parsed = JSON.parse(text) as {
      headline?: unknown;
      body?: unknown;
    };

    if (
      typeof parsed.headline === "string" &&
      parsed.headline.trim() &&
      typeof parsed.body === "string" &&
      parsed.body.trim()
    ) {
      return {
        headline: parsed.headline.trim(),
        body: parsed.body.trim(),
        parseFailed: false,
      };
    }
  } catch {
    // fall through to regex recovery path
  }

  // Recovery path for truncated JSON: try to salvage the headline and body
  // fields via regex. If the body is missing/truncated, we treat it as a
  // failed column so the caller does NOT persist a partial record — a
  // headline without body is not a publishable column.
  const headlineMatch = text.match(
    /"headline"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );
  const bodyMatch = text.match(
    /"body"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );

  const extractedHeadline = headlineMatch?.[1]
    ? decodeRecoveredJsonString(headlineMatch[1]).trim()
    : null;
  const extractedBody = bodyMatch?.[1]
    ? decodeRecoveredJsonString(bodyMatch[1]).trim()
    : null;

  return {
    headline: extractedHeadline,
    body: extractedBody,
    parseFailed: !extractedHeadline || !extractedBody,
  };
}

function decodeRecoveredJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value
      .replace(/\\"/g, '"')
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  }
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

  async generatePreamble(input: PreambleInput): Promise<CommentaryResult> {
    const messages: GrokChatMessage[] = [
      {
        role: "system",
        content: buildPreambleSystemPrompt(
          input.reporter,
          input.reporterTeam,
          input.mood,
          input.context,
        ),
      },
      {
        role: "user",
        content: buildPreambleUserMessage(
          input.reporter,
          input.reporterTeam,
          input.context,
        ),
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

    const systemPrompt = [
      buildCommentarySystemPrompt(
        input.reporter,
        input.mood,
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
    const messages: GrokChatMessage[] = [
      {
        role: "system",
        content: buildBetweenInningSummarySystemPrompt(
          input.reporter,
          input.reporterTeam,
          input.mood,
          input.context,
          input.inning,
          input.previousNarrativeSoFar,
          input.inningEvents,
          input.historicalFact,
        ),
      },
      {
        role: "user",
        content: buildBetweenInningSummaryUserMessage(
          input.inning,
          input.inningEvents,
          input.previousNarrativeSoFar,
          input.historicalFact,
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
        responseFormat: BETWEEN_INNING_RESPONSE_FORMAT,
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
          historicalLeadIn: null,
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
          historicalLeadIn: parsed.historicalLeadIn,
          skipped: false,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
        };
      }

      this.gameNarrativeSoFar = parsed.narrativeText;
      return {
        popupText: parsed.popupText,
        updatedNarrativeSoFar: this.gameNarrativeSoFar,
        historicalLeadIn: parsed.historicalLeadIn,
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
        historicalLeadIn: null,
        skipped: true,
        error: message,
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  }

  buildPostGameColumnPrompt(input: PostGameColumnInput): {
    system: string;
    user: string;
  } {
    return {
      system: buildPostGameColumnSystemPrompt(
        input.reporter,
        input.reporterTeam,
        input.context,
        input.finalScore,
        input.allInningEvents,
        input.narrativeSoFar,
      ),
      user: buildPostGameColumnUserMessage(
        input.reporter,
        input.reporterTeam,
        input.context,
        input.finalScore,
        input.allInningEvents,
        input.narrativeSoFar,
      ),
    };
  }

  async generatePostGameColumn(
    input: PostGameColumnInput,
  ): Promise<PostGameColumnResult> {
    const prompt = this.buildPostGameColumnPrompt(input);
    const messages: GrokChatMessage[] = [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ];

    let response;
    try {
      response = await callClaudeMessages({
        model: this.config.claudeModel ?? "claude-sonnet-4-6",
        messages,
        intensity: this.config.intensity,
        purpose: "post_game_column",
        temperature: 0.6,
        maxTokens: 1200,
        gameId: this.config.gameId,
        mode: this.config.mode,
        invokeImpl: this.config.claudeInvokeImpl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        "[reporter:post-game] Column generation failed; skipping.",
        message,
      );
      return {
        headline: null,
        body: null,
        skipped: true,
        error: message,
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    // Fire-and-forget usage logging; a log failure must not block the column.
    try {
      await this.logUsageImpl(
        toUsageLogInput({
          config: this.config,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          purpose: "post_game_column",
        }),
      );
    } catch (logError) {
      console.warn(
        "[reporter:post-game] Failed to log post-game column LLM usage.",
        logError,
      );
    }

    if (!response.text) {
      return {
        headline: null,
        body: null,
        skipped: true,
        error: "Claude response was empty.",
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };
    }

    const parsed = parsePostGameColumnPayload(response.text);
    if (parsed.parseFailed || !parsed.headline || !parsed.body) {
      console.warn(
        "[reporter:post-game] Column JSON invalid/truncated; not persisting partial column.",
        response.text,
      );
      return {
        headline: parsed.headline,
        body: parsed.body,
        skipped: true,
        error: "Column payload invalid or truncated.",
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };
    }

    return {
      headline: parsed.headline,
      body: parsed.body,
      skipped: false,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    };
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
