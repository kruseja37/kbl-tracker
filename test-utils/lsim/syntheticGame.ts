import type { KblWpaPlayerTotal } from '../../src/utils/kblWpaAttribution';
import type { PersistedGameState } from '../../src/utils/gameStorage';
import type { Player } from '../../src/utils/leagueBuilderStorage';
import { getAllFranchisePlayers } from '../../src/utils/franchisePlayerStorage';
import { loadFranchiseConditionSnapshots } from '../../src/utils/mojoFitnessStorage';
import {
  applyCombinedMultiplier,
  type FitnessState,
} from '../../src/engines/fitnessEngine';
import {
  getMojoStatMultiplier,
  type MojoLevel,
} from '../../src/engines/mojoEngine';
import {
  lsimArchiveOptionsFor,
  type LsimArchiveOptions,
  type LsimSandboxContext,
  type LsimTeamSeed,
} from './sandbox';

export interface LsimSyntheticCompletedGame {
  gameState: PersistedGameState;
  archiveOptions: LsimArchiveOptions;
  finalScore: { away: number; home: number };
  performanceReads?: LsimPlayerPerformanceRead[];
}

export interface LsimSyntheticGameOptions {
  gameNumber?: number;
  seed?: string;
  performanceReads?: LsimPlayerPerformanceRead[];
}

export type LsimRatingKey =
  | 'power'
  | 'contact'
  | 'speed'
  | 'fielding'
  | 'arm'
  | 'velocity'
  | 'junk'
  | 'accuracy';

export interface LsimRegimePhase {
  id: string;
  startGameNumber: number;
  endGameNumber: number;
  playerIds?: string[];
  teamIds?: string[];
  hitTendencyMultiplier: number;
  powerTendencyMultiplier: number;
  seededJitter?: number;
}

export interface LsimPerformanceRegime {
  id: string;
  phases: LsimRegimePhase[];
}

export interface LsimSampledBattingWindow {
  plateAppearances: number;
  hits: number;
  extraBaseHits: number;
  homeRuns: number;
  weightedOutput: number;
}

export interface LsimPlayerPerformanceRead {
  playerId: string;
  teamId: string;
  gameNumber: number;
  storedRatings: Record<LsimRatingKey, number>;
  effectiveRatings: Record<LsimRatingKey, number>;
  mojoLevel: MojoLevel;
  fitnessState: FitnessState;
  regimeId: string;
  regimePhaseId: string;
  hitTendency: number;
  powerTendency: number;
  sampledWindow: LsimSampledBattingWindow;
}

const GAME_STARTED_AT = Date.UTC(2026, 5, 19, 19, 5, 0);
const POSITION_ORDER = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'] as const;
const STRUGGLING_TEAM_IDS = new Set(['lsim-team-02', 'lsim-team-05']);
const CORE_DECLINE_ROSTER_INDEXES = new Set([0, 1, 4, 7, 13, 16]);

function fullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function seedHash(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function seededUnit(seed: string): number {
  return seedHash(seed) / 0x100000000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function legacyMojoLevel(player: Player): MojoLevel {
  if (player.mojo === 'On Fire') return 2;
  if (player.mojo === 'Hot') return 1;
  if (player.mojo === 'Cold') return -1;
  if (player.mojo === 'Ice Cold') return -2;
  return 0;
}

function playerTeamId(player: Player, leagueId: string): string {
  return player.leagueAssignments?.find((assignment) => assignment.leagueId === leagueId)?.teamId ?? '';
}

function matchingRegimePhase(
  regime: LsimPerformanceRegime,
  player: Player,
  teamId: string,
  gameNumber: number,
): LsimRegimePhase | undefined {
  return regime.phases.find((phase) =>
    gameNumber >= phase.startGameNumber &&
    gameNumber <= phase.endGameNumber &&
    (!phase.playerIds || phase.playerIds.includes(player.id)) &&
    (!phase.teamIds || phase.teamIds.includes(teamId)),
  );
}

function tendencyMultipliers(
  regime: LsimPerformanceRegime,
  phase: LsimRegimePhase | undefined,
  playerId: string,
  gameNumber: number,
  seed: string,
): { hit: number; power: number; phaseId: string } {
  if (!phase) return { hit: 1, power: 1, phaseId: 'neutral' };
  const jitter = Math.max(0, phase.seededJitter ?? 0);
  const signedJitter = jitter === 0
    ? 0
    : ((seededUnit(`${seed}:${regime.id}:${phase.id}:${playerId}:${gameNumber}:jitter`) * 2) - 1) * jitter;
  return {
    hit: Math.max(0, phase.hitTendencyMultiplier * (1 + signedJitter)),
    power: Math.max(0, phase.powerTendencyMultiplier * (1 + signedJitter)),
    phaseId: phase.id,
  };
}

export function sampleLsimBattingWindow(input: {
  seed: string;
  playerId: string;
  hitTendency: number;
  powerTendency: number;
  plateAppearances?: number;
}): LsimSampledBattingWindow {
  const plateAppearances = input.plateAppearances ?? 20_000;
  let hits = 0;
  let extraBaseHits = 0;
  let homeRuns = 0;
  for (let pa = 0; pa < plateAppearances; pa += 1) {
    const hit = seededUnit(`${input.seed}:${input.playerId}:sample:${pa}:hit`) < input.hitTendency;
    if (!hit) continue;
    hits += 1;
    const powerRoll = seededUnit(`${input.seed}:${input.playerId}:sample:${pa}:power`);
    if (powerRoll < input.powerTendency) {
      extraBaseHits += 1;
      if (powerRoll < input.powerTendency * 0.42) homeRuns += 1;
    }
  }
  return {
    plateAppearances,
    hits,
    extraBaseHits,
    homeRuns,
    weightedOutput: hits + (2 * extraBaseHits) + (3 * homeRuns),
  };
}

export function buildLsimPlayerPerformanceRead(input: {
  player: Player;
  teamId: string;
  gameNumber: number;
  seed: string;
  regime: LsimPerformanceRegime;
  mojoLevel?: MojoLevel;
  fitnessState?: FitnessState;
}): LsimPlayerPerformanceRead {
  const mojoLevel = input.mojoLevel ?? legacyMojoLevel(input.player);
  const fitnessState = input.fitnessState ?? 'FIT';
  const storedRatings: Record<LsimRatingKey, number> = {
    power: input.player.power,
    contact: input.player.contact,
    speed: input.player.speed,
    fielding: input.player.fielding,
    arm: input.player.arm,
    velocity: input.player.velocity,
    junk: input.player.junk,
    accuracy: input.player.accuracy,
  };
  const mojoMultiplier = getMojoStatMultiplier(mojoLevel);
  const effectiveRatings = Object.fromEntries(
    Object.entries(storedRatings).map(([key, value]) => [
      key,
      applyCombinedMultiplier(value, mojoMultiplier, fitnessState),
    ]),
  ) as Record<LsimRatingKey, number>;
  const phase = matchingRegimePhase(input.regime, input.player, input.teamId, input.gameNumber);
  const multipliers = tendencyMultipliers(
    input.regime,
    phase,
    input.player.id,
    input.gameNumber,
    input.seed,
  );
  const hitTendency = clamp((0.08 + (effectiveRatings.contact / 250)) * multipliers.hit, 0.02, 0.72);
  const powerTendency = clamp((0.03 + (effectiveRatings.power / 360)) * multipliers.power, 0.005, 0.55);
  return {
    playerId: input.player.id,
    teamId: input.teamId,
    gameNumber: input.gameNumber,
    storedRatings,
    effectiveRatings,
    mojoLevel,
    fitnessState,
    regimeId: input.regime.id,
    regimePhaseId: multipliers.phaseId,
    hitTendency,
    powerTendency,
    sampledWindow: sampleLsimBattingWindow({
      seed: input.seed,
      playerId: input.player.id,
      hitTendency,
      powerTendency,
      plateAppearances: phase ? 20_000 : 0,
    }),
  };
}

function rosterIndexFor(player: Player): number {
  const match = player.id.match(/-mlb-(\d{2})-/);
  return match ? Number(match[1]) - 1 : 99;
}

function declineWindow(gameNumber: number): number {
  if (gameNumber <= 6) return 0.35;
  if (gameNumber <= 38) return 1;
  if (gameNumber <= 50) return 0.65;
  return 0.3;
}

function declineIntensityFor(player: Player, teamId: string, gameNumber: number, hash: number): number {
  const rosterIndex = rosterIndexFor(player);
  const teamDecline = STRUGGLING_TEAM_IDS.has(teamId) ? declineWindow(gameNumber) : 0;
  const personalColdRoll = seedHash(`${player.id}:cold:${gameNumber}:${hash}`) % 100;
  const personalCold = personalColdRoll < 11 ? 0.42 : personalColdRoll < 24 ? 0.24 : 0;
  const coreMultiplier = CORE_DECLINE_ROSTER_INDEXES.has(rosterIndex) ? 0.9 : 0.45;
  return Math.min(1, (teamDecline * coreMultiplier) + personalCold);
}

function teamDeclineIntensity(teamId: string, gameNumber: number): number {
  return STRUGGLING_TEAM_IDS.has(teamId) ? declineWindow(gameNumber) : 0;
}

function lineupFor(seed: LsimTeamSeed): PersistedGameState['awayLineup'] {
  return POSITION_ORDER.map((position) => {
    const player = seed.positionPlayers.find((candidate) => candidate.primaryPosition === position)
      ?? seed.positionPlayers[0];
    return {
      playerId: player.id,
      playerName: fullName(player),
      position,
    };
  });
}

function lineupStateFor(seed: LsimTeamSeed, lineup: NonNullable<PersistedGameState['awayLineup']>): NonNullable<PersistedGameState['awayLineupState']> {
  const starter = seed.pitchers.find((player) => player.primaryPosition === 'SP') ?? seed.pitchers[0];
  const lineupEntries = lineup.map((entry, index) => ({
    ...entry,
    battingOrder: index + 1,
    enteredInning: 1,
    isStarter: true,
  }));

  return {
    lineup: lineupEntries,
    bench: seed.positionPlayers
      .filter((player) => !lineup.some((entry) => entry.playerId === player.id))
      .map((player) => ({
        playerId: player.id,
        playerName: fullName(player),
        positions: [player.primaryPosition, player.secondaryPosition].filter(Boolean) as string[],
        isAvailable: true,
      })),
    usedPlayers: lineupEntries.map((entry) => entry.playerId),
    currentPitcher: {
      playerId: starter.id,
      playerName: fullName(starter),
      position: starter.primaryPosition,
      battingOrder: 10,
      enteredInning: 1,
      isStarter: true,
    },
  };
}

function battingStatsFor(
  player: Player,
  teamId: string,
  index: number,
  role: 'home' | 'away',
  starPlayerId: string,
  gameNumber: number,
  hash: number,
  performanceRead?: LsimPlayerPerformanceRead,
): PersistedGameState['playerStats'][string] {
  if (performanceRead) {
    const pa = player.id === starPlayerId ? 5 : 4;
    let singles = 0;
    let doubles = 0;
    let triples = 0;
    let hr = 0;
    let walks = 0;
    let strikeouts = 0;
    for (let appearance = 0; appearance < pa; appearance += 1) {
      const scope = `${hash}:${gameNumber}:${player.id}:${appearance}`;
      const walk = seededUnit(`${scope}:walk`) < 0.07;
      if (walk) {
        walks += 1;
        continue;
      }
      const hit = seededUnit(`${scope}:hit`) < performanceRead.hitTendency;
      if (!hit) {
        if (seededUnit(`${scope}:out`) > performanceRead.hitTendency * 0.9) strikeouts += 1;
        continue;
      }
      const powerRoll = seededUnit(`${scope}:power`);
      if (powerRoll < performanceRead.powerTendency * 0.42) hr += 1;
      else if (powerRoll < performanceRead.powerTendency * 0.86) doubles += 1;
      else if (powerRoll < performanceRead.powerTendency) triples += 1;
      else singles += 1;
    }
    const hits = singles + doubles + triples + hr;
    const runsCreated = doubles + (2 * triples) + (3 * hr);
    return {
      playerName: fullName(player),
      teamId,
      pa,
      ab: pa - walks,
      h: hits,
      singles,
      doubles,
      triples,
      hr,
      rbi: Math.min(7, hits + runsCreated),
      r: Math.min(5, hits + hr),
      bb: walks,
      hbp: 0,
      k: strikeouts,
      sb: performanceRead.effectiveRatings.speed >= 75 && hits > 0 ? 1 : 0,
      cs: 0,
      sf: 0,
      sh: 0,
      gidp: 0,
      putouts: Math.max(1, Math.round(performanceRead.effectiveRatings.fielding / 15)),
      assists: Math.max(0, Math.round(performanceRead.effectiveRatings.arm / 30)),
      fieldingErrors: seededUnit(`${hash}:${gameNumber}:${player.id}:error`) >
        clamp(0.9 + (performanceRead.effectiveRatings.fielding / 1000), 0.9, 0.995) ? 1 : 0,
      grandSlams: 0,
      d3kOutcomes: 0,
      divingCatches: performanceRead.effectiveRatings.fielding >= 85 ? 1 : 0,
      robberies: 0,
      nutshots: 0,
    };
  }
  const isStar = player.id === starPlayerId;
  const isHome = role === 'home';
  const decline = declineIntensityFor(player, teamId, gameNumber, hash);
  const hardCold = decline >= 0.72;
  const mildCold = decline >= 0.35;
  const singles = hardCold ? (index % 7 === 0 ? 1 : 0) : isStar ? 1 : 1;
  const doubles = hardCold ? 0 : mildCold ? (index % 5 === 0 ? 1 : 0) : isStar ? 1 : index % 2;
  const triples = hardCold || mildCold ? 0 : index === 2 && !isStar ? 1 : 0;
  const hr = hardCold ? 0 : mildCold ? (index === 4 && isHome && gameNumber % 5 === 0 ? 1 : 0) : isStar ? 2 : index === 4 && isHome ? 1 : 0;
  const hits = singles + doubles + triples + hr;
  const walks = hardCold ? 0 : isStar ? 0 : 1;
  const sacFlies = index === 5 ? 1 : 0;
  const pa = hardCold ? 4 : isStar ? 5 : 4;
  const strikeouts = hardCold ? 2 + ((hash + index + gameNumber) % 2) : mildCold ? 2 : isStar ? 0 : 1 + (index % 2);
  const fieldingErrors = hardCold && index % 4 === 0 ? 1 : mildCold && index % 6 === 0 ? 1 : 0;

  return {
    playerName: fullName(player),
    teamId,
    pa,
    ab: Math.max(hits, pa - walks - sacFlies),
    h: hits,
    singles,
    doubles,
    triples,
    hr,
    rbi: hardCold ? 0 : isStar ? 6 : isHome ? 1 + (index % 3) : index % 2,
    r: hardCold ? 0 : isStar ? 3 : isHome ? 1 + (index % 2) : index % 2,
    bb: walks,
    hbp: 0,
    k: strikeouts,
    sb: hardCold ? 0 : isStar ? 1 : index % 3 === 0 ? 1 : 0,
    cs: hardCold && index % 5 === 0 ? 1 : 0,
    sf: sacFlies,
    sh: 0,
    gidp: hardCold && index % 3 === 0 ? 1 : 0,
    putouts: Math.max(1, hardCold ? 2 + (index % 3) : isStar ? 9 : 4 + index),
    assists: hardCold ? index % 2 : isStar ? 2 : index % 5,
    fieldingErrors,
    grandSlams: hardCold ? 0 : isStar ? 1 : 0,
    d3kOutcomes: 0,
    divingCatches: hardCold ? 0 : isStar ? 2 : index % 2,
    robberies: hardCold ? 0 : isStar ? 1 : 0,
    nutshots: 0,
  };
}

function pitcherStatsFor(
  seed: LsimTeamSeed,
  role: 'home' | 'away',
  gameNumber: number,
): PersistedGameState['pitcherGameStats'] {
  const starter = seed.pitchers.find((player) => player.primaryPosition === 'SP') ?? seed.pitchers[0];
  const reliever = seed.pitchers.find((player) => player.primaryPosition === 'RP') ?? seed.pitchers[1] ?? starter;
  const stress = teamDeclineIntensity(seed.team.id, gameNumber);
  const winning = role === 'home' && stress < 0.7;
  const starterRuns = winning ? 1 + Math.floor(stress * 3) : 8 + Math.floor(stress * 3);
  const relieverRuns = winning ? Math.floor(stress * 2) : 4 + Math.floor(stress * 2);

  return [
    {
      pitcherId: starter.id,
      pitcherName: fullName(starter),
      teamId: seed.team.id,
      isStarter: true,
      entryInning: 1,
      outsRecorded: 18,
      hitsAllowed: winning ? 4 + Math.floor(stress * 3) : 10 + Math.floor(stress * 4),
      runsAllowed: starterRuns,
      earnedRuns: starterRuns,
      walksAllowed: winning ? 1 + Math.floor(stress * 2) : 4 + Math.floor(stress * 3),
      strikeoutsThrown: Math.max(1, winning ? 9 - Math.floor(stress * 3) : 3 - Math.floor(stress * 2)),
      homeRunsAllowed: winning ? Math.floor(stress * 2) : 3 + Math.floor(stress * 2),
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: winning ? 83 : 96,
      battersFaced: winning ? 22 : 31,
      consecutiveHRsAllowed: winning ? 0 : 2 + Math.floor(stress),
      firstInningRuns: winning ? Math.floor(stress) : 2 + Math.floor(stress),
      basesLoadedWalks: 0,
      inningsComplete: 6,
      decision: winning ? 'W' : 'L',
      save: false,
      hold: false,
      blownSave: false,
      comebackerInjuries: 0,
    },
    {
      pitcherId: reliever.id,
      pitcherName: fullName(reliever),
      teamId: seed.team.id,
      isStarter: false,
      entryInning: 7,
      outsRecorded: 9,
      hitsAllowed: winning ? 1 + Math.floor(stress * 2) : 4 + Math.floor(stress * 3),
      runsAllowed: relieverRuns,
      earnedRuns: relieverRuns,
      walksAllowed: winning ? Math.floor(stress * 2) : 2 + Math.floor(stress * 2),
      strikeoutsThrown: Math.max(1, winning ? 4 - Math.floor(stress * 2) : 2 - Math.floor(stress)),
      homeRunsAllowed: winning ? Math.floor(stress) : 1 + Math.floor(stress),
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: winning ? 0 : 1,
      pitchCount: winning ? 34 : 47,
      battersFaced: winning ? 10 : 16,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 3,
      decision: 'ND',
      save: winning,
      hold: false,
      blownSave: false,
      comebackerInjuries: 0,
    },
  ];
}

function roundWpa(value: number): number {
  return Number(value.toFixed(3));
}

function upsertWpa(rows: Map<string, KblWpaPlayerTotal>, row: KblWpaPlayerTotal): void {
  const existing = rows.get(row.playerId);
  if (!existing) {
    rows.set(row.playerId, row);
    return;
  }

  rows.set(row.playerId, {
    ...existing,
    totalWpa: roundWpa(existing.totalWpa + row.totalWpa),
    battingWpa: roundWpa(existing.battingWpa + row.battingWpa),
    pitchingWpa: roundWpa(existing.pitchingWpa + row.pitchingWpa),
    catchingWpa: roundWpa(existing.catchingWpa + row.catchingWpa),
    fieldingWpa: roundWpa(existing.fieldingWpa + row.fieldingWpa),
    baserunningWpa: roundWpa(existing.baserunningWpa + row.baserunningWpa),
    managingWpa: roundWpa(existing.managingWpa + row.managingWpa),
  });
}

function playerWpaTotalsFor(
  homeSeed: LsimTeamSeed,
  awaySeed: LsimTeamSeed,
  spotlightPlayer: Player,
  gameNumber: number,
  hash: number,
): KblWpaPlayerTotal[] {
  const homeStarter = homeSeed.pitchers.find((player) => player.primaryPosition === 'SP') ?? homeSeed.pitchers[0];
  const homeReliever = homeSeed.pitchers.find((player) => player.primaryPosition === 'RP') ?? homeSeed.pitchers[1] ?? homeStarter;
  const awayStarter = awaySeed.pitchers.find((player) => player.primaryPosition === 'SP') ?? awaySeed.pitchers[0];
  const awayReliever = awaySeed.pitchers.find((player) => player.primaryPosition === 'RP') ?? awaySeed.pitchers[1] ?? awayStarter;
  const rows = new Map<string, KblWpaPlayerTotal>();
  const addPositionRows = (seed: LsimTeamSeed, sign: 1 | -1) => {
    for (const [index, player] of seed.positionPlayers.slice(0, 9).entries()) {
      const magnitude = 0.04 + (((hash + gameNumber + index * 17) % 13) / 100);
      const decline = declineIntensityFor(player, seed.team.id, gameNumber, hash);
      const coldPenalty = decline > 0 ? -(0.08 + (decline * 0.34) + (((hash + index) % 5) / 100)) : null;
      const battingWpa = roundWpa(coldPenalty ?? sign * magnitude);
      const fieldingWpa = roundWpa(decline > 0.5
        ? -(0.02 + (((hash + index * 7) % 7) / 100))
        : sign * (((hash + index * 7) % 5) / 100));
      const baserunningWpa = roundWpa(decline > 0.65
        ? -(0.01 + (((gameNumber + index) % 3) / 100))
        : sign * (((gameNumber + index) % 3) / 100));
      upsertWpa(rows, {
        playerId: player.id,
        playerName: fullName(player),
        teamId: seed.team.id,
        totalWpa: roundWpa(battingWpa + fieldingWpa + baserunningWpa),
        battingWpa,
        pitchingWpa: 0,
        catchingWpa: player.primaryPosition === 'C' ? fieldingWpa : 0,
        fieldingWpa,
        baserunningWpa,
        managingWpa: 0,
      });
    }
  };

  addPositionRows(homeSeed, 1);
  addPositionRows(awaySeed, -1);

  if (declineIntensityFor(spotlightPlayer, homeSeed.team.id, gameNumber, hash) < 0.5) {
    upsertWpa(rows, {
      playerId: spotlightPlayer.id,
      playerName: fullName(spotlightPlayer),
      teamId: homeSeed.team.id,
      totalWpa: 0.95,
      battingWpa: 0.78,
      pitchingWpa: 0,
      catchingWpa: 0.05,
      fieldingWpa: 0.08,
      baserunningWpa: 0.04,
      managingWpa: 0,
    });
  }
  for (const row of [
    [
      homeStarter,
      homeSeed.team.id,
      STRUGGLING_TEAM_IDS.has(homeSeed.team.id) ? -0.72 : 0.58,
    ] as const,
    [
      homeReliever,
      homeSeed.team.id,
      STRUGGLING_TEAM_IDS.has(homeSeed.team.id) ? -0.38 : 0.31,
    ] as const,
    [
      awayStarter,
      awaySeed.team.id,
      STRUGGLING_TEAM_IDS.has(awaySeed.team.id) ? -0.82 : -0.34,
    ] as const,
    [
      awayReliever,
      awaySeed.team.id,
      STRUGGLING_TEAM_IDS.has(awaySeed.team.id) ? -0.44 : -0.19,
    ] as const,
  ]) {
    const [player, teamId, pitchingWpa] = row;
    upsertWpa(rows, {
      playerId: player.id,
      playerName: fullName(player),
      teamId,
      totalWpa: roundWpa(pitchingWpa),
      battingWpa: 0,
      pitchingWpa: roundWpa(pitchingWpa),
      catchingWpa: 0,
      fieldingWpa: 0,
      baserunningWpa: 0,
      managingWpa: 0,
    });
  }

  return [...rows.values()].sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export function generateLsimSyntheticCompletedGame(
  context: LsimSandboxContext,
  optionsOrSeed: LsimSyntheticGameOptions | string = 'lsim-h1-preflight',
): LsimSyntheticCompletedGame {
  const options: LsimSyntheticGameOptions = typeof optionsOrSeed === 'string'
    ? { seed: optionsOrSeed }
    : optionsOrSeed;
  const gameNumber = options.gameNumber ?? context.ids.checkpointGameNumber;
  const seed = options.seed ?? `lsim-h2-g${gameNumber}`;
  const performanceReads = options.performanceReads;
  const performanceReadByPlayerId = new Map(
    (performanceReads ?? []).map((read) => [read.playerId, read]),
  );
  const scheduleGame = context.scheduleByGameNumber.get(gameNumber);
  if (!scheduleGame) {
    throw new Error(`[L-SIM] Missing schedule row for gameNumber ${gameNumber}`);
  }

  const homeSeed = context.teamSeeds.find((candidate) => candidate.team.id === scheduleGame.homeTeamId);
  const awaySeed = context.teamSeeds.find((candidate) => candidate.team.id === scheduleGame.awayTeamId);
  if (!homeSeed || !awaySeed) {
    throw new Error('[L-SIM-H1] Schedule team IDs do not match seeded franchise teams');
  }

  const homeLineup = lineupFor(homeSeed);
  const awayLineup = lineupFor(awaySeed);
  const homeLineupState = lineupStateFor(homeSeed, homeLineup);
  const awayLineupState = lineupStateFor(awaySeed, awayLineup);
  const trueValueStarPlayer = context.teamSeeds
    .flatMap((teamSeed) => teamSeed.positionPlayers)
    .find((player) => player.id === context.trueValueCandidatePlayerId)
    ?? context.teamSeeds[0].positionPlayers[0];
  const spotlightPlayer = homeSeed.positionPlayers.find((player) => player.id === context.trueValueCandidatePlayerId)
    ?? homeSeed.positionPlayers[0];
  const hash = seedHash(seed);
  const homeDecline = teamDeclineIntensity(homeSeed.team.id, gameNumber);
  const awayDecline = teamDeclineIntensity(awaySeed.team.id, gameNumber);
  const homeRuns = Math.max(1, 5 + ((hash + gameNumber) % 8) - Math.floor(homeDecline * 5) + Math.floor(awayDecline * 2));
  let awayRuns = Math.max(1, 3 + ((hash >>> 3) % 7) - Math.floor(awayDecline * 4) + Math.floor(homeDecline * 2));
  if (awayRuns === homeRuns) awayRuns += 1;
  const finalScore = { away: awayRuns, home: homeRuns };
  const playerStats: PersistedGameState['playerStats'] = {};

  for (const [index, player] of homeSeed.positionPlayers.entries()) {
    playerStats[player.id] = battingStatsFor(
      player,
      homeSeed.team.id,
      index,
      'home',
      trueValueStarPlayer.id,
      gameNumber,
      hash,
      performanceReadByPlayerId.get(player.id),
    );
  }
  for (const [index, player] of awaySeed.positionPlayers.entries()) {
    playerStats[player.id] = battingStatsFor(
      player,
      awaySeed.team.id,
      index,
      'away',
      trueValueStarPlayer.id,
      gameNumber,
      hash,
      performanceReadByPlayerId.get(player.id),
    );
  }

  const pitcherGameStats = [
    ...pitcherStatsFor(awaySeed, 'away', gameNumber),
    ...pitcherStatsFor(homeSeed, 'home', gameNumber),
  ];
  const playerWpaTotals = playerWpaTotalsFor(homeSeed, awaySeed, spotlightPlayer, gameNumber, hash);
  const savedAt = GAME_STARTED_AT + (gameNumber * 60_000) + (hash % 1000);
  const gameId = `lsim-h2-${context.ids.franchiseId}-g${String(gameNumber).padStart(3, '0')}-${hash}`;
  const spotlightDecline = declineIntensityFor(spotlightPlayer, homeSeed.team.id, gameNumber, hash);
  const fameEvents = ((hash + gameNumber) % 3 === 0 || spotlightDecline >= 0.72)
    ? [
        {
          id: `lsim-fame-${spotlightPlayer.id}-${gameNumber}`,
          gameId,
          eventType: spotlightDecline >= 0.72 ? 'DROPPED_FLY' : 'WEB_GEM',
          playerId: spotlightPlayer.id,
          playerName: fullName(spotlightPlayer),
          playerTeam: homeSeed.team.id,
          teamId: homeSeed.team.id,
          teamName: homeSeed.team.name,
          opponentTeamId: awaySeed.team.id,
          opponentTeamName: awaySeed.team.name,
          franchiseId: context.ids.franchiseId,
          seasonId: context.ids.seasonId,
          statsScopeId: context.ids.statsScopeId,
          competitionType: 'franchise',
          competitionId: context.ids.franchiseId,
          scheduleGameId: scheduleGame.id,
          fameValue: spotlightDecline >= 0.72 ? -3 : 6,
          fameType: spotlightDecline >= 0.72 ? 'boner' as const : 'bonus' as const,
          inning: 8,
          halfInning: 'TOP',
          timestamp: savedAt,
          autoDetected: true,
          description: spotlightDecline >= 0.72
            ? 'L-SIM Step 3 synthetic slump misplay fame event'
            : 'L-SIM Step 3 synthetic defensive fame event',
        },
      ]
    : [];

  const gameState: PersistedGameState = {
    id: 'current',
    gameId,
    savedAt,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: finalScore.home,
    awayScore: finalScore.away,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: Object.values(playerStats).reduce((sum, stats) => sum + stats.pa, 0),
    awayTeamId: awaySeed.team.id,
    homeTeamId: homeSeed.team.id,
    awayTeamName: awaySeed.team.name,
    homeTeamName: homeSeed.team.name,
    seasonNumber: context.ids.seasonNumber,
    stadiumName: homeSeed.team.stadium,
    stadiumId: homeSeed.team.stadiumId,
    parkFactors: homeSeed.team.parkFactors,
    gamePhase: 'FINALIZED',
    gameStartedAt: GAME_STARTED_AT,
    currentBatterId: spotlightPlayer.id,
    currentBatterName: fullName(spotlightPlayer),
    currentPitcherId: pitcherGameStats[pitcherGameStats.length - 1].pitcherId,
    currentPitcherName: pitcherGameStats[pitcherGameStats.length - 1].pitcherName,
    playerStats,
    pitcherGameStats,
    fameEvents,
    playerWpaTotals,
    moraleShifts: [{ teamId: homeSeed.team.id, shiftAmount: 2, triggerEvent: 'synthetic-checkpoint-win' }],
    lastHRBatterId: spotlightPlayer.id,
    consecutiveHRCount: 2,
    inningStrikeouts: 1,
    maxDeficitAway: 2,
    maxDeficitHome: 1,
    activityLog: [`L-SIM synthetic completed game ${gameNumber}`],
    currentInningPitches: null,
    scoreboard: {
      innings: [
        { away: 1, home: 2 },
        { away: 0, home: 1 },
        { away: 2, home: 0 },
        { away: 0, home: 3 },
        { away: 1, home: 0 },
        { away: 0, home: 2 },
        { away: 2, home: 1 },
        { away: 0, home: 1 },
        { away: 0, home: 2 },
      ],
      away: { runs: finalScore.away, hits: 10, errors: 0 },
      home: { runs: finalScore.home, hits: 16, errors: 0 },
    },
    seasonId: context.ids.seasonId,
    statsScopeId: context.ids.statsScopeId,
    franchiseId: context.ids.franchiseId,
    scheduleGameId: scheduleGame.id,
    competitionType: 'franchise',
    competitionId: context.ids.franchiseId,
    competitionName: 'L-SIM H1 Sandbox',
    leagueId: context.ids.leagueId,
    totalInnings: context.ids.inningsPerGame,
    awayUsesDh: true,
    homeUsesDh: true,
    awayLineup,
    homeLineup,
    awayLineupState,
    homeLineupState,
    runnerTrackerSnapshot: {
      runners: [],
      currentPitcherId: pitcherGameStats[pitcherGameStats.length - 1].pitcherId,
      currentPitcherName: pitcherGameStats[pitcherGameStats.length - 1].pitcherName,
      pitcherStatsEntries: pitcherGameStats.map((stats) => [stats.pitcherId, stats]),
      inning: 9,
      atBatNumber: 74,
    },
    pitcherNamesEntries: pitcherGameStats.map((stats) => [stats.pitcherId, stats.pitcherName]),
    substitutionLog: [],
    useGhostRunner: false,
    extraInningRunner: false,
    extraInningRunnerDelay: 2,
    awayTeamColor: awaySeed.team.colors.primary,
    homeTeamColor: homeSeed.team.colors.primary,
  };

  return {
    gameState,
    finalScore,
    archiveOptions: lsimArchiveOptionsFor(scheduleGame, finalScore),
    ...(performanceReads ? { performanceReads } : {}),
  };
}

export async function generateRatingsAwareLsimSyntheticCompletedGame(
  context: LsimSandboxContext,
  options: Omit<LsimSyntheticGameOptions, 'performanceReads'> & {
    regime: LsimPerformanceRegime;
  },
): Promise<LsimSyntheticCompletedGame> {
  const gameNumber = options.gameNumber ?? context.ids.checkpointGameNumber;
  const seed = options.seed ?? `lsim-feedback-g${gameNumber}`;
  const [players, conditionSnapshots] = await Promise.all([
    getAllFranchisePlayers(context.ids.franchiseId),
    loadFranchiseConditionSnapshots(context.ids.franchiseId).catch(() => []),
  ]);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const conditionByPlayerId = new Map(
    conditionSnapshots.map((snapshot) => [snapshot.playerId, snapshot]),
  );
  const freshPlayer = (player: Player): Player => playerById.get(player.id) ?? player;
  const freshContext: LsimSandboxContext = {
    ...context,
    teamSeeds: context.teamSeeds.map((teamSeed) => ({
      ...teamSeed,
      mlbPlayers: teamSeed.mlbPlayers.map(freshPlayer),
      farmPlayers: teamSeed.farmPlayers.map(freshPlayer),
      positionPlayers: teamSeed.positionPlayers.map(freshPlayer),
      pitchers: teamSeed.pitchers.map(freshPlayer),
    })),
  };
  const performanceReads = players
    .map((player) => {
      const condition = conditionByPlayerId.get(player.id);
      return buildLsimPlayerPerformanceRead({
        player,
        teamId: playerTeamId(player, context.ids.leagueId),
        gameNumber,
        seed,
        regime: options.regime,
        mojoLevel: condition?.mojoLevel,
        fitnessState: condition?.fitnessState,
      });
    })
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
  return generateLsimSyntheticCompletedGame(freshContext, {
    gameNumber,
    seed,
    performanceReads,
  });
}
