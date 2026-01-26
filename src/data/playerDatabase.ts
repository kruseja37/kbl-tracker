/**
 * Player and Team Database
 *
 * Contains master data for all players and teams, including ratings needed
 * for salary calculations per SALARY_SYSTEM_SPEC.md
 */

import type { Position, BatterHand } from '../types/game';

// ============================================
// TYPES
// ============================================

export type ThrowHand = 'L' | 'R';
export type Gender = 'M' | 'F';
export type Chemistry = 'SPIRITED' | 'CRAFTY' | 'DISCIPLINED' | 'FIERY' | 'GRITTY';
export type PlayerRole = 'STARTER' | 'BENCH' | 'ROTATION' | 'BULLPEN';
export type PitcherRole = 'SP' | 'RP' | 'CP' | 'SP/RP';

export interface BatterRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

export interface PitcherRatings {
  velocity: number;
  junk: number;
  accuracy: number;
}

export interface PlayerTraits {
  trait1?: string;
  trait2?: string;
}

export interface PlayerData {
  id: string;
  name: string;
  teamId: string;

  // Demographics
  age: number;
  gender: Gender;
  bats: BatterHand;
  throws: ThrowHand;

  // Position info
  primaryPosition: Position;
  secondaryPosition?: Position;
  isPitcher: boolean;
  pitcherRole?: PitcherRole;  // SP, RP, CP, SP/RP
  role: PlayerRole;  // STARTER, BENCH, ROTATION, BULLPEN

  // Ratings (0-99 scale)
  overall: string;  // Letter grade: S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D
  batterRatings?: BatterRatings;
  pitcherRatings?: PitcherRatings;

  // Chemistry and traits
  chemistry: string;  // SPI, DIS, CMP, SCH, CRA
  traits: PlayerTraits;

  // Arsenal (for pitchers) - pitch types they have
  arsenal?: string[];  // e.g., ['4F', '2F', 'CF', 'CB', 'SL', 'CH', 'FK']
}

export interface TeamData {
  id: string;
  name: string;
  homePark: string;
  chemistry: Chemistry;

  // Colors (for display)
  primaryColor: string;
  secondaryColor: string;

  // Roster
  rosterIds: string[];

  // League assignment (for DH rules)
  leagueId?: string;
}

// ============================================
// TEAM DATA
// ============================================

export const TEAMS: Record<string, TeamData> = {
  'sirloins': {
    id: 'sirloins',
    name: 'Sirloins',
    homePark: 'Apple Field',
    chemistry: 'SPIRITED',
    primaryColor: '#CC0000',  // Red
    secondaryColor: '#FFFFFF',  // White
    rosterIds: [
      // Starters
      'sir-plattune', 'sir-cook', 'sir-stanza', 'sir-longballo', 'sir-wiggins',
      'sir-hayata', 'sir-jones', 'sir-addonomus', 'sir-rush',
      // Bench
      'sir-tobo', 'sir-steeyle', 'sir-cortez', 'sir-balin',
      // Rotation
      'sir-kays', 'sir-snugs', 'sir-vanderwink', 'sir-niomo',
      // Bullpen
      'sir-seemerson', 'sir-dee', 'sir-duke', 'sir-digby', 'sir-zilla'
    ],
    leagueId: 'national'  // National League - pitchers bat (no DH)
  },
  'beewolves': {
    id: 'beewolves',
    name: 'Beewolves',
    homePark: 'Emerald Diamond',
    chemistry: 'CRAFTY',
    primaryColor: '#008B8B',  // Teal
    secondaryColor: '#FFD700',  // Yellow/Gold
    rosterIds: [
      // Starters
      'bee-torrens', 'bee-dexterez', 'bee-bigs', 'bee-kingman', 'bee-greene',
      'bee-moore', 'bee-banks', 'bee-leboink', 'bee-swanson',
      // Bench
      'bee-monstur', 'bee-knox', 'bee-balmer', 'bee-foster',
      // Rotation
      'bee-bender', 'bee-ortiz', 'bee-gipani', 'bee-levonn',
      // Bullpen
      'bee-pastimm', 'bee-balfour', 'bee-rushmore', 'bee-winder', 'bee-avery'
    ],
    leagueId: 'national'  // National League - pitchers bat (no DH)
  }
};

// ============================================
// PLAYER DATA
// ============================================

export const PLAYERS: Record<string, PlayerData> = {
  // ==========================================
  // SIRLOINS - POSITION PLAYERS (Starters)
  // ==========================================
  'sir-plattune': {
    id: 'sir-plattune',
    name: 'Boomer Plattune',
    teamId: 'sirloins',
    age: 34,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 70, contact: 54, speed: 54, fielding: 41, arm: 80 },
    chemistry: 'SPI',
    traits: {}
  },
  'sir-cook': {
    id: 'sir-cook',
    name: 'Lloyd Cook',
    teamId: 'sirloins',
    age: 32,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A-',
    batterRatings: { power: 80, contact: 52, speed: 83, fielding: 72, arm: 33 },
    chemistry: 'SPI',
    traits: { trait1: 'High Pitch' }
  },
  'sir-stanza': {
    id: 'sir-stanza',
    name: 'Kat Stanza',
    teamId: 'sirloins',
    age: 31,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 90, contact: 71, speed: 58, fielding: 42, arm: 65 },
    chemistry: 'DIS',
    traits: {}
  },
  'sir-longballo': {
    id: 'sir-longballo',
    name: 'Hammer Longballo',
    teamId: 'sirloins',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'A+',
    batterRatings: { power: 99, contact: 78, speed: 60, fielding: 58, arm: 75 },
    chemistry: 'CMP',
    traits: { trait1: 'POW vs RHP', trait2: 'Fastball Hitter' }
  },
  'sir-wiggins': {
    id: 'sir-wiggins',
    name: 'Willard Wiggins',
    teamId: 'sirloins',
    age: 21,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 66, contact: 50, speed: 64, fielding: 46, arm: 68 },
    chemistry: 'CMP',
    traits: { trait1: 'RBI Hero', trait2: 'Dive Wizard' }
  },
  'sir-hayata': {
    id: 'sir-hayata',
    name: 'Madoka Hayata',
    teamId: 'sirloins',
    age: 36,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'DH',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 48, contact: 84, speed: 97, fielding: 43, arm: 45 },
    chemistry: 'SCH',
    traits: { trait1: 'Wild Thrower', trait2: 'Noodle Arm' }
  },
  'sir-jones': {
    id: 'sir-jones',
    name: 'Filet Jones',
    teamId: 'sirloins',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'C+',
    batterRatings: { power: 97, contact: 41, speed: 44, fielding: 55, arm: 25 },
    chemistry: 'SPI',
    traits: {}
  },
  'sir-addonomus': {
    id: 'sir-addonomus',
    name: 'Preston Addonomus',
    teamId: 'sirloins',
    age: 37,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 84, contact: 19, speed: 48, fielding: 64, arm: 69 },
    chemistry: 'SPI',
    traits: {}
  },
  'sir-rush': {
    id: 'sir-rush',
    name: 'Damien Rush',
    teamId: 'sirloins',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 89, contact: 12, speed: 93, fielding: 57, arm: 70 },
    chemistry: 'SCH',
    traits: { trait1: 'Sprinter', trait2: 'Magic Hands' }
  },

  // ==========================================
  // SIRLOINS - BENCH
  // ==========================================
  'sir-tobo': {
    id: 'sir-tobo',
    name: 'Momo Tobo',
    teamId: 'sirloins',
    age: 29,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 50, contact: 48, speed: 37, fielding: 70, arm: 80 },
    chemistry: 'SCH',
    traits: {}
  },
  'sir-steeyle': {
    id: 'sir-steeyle',
    name: 'Mick Steeyle',
    teamId: 'sirloins',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 84, contact: 35, speed: 45, fielding: 28, arm: 21 },
    chemistry: 'SPI',
    traits: { trait1: 'Pinch Perfect' }
  },
  'sir-cortez': {
    id: 'sir-cortez',
    name: 'Javier Cortez',
    teamId: 'sirloins',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 65, contact: 32, speed: 46, fielding: 44, arm: 64 },
    chemistry: 'SCH',
    traits: { trait1: 'Stealer' }
  },
  'sir-balin': {
    id: 'sir-balin',
    name: 'Tish Balin',
    teamId: 'sirloins',
    age: 22,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 58, contact: 33, speed: 68, fielding: 70, arm: 90 },
    chemistry: 'DIS',
    traits: { trait1: 'Utility' }
  },

  // ==========================================
  // SIRLOINS - ROTATION (Starting Pitchers)
  // ==========================================
  'sir-kays': {
    id: 'sir-kays',
    name: 'Manny Kays',
    teamId: 'sirloins',
    age: 25,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'A+',
    pitcherRatings: { velocity: 75, junk: 88, accuracy: 77 },
    batterRatings: { power: 11, contact: 2, speed: 67, fielding: 88, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite 2F' },
    arsenal: ['4F', '2F', 'CF', 'SL']
  },
  'sir-snugs': {
    id: 'sir-snugs',
    name: 'Bugsy Snugs',
    teamId: 'sirloins',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 77, junk: 64, accuracy: 64 },
    batterRatings: { power: 18, contact: 6, speed: 15, fielding: 37, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'BB Prone' },
    arsenal: ['4F', '2F', 'CF', 'SL']
  },
  'sir-vanderwink': {
    id: 'sir-vanderwink',
    name: "Slip Van'Derwink",
    teamId: 'sirloins',
    age: 30,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 60, junk: 76, accuracy: 71 },
    batterRatings: { power: 44, contact: 2, speed: 14, fielding: 46, arm: 0 },
    chemistry: 'CMP',
    traits: { trait1: 'Easy Jumps' },
    arsenal: ['4F', 'CB', 'SL', 'CH', 'FK']
  },
  'sir-niomo': {
    id: 'sir-niomo',
    name: 'Kayo Niomo',
    teamId: 'sirloins',
    age: 38,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 70, junk: 49, accuracy: 54 },
    batterRatings: { power: 6, contact: 1, speed: 73, fielding: 60, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Pick Officer' },
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },

  // ==========================================
  // SIRLOINS - BULLPEN (Relief Pitchers)
  // ==========================================
  'sir-seemerson': {
    id: 'sir-seemerson',
    name: 'Split Seemerson',
    teamId: 'sirloins',
    age: 21,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 35, junk: 65, accuracy: 55 },
    batterRatings: { power: 15, contact: 9, speed: 8, fielding: 51, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite FK', trait2: 'Injury Prone' },
    arsenal: ['4F', 'SB', 'CH', 'FK']
  },
  'sir-dee': {
    id: 'sir-dee',
    name: 'Shay Dee',
    teamId: 'sirloins',
    age: 31,
    gender: 'F',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'A',
    pitcherRatings: { velocity: 84, junk: 5, accuracy: 95 },
    batterRatings: { power: 29, contact: 17, speed: 32, fielding: 94, arm: 0 },
    chemistry: 'CRA',
    traits: { trait1: 'Falls Behind', trait2: 'Stimulated' },
    arsenal: ['4F', 'CF', 'CH']
  },
  'sir-duke': {
    id: 'sir-duke',
    name: 'Miguel Duke',
    teamId: 'sirloins',
    age: 29,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C',
    pitcherRatings: { velocity: 30, junk: 86, accuracy: 18 },
    batterRatings: { power: 9, contact: 13, speed: 47, fielding: 89, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', 'CB', 'SL']
  },
  'sir-digby': {
    id: 'sir-digby',
    name: 'Linus Digby',
    teamId: 'sirloins',
    age: 27,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C',
    pitcherRatings: { velocity: 50, junk: 55, accuracy: 19 },
    batterRatings: { power: 21, contact: 6, speed: 54, fielding: 89, arm: 0 },
    chemistry: 'CMP',
    traits: {},
    arsenal: ['4F', 'CB', 'SL', 'CH']
  },
  'sir-zilla': {
    id: 'sir-zilla',
    name: 'Franz Zilla',
    teamId: 'sirloins',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 85, junk: 37, accuracy: 25 },
    batterRatings: { power: 5, contact: 2, speed: 19, fielding: 58, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'K Collector' },
    arsenal: ['4F', 'SL']
  },

  // ==========================================
  // BEEWOLVES - POSITION PLAYERS (Starters)
  // ==========================================
  'bee-torrens': {
    id: 'bee-torrens',
    name: 'Gina Torrens',
    teamId: 'beewolves',
    age: 36,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: '2B',
    secondaryPosition: 'SS',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B+',
    batterRatings: { power: 25, contact: 87, speed: 91, fielding: 80, arm: 20 },
    chemistry: 'CRA',
    traits: { trait1: 'POW vs RHP', trait2: 'Butter Fingers' }
  },
  'bee-dexterez': {
    id: 'bee-dexterez',
    name: 'Handley Dexterez',
    teamId: 'beewolves',
    age: 29,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: 'SS',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'S',
    batterRatings: { power: 63, contact: 87, speed: 87, fielding: 97, arm: 74 },
    chemistry: 'SPI',
    traits: { trait1: 'Utility', trait2: 'Fastball Hitter' }
  },
  'bee-bigs': {
    id: 'bee-bigs',
    name: 'Buster Bigs',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'LF',
    secondaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 74, contact: 87, speed: 77, fielding: 44, arm: 40 },
    chemistry: 'SCH',
    traits: { trait1: 'Base Jogger' }
  },
  'bee-kingman': {
    id: 'bee-kingman',
    name: 'Kobe Kingman',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'S',
    throws: 'R',
    primaryPosition: '1B',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 95, contact: 27, speed: 59, fielding: 68, arm: 62 },
    chemistry: 'CMP',
    traits: {}
  },
  'bee-greene': {
    id: 'bee-greene',
    name: 'Ruby Greene',
    teamId: 'beewolves',
    age: 26,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'DH',
    secondaryPosition: '3B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 54, contact: 40, speed: 87, fielding: 54, arm: 18 },
    chemistry: 'SPI',
    traits: { trait1: 'Mind Gamer' }
  },
  'bee-moore': {
    id: 'bee-moore',
    name: 'Magic Moore',
    teamId: 'beewolves',
    age: 22,
    gender: 'M',
    bats: 'S',
    throws: 'L',
    primaryPosition: 'CF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B',
    batterRatings: { power: 54, contact: 40, speed: 87, fielding: 68, arm: 66 },
    chemistry: 'SPI',
    traits: {}
  },
  'bee-banks': {
    id: 'bee-banks',
    name: 'Bertha Banks',
    teamId: 'beewolves',
    age: 29,
    gender: 'F',
    bats: 'L',
    throws: 'R',
    primaryPosition: '3B',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 54, contact: 74, speed: 74, fielding: 28, arm: 73 },
    chemistry: 'SCH',
    traits: { trait1: 'Big Hack', trait2: 'Slow Poke' }
  },
  'bee-leboink': {
    id: 'bee-leboink',
    name: 'Billy LeBoink',
    teamId: 'beewolves',
    age: 32,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'LF',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 54, contact: 74, speed: 28, fielding: 73, arm: 97 },
    chemistry: 'CMP',
    traits: {}
  },
  'bee-swanson': {
    id: 'bee-swanson',
    name: 'Johnson Swanson',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    isPitcher: false,
    role: 'STARTER',
    overall: 'B-',
    batterRatings: { power: 62, contact: 43, speed: 72, fielding: 73, arm: 64 },
    chemistry: 'SPI',
    traits: { trait1: 'Little Hack' }
  },

  // ==========================================
  // BEEWOLVES - BENCH
  // ==========================================
  'bee-monstur': {
    id: 'bee-monstur',
    name: 'Steve Monstur',
    teamId: 'beewolves',
    age: 32,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'C',
    secondaryPosition: '1B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 45, contact: 54, speed: 95, fielding: 43, arm: 54 },
    chemistry: 'CRA',
    traits: { trait1: 'First Pitch Slayer' }
  },
  'bee-knox': {
    id: 'bee-knox',
    name: 'Freddie Knox',
    teamId: 'beewolves',
    age: 38,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: '2B',
    isPitcher: false,
    role: 'BENCH',
    overall: 'B-',
    batterRatings: { power: 23, contact: 81, speed: 95, fielding: 43, arm: 56 },
    chemistry: 'SPI',
    traits: { trait1: 'Bad Ball Hitter' }
  },
  'bee-balmer': {
    id: 'bee-balmer',
    name: 'Benny Balmer',
    teamId: 'beewolves',
    age: 29,
    gender: 'M',
    bats: 'S',
    throws: 'L',
    primaryPosition: 'LF',
    secondaryPosition: 'RF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C+',
    batterRatings: { power: 32, contact: 40, speed: 58, fielding: 89, arm: 84 },
    chemistry: 'CRA',
    traits: { trait1: 'Clutch' }
  },
  'bee-foster': {
    id: 'bee-foster',
    name: 'Poke Foster',
    teamId: 'beewolves',
    age: 24,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'RF',
    secondaryPosition: 'CF',
    isPitcher: false,
    role: 'BENCH',
    overall: 'C',
    batterRatings: { power: 25, contact: 76, speed: 24, fielding: 68, arm: 66 },
    chemistry: 'SPI',
    traits: { trait1: 'Bunter' }
  },

  // ==========================================
  // BEEWOLVES - ROTATION (Starting Pitchers)
  // ==========================================
  'bee-bender': {
    id: 'bee-bender',
    name: 'Hurley Bender',
    teamId: 'beewolves',
    age: 23,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'S',
    pitcherRatings: { velocity: 73, junk: 99, accuracy: 86 },
    batterRatings: { power: 4, contact: 7, speed: 65, fielding: 70, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite CB' },
    arsenal: ['4F', '2F', 'CF', 'CB', 'SL']
  },
  'bee-ortiz': {
    id: 'bee-ortiz',
    name: 'Bevis Ortiz',
    teamId: 'beewolves',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B+',
    pitcherRatings: { velocity: 63, junk: 66, accuracy: 63 },
    batterRatings: { power: 4, contact: 7, speed: 65, fielding: 70, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Elite FK' },
    arsenal: ['4F', 'CB', 'SL', 'FK']
  },
  'bee-gipani': {
    id: 'bee-gipani',
    name: 'Fran Gipani',
    teamId: 'beewolves',
    age: 37,
    gender: 'F',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'B',
    pitcherRatings: { velocity: 66, junk: 54, accuracy: 98 },
    batterRatings: { power: 2, contact: 38, speed: 35, fielding: 98, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'Elite 2F', trait2: 'Volatile' },
    arsenal: ['4F', '2F', 'CB', 'SL', 'CH']
  },
  'bee-levonn': {
    id: 'bee-levonn',
    name: 'Deshaun Levonn',
    teamId: 'beewolves',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP',
    role: 'ROTATION',
    overall: 'C+',
    pitcherRatings: { velocity: 42, junk: 41, accuracy: 68 },
    batterRatings: { power: 54, contact: 24, speed: 5, fielding: 60, arm: 0 },
    chemistry: 'SCH',
    traits: {},
    arsenal: ['4F', '2F', 'SL', 'CH']
  },

  // ==========================================
  // BEEWOLVES - BULLPEN (Relief Pitchers)
  // ==========================================
  'bee-pastimm': {
    id: 'bee-pastimm',
    name: 'Buzz Pastimm',
    teamId: 'beewolves',
    age: 31,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'SP/RP',
    role: 'BULLPEN',
    overall: 'B+',
    pitcherRatings: { velocity: 87, junk: 29, accuracy: 65 },
    batterRatings: { power: 14, contact: 26, speed: 5, fielding: 54, arm: 0 },
    chemistry: 'SPI',
    traits: { trait1: 'Specialist', trait2: 'Elite 4F' },
    arsenal: ['4F', '2F', 'SB', 'CH']
  },
  'bee-balfour': {
    id: 'bee-balfour',
    name: 'Tatts Balfour',
    teamId: 'beewolves',
    age: 37,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 49, junk: 64, accuracy: 40 },
    batterRatings: { power: 2, contact: 13, speed: 41, fielding: 90, arm: 0 },
    chemistry: 'SCH',
    traits: { trait1: 'BB Prone' },
    arsenal: ['4F', 'CB', 'SL']
  },
  'bee-rushmore': {
    id: 'bee-rushmore',
    name: 'Benson Rushmore',
    teamId: 'beewolves',
    age: 26,
    gender: 'M',
    bats: 'R',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 62, junk: 59, accuracy: 31 },
    batterRatings: { power: 25, contact: 8, speed: 8, fielding: 89, arm: 0 },
    chemistry: 'CRA',
    traits: {},
    arsenal: ['4F', '2F', 'CB', 'SL']
  },
  'bee-winder': {
    id: 'bee-winder',
    name: 'Dusty Winder',
    teamId: 'beewolves',
    age: 28,
    gender: 'M',
    bats: 'L',
    throws: 'R',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'RP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 62, junk: 42, accuracy: 46 },
    batterRatings: { power: 12, contact: 3, speed: 13, fielding: 76, arm: 0 },
    chemistry: 'SCH',
    traits: {},
    arsenal: ['4F', 'CB', 'CH']
  },
  'bee-avery': {
    id: 'bee-avery',
    name: 'Smack Avery',
    teamId: 'beewolves',
    age: 20,
    gender: 'M',
    bats: 'L',
    throws: 'L',
    primaryPosition: 'P',
    isPitcher: true,
    pitcherRole: 'CP',
    role: 'BULLPEN',
    overall: 'C+',
    pitcherRatings: { velocity: 72, junk: 36, accuracy: 40 },
    batterRatings: { power: 3, contact: 4, speed: 19, fielding: 80, arm: 0 },
    chemistry: 'DIS',
    traits: { trait1: 'K Collector' },
    arsenal: ['4F', 'CB']
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all players for a team
 */
export function getTeamRoster(teamId: string): PlayerData[] {
  const team = TEAMS[teamId];
  if (!team) return [];
  return team.rosterIds.map(id => PLAYERS[id]).filter(Boolean);
}

/**
 * Get player by ID
 */
export function getPlayer(playerId: string): PlayerData | undefined {
  return PLAYERS[playerId];
}

/**
 * Get team by ID
 */
export function getTeam(teamId: string): TeamData | undefined {
  return TEAMS[teamId];
}

/**
 * Get all teams
 */
export function getAllTeams(): TeamData[] {
  return Object.values(TEAMS);
}

/**
 * Get all players
 */
export function getAllPlayers(): PlayerData[] {
  return Object.values(PLAYERS);
}

/**
 * Get starters for a team (position players in starting lineup)
 */
export function getTeamStarters(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'STARTER');
}

/**
 * Get bench players for a team
 */
export function getTeamBench(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'BENCH');
}

/**
 * Get rotation (starting pitchers) for a team
 */
export function getTeamRotation(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'ROTATION');
}

/**
 * Get bullpen (relief pitchers) for a team
 */
export function getTeamBullpen(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.role === 'BULLPEN');
}

/**
 * Get all pitchers for a team
 */
export function getTeamPitchers(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => p.isPitcher);
}

/**
 * Get all position players for a team
 */
export function getTeamPositionPlayers(teamId: string): PlayerData[] {
  return getTeamRoster(teamId).filter(p => !p.isPitcher);
}

/**
 * Search players by name (case-insensitive partial match)
 */
export function searchPlayers(query: string): PlayerData[] {
  const lowerQuery = query.toLowerCase();
  return getAllPlayers().filter(p =>
    p.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Find player by exact name (case-insensitive)
 */
export function getPlayerByName(name: string): PlayerData | undefined {
  const lowerName = name.toLowerCase();
  return getAllPlayers().find(p => p.name.toLowerCase() === lowerName);
}

/**
 * Convert PlayerData to format expected by salary calculator
 */
export function toSalaryPlayerFormat(player: PlayerData) {
  return {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    isTwoWay: false,  // Could be detected if player has both ratings
    primaryPosition: player.primaryPosition,
    ratings: player.isPitcher
      ? player.pitcherRatings!
      : player.batterRatings!,
    battingRatings: player.batterRatings,
    age: player.age,
    personality: undefined,  // Could map from chemistry
    fame: 0,  // Would come from season stats
    traits: [player.traits.trait1, player.traits.trait2].filter(Boolean) as string[]
  };
}

// ============================================
// GAME LINEUP GENERATION
// ============================================

/**
 * Lineup slot for game tracker (pre-game format)
 */
export interface GameLineupSlot {
  id: string;
  name: string;
  position: Position;
  grade: string;
  jerseyNumber: number;
}

/**
 * Bench player for game tracker
 */
export interface GameBenchPlayer {
  playerId: string;
  playerName: string;
  positions: Position[];
  isAvailable: boolean;
  batterHand: BatterHand;
}

/**
 * Generate a starting lineup for a team
 * Returns 9 players in batting order with starting pitcher at #9
 */
export function generateTeamLineup(teamId: string, startingPitcherId?: string): GameLineupSlot[] {
  const starters = getTeamStarters(teamId);
  const rotation = getTeamRotation(teamId);

  // Get starting pitcher (first in rotation if not specified)
  const startingPitcher = startingPitcherId
    ? rotation.find(p => p.id === startingPitcherId) || rotation[0]
    : rotation[0];

  if (!startingPitcher) {
    console.warn(`[playerDatabase] No pitchers found for team ${teamId}`);
    return [];
  }

  // Build lineup: 8 position players + pitcher at 9
  // IMPORTANT: Must fill all 8 defensive positions (C, 1B, 2B, 3B, SS, LF, CF, RF)
  const positionPlayers = starters.filter(p => !p.isPitcher);

  // First, ensure we have exactly one player at each required position
  const requiredPositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const lineupByPosition = new Map<Position, PlayerData>();

  // Assign players to their primary positions first
  for (const pos of requiredPositions) {
    const playerAtPos = positionPlayers.find(p =>
      p.primaryPosition === pos && !Array.from(lineupByPosition.values()).includes(p)
    );
    if (playerAtPos) {
      lineupByPosition.set(pos, playerAtPos);
    }
  }

  // Fill any missing positions with players who can play there (secondary position)
  for (const pos of requiredPositions) {
    if (!lineupByPosition.has(pos)) {
      const playerWithSecondary = positionPlayers.find(p =>
        p.secondaryPosition === pos && !Array.from(lineupByPosition.values()).includes(p)
      );
      if (playerWithSecondary) {
        lineupByPosition.set(pos, playerWithSecondary);
      }
    }
  }

  // Convert to array maintaining position coverage
  const lineupPlayers = Array.from(lineupByPosition.values());

  // Reorder for typical lineup: speed at top, power in 3-5
  const lineup: PlayerData[] = [];
  const byPower = [...lineupPlayers].sort((a, b) =>
    (b.batterRatings?.power ?? 0) - (a.batterRatings?.power ?? 0)
  );
  const bySpeed = [...lineupPlayers].sort((a, b) =>
    (b.batterRatings?.speed ?? 0) - (a.batterRatings?.speed ?? 0)
  );

  // Simple approach: alternate speed and power
  // 1, 2 - speed guys
  // 3, 4, 5 - power guys
  // 6, 7, 8 - remaining
  const used = new Set<string>();

  // Spots 1-2: fastest players
  for (const p of bySpeed) {
    if (!used.has(p.id) && lineup.length < 2) {
      lineup.push(p);
      used.add(p.id);
    }
  }

  // Spots 3-5: power hitters
  for (const p of byPower) {
    if (!used.has(p.id) && lineup.length < 5) {
      lineup.push(p);
      used.add(p.id);
    }
  }

  // Spots 6-8: remaining
  for (const p of lineupPlayers) {
    if (!used.has(p.id) && lineup.length < 8) {
      lineup.push(p);
      used.add(p.id);
    }
  }

  // Convert to game format
  const gameLineup: GameLineupSlot[] = lineup.map((p, idx) => ({
    id: p.id,
    name: p.name,
    position: p.primaryPosition,
    grade: p.overall,
    jerseyNumber: idx + 1,  // Placeholder - would need real jersey numbers
  }));

  // Add pitcher at position 9
  gameLineup.push({
    id: startingPitcher.id,
    name: startingPitcher.name,
    position: 'P',
    grade: startingPitcher.overall,
    jerseyNumber: 9,
  });

  return gameLineup;
}

/**
 * Generate bench for a team (non-starters + bullpen)
 */
export function generateTeamBench(teamId: string, startingPitcherId?: string): GameBenchPlayer[] {
  const bench = getTeamBench(teamId);
  const rotation = getTeamRotation(teamId);
  const bullpen = getTeamBullpen(teamId);

  // Starting pitcher is NOT on bench
  const availablePitchers = [...rotation, ...bullpen].filter(p =>
    p.id !== startingPitcherId
  );

  const benchPlayers: GameBenchPlayer[] = [];

  // Add bench position players
  for (const p of bench) {
    const positions: Position[] = [p.primaryPosition];
    if (p.secondaryPosition) {
      positions.push(p.secondaryPosition);
    }

    benchPlayers.push({
      playerId: p.id,
      playerName: p.name,
      positions,
      isAvailable: true,
      batterHand: p.bats,
    });
  }

  // Add available pitchers
  for (const p of availablePitchers) {
    benchPlayers.push({
      playerId: p.id,
      playerName: p.name,
      positions: ['P'],
      isAvailable: true,
      batterHand: p.bats,
    });
  }

  return benchPlayers;
}
