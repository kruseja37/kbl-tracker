// Core data types for the KBL Tracker

// Re-export comprehensive types from game.ts and war.ts
export * from './game';
export * from './war';

// Legacy placeholder types (kept for backward compatibility with existing Figma components)
export interface Player {
  id: string;
  name: string;
  position: string;
  battingAvg: number;
  homeRuns: number;
  rbi: number;
  era?: number;
  strikeouts?: number;
  wins?: number;
  mojo: number; // 0-100
  fitness: number; // 0-100
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  colors: {
    primary: string;
    secondary: string;
  };
  record: {
    wins: number;
    losses: number;
  };
  roster: Player[];
}

export interface League {
  id: string;
  name: string;
  teams: Team[];
  conferences?: string[];
  divisions?: string[];
}

export interface Franchise {
  id: string;
  saveName: string;
  leagueId: string;
  userTeamId: string;
  season: number;
  currentWeek: number;
  gamesPerSeason: number;
  inningsPerGame: number;
  lastPlayed: Date;
}

export interface GameResult {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  inning: number;
  outs: number;
  balls: number;
  strikes: number;
  baserunners: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
}

export interface AtBatOutcome {
  type: "single" | "double" | "triple" | "homerun" | "walk" | "hbp" | "strikeout" | "out" | "sac_fly" | "sac_bunt" | "error" | "fielders_choice";
  runs: number;
  rbi: number;
}
