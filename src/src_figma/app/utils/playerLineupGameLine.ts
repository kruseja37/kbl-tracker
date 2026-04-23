import type { FieldingEvent } from "../../../utils/eventLog";
import type { PlayerGameStats } from "../../hooks/useGameState";

const GEM_PLAY_TYPES = new Set<FieldingEvent["specialPlayType"]>([
  "Diving",
  "Leaping",
  "Robbed HR",
]);

function formatCount(label: string, count: number): string {
  if (count === 1) {
    return label;
  }
  const pluralLabel = label === "Gem" ? "Gems" : label;
  return `${count} ${pluralLabel}`;
}

export function buildPlayerGemCounts(
  fieldingEvents: FieldingEvent[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const event of fieldingEvents) {
    if (!event.success || !event.specialPlayType || !GEM_PLAY_TYPES.has(event.specialPlayType)) {
      continue;
    }
    counts[event.playerId] = (counts[event.playerId] ?? 0) + 1;
  }

  return counts;
}

export function formatPlayerLineupGameLine(
  stats?: Partial<PlayerGameStats>,
  gemCount = 0,
): string {
  const ab = stats?.ab ?? 0;
  const hits = stats?.h ?? 0;
  const hr = stats?.hr ?? 0;
  const triples = stats?.triples ?? 0;
  const doubles = stats?.doubles ?? 0;
  const rbi = stats?.rbi ?? 0;
  const bb = stats?.bb ?? 0;
  const hbp = stats?.hbp ?? 0;
  const sb = stats?.sb ?? 0;
  const cs = stats?.cs ?? 0;
  const k = stats?.k ?? 0;
  const parts = [`${hits} for ${ab}`];

  if (hr > 0) parts.push(formatCount("HR", hr));
  if (triples > 0) parts.push(formatCount("3B", triples));
  if (doubles > 0) parts.push(formatCount("2B", doubles));
  if (rbi > 0) parts.push(formatCount("RBI", rbi));
  if (bb > 0) parts.push(formatCount("BB", bb));
  if (hbp > 0) parts.push(formatCount("HBP", hbp));
  if (sb > 0) parts.push(formatCount("SB", sb));
  if (cs > 0) parts.push(formatCount("CS", cs));
  if (gemCount > 0) parts.push(formatCount("Gem", gemCount));
  if (k > 0) parts.push(formatCount("K", k));

  return parts.join("; ");
}
