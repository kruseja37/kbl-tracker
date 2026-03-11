import type { AtBatEvent } from "../../../utils/eventLog";
import type { MilestoneWatch } from "../../../utils/milestoneDetector";

const HIT_RESULTS = new Set(['1B', '2B', '3B', 'HR']);
const NON_AB_RESULTS = new Set(['BB', 'IBB', 'HBP', 'SF', 'SAC']);

const STAT_LABELS: Record<string, string> = {
  homeRuns: 'HR',
  hits: 'hits',
  rbi: 'RBI',
  runs: 'runs',
  stolenBases: 'SB',
  doubles: '2B',
  triples: '3B',
  walks: 'BB',
  games: 'games',
  strikeouts: 'K',
  wins: 'wins',
  saves: 'saves',
  shutouts: 'shutouts',
  completeGames: 'CG',
  noHitters: 'no-hitters',
  perfectGames: 'perfect games',
  battingAvg: 'AVG',
  era: 'ERA',
};

function formatRateValue(value: number): string {
  return value.toFixed(3).replace(/^0/, '');
}

function formatThreshold(value: number): string {
  if (value > 0 && value < 1) {
    return formatRateValue(value);
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(1);
}

function formatNeeded(value: number): string {
  if (value > 0 && value < 1) {
    return formatRateValue(value);
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(1);
}

export function buildFenwayMatchupSummary(
  events: AtBatEvent[],
  batterId?: string,
  pitcherId?: string,
): { matchupRecord?: string; matchupAvg?: string } {
  if (!batterId || !pitcherId) {
    return {};
  }

  let ab = 0;
  let hits = 0;
  let encounters = 0;

  for (const event of events) {
    if (event.batterId !== batterId || event.pitcherId !== pitcherId || event.undoneAt) {
      continue;
    }
    encounters += 1;

    if (!NON_AB_RESULTS.has(event.result)) {
      ab += 1;
    }
    if (HIT_RESULTS.has(event.result)) {
      hits += 1;
    }
  }

  if (encounters === 0) {
    return {};
  }

  return {
    matchupRecord: `${hits}-${ab}`,
    matchupAvg: ab > 0 ? (hits / ab).toFixed(3).replace(/^0/, '') : undefined,
  };
}

export function pickFenwayMilestoneWatch(
  watches: MilestoneWatch[],
  preferredPlayerId?: string,
): MilestoneWatch | null {
  return pickFenwayMilestoneWatches(watches, preferredPlayerId, 1)[0] || null;
}

export function pickFenwayMilestoneWatches(
  watches: MilestoneWatch[],
  preferredPlayerId?: string,
  limit = 2,
): MilestoneWatch[] {
  if (watches.length === 0) {
    return [];
  }

  const countingWatches = watches.filter((watch) =>
    Number.isInteger(watch.threshold) && Number.isInteger(watch.neededForMilestone)
  );
  const candidates = countingWatches.length > 0 ? countingWatches : watches;

  return [...candidates].sort((a, b) => {
    if (a.neededForMilestone !== b.neededForMilestone) {
      return a.neededForMilestone - b.neededForMilestone;
    }
    if (preferredPlayerId) {
      if (a.playerId === preferredPlayerId && b.playerId !== preferredPlayerId) return -1;
      if (b.playerId === preferredPlayerId && a.playerId !== preferredPlayerId) return 1;
    }
    return a.threshold - b.threshold;
  }).slice(0, limit);
}

export function formatFenwayMilestoneAlert(
  watch: MilestoneWatch,
  includePlayerName = false,
): string {
  const label = STAT_LABELS[watch.statName] || watch.statName;
  const prefix = includePlayerName ? `${watch.playerName}: ` : '';
  return `${prefix}${formatNeeded(watch.neededForMilestone)} from ${formatThreshold(watch.threshold)} ${label}`;
}
