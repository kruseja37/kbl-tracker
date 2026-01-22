// Core Types for KBL XHD Tracker

// Player position types
export type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'SP' | 'RP' | 'DH';

// Grade scale
export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';

// Player definition
export interface Player {
  id: string;
  name: string;
  position: Position;
  grade: Grade;
  teamId: string;
  jerseyNumber: number;
  salary: number;
  seasonStats: BattingStats & PitchingStats;
  gameStats: BattingStats & PitchingStats;
}

// Batting statistics
export interface BattingStats {
  gamesPlayed: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  errors: number;
  hitByPitch: number;
}

// Pitching statistics
export interface PitchingStats {
  gamesStarted: number;
  gamesPitched: number;
  inningsPitched: number;
  pitchCount: number;
  battersFaced: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsPitching: number;
  homeRunsAllowed: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
}

// Team definition
export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  wins: number;
  losses: number;
  roster: Player[];
}

// At-bat result options
export type AtBatResult =
  | 'SINGLE'
  | 'DOUBLE'
  | 'TRIPLE'
  | 'HOME_RUN'
  | 'WALK'
  | 'STRIKEOUT'
  | 'GROUNDOUT'
  | 'FLYOUT'
  | 'LINEOUT'
  | 'ERROR'
  | 'HIT_BY_PITCH'
  | 'SAC_FLY'
  | 'SAC_BUNT'
  | 'FIELDERS_CHOICE'
  | 'DOUBLE_PLAY';

// Season phase
export type SeasonPhase =
  | 'SETUP'
  | 'PRE_SEASON'
  | 'REGULAR_SEASON'
  | 'ALL_STAR_BREAK'
  | 'POST_DEADLINE'
  | 'PLAYOFFS'
  | 'OFFSEASON';
