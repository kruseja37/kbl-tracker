/**
 * Franchise Configuration Types
 *
 * Shared between FranchiseSetup wizard, franchise storage, and franchise loading.
 * Extracted from FranchiseSetup.tsx to avoid circular imports.
 */

import type { SnakeDraftManifest } from '../utils/leagueBuilderStorage';

export type FranchiseType = 'solo' | 'couch-coop' | 'custom';
export type FranchiseTeamControl = 'human' | 'ai';

export interface FranchiseSeat { id: string; name: string } // couch-coop player; name = GM identity

export interface FranchiseControlledTeamMetadata {
  teamId: string;
  teamName: string;
  controlledBy: FranchiseTeamControl;
}

export interface FranchiseTeamControlSnapshot {
  franchiseType: FranchiseType;
  aiScoreEntry: boolean;
  teamControl: Record<string, FranchiseTeamControl>;
  controlledTeams: FranchiseControlledTeamMetadata[];
}

export interface FranchiseRulesSnapshot {
  gamesPerTeam: number;
  inningsPerGame: number;
  extraInningsRule: string;
  scheduleType: string;
  useDH?: boolean;
  allStarGame: boolean;
  tradeDeadline: boolean;
  mercyRule: boolean;
}

export interface FranchisePlayoffSetupSnapshot {
  teamsQualifying: number;
  format: string;
  seriesLengths: {
    wildCard: string;
    divisionSeries: string;
    championship: string;
    worldSeries: string;
  };
  homeFieldAdvantage: string;
}

export interface FranchiseSeasonLengthMetadata {
  gamesPerTeam: number;
  expectedRegularSeasonGamesPerTeam: number;
  inningsPerGame: number;
  adaptiveStandardsInningsPerGame: number;
}

export interface FranchiseTeamStadiumSnapshot {
  teamId: string;
  teamName: string;
  stadium?: string;
  stadiumId?: string;
  hasSeedParkFactors: boolean;
}

export interface FranchiseRosterRequirementSnapshot {
  mlbPlayersPerTeam: number;
  farmPlayersPerTeam: number;
  validationStatus: 'passed';
  teamCounts: Record<string, { MLB: number; FARM: number }>;
  farmScouting?: FranchiseFarmScoutingHandoffSnapshot;
}

export interface FranchiseFarmScoutingHandoffSnapshot {
  ownership: 'league-builder-mode-1';
  validationVersion: 'league-builder-farm-scouting-v1';
  bridgePolicy: 'temporary-franchise-setup-repair-only';
  preparedInLeagueBuilder: boolean;
  bridgeRepairApplied: boolean;
  mlbPlayersPerTeam: number;
  farmPlayersPerTeam: number;
  hiddenTrueRatingsUntilReveal: true;
  scoutProfilesRequired: true;
  teamCounts: Record<string, {
    MLB: number;
    FARM: number;
    hiddenFarm: number;
    visibleSafeMetadata: number;
    scouts: number;
  }>;
  scoutProfilesByTeamId?: Record<string, Array<{
    id: string;
    name: string;
    specialties: string[];
    weaknesses: string[];
    accuracyByPosition: Record<string, number>;
  }>>;
  warnings: string[];
  limitations: string[];
}

export interface FranchiseSalaryBaselineProof {
  calculationVersion: string;
  playerCount: number;
  salariedPlayerCount: number;
  totalSalary: number;
  teamPayrolls: Record<string, number>;
}

export interface FranchiseSchedulePolicySnapshot {
  policy: 'empty-manual-user-supplied';
  generatedSchedulesAllowed: false;
  initialScheduleRows: 0;
  allowedSources: Array<'manual' | 'csv'>;
}

export interface FranchiseModeHandoffContract {
  version: 'mode1-mode2-v1';
  franchiseType: FranchiseType;
  teamControl: FranchiseTeamControlSnapshot;
  rulesSnapshot: FranchiseRulesSnapshot;
  playoffSetupSnapshot: FranchisePlayoffSetupSnapshot;
  seasonLength: FranchiseSeasonLengthMetadata;
  schedulePolicy: FranchiseSchedulePolicySnapshot;
  rosterRequirements: FranchiseRosterRequirementSnapshot;
  stadiums: FranchiseTeamStadiumSnapshot[];
  salaryBaseline: FranchiseSalaryBaselineProof;
  /** Present for the confirmed two-stage snake path; absent for auction/legacy launches. */
  snakeDraftProvenance?: {
    mlb: SnakeDraftManifest;
    farm: SnakeDraftManifest;
  };
}

export interface FranchiseStartupProspectDraftConfig {
  enabled: boolean;
  rounds: number;
  mode: 'auto-snake-v1';
  bridgeRepairApplied?: boolean;
}

export interface GmTenureRecord {
  teamId: string;
  startDate?: string;
  endDate?: string;
  endReason?: 'replaced' | 'relocated';
}

export interface GmProfile {
  gmId: string;
  displayName: string;
  createdByUser: boolean;
  teamId?: string;
  tenureRecords?: GmTenureRecord[];
}

export interface FranchiseConfig {
  league: string | null;
  leagueDetails: {
    name: string;
    teams: number;
    conferences: number;
    divisions: number;
  } | null;
  season: {
    gamesPerTeam: number;
    inningsPerGame: number;
    extraInningsRule: string;
    extraInningsRunnerDelay?: 1 | 2;
    scheduleType: string;
    useDH?: boolean;
    allStarGame: boolean;
    tradeDeadline: boolean;
    mercyRule: boolean;
  };
  playoffs: {
    teamsQualifying: number;
    format: string;
    seriesLengths: {
      wildCard: string;
      divisionSeries: string;
      championship: string;
      worldSeries: string;
    };
    homeFieldAdvantage: string;
  };
  teams: {
    selectedTeams: string[];
    mode: "single" | "multiplayer";
    playerAssignments: Record<string, string>; // teamId -> seatId | 'cpu'
    seats?: FranchiseSeat[]; // couch-coop players / GM identities
  };
  roster: {
    mode: "existing" | "draft";
    draftSettings?: {
      playerPool: string;
      rounds: number;
      format: string;
      timePerPick: string;
    };
    startupProspectDraft?: FranchiseStartupProspectDraftConfig;
  };
  franchiseName: string;
  franchiseType?: FranchiseType;
  aiScoreEntry?: boolean;
  gmName?: string;
}

/**
 * FranchiseConfig as stored in IndexedDB, keyed by franchiseId.
 */
export interface StoredFranchiseConfig extends FranchiseConfig {
  franchiseId: string;
  createdAt: number;
  franchiseType: FranchiseType;
  gm?: GmProfile;
  teamControl: Record<string, FranchiseTeamControl>;
  controlledTeams: FranchiseControlledTeamMetadata[];
  rulesSnapshot: FranchiseRulesSnapshot;
  playoffSetupSnapshot: FranchisePlayoffSetupSnapshot;
  seasonLength: FranchiseSeasonLengthMetadata;
  schedulePolicy: FranchiseSchedulePolicySnapshot;
  rosterRequirements: FranchiseRosterRequirementSnapshot;
  stadiums: FranchiseTeamStadiumSnapshot[];
  salaryBaseline: FranchiseSalaryBaselineProof;
  snakeDraftProvenance?: FranchiseModeHandoffContract['snakeDraftProvenance'];
  handoffContract: FranchiseModeHandoffContract;
}
