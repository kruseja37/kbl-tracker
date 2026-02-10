/**
 * Franchise Configuration Types
 *
 * Shared between FranchiseSetup wizard, franchise storage, and franchise loading.
 * Extracted from FranchiseSetup.tsx to avoid circular imports.
 */

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
    scheduleType: string;
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
    playerAssignments: Record<string, string>;
  };
  roster: {
    mode: "existing" | "draft";
    draftSettings?: {
      playerPool: string;
      rounds: number;
      format: string;
      timePerPick: string;
    };
  };
  franchiseName: string;
}

/**
 * FranchiseConfig as stored in IndexedDB, keyed by franchiseId.
 */
export interface StoredFranchiseConfig extends FranchiseConfig {
  franchiseId: string;
  createdAt: number;
}
