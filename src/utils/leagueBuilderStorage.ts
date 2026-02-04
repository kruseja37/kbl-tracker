/**
 * League Builder Storage Utility
 * Per LEAGUE_BUILDER_SPEC.md LB-005
 *
 * Provides IndexedDB storage for:
 * - leagueTemplates: League configuration templates
 * - globalTeams: Team definitions
 * - globalPlayers: Player database
 * - rulesPresets: Game rules configurations
 * - teamRosters: Roster assignments and lineups
 */

const DB_NAME = 'kbl-league-builder';
const DB_VERSION = 1;

const STORES = {
  LEAGUE_TEMPLATES: 'leagueTemplates',
  GLOBAL_TEAMS: 'globalTeams',
  GLOBAL_PLAYERS: 'globalPlayers',
  RULES_PRESETS: 'rulesPresets',
  TEAM_ROSTERS: 'teamRosters',
} as const;

// ============================================
// TYPES
// ============================================

// Position types
export type Position = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' | 'DH' |
  'SP' | 'RP' | 'CP' | 'SP/RP' | 'TWO-WAY';

export type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-';

export type PitchType = '4F' | '2F' | 'CB' | 'SL' | 'CH' | 'FK' | 'CF' | 'SB' | 'SC' | 'KN';

export type Personality = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' |
  'Disciplined' | 'Tough' | 'Relaxed' | 'Egotistical' |
  'Jolly' | 'Timid' | 'Droopy';

export type Chemistry = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' | 'Disciplined';

export type MojoState = 'On Fire' | 'Hot' | 'Normal' | 'Cold' | 'Ice Cold';

export type RosterStatus = 'MLB' | 'FARM' | 'FREE_AGENT';

// League Template
export interface Conference {
  id: string;
  name: string;
  abbreviation: string;
  divisionIds: string[];
}

export interface Division {
  id: string;
  name: string;
  conferenceId: string;
  teamIds: string[];
}

export interface LeagueTemplate {
  id: string;
  name: string;
  description?: string;
  createdDate: string;
  lastModified: string;
  teamIds: string[];
  conferences: Conference[];
  divisions: Division[];
  defaultRulesPreset: string;
  logoUrl?: string;
  color?: string;
}

// Team
export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  location: string;
  nickname: string;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  logoUrl?: string;
  stadium: string;
  stadiumCapacity?: number;
  leagueIds: string[];
  foundedYear?: number;
  championships?: number;
  retiredNumbers?: number[];
  createdDate: string;
  lastModified: string;
}

// Player
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: 'M' | 'F';
  age: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  primaryPosition: Position;
  secondaryPosition?: Position;
  // Batting ratings
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  // Pitching ratings
  velocity: number;
  junk: number;
  accuracy: number;
  arsenal: PitchType[];
  overallGrade: Grade;
  trait1?: string;
  trait2?: string;
  personality: Personality;
  chemistry: Chemistry;
  morale: number;
  mojo: MojoState;
  fame: number;
  salary: number;
  contractYears?: number;
  currentTeamId: string | null;
  rosterStatus: RosterStatus;
  createdDate: string;
  lastModified: string;
  isCustom: boolean;
  sourceDatabase?: string;
}

// Roster
export interface LineupSlot {
  battingOrder: number;
  playerId: string;
  fieldingPosition: Position;
}

export interface DepthChart {
  C: string[];
  '1B': string[];
  '2B': string[];
  SS: string[];
  '3B': string[];
  LF: string[];
  CF: string[];
  RF: string[];
  DH: string[];
  SP: string[];
  RP: string[];
  CP: string[];
}

export interface TeamRoster {
  teamId: string;
  mlbRoster: string[];
  farmRoster: string[];
  lineupVsRHP: LineupSlot[];
  lineupVsLHP: LineupSlot[];
  startingRotation: string[];
  closingPitcher: string;
  setupPitchers: string[];
  depthChart: DepthChart;
  pinchHitOrder: string[];
  pinchRunOrder: string[];
  defensiveSubOrder: string[];
  lastModified: string;
}

// Rules Preset
export interface RulesPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isEditable: boolean;
  game: {
    inningsPerGame: 6 | 7 | 9;
    extraInningsRule: 'standard' | 'runner_on_second' | 'sudden_death';
    mercyRule: {
      enabled: boolean;
      runDifferential: number;
      afterInning: number;
    };
    pitchCounts: {
      enabled: boolean;
      starterLimit: number;
      relieverLimit: number;
    };
    moundVisits: {
      enabled: boolean;
      perGame: number;
    };
  };
  season: {
    gamesPerTeam: number;
    scheduleType: 'balanced' | 'division_heavy' | 'rivalry_focused';
    allStarGame: boolean;
    allStarTiming: number;
    tradeDeadline: {
      enabled: boolean;
      timing: number;
    };
  };
  playoffs: {
    teamsQualifying: number;
    format: 'bracket' | 'pool' | 'best_record_bye';
    seriesLengths: number[];
    homeFieldAdvantage: 'higher_seed' | 'alternating' | 'fixed';
  };
  createdDate: string;
  lastModified: string;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

export async function initLeagueBuilderDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[leagueBuilderStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // League Templates store
      if (!db.objectStoreNames.contains(STORES.LEAGUE_TEMPLATES)) {
        const store = db.createObjectStore(STORES.LEAGUE_TEMPLATES, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }

      // Global Teams store
      if (!db.objectStoreNames.contains(STORES.GLOBAL_TEAMS)) {
        const store = db.createObjectStore(STORES.GLOBAL_TEAMS, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('abbreviation', 'abbreviation', { unique: false });
      }

      // Global Players store
      if (!db.objectStoreNames.contains(STORES.GLOBAL_PLAYERS)) {
        const store = db.createObjectStore(STORES.GLOBAL_PLAYERS, { keyPath: 'id' });
        store.createIndex('lastName', 'lastName', { unique: false });
        store.createIndex('currentTeamId', 'currentTeamId', { unique: false });
        store.createIndex('primaryPosition', 'primaryPosition', { unique: false });
        store.createIndex('overallGrade', 'overallGrade', { unique: false });
      }

      // Rules Presets store
      if (!db.objectStoreNames.contains(STORES.RULES_PRESETS)) {
        const store = db.createObjectStore(STORES.RULES_PRESETS, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('isDefault', 'isDefault', { unique: false });
      }

      // Team Rosters store
      if (!db.objectStoreNames.contains(STORES.TEAM_ROSTERS)) {
        db.createObjectStore(STORES.TEAM_ROSTERS, { keyPath: 'teamId' });
      }
    };
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ============================================
// LEAGUE TEMPLATE OPERATIONS
// ============================================

export async function getAllLeagueTemplates(): Promise<LeagueTemplate[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readonly');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getLeagueTemplate(id: string): Promise<LeagueTemplate | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readonly');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLeagueTemplate(template: Omit<LeagueTemplate, 'id' | 'createdDate' | 'lastModified'> & { id?: string }): Promise<LeagueTemplate> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullTemplate: LeagueTemplate = {
    ...template,
    id: template.id || generateId('league'),
    createdDate: template.id ? (await getLeagueTemplate(template.id))?.createdDate || now : now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readwrite');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.put(fullTemplate);

    request.onsuccess = () => resolve(fullTemplate);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLeagueTemplate(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readwrite');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// TEAM OPERATIONS
// ============================================

export async function getAllTeams(): Promise<Team[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getTeam(id: string): Promise<Team | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTeam(team: Omit<Team, 'id' | 'createdDate' | 'lastModified'> & { id?: string }): Promise<Team> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullTeam: Team = {
    ...team,
    id: team.id || generateId('team'),
    createdDate: team.id ? (await getTeam(team.id))?.createdDate || now : now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.put(fullTeam);

    request.onsuccess = () => resolve(fullTeam);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTeam(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// PLAYER OPERATIONS
// ============================================

export async function getAllPlayers(): Promise<Player[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayer(id: string): Promise<Player | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayersByTeam(teamId: string | null): Promise<Player[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const index = store.index('currentTeamId');
    const request = index.getAll(teamId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function savePlayer(player: Omit<Player, 'id' | 'createdDate' | 'lastModified'> & { id?: string }): Promise<Player> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullPlayer: Player = {
    ...player,
    id: player.id || generateId('player'),
    createdDate: player.id ? (await getPlayer(player.id))?.createdDate || now : now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.put(fullPlayer);

    request.onsuccess = () => resolve(fullPlayer);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePlayer(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// RULES PRESET OPERATIONS
// ============================================

export async function getAllRulesPresets(): Promise<RulesPreset[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readonly');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getRulesPreset(id: string): Promise<RulesPreset | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readonly');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRulesPreset(preset: Omit<RulesPreset, 'id' | 'createdDate' | 'lastModified'> & { id?: string }): Promise<RulesPreset> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullPreset: RulesPreset = {
    ...preset,
    id: preset.id || generateId('rules'),
    createdDate: preset.id ? (await getRulesPreset(preset.id))?.createdDate || now : now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readwrite');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.put(fullPreset);

    request.onsuccess = () => resolve(fullPreset);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRulesPreset(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readwrite');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// TEAM ROSTER OPERATIONS
// ============================================

export async function getTeamRoster(teamId: string): Promise<TeamRoster | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_ROSTERS, 'readonly');
    const store = tx.objectStore(STORES.TEAM_ROSTERS);
    const request = store.get(teamId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTeamRoster(roster: TeamRoster): Promise<TeamRoster> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullRoster: TeamRoster = {
    ...roster,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_ROSTERS, 'readwrite');
    const store = tx.objectStore(STORES.TEAM_ROSTERS);
    const request = store.put(fullRoster);

    request.onsuccess = () => resolve(fullRoster);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTeamRoster(teamId: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_ROSTERS, 'readwrite');
    const store = tx.objectStore(STORES.TEAM_ROSTERS);
    const request = store.delete(teamId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// DEFAULT PRESETS
// ============================================

export const DEFAULT_RULES_PRESETS: Omit<RulesPreset, 'id' | 'createdDate' | 'lastModified'>[] = [
  {
    name: 'Standard',
    description: 'Balanced settings for typical play',
    isDefault: true,
    isEditable: false,
    game: {
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      mercyRule: { enabled: false, runDifferential: 10, afterInning: 7 },
      pitchCounts: { enabled: true, starterLimit: 100, relieverLimit: 40 },
      moundVisits: { enabled: true, perGame: 5 },
    },
    season: {
      gamesPerTeam: 50,
      scheduleType: 'balanced',
      allStarGame: true,
      allStarTiming: 0.5,
      tradeDeadline: { enabled: true, timing: 0.75 },
    },
    playoffs: {
      teamsQualifying: 4,
      format: 'bracket',
      seriesLengths: [5, 7, 7],
      homeFieldAdvantage: 'higher_seed',
    },
  },
  {
    name: 'Quick Play',
    description: 'Shorter games and seasons for faster completion',
    isDefault: false,
    isEditable: false,
    game: {
      inningsPerGame: 6,
      extraInningsRule: 'runner_on_second',
      mercyRule: { enabled: true, runDifferential: 8, afterInning: 4 },
      pitchCounts: { enabled: false, starterLimit: 100, relieverLimit: 40 },
      moundVisits: { enabled: false, perGame: 5 },
    },
    season: {
      gamesPerTeam: 16,
      scheduleType: 'balanced',
      allStarGame: false,
      allStarTiming: 0.5,
      tradeDeadline: { enabled: false, timing: 0.75 },
    },
    playoffs: {
      teamsQualifying: 4,
      format: 'bracket',
      seriesLengths: [3, 5],
      homeFieldAdvantage: 'higher_seed',
    },
  },
  {
    name: 'Full Simulation',
    description: 'MLB-style 162 game season with full rules',
    isDefault: false,
    isEditable: false,
    game: {
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      mercyRule: { enabled: false, runDifferential: 10, afterInning: 7 },
      pitchCounts: { enabled: true, starterLimit: 120, relieverLimit: 50 },
      moundVisits: { enabled: true, perGame: 6 },
    },
    season: {
      gamesPerTeam: 162,
      scheduleType: 'division_heavy',
      allStarGame: true,
      allStarTiming: 0.55,
      tradeDeadline: { enabled: true, timing: 0.65 },
    },
    playoffs: {
      teamsQualifying: 10,
      format: 'best_record_bye',
      seriesLengths: [3, 5, 7, 7],
      homeFieldAdvantage: 'higher_seed',
    },
  },
];

export async function initializeDefaultPresets(): Promise<void> {
  const existing = await getAllRulesPresets();
  if (existing.length > 0) return;

  for (const preset of DEFAULT_RULES_PRESETS) {
    await saveRulesPreset(preset);
  }
}

// ============================================
// CLEAR OPERATIONS
// ============================================

export async function clearAllLeagueBuilderData(): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.LEAGUE_TEMPLATES, STORES.GLOBAL_TEAMS, STORES.GLOBAL_PLAYERS, STORES.RULES_PRESETS, STORES.TEAM_ROSTERS],
      'readwrite'
    );

    tx.objectStore(STORES.LEAGUE_TEMPLATES).clear();
    tx.objectStore(STORES.GLOBAL_TEAMS).clear();
    tx.objectStore(STORES.GLOBAL_PLAYERS).clear();
    tx.objectStore(STORES.RULES_PRESETS).clear();
    tx.objectStore(STORES.TEAM_ROSTERS).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================
// SMB4 DATABASE SEEDING
// ============================================

import { TEAMS as SMB4_TEAMS, PLAYERS as SMB4_PLAYERS, type PlayerData, type TeamData } from '../data/playerDatabase';

/**
 * Chemistry code to full chemistry name mapping
 */
const CHEMISTRY_MAP: Record<string, Chemistry> = {
  'SPI': 'Spirited',
  'DIS': 'Disciplined',
  'CMP': 'Competitive',
  'SCH': 'Scholarly',
  'CRA': 'Crafty',
  'SPIRITED': 'Spirited',
  'DISCIPLINED': 'Disciplined',
  'COMPETITIVE': 'Competitive',
  'SCHOLARLY': 'Scholarly',
  'CRAFTY': 'Crafty',
  'FIERY': 'Competitive',  // Map FIERY to Competitive
  'GRITTY': 'Competitive', // Map GRITTY to Competitive
};

/**
 * Convert SMB4 PlayerData to League Builder Player format
 */
function convertPlayer(player: PlayerData): Omit<Player, 'createdDate' | 'lastModified'> {
  // Split name into first/last
  const nameParts = player.name.split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || player.id;

  // Map chemistry code to full name
  const chemistry = CHEMISTRY_MAP[player.chemistry] || CHEMISTRY_MAP[player.chemistry.toUpperCase()] || 'Competitive';

  // Determine position for League Builder format
  let primaryPosition: Position = player.primaryPosition as Position;
  if (player.isPitcher && player.pitcherRole) {
    // Map pitcher role to position
    if (player.pitcherRole === 'CP') {
      primaryPosition = 'CP';
    } else if (player.pitcherRole === 'RP') {
      primaryPosition = 'RP';
    } else if (player.pitcherRole === 'SP/RP') {
      primaryPosition = 'SP/RP';
    } else {
      primaryPosition = 'SP';
    }
  }

  // Determine roster status based on role
  let rosterStatus: RosterStatus = 'MLB';
  if (player.role === 'BENCH' || player.role === 'BULLPEN') {
    rosterStatus = 'MLB';
  }

  return {
    id: player.id,
    firstName,
    lastName,
    gender: player.gender,
    age: player.age,
    bats: player.bats,
    throws: player.throws,
    primaryPosition,
    secondaryPosition: player.secondaryPosition as Position | undefined,
    // Batting ratings (default to 50 if not present)
    power: player.batterRatings?.power ?? 50,
    contact: player.batterRatings?.contact ?? 50,
    speed: player.batterRatings?.speed ?? 50,
    fielding: player.batterRatings?.fielding ?? 50,
    arm: player.batterRatings?.arm ?? 50,
    // Pitching ratings (default to 50 if not present)
    velocity: player.pitcherRatings?.velocity ?? 50,
    junk: player.pitcherRatings?.junk ?? 50,
    accuracy: player.pitcherRatings?.accuracy ?? 50,
    arsenal: (player.arsenal as PitchType[]) || [],
    overallGrade: player.overall as Grade,
    trait1: player.traits.trait1,
    trait2: player.traits.trait2,
    personality: 'Competitive', // Default personality
    chemistry,
    morale: 75, // Default morale
    mojo: 'Normal',
    fame: 0,
    salary: 1.0, // Default salary in millions
    currentTeamId: player.teamId === 'free-agent' ? null : player.teamId,
    rosterStatus,
    isCustom: false,
    sourceDatabase: 'SMB4',
  };
}

/**
 * Convert SMB4 TeamData to League Builder Team format
 */
function convertTeam(team: TeamData): Omit<Team, 'createdDate' | 'lastModified'> {
  // Extract location and nickname from team name
  // Most teams are just a nickname (e.g., "Sirloins", "Beewolves")
  const name = team.name;

  return {
    id: team.id,
    name: team.name,
    abbreviation: team.id.substring(0, 3).toUpperCase(),
    location: '', // SMB4 teams don't have locations
    nickname: name,
    colors: {
      primary: team.primaryColor,
      secondary: team.secondaryColor,
    },
    stadium: team.homePark,
    leagueIds: team.leagueId ? [team.leagueId] : [],
  };
}

/**
 * Seed the League Builder database with SMB4 teams and players
 * @param clearExisting - If true, clears existing data before seeding
 * @returns Object with counts of seeded teams and players
 */
export async function seedFromSMB4Database(clearExisting = true): Promise<{ teams: number; players: number }> {
  const db = await initLeagueBuilderDatabase();

  if (clearExisting) {
    // Clear existing teams and players only (preserve leagues, rules, rosters)
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.GLOBAL_TEAMS, STORES.GLOBAL_PLAYERS], 'readwrite');
      tx.objectStore(STORES.GLOBAL_TEAMS).clear();
      tx.objectStore(STORES.GLOBAL_PLAYERS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  let teamCount = 0;
  let playerCount = 0;

  // Seed teams (excluding free-agent pool)
  for (const teamData of Object.values(SMB4_TEAMS)) {
    if (teamData.id === 'free-agent') continue; // Skip free agent pool

    const team = convertTeam(teamData);
    await saveTeam(team);
    teamCount++;
  }

  // Seed players
  for (const playerData of Object.values(SMB4_PLAYERS)) {
    const player = convertPlayer(playerData);
    await savePlayer(player);
    playerCount++;
  }

  console.log(`[LeagueBuilder] Seeded ${teamCount} teams and ${playerCount} players from SMB4 database`);

  return { teams: teamCount, players: playerCount };
}

/**
 * Check if the database has been seeded with SMB4 data
 */
export async function isSMB4DatabaseSeeded(): Promise<boolean> {
  const players = await getAllPlayers();
  return players.some(p => p.sourceDatabase === 'SMB4');
}
