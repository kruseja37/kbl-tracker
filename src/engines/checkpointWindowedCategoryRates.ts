/**
 * RA-9b pure recent-window category-rate aggregation.
 *
 * Source: RATINGS_ADJUSTMENT_SPEC §8 + DECISIONS_LOG 2026-06-24 point 5.
 * Builds temporary window-only batting/pitching count rows from persisted
 * AtBatEvents, then reuses toExpectedStatsCategoryRates so recent signals use
 * the exact same category-rate math as cumulative checkpoint signals.
 *
 * Conservative default: hitter fielding rates are not sourced from at-bat
 * events. We pass no fielding row, so fielding actuals remain absent and the
 * checkpoint flat sample floor drops them.
 */

import {
  extractContactQualityTag,
  tallyContactQualityByPlayer,
} from './contactQualityAggregator';
import {
  aggregateUbrFromEvents,
  type UbrRunnerAggregate,
} from './ubrAggregator';
import {
  toExpectedStatsCategoryRates,
  type CategoryRateResult,
} from './expectedStatsCategoryRates';
import type { AtBatResult } from '../types/game';
import type { AtBatEvent } from '../utils/eventLog';
import type {
  PlayerSeasonBatting,
  PlayerSeasonPitching,
} from '../utils/seasonStorage';

export interface WindowedGameAtBatEvents {
  gameNumber: number;
  events: readonly AtBatEvent[];
}

export interface CheckpointWindowedCategoryRateMaps {
  hitters: Map<string, CategoryRateResult>;
  pitchers: Map<string, CategoryRateResult>;
}

const HIT_RESULTS: ReadonlySet<AtBatResult> = new Set(['1B', '2B', '3B', 'HR', 'ITPHR', 'GRD']);
const HOME_RUN_RESULTS: ReadonlySet<AtBatResult> = new Set(['HR', 'ITPHR']);
const STRIKEOUT_RESULTS: ReadonlySet<AtBatResult> = new Set(['K', 'Kc', 'Ꝁ', 'D3K', 'WP_K', 'PB_K']);
const NON_AB_RESULTS: ReadonlySet<AtBatResult> = new Set(['BB', 'IBB', 'HBP', 'SF', 'SAC']);

export function collectCheckpointWindowAtBatEvents(
  games: readonly WindowedGameAtBatEvents[],
  prevBoundaryGameNumber: number,
  currentGameNumber: number,
): AtBatEvent[] {
  return [...games]
    .filter((game) => (
      Number.isInteger(game.gameNumber) &&
      game.gameNumber > prevBoundaryGameNumber &&
      game.gameNumber <= currentGameNumber
    ))
    .sort((a, b) => a.gameNumber - b.gameNumber)
    .flatMap((game) => [...game.events]);
}

export function aggregateCheckpointWindowedCategoryRates(
  atBatEvents: readonly AtBatEvent[],
): CheckpointWindowedCategoryRateMaps {
  const activeEvents = atBatEvents
    .filter((event) => !event.undoneAt)
    .sort((a, b) => (
      a.gameId.localeCompare(b.gameId) ||
      a.eventIndex - b.eventIndex ||
      a.timestamp - b.timestamp
    ));
  const battingByPlayerId = new Map<string, PlayerSeasonBatting>();
  const pitchingByPlayerId = new Map<string, PlayerSeasonPitching>();

  for (const event of activeEvents) {
    tallyBattingEvent(getOrCreateBattingRow(battingByPlayerId, event), event);
    tallyPitchingEvent(getOrCreatePitchingRow(pitchingByPlayerId, event), event);
  }

  const cqByBatter = tallyContactQualityByPlayer(
    activeEvents.map((event) => ({
      key: event.batterId,
      result: event.result,
      contactType: extractContactQualityTag(event.enrichment?.exitType),
    })),
  );
  const cqByPitcher = tallyContactQualityByPlayer(
    activeEvents.map((event) => ({
      key: event.pitcherId,
      result: event.result,
      contactType: extractContactQualityTag(event.enrichment?.exitType),
    })),
  );
  const ubrByRunner = aggregateUbrFromEvents(activeEvents);

  for (const [playerId, batting] of battingByPlayerId) {
    const contactQuality = cqByBatter.get(playerId);
    batting.contactQualityGood = contactQuality?.goodCount ?? 0;
    batting.contactQualityTracked = contactQuality?.trackedCount ?? 0;

    const ubr = ubrByRunner[playerId];
    batting.extraBasesTaken = extraBasesTakenFor(ubr);
    batting.advancementOpportunities = ubr?.advancementStats.advancementOpportunities ?? 0;
  }

  for (const [playerId, pitching] of pitchingByPlayerId) {
    const contactQuality = cqByPitcher.get(playerId);
    pitching.weakContactInduced = contactQuality?.weakCount ?? 0;
    pitching.weakContactTracked = contactQuality?.trackedCount ?? 0;
  }

  return {
    hitters: new Map(
      [...battingByPlayerId].map(([playerId, batting]) => [
        playerId,
        toExpectedStatsCategoryRates({ role: 'hitter', batting }),
      ]),
    ),
    pitchers: new Map(
      [...pitchingByPlayerId].map(([playerId, pitching]) => [
        playerId,
        toExpectedStatsCategoryRates({ role: 'pitcher', pitching }),
      ]),
    ),
  };
}

function getOrCreateBattingRow(
  rows: Map<string, PlayerSeasonBatting>,
  event: AtBatEvent,
): PlayerSeasonBatting {
  const existing = rows.get(event.batterId);
  if (existing) return existing;

  const created: PlayerSeasonBatting = {
    seasonId: event.seasonId ?? '',
    playerId: event.batterId,
    playerName: event.batterName ?? event.batterId,
    teamId: event.batterTeamId ?? '',
    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    contactQualityGood: 0,
    contactQualityTracked: 0,
    extraBasesTaken: 0,
    advancementOpportunities: 0,
    lastUpdated: 0,
  };
  rows.set(event.batterId, created);
  return created;
}

function getOrCreatePitchingRow(
  rows: Map<string, PlayerSeasonPitching>,
  event: AtBatEvent,
): PlayerSeasonPitching {
  const existing = rows.get(event.pitcherId);
  if (existing) return existing;

  const created: PlayerSeasonPitching = {
    seasonId: event.seasonId ?? '',
    playerId: event.pitcherId,
    playerName: event.pitcherName ?? event.pitcherId,
    teamId: event.pitcherTeamId ?? '',
    games: 0,
    gamesStarted: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    wildPitches: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    holds: 0,
    blownSaves: 0,
    qualityStarts: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    weakContactInduced: 0,
    weakContactTracked: 0,
    lastUpdated: 0,
  };
  rows.set(event.pitcherId, created);
  return created;
}

function tallyBattingEvent(row: PlayerSeasonBatting, event: AtBatEvent): void {
  const result = event.result;
  row.pa += 1;
  if (!NON_AB_RESULTS.has(result)) row.ab += 1;

  if (result === '1B') row.singles += 1;
  if (result === '2B' || result === 'GRD') row.doubles += 1;
  if (result === '3B') row.triples += 1;
  if (HOME_RUN_RESULTS.has(result)) row.homeRuns += 1;
  if (result === 'BB' || result === 'IBB') row.walks += 1;
  if (result === 'HBP') row.hitByPitch += 1;
  if (result === 'SF') row.sacFlies += 1;
  if (result === 'SAC') row.sacBunts += 1;
  if (STRIKEOUT_RESULTS.has(result)) row.strikeouts += 1;
  if (result === 'DP') row.gidp += 1;

  row.hits = row.singles + row.doubles + row.triples + row.homeRuns;
  row.rbi += finiteCount(event.rbiCount);
  row.runs += runsForPlayer(event, event.batterId);
}

function tallyPitchingEvent(row: PlayerSeasonPitching, event: AtBatEvent): void {
  const result = event.result;
  row.outsRecorded += outsRecordedForEvent(event);
  if (HIT_RESULTS.has(result)) row.hitsAllowed += 1;
  if (result === 'BB' || result === 'IBB') row.walksAllowed += 1;
  if (result === 'HBP') row.hitBatters += 1;
  if (STRIKEOUT_RESULTS.has(result)) row.strikeouts += 1;
  if (HOME_RUN_RESULTS.has(result)) row.homeRunsAllowed += 1;
}

function outsRecordedForEvent(event: AtBatEvent): number {
  const explicit = (event as AtBatEvent & { outsRecorded?: number }).outsRecorded;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return Math.max(0, explicit);
  }

  if (
    typeof event.outs === 'number' &&
    typeof event.outsAfter === 'number' &&
    Number.isFinite(event.outs) &&
    Number.isFinite(event.outsAfter)
  ) {
    if (event.outsAfter >= event.outs) return Math.max(0, event.outsAfter - event.outs);
    if (event.outsAfter === 0) return Math.max(0, 3 - event.outs);
  }

  switch (event.result) {
    case 'K':
    case 'Kc':
    case 'Ꝁ':
    case 'GO':
    case 'FO':
    case 'FLO':
    case 'LO':
    case 'PO':
    case 'SF':
    case 'SAC':
    case 'D3K':
    case 'WP_K':
    case 'PB_K':
      return 1;
    case 'DP':
      return 2;
    case 'TP':
      return 3;
    default:
      return 0;
  }
}

function runsForPlayer(event: AtBatEvent, playerId: string): number {
  if (Array.isArray(event.runsScored)) {
    return event.runsScored.filter((id) => id === playerId).length;
  }
  return 0;
}

function finiteCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function extraBasesTakenFor(agg: UbrRunnerAggregate | undefined): number {
  if (!agg) return 0;

  const stats = agg.advancementStats;
  return stats.firstToThird +
    stats.firstToHomeOnDouble +
    stats.secondToHomeOnSingle +
    stats.tagsScored;
}
