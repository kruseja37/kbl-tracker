import type { MoodLabel } from "../../../../engines/moodEngine";
import type {
  NotabilityPlayContext,
  NotabilityResult,
} from "../../../../engines/notabilityScorer";
import {
  FAME_TIER_LABEL,
  type BeatReporter,
  type EraFlavor,
  type ReporterPersonality,
  type VoiceStyle,
} from "../../../../types/reporter";
import type { ReporterContext } from "./reporterContext";

const VOICE_STYLE_GUIDES: Record<VoiceStyle, string> = {
  THE_POET: "Use calm reverence, winding metaphors, and graceful pauses. Let the game feel timeless without becoming purple or overwritten.",
  THE_REACTOR: "Stay measured until the big beat lands, then let the exclamation hit. Favor clean, sharp turns of phrase over long buildup.",
  THE_HOLY_COW: "Sound loud, earthy, and unfiltered. Lean into crowd-level excitement and broad, memorable exclamations.",
  THE_PROFESSOR: "Use rich vocabulary, historical context, and dry wit. Sound informed without becoming academic or stiff.",
  THE_HYPE_MAN: "Bring velocity and momentum. Favor emphatic wording, repetition, and a feeling that the moment is bursting open.",
  THE_STORYTELLER: "Tie the play to a larger thread. Make each line feel like a chapter in a bigger baseball story.",
  THE_GRINDER: "Use blue-collar, local-radio phrasing. Keep it practical, grounded, and conversational, like a broadcaster who has seen a thousand games.",
  THE_CALLER: "Carry classic big-band enthusiasm. Use crisp showman energy and broad, golden-age baseball warmth.",
  THE_GENTLEMAN: "Sound polished, warm, and intimate. Use inviting conversation and old-school radio courtesy.",
};

const ERA_STYLE_GUIDES: Record<EraFlavor, string> = {
  GOLDEN_AGE: "Favor 1930s-1950s radio cadence, formal-yet-colorful phrasing, and an occasional 'ladies and gentlemen' texture. Keep it vivid, not campy.",
  CLASSIC_TV: "Favor 1960s-1980s broadcast polish, dramatic pauses, and smooth booth authority. Let the line feel network-ready and big-league.",
  MODERN_LOCAL: "Favor present-day local-broadcast ease with light self-awareness. Keep it casual enough to feel current while still matching the app's vintage baseball world.",
};

const PERSONALITY_COLOR: Record<ReporterPersonality, string> = {
  OPTIMIST: "Find the encouraging angle, even in tense spots.",
  PESSIMIST: "Notice the danger signs and let caution seep into the call.",
  BALANCED: "Stay fair-minded and measured, giving both teams their due.",
  DRAMATIC: "Treat turning points like thunderclaps and let stakes ring loudly.",
  ANALYTICAL: "Frame the moment through leverage, matchup logic, and baseball detail.",
  HOMER: "Filter the game through loyal affection for the assigned club without inventing facts.",
  CONTRARIAN: "Find the less obvious angle and resist the most conventional takeaway.",
  INSIDER: "Sound connected and clubhouse-aware, as if you know the temperature around the team.",
  OLD_SCHOOL: "Value fundamentals, baseball tradition, and proper form.",
  HOT_TAKE: "Lean provocative and punchy, but stop short of parody.",
};

const MOOD_BEHAVIOR_NOTES: Record<MoodLabel, string> = {
  euphoric: "You're feeling euphoric. Let joy and momentum spill into the line.",
  optimistic: "You're feeling optimistic. Tilt toward hope and upward momentum.",
  neutral: "You're feeling neutral. Stay observant, composed, and game-focused.",
  frustrated: "You're feeling frustrated. Let tension and annoyance sharpen the edge.",
  bitter: "You're feeling bitter. Sound fed up and skeptical without losing control of the facts.",
};

function humanizeEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function resolveAssignedTeamName(reporter: BeatReporter, context: ReporterContext): string {
  if (reporter.teamId === context.battingTeam.id) return context.battingTeam.name;
  if (reporter.teamId === context.pitchingTeam.id) return context.pitchingTeam.name;
  return `Team ${reporter.teamId}`;
}

function formatAlmanacHighlights(entries: ReporterContext["teamRecentAlmanac"]): string {
  if (entries.length === 0) return "No recent almanac notes.";

  return entries
    .slice(0, 3)
    .map((entry) => `${entry.headline}: ${entry.summary}`)
    .join(" | ");
}

function formatRelationshipHighlights(context: ReporterContext): string {
  const relationships = [
    ...context.activeOpposingRelationships,
    ...context.activeWithinTeamRelationships,
  ];
  if (relationships.length === 0) return "No active relationship beats in focus.";

  return relationships
    .slice(0, 3)
    .map((relationship) => `${relationship.kind} (${relationship.intensity})${relationship.note ? `: ${relationship.note}` : ""}`)
    .join(" | ");
}

function formatBaseRunners(gameState: ReporterContext["gameState"]): string {
  const occupied = [
    gameState.bases.first ? "1st" : null,
    gameState.bases.second ? "2nd" : null,
    gameState.bases.third ? "3rd" : null,
  ].filter(Boolean);

  return occupied.length > 0 ? occupied.join(", ") : "bases empty";
}

function formatContextHighlights(context: ReporterContext): string {
  const duel = `${context.batter.name} (${FAME_TIER_LABEL[context.batter.effectiveFame]}${context.batter.archetype ? `, ${humanizeEnum(context.batter.archetype)}` : ""}) vs ${context.pitcher.name} (${FAME_TIER_LABEL[context.pitcher.effectiveFame]}${context.pitcher.archetype ? `, ${humanizeEnum(context.pitcher.archetype)}` : ""})`;
  const wpaLine = context.wpaMoment
    ? `Latest leverage: LI ${context.wpaMoment.leverageIndex.toFixed(2)}, WPA ${context.wpaMoment.wpa.toFixed(3)}.`
    : `Dramatic weight: ${context.dramaticWeight.toFixed(2)}.`;

  return [
    `Game state: ${context.gameState.halfInning} ${context.gameState.inning}, ${context.gameState.outs} outs, ${formatBaseRunners(context.gameState)}, away ${context.gameState.awayScore}, home ${context.gameState.homeScore}.`,
    `Current duel: ${duel}.`,
    `Batter legacy: ${context.batterLegacySummary || "No batter legacy summary yet."}`,
    `Pitcher legacy: ${context.pitcherLegacySummary || "No pitcher legacy summary yet."}`,
    `Batting team backstory: ${context.battingTeam.baselineBackstory || "No batting-team backstory supplied."}`,
    `Pitching team backstory: ${context.pitchingTeam.baselineBackstory || "No pitching-team backstory supplied."}`,
    `Team legacy notes: ${context.battingTeamLegacySummary || "No batting-team legacy summary."} | ${context.pitchingTeamLegacySummary || "No pitching-team legacy summary."}`,
    `Recent almanac: ${formatAlmanacHighlights(context.teamRecentAlmanac)}`,
    `Player headlines: ${formatAlmanacHighlights([...context.batterRecentAlmanac, ...context.pitcherRecentAlmanac])}`,
    `Relationships: ${formatRelationshipHighlights(context)}`,
    `Rivalry intensity: ${context.teamRivalryIntensity.toFixed(1)}. ${wpaLine}`,
  ].join("\n");
}

function formatBases(bases: NotabilityPlayContext["basesBefore"]): string {
  const occupied = [
    bases.first ? "1st" : null,
    bases.second ? "2nd" : null,
    bases.third ? "3rd" : null,
  ].filter(Boolean);

  return occupied.length > 0 ? occupied.join(", ") : "bases empty";
}

function safeJson(value: Record<string, unknown> | undefined): string {
  if (!value) return "No box score snapshot supplied.";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Box score snapshot could not be serialized.";
  }
}

export function buildCommentarySystemPrompt(
  reporter: BeatReporter,
  mood: MoodLabel,
  narrativeSoFar: string,
  context: ReporterContext,
): string {
  const assignedTeam = resolveAssignedTeamName(reporter, context);

  return [
    "1. Reporter Identity",
    `Name: ${reporter.name}`,
    `Assigned team: ${assignedTeam}`,
    `Era flavor: ${humanizeEnum(reporter.eraFlavor)}`,
    `Personality: ${humanizeEnum(reporter.personality)}`,
    `Voice style: ${humanizeEnum(reporter.voiceStyle)}`,
    `Silhouette variant: ${reporter.avatarEra}`,
    "",
    "2. Voice And Style Guide",
    VOICE_STYLE_GUIDES[reporter.voiceStyle],
    ERA_STYLE_GUIDES[reporter.eraFlavor],
    PERSONALITY_COLOR[reporter.personality],
    "Stay in character, write 1-2 sentences, avoid markdown, avoid invented stats, and sound like a live beat reporter reacting in the moment.",
    "",
    "3. Current Mood",
    `Mood label: ${mood}`,
    MOOD_BEHAVIOR_NOTES[mood],
    "",
    "4. Game Narrative So Far",
    narrativeSoFar || "No rolling narrative yet. Treat this like the game's opening beats.",
    "",
    "5. Reporter Context Highlights",
    formatContextHighlights(context),
  ].join("\n");
}

export function buildCommentaryUserMessage(
  play: NotabilityPlayContext,
  notability: NotabilityResult,
  boxScore?: Record<string, unknown>,
): string {
  return [
    "6. Current Play",
    `Half-inning: ${play.halfInning} ${play.inning}`,
    `Outs: ${play.outsBefore} before, ${play.outsAfter} after`,
    `Bases: ${formatBases(play.basesBefore)} before; ${formatBases(play.basesAfter)} after`,
    `Score: away ${play.awayScoreBefore}-${play.awayScoreAfter}, home ${play.homeScoreBefore}-${play.homeScoreAfter}`,
    `Result: ${play.result}`,
    `Runs scored: ${play.runsScored ?? 0}`,
    `Notability reason: ${notability.reason}`,
    `Notability score: ${notability.score.toFixed(3)}`,
    "Box score snapshot:",
    safeJson(boxScore),
    "Instruction: Write 1-2 sentences of live commentary grounded only in the supplied facts.",
  ].join("\n");
}
