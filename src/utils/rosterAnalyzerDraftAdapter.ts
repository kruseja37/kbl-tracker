import {
  analyzeRoster,
  createDefaultRosterAnalyzerConfig,
  type AnalyzerPlayer,
  type RosterAnalyzerConfig,
  type RosterAnalyzerInput,
  type RosterAnalyzerReport,
} from '../engines/rosterAnalyzerEngine';

// Build-DARK adapter for RB-9a: RB-9c wires the UI consumer later. Farm prospect
// ratings stay obscured per draft scouting policy, with scout signal carried on
// optionState. Salary analysis is disabled by default because auction wallet/tax
// display belongs to the draft board, while this report is holes-focused.

export interface DraftAnalyzerMlbEntry {
  id: string;
  name: string;
  primaryPosition: string;
  secondaryPosition?: string;
  bats?: 'L' | 'R' | 'S';
  throws?: 'L' | 'R';
  ratings?: {
    power?: number;
    contact?: number;
    speed?: number;
    fielding?: number;
    arm?: number;
    velocity?: number;
    junk?: number;
    accuracy?: number;
  };
  arsenal?: string[];
  traits?: string[];
  chemistry?: string;
  personality?: string;
  salary?: number;
}

export interface DraftAnalyzerFarmEntry {
  id: string;
  name: string;
  primaryPosition: string;
  secondaryPosition?: string;
  bats?: 'L' | 'R' | 'S';
  throws?: 'L' | 'R';
  salary?: number;
  scoutedGrade?: string;
  scoutConfidence?: string;
}

export interface DraftAnalyzerAdapterInput {
  leagueId?: string;
  team: {
    id: string;
    name: string;
  };
  mlbWonPlayers: DraftAnalyzerMlbEntry[];
  farmWonPlayers: DraftAnalyzerFarmEntry[];
  walletCap?: number;
  generatedAt?: string;
  config?: Partial<RosterAnalyzerConfig>;
}

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CP', 'P', 'SP/RP', 'TWO-WAY']);

function isPitcherPosition(position: string | undefined): boolean {
  return PITCHER_POSITIONS.has(position ?? '');
}

function mapDraftMlbPlayer(
  player: DraftAnalyzerMlbEntry,
  input: DraftAnalyzerAdapterInput,
): AnalyzerPlayer {
  return {
    id: player.id,
    name: player.name,
    teamId: input.team.id,
    leagueId: input.leagueId,
    primaryPosition: player.primaryPosition,
    secondaryPositions: player.secondaryPosition ? [player.secondaryPosition] : [],
    bats: player.bats,
    throws: player.throws,
    isPitcher: isPitcherPosition(player.primaryPosition),
    rosterStatus: 'MLB',
    rosterLevel: 'MLB',
    ratings: {
      power: player.ratings?.power,
      contact: player.ratings?.contact,
      speed: player.ratings?.speed,
      fielding: player.ratings?.fielding,
      arm: player.ratings?.arm,
      velocity: player.ratings?.velocity,
      junk: player.ratings?.junk,
      accuracy: player.ratings?.accuracy,
    },
    arsenal: player.arsenal,
    traits: player.traits,
    chemistry: player.chemistry,
    personality: player.personality,
    salary: player.salary,
    stats: {
      source: 'unavailable',
      trust: 'unavailable',
    },
    sourceTrust: 'high',
  };
}

function mapDraftFarmPlayer(
  player: DraftAnalyzerFarmEntry,
  input: DraftAnalyzerAdapterInput,
): AnalyzerPlayer {
  return {
    id: player.id,
    name: player.name,
    teamId: input.team.id,
    leagueId: input.leagueId,
    primaryPosition: player.primaryPosition,
    secondaryPositions: player.secondaryPosition ? [player.secondaryPosition] : [],
    bats: player.bats,
    throws: player.throws,
    isPitcher: isPitcherPosition(player.primaryPosition),
    rosterStatus: 'FARM',
    rosterLevel: 'FARM',
    ratings: {},
    salary: player.salary,
    optionState: {
      maxSeasonOptions: 3,
      ratingRevealState: 'hidden',
      eligibleForCallUp: true,
      eligibleForSendDown: false,
      scoutedGrade: player.scoutedGrade,
      scoutConfidence: player.scoutConfidence,
    },
    stats: {
      source: 'unavailable',
      trust: 'unavailable',
    },
    sourceTrust: 'high',
  };
}

export function buildDraftAnalyzerInput(input: DraftAnalyzerAdapterInput): RosterAnalyzerInput {
  const mlbPlayers = input.mlbWonPlayers.map((player) => mapDraftMlbPlayer(player, input));
  const farmPlayers = input.farmWonPlayers.map((player) => mapDraftFarmPlayer(player, input));

  return {
    identity: {
      mode: 'builder',
      surface: 'draft_prep',
      leagueId: input.leagueId,
      teamId: input.team.id,
      generatedAt: input.generatedAt,
    },
    teamName: input.team.name,
    players: [...mlbPlayers, ...farmPlayers],
    roster: {
      activePlayerIds: input.mlbWonPlayers.map((player) => player.id),
      farmPlayerIds: input.farmWonPlayers.map((player) => player.id),
    },
    config: createDefaultRosterAnalyzerConfig({
      presetId: 'draft_prep_read_only_v1',
      salary: {
        enabled: typeof input.walletCap === 'number',
        unit: 'raw',
        ...(typeof input.walletCap === 'number' ? { luxuryCap: input.walletCap } : {}),
      },
      ...(input.config ?? {}),
    }),
  };
}

export function analyzeDraftRoster(input: DraftAnalyzerAdapterInput): RosterAnalyzerReport {
  return analyzeRoster(buildDraftAnalyzerInput(input));
}
