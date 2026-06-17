import type { NarrativeEventType } from "../../../../engines/narrativeEngine";
import type {
  BeatReporter,
  SeasonEmissionConfig,
  SeasonNewsItem,
} from "../../../../types/reporter";
import type { GrokChatMessage } from "./grokClient";
import { callClaudeMessages } from "./claudeClient";
import { formatReporterIdentity } from "./promptBuilder";

export interface SeasonNewsEvent {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  eventType: NarrativeEventType;
  subjectIds: string[];
  facts: Record<string, unknown>;
  dramaticWeight: number;
}

function createSeasonNewsId(event: SeasonNewsEvent, timestamp: number): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${timestamp}`;

  return `season-news:${event.franchiseId}:${event.seasonId}:${event.eventType}:${timestamp}:${random}`;
}

function humanizeEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatFacts(facts: Record<string, unknown>): string {
  return JSON.stringify(facts, null, 2);
}

function buildSeasonNewsSystemPrompt(
  event: SeasonNewsEvent,
  reporter: BeatReporter,
): string {
  return [
    "REPORTER IDENTITY",
    ...formatReporterIdentity(reporter),
    "",
    "SEASON NEWS GROUND TRUTH",
    `Franchise ID: ${event.franchiseId}`,
    `Season ID: ${event.seasonId}`,
    `Season number: ${event.seasonNumber}`,
    `Event type: ${event.eventType} (${humanizeEnum(event.eventType)})`,
    `Subject IDs: ${event.subjectIds.join(", ") || "none supplied"}`,
    `Dramatic weight: ${event.dramaticWeight.toFixed(2)}`,
    "",
    "HARD RULES",
    "The deterministic Phase-2 matrix is the math. The reporter narrates only.",
    "Never invent facts, stats, causes, motives, quotes, transactions, injuries, rankings, or relationships.",
    "Use only the supplied event facts and subject IDs. If a detail is missing, stay generic.",
    "Do not decide whether the event matters; the emission gate already decided that.",
    "No markdown, no bullet lists, no headings, and no meta commentary in the final answer.",
    "",
    "TASK",
    "Write one season-long news take in this reporter's voice.",
    "Return JSON only: { \"headline\": \"<short headline>\", \"body\": \"<2-3 paragraph season news take>\" }",
  ].join("\n");
}

function buildSeasonNewsUserMessage(event: SeasonNewsEvent): string {
  return [
    "SEASON NEWS EVENT",
    `Event type: ${event.eventType}`,
    `Dramatic weight: ${event.dramaticWeight.toFixed(2)}`,
    "Facts supplied by the deterministic event source:",
    formatFacts(event.facts),
  ].join("\n");
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

function parseSeasonNewsPayload(text: string): {
  headline: string | null;
  body: string | null;
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
      };
    }
  } catch {
    // fall through to regex recovery path
  }

  const headlineMatch = text.match(
    /"headline"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );
  const bodyMatch = text.match(
    /"body"\s*:\s*"((?:\\.|[^"\\])*)"/,
  );

  return {
    headline: headlineMatch?.[1]
      ? decodeRecoveredJsonString(headlineMatch[1]).trim()
      : null,
    body: bodyMatch?.[1]
      ? decodeRecoveredJsonString(bodyMatch[1]).trim()
      : null,
  };
}

export function shouldEmitSeasonNews(
  eventType: NarrativeEventType,
  config: SeasonEmissionConfig,
): boolean {
  const rate = config.perEventRate[eventType];
  if (rate !== undefined) {
    return rate > 0;
  }

  return !config.marqueeOnly;
}

export async function generateSeasonNewsTake(
  event: SeasonNewsEvent,
  reporter: BeatReporter,
  config: SeasonEmissionConfig,
): Promise<SeasonNewsItem | null> {
  if (!shouldEmitSeasonNews(event.eventType, config)) {
    return null;
  }

  const messages: GrokChatMessage[] = [
    { role: "system", content: buildSeasonNewsSystemPrompt(event, reporter) },
    { role: "user", content: buildSeasonNewsUserMessage(event) },
  ];

  try {
    const response = await callClaudeMessages({
      model: "claude-sonnet-4-6",
      messages,
      intensity: "medium",
      purpose: "storyline_refinement",
      temperature: 0.6,
      maxTokens: 900,
      mode: "franchise",
    });

    const parsed = parseSeasonNewsPayload(response.text);
    if (!parsed.headline || !parsed.body) {
      return null;
    }

    const now = Date.now();
    return {
      id: createSeasonNewsId(event, now),
      franchiseId: event.franchiseId,
      seasonId: event.seasonId,
      seasonNumber: event.seasonNumber,
      eventType: event.eventType,
      subjectIds: event.subjectIds,
      facts: event.facts,
      headline: parsed.headline,
      body: parsed.body,
      reporterId: reporter.id,
      dramaticWeight: event.dramaticWeight,
      createdAt: now,
      changed_at: now,
    };
  } catch (error) {
    console.warn(
      "[reporter:season-news] Season news generation failed; skipping.",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
