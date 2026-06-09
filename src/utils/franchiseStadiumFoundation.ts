import {
  FIELD_ZONES,
  getDepthFromZone,
  getDirectionFromZone,
  type SprayDirection,
  type ZoneDepth,
} from '../data/fieldZones';
import { getParkByName, getStableParkId, type ParkDimensions } from '../data/parkLookup';
import { getDerivedParkFactorsIfAvailable } from '../engines/parkFactorDeriver';
import type { ParkFactors } from '../types/war';
import type { AtBatEvent, FieldingEvent } from './eventLog';
import type { CompletedGameRecord } from './gameStorage';
import type { FranchiseTeamStadiumSnapshot } from '../types/franchise';

export const FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION =
  'franchise-stadium-foundation-v1-readonly';

export type FranchiseStadiumFoundationStatus =
  | 'trusted'
  | 'preview-only'
  | 'blocked'
  | 'not-applicable';

export type FranchiseSprayChartRole = 'batting' | 'pitching' | 'fielding';

export interface FranchiseStadiumFoundationArea {
  status: FranchiseStadiumFoundationStatus;
  reasons: string[];
  limitations: string[];
}

export interface FranchiseStadiumFoundationScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

export interface FranchiseStadiumFoundationStadium {
  teamId: string | null;
  teamName: string | null;
  stadiumId: string;
  stadiumName: string;
  dimensions: ParkDimensions | null;
  seedParkFactors: ParkFactors | null;
  seedParkFactorsTrusted: boolean;
  archiveGameRows: number;
  sprayEventRows: number;
  adaptiveParkFactorPreview: FranchiseStadiumFoundationArea & {
    gamesIncluded: number;
    trustedForPersistence: false;
  };
  stadiumRecords: FranchiseStadiumFoundationArea & {
    persisted: false;
  };
}

export interface FranchiseSprayChartRow {
  role: FranchiseSprayChartRole;
  gameId: string;
  eventId: string;
  timestamp: number;
  stadiumId: string;
  stadiumName: string;
  teamId: string;
  opponentTeamId: string | null;
  playerId: string;
  playerName: string;
  batterId: string | null;
  batterName: string | null;
  pitcherId: string | null;
  pitcherName: string | null;
  fielderId: string | null;
  fielderName: string | null;
  handedness: 'L' | 'R' | 'S' | null;
  outcome: string;
  zoneId: string | null;
  zoneName: string | null;
  direction: SprayDirection | 'unknown';
  depth: ZoneDepth | 'unknown';
  source: 'at-bat-event' | 'fielding-event';
}

export interface FranchiseSprayChartSummary {
  rows: number;
  battingRows: number;
  pitchingRows: number;
  fieldingRows: number;
  stadiumIds: string[];
  teamIds: string[];
  playerIds: string[];
  outcomeCounts: Record<string, number>;
  zoneCounts: Record<string, number>;
  limitations: string[];
}

export interface FranchiseStadiumFoundationReport {
  contractVersion: typeof FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION;
  generatedAt: number;
  scope: FranchiseStadiumFoundationScope & FranchiseStadiumFoundationArea;
  stadiumIdentity: FranchiseStadiumFoundationArea & {
    stadiums: FranchiseStadiumFoundationStadium[];
  };
  sprayCharts: FranchiseStadiumFoundationArea & {
    rows: FranchiseSprayChartRow[];
    summary: FranchiseSprayChartSummary;
    trustedForBatting: boolean;
    trustedForPitching: boolean;
    trustedForFielding: boolean;
    source: 'completed-game-archive-events';
  };
  parkFactors: FranchiseStadiumFoundationArea & {
    seedFactorsTrusted: boolean;
    adaptiveFactorsPreviewOnly: true;
    adaptiveFactorsPersisted: false;
  };
  downstreamConsumers: {
    warParkAdjustment: FranchiseStadiumFoundationArea;
    randomEventGenerator: FranchiseStadiumFoundationArea;
    fanPlayerMorale: FranchiseStadiumFoundationArea;
    mode3Handoff: FranchiseStadiumFoundationArea;
  };
  limitations: string[];
}

export interface BuildFranchiseStadiumFoundationInput extends FranchiseStadiumFoundationScope {
  stadiumSnapshots?: FranchiseTeamStadiumSnapshot[];
  completedGames?: CompletedGameRecord[];
  atBatEvents?: AtBatEvent[];
  fieldingEvents?: FieldingEvent[];
}

export interface FranchiseSprayChartFilterSortOptions {
  role?: FranchiseSprayChartRole | 'all';
  teamId?: string;
  playerId?: string;
  stadiumId?: string;
  handedness?: 'L' | 'R' | 'S';
  outcome?: string;
  zoneId?: string;
  sortBy?: 'timestamp' | 'frequency' | 'player' | 'team' | 'stadium' | 'outcome' | 'zone';
  sortDirection?: 'asc' | 'desc';
}

function area(
  status: FranchiseStadiumFoundationStatus,
  reasons: string[],
  limitations: string[] = [],
): FranchiseStadiumFoundationArea {
  return { status, reasons, limitations };
}

function hasScopeIdentity(record: {
  franchiseId?: string | null;
  seasonId?: string | null;
  statsScopeId?: string | null;
}, scope: FranchiseStadiumFoundationScope): boolean {
  return (
    record.franchiseId === scope.franchiseId &&
    record.seasonId === scope.seasonId &&
    record.statsScopeId === scope.statsScopeId
  );
}

function normalizeStadiumId(stadiumName?: string | null, stadiumId?: string | null): string | null {
  const trimmedName = stadiumName?.trim() ?? '';
  const trimmedId = stadiumId?.trim() ?? '';
  if (trimmedName) {
    const stableFromName = getStableParkId(trimmedName);
    if (!trimmedId) return stableFromName;
    if (trimmedId === trimmedName || getStableParkId(trimmedId) === stableFromName) {
      return stableFromName;
    }
    return trimmedId;
  }
  if (trimmedId) return trimmedId;
  return null;
}

const PARK_FACTOR_NUMERIC_KEYS: Array<keyof Pick<
  ParkFactors,
  | 'overall'
  | 'runs'
  | 'homeRuns'
  | 'hits'
  | 'doubles'
  | 'triples'
  | 'strikeouts'
  | 'walks'
  | 'leftHandedHR'
  | 'rightHandedHR'
  | 'leftHandedAVG'
  | 'rightHandedAVG'
>> = [
  'overall',
  'runs',
  'homeRuns',
  'hits',
  'doubles',
  'triples',
  'strikeouts',
  'walks',
  'leftHandedHR',
  'rightHandedHR',
  'leftHandedAVG',
  'rightHandedAVG',
];

function numericParkFactorMatches(left: unknown, right: unknown): boolean {
  if (typeof left !== 'number' || typeof right !== 'number') return false;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) <= 0.000001;
}

function trustedArchiveSeedParkFactors(
  stadiumName: string,
  stadiumId: string,
  parkFactors?: ParkFactors | null,
): ParkFactors | null {
  if (!parkFactors || parkFactors.source !== 'SEED') return null;

  const derived = getDerivedParkFactorsIfAvailable(stadiumName);
  if (!derived) return null;

  const expectedStadiumId = getStableParkId(derived.stadiumName ?? stadiumName);
  if (stadiumId !== expectedStadiumId) return null;
  if (parkFactors.stadiumId && parkFactors.stadiumId !== expectedStadiumId) return null;
  if (parkFactors.stadiumName && parkFactors.stadiumName !== derived.stadiumName) return null;

  const allFactorsMatch = PARK_FACTOR_NUMERIC_KEYS.every((key) =>
    numericParkFactorMatches(parkFactors[key], derived[key]),
  );
  return allFactorsMatch ? parkFactors : null;
}

function zoneIdFromEvent(atBat: AtBatEvent): string | null {
  const enrichedZone = atBat.enrichment?.fieldLocation?.zone;
  if (enrichedZone) return enrichedZone;
  if (typeof atBat.ballInPlay?.zone === 'number' && atBat.ballInPlay.zone > 0) {
    return `legacy-${atBat.ballInPlay.zone}`;
  }
  return null;
}

function zoneIdFromFielding(event: FieldingEvent): string | null {
  if (typeof event.ballInPlay?.zone === 'number' && event.ballInPlay.zone > 0) {
    return `legacy-${event.ballInPlay.zone}`;
  }
  return null;
}

function zoneName(zoneId: string | null): string | null {
  if (!zoneId) return null;
  return FIELD_ZONES[zoneId]?.name ?? zoneId.replace(/^legacy-/, 'Legacy zone ');
}

function zoneDirection(zoneId: string | null, hand: 'L' | 'R' | 'S' | null): SprayDirection | 'unknown' {
  if (!zoneId || !FIELD_ZONES[zoneId]) return 'unknown';
  return getDirectionFromZone(zoneId, hand ?? 'R');
}

function zoneDepth(zoneId: string | null): ZoneDepth | 'unknown' {
  if (!zoneId || !FIELD_ZONES[zoneId]) return 'unknown';
  return getDepthFromZone(zoneId);
}

function countBy<T>(rows: T[], getKey: (row: T) => string | null | undefined): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const key = getKey(row);
    if (!key) return counts;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((a, b) => a.localeCompare(b));
}

function mergeAtBatEventsById(
  archiveGames: CompletedGameRecord[],
  eventLogRows: AtBatEvent[],
): AtBatEvent[] {
  const byId = new Map<string, AtBatEvent>();
  for (const game of archiveGames) {
    for (const event of game.atBatEvents ?? []) {
      byId.set(event.eventId, event);
    }
  }
  for (const event of eventLogRows) {
    byId.set(event.eventId, event);
  }
  return Array.from(byId.values());
}

function mergeFieldingEventsById(
  archiveGames: CompletedGameRecord[],
  eventLogRows: FieldingEvent[],
): FieldingEvent[] {
  const byId = new Map<string, FieldingEvent>();
  for (const game of archiveGames) {
    for (const event of game.fieldingEvents ?? []) {
      byId.set(event.fieldingEventId, event);
    }
  }
  for (const event of eventLogRows) {
    byId.set(event.fieldingEventId, event);
  }
  return Array.from(byId.values());
}

function buildAtBatSprayRows(
  events: AtBatEvent[],
  completedGamesById: Map<string, CompletedGameRecord>,
  scope: FranchiseStadiumFoundationScope,
): FranchiseSprayChartRow[] {
  const rows: FranchiseSprayChartRow[] = [];

  for (const event of events) {
    if (event.undoneAt) continue;
    if (!hasScopeIdentity(event, scope)) continue;
    if (!event.ballInPlay && !event.enrichment?.fieldLocation?.zone) continue;

    const game = completedGamesById.get(event.gameId);
    const stadiumName = event.parkContext?.stadiumName ?? game?.stadiumName ?? null;
    const stadiumId = normalizeStadiumId(stadiumName, event.parkContext?.stadiumId ?? game?.stadiumId);
    if (!stadiumName || !stadiumId) continue;

    const hand = event.batterContext?.handedness ?? null;
    const zoneId = zoneIdFromEvent(event);
    const shared = {
      gameId: event.gameId,
      eventId: event.eventId,
      timestamp: event.timestamp,
      stadiumId,
      stadiumName,
      batterId: event.batterId,
      batterName: event.batterName,
      pitcherId: event.pitcherId,
      pitcherName: event.pitcherName,
      fielderId: null,
      fielderName: null,
      handedness: hand,
      outcome: event.result,
      zoneId,
      zoneName: zoneName(zoneId),
      direction: zoneDirection(zoneId, hand),
      depth: zoneDepth(zoneId),
      source: 'at-bat-event' as const,
    };

    rows.push({
      ...shared,
      role: 'batting',
      teamId: event.batterTeamId,
      opponentTeamId: event.pitcherTeamId,
      playerId: event.batterId,
      playerName: event.batterName,
    });

    rows.push({
      ...shared,
      role: 'pitching',
      teamId: event.pitcherTeamId,
      opponentTeamId: event.batterTeamId,
      playerId: event.pitcherId,
      playerName: event.pitcherName,
    });
  }

  return rows;
}

function buildFieldingSprayRows(
  fieldingEvents: FieldingEvent[],
  atBatEventsById: Map<string, AtBatEvent>,
  completedGamesById: Map<string, CompletedGameRecord>,
  scope: FranchiseStadiumFoundationScope,
): FranchiseSprayChartRow[] {
  const rows: FranchiseSprayChartRow[] = [];

  for (const fielding of fieldingEvents) {
    const atBat = atBatEventsById.get(fielding.atBatEventId);
    const game = completedGamesById.get(fielding.gameId);
    if (atBat && atBat.undoneAt) continue;
    if (!atBat || !hasScopeIdentity(atBat, scope)) continue;

    const stadiumName = atBat?.parkContext?.stadiumName ?? game?.stadiumName ?? null;
    const stadiumId = normalizeStadiumId(stadiumName, atBat?.parkContext?.stadiumId ?? game?.stadiumId);
    if (!stadiumName || !stadiumId) continue;

    const hand = atBat?.batterContext?.handedness ?? null;
    const zoneId = zoneIdFromFielding(fielding);
    rows.push({
      role: 'fielding',
      gameId: fielding.gameId,
      eventId: fielding.fieldingEventId,
      timestamp: atBat?.timestamp ?? game?.date ?? 0,
      stadiumId,
      stadiumName,
      teamId: fielding.teamId,
      opponentTeamId: atBat?.batterTeamId ?? null,
      playerId: fielding.playerId,
      playerName: fielding.playerName,
      batterId: atBat?.batterId ?? null,
      batterName: atBat?.batterName ?? null,
      pitcherId: atBat?.pitcherId ?? null,
      pitcherName: atBat?.pitcherName ?? null,
      fielderId: fielding.playerId,
      fielderName: fielding.playerName,
      handedness: hand,
      outcome: fielding.playType,
      zoneId,
      zoneName: zoneName(zoneId),
      direction: zoneDirection(zoneId, hand),
      depth: zoneDepth(zoneId),
      source: 'fielding-event',
    });
  }

  return rows;
}

function buildSummary(rows: FranchiseSprayChartRow[]): FranchiseSprayChartSummary {
  const limitations = rows.length === 0
    ? ['No scoped at-bat or fielding event detail is available for spray chart projection.']
    : [
        'Spray rows are archive/event projections and do not create a separate durable spray store.',
        'Legacy numeric zones are preserved as legacy labels until full zone ids are available.',
      ];

  return {
    rows: rows.length,
    battingRows: rows.filter((row) => row.role === 'batting').length,
    pitchingRows: rows.filter((row) => row.role === 'pitching').length,
    fieldingRows: rows.filter((row) => row.role === 'fielding').length,
    stadiumIds: uniqueSorted(rows.map((row) => row.stadiumId)),
    teamIds: uniqueSorted(rows.map((row) => row.teamId)),
    playerIds: uniqueSorted(rows.map((row) => row.playerId)),
    outcomeCounts: countBy(rows, (row) => row.outcome),
    zoneCounts: countBy(rows, (row) => row.zoneId),
    limitations,
  };
}

function buildStadiums(
  snapshots: FranchiseTeamStadiumSnapshot[],
  scopedGames: CompletedGameRecord[],
  sprayRows: FranchiseSprayChartRow[],
): FranchiseStadiumFoundationStadium[] {
  const byId = new Map<string, FranchiseStadiumFoundationStadium>();

  const ensure = (
    stadiumName: string,
    stadiumId: string,
    teamId: string | null,
    teamName: string | null,
    seedParkFactors: ParkFactors | null,
  ) => {
    const existing = byId.get(stadiumId);
    if (existing) {
      if (!existing.teamId && teamId) existing.teamId = teamId;
      if (!existing.teamName && teamName) existing.teamName = teamName;
      if (!existing.seedParkFactors && seedParkFactors) existing.seedParkFactors = seedParkFactors;
      existing.seedParkFactorsTrusted = existing.seedParkFactorsTrusted || Boolean(seedParkFactors);
      return existing;
    }

    const dimensions = getParkByName(stadiumName) ?? null;
    const created: FranchiseStadiumFoundationStadium = {
      teamId,
      teamName,
      stadiumId,
      stadiumName,
      dimensions,
      seedParkFactors,
      seedParkFactorsTrusted: Boolean(seedParkFactors),
      archiveGameRows: 0,
      sprayEventRows: 0,
      adaptiveParkFactorPreview: {
        ...area('not-applicable', [
          'No scoped completed games are available for adaptive park factor preview.',
        ]),
        gamesIncluded: 0,
        trustedForPersistence: false,
      },
      stadiumRecords: {
        ...area('blocked', [
          'Stadium records are a future consumer of the stadium foundation and are not persisted in this slice.',
        ]),
        persisted: false,
      },
    };
    byId.set(stadiumId, created);
    return created;
  };

  for (const snapshot of snapshots) {
    const stadiumName = snapshot.stadium;
    const stadiumId = normalizeStadiumId(stadiumName, snapshot.stadiumId);
    if (!stadiumName || !stadiumId) continue;
    ensure(
      stadiumName,
      stadiumId,
      snapshot.teamId,
      snapshot.teamName,
      getDerivedParkFactorsIfAvailable(stadiumName) ?? null,
    );
  }

  for (const game of scopedGames) {
    const stadiumName = game.stadiumName;
    const stadiumId = normalizeStadiumId(stadiumName, game.stadiumId);
    if (!stadiumName || !stadiumId) continue;
    const stadium = ensure(
      stadiumName,
      stadiumId,
      null,
      null,
      trustedArchiveSeedParkFactors(stadiumName, stadiumId, game.parkFactors),
    );
    stadium.archiveGameRows += 1;
  }

  for (const row of sprayRows) {
    const stadium = ensure(row.stadiumName, row.stadiumId, null, null, null);
    stadium.sprayEventRows += 1;
  }

  for (const stadium of byId.values()) {
    if (stadium.archiveGameRows > 0) {
      stadium.adaptiveParkFactorPreview = {
        ...area('preview-only', [
          'Scoped completed games can support archive-derived adaptive park factor previews.',
        ], [
          'Adaptive park factors are not persisted or trusted for final value/WAR adjustment in this slice.',
        ]),
        gamesIncluded: stadium.archiveGameRows,
        trustedForPersistence: false,
      };
    }
  }

  return [...byId.values()].sort((a, b) => a.stadiumName.localeCompare(b.stadiumName));
}

export function buildFranchiseStadiumFoundationReport(
  input: BuildFranchiseStadiumFoundationInput,
): FranchiseStadiumFoundationReport {
  const scope: FranchiseStadiumFoundationScope = {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
  };
  const completedGames = input.completedGames ?? [];
  const scopedGames = completedGames.filter((game) =>
    hasScopeIdentity(game, scope) &&
    game.aggregationStatus !== 'incomplete',
  );
  const completedGamesById = new Map(scopedGames.map((game) => [game.gameId, game]));
  const atBatEvents = mergeAtBatEventsById(scopedGames, input.atBatEvents ?? []);
  const atBatEventsById = new Map(atBatEvents.map((event) => [event.eventId, event]));
  const battingPitchingRows = buildAtBatSprayRows(atBatEvents, completedGamesById, scope);
  const fieldingRows = buildFieldingSprayRows(
    mergeFieldingEventsById(scopedGames, input.fieldingEvents ?? []),
    atBatEventsById,
    completedGamesById,
    scope,
  );
  const sprayRows = [...battingPitchingRows, ...fieldingRows].sort((a, b) =>
    a.timestamp - b.timestamp || a.eventId.localeCompare(b.eventId),
  );
  const stadiums = buildStadiums(input.stadiumSnapshots ?? [], scopedGames, sprayRows);
  const seedFactorsTrusted = stadiums.some((stadium) => stadium.seedParkFactorsTrusted);
  const spraySummary = buildSummary(sprayRows);
  const stadiumIdentityStatus = stadiums.length > 0 ? 'trusted' : 'blocked';
  const sprayStatus = sprayRows.length > 0 ? 'trusted' : 'blocked';
  const seedStatus = seedFactorsTrusted ? 'trusted' : 'blocked';
  const adaptivePreview = stadiums.some((stadium) => stadium.archiveGameRows > 0);

  return {
    contractVersion: FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION,
    generatedAt: Date.now(),
    scope: {
      ...scope,
      ...area('trusted', [
        'Franchise, season, and stats scope identity are explicit inputs to this read-only stadium foundation report.',
      ]),
    },
    stadiumIdentity: {
      ...area(stadiumIdentityStatus, stadiumIdentityStatus === 'trusted'
        ? ['Stadium identity is available from Mode 1 handoff snapshots and/or scoped completed-game archives.']
        : ['No stadium identity snapshots or scoped completed-game stadium rows are available.']),
      stadiums,
    },
    sprayCharts: {
      ...area(sprayStatus, sprayStatus === 'trusted'
        ? ['Scoped event-log rows can be projected into batting, pitching, and fielding spray chart views.']
        : ['No scoped event-log rows with ball-in-play or fielding location detail are available.'],
      spraySummary.limitations),
      rows: sprayRows,
      summary: spraySummary,
      trustedForBatting: spraySummary.battingRows > 0,
      trustedForPitching: spraySummary.pitchingRows > 0,
      trustedForFielding: spraySummary.fieldingRows > 0,
      source: 'completed-game-archive-events',
    },
    parkFactors: {
      ...area(seedStatus, seedStatus === 'trusted'
        ? ['Seed/static park factors are trusted as v1 stadium inputs.']
        : ['Seed/static park factors are unavailable for the provided stadiums.'],
      adaptivePreview
        ? ['Archive-derived adaptive factors are preview-only and not persisted.']
        : ['No scoped archive sample exists yet for adaptive factor previews.']),
      seedFactorsTrusted,
      adaptiveFactorsPreviewOnly: true,
      adaptiveFactorsPersisted: false,
    },
    downstreamConsumers: {
      warParkAdjustment: area('preview-only', [
        'Stadium and seed park factor inputs can be reported as context for future park-adjusted WAR.',
      ], [
        'Final WAR/value consumers must remain blocked until park-adjusted analytics are separately validated.',
      ]),
      randomEventGenerator: area('preview-only', [
        'Stadium facts and spray trends can become evidence for future random-event prompts.',
      ], [
        'No random-event generation, event log persistence, or profile mutation is enabled by this report.',
      ]),
      fanPlayerMorale: area('preview-only', [
        'Stadium context can become evidence for future fan/player morale prompts.',
      ], [
        'No fan morale or player morale mutation is enabled by this report.',
      ]),
      mode3Handoff: area('preview-only', [
        'Stadium identity, seed factors, and spray-chart summaries can be handed off as read-only context.',
      ], [
        'Adaptive factors, stadium records, morale effects, and narrative effects remain future consumers.',
      ]),
    },
    limitations: [
      'This report is read-only and writes no stadium, spray, park-factor, narrative, or morale storage.',
      'Spray charts are projected from scoped completed-game/event evidence, not from a separate durable spray store.',
      'Seed/static park factors are trusted; adaptive park factors are preview-only and not persisted.',
    ],
  };
}

export function filterAndSortFranchiseSprayChartRows(
  rows: FranchiseSprayChartRow[],
  options: FranchiseSprayChartFilterSortOptions = {},
): FranchiseSprayChartRow[] {
  const filtered = rows.filter((row) => {
    if (options.role && options.role !== 'all' && row.role !== options.role) return false;
    if (options.teamId && row.teamId !== options.teamId) return false;
    if (options.playerId && row.playerId !== options.playerId) return false;
    if (options.stadiumId && row.stadiumId !== options.stadiumId) return false;
    if (options.handedness && row.handedness !== options.handedness) return false;
    if (options.outcome && row.outcome !== options.outcome) return false;
    if (options.zoneId && row.zoneId !== options.zoneId) return false;
    return true;
  });

  const sortBy = options.sortBy ?? 'timestamp';
  const direction = options.sortDirection === 'desc' ? -1 : 1;
  const frequencyCounts = countBy(filtered, (row) =>
    `${row.role}:${row.outcome}:${row.zoneId ?? 'unknown-zone'}`,
  );
  const valueFor = (row: FranchiseSprayChartRow): string | number => {
    if (sortBy === 'timestamp') return row.timestamp;
    if (sortBy === 'frequency') {
      return frequencyCounts[`${row.role}:${row.outcome}:${row.zoneId ?? 'unknown-zone'}`] ?? 0;
    }
    if (sortBy === 'player') return row.playerName;
    if (sortBy === 'team') return row.teamId;
    if (sortBy === 'stadium') return row.stadiumName;
    if (sortBy === 'outcome') return row.outcome;
    return row.zoneName ?? row.zoneId ?? '';
  };

  return [...filtered].sort((a, b) => {
    const left = valueFor(a);
    const right = valueFor(b);
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction || a.outcome.localeCompare(b.outcome) || a.playerName.localeCompare(b.playerName) || a.eventId.localeCompare(b.eventId);
    }
    return String(left).localeCompare(String(right)) * direction || a.eventId.localeCompare(b.eventId);
  });
}
