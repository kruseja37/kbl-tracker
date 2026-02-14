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

export type RosterStatus = 'MLB' | 'FARM' | 'FREE_AGENT' | 'RETIRED';

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
  managerId?: string;
  managerName?: string;
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
      // Auto-invalidate singleton if the database is externally closed or version-changed
      dbInstance.onclose = () => { dbInstance = null; };
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
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

/**
 * Retire a player: mark RETIRED in the player record and remove from
 * their team roster (mlbRoster, lineups, rotation, bullpen, depth chart, etc.).
 */
export async function retirePlayer(playerId: string): Promise<void> {
  // 1. Update the player record
  const player = await getPlayer(playerId);
  if (!player) return;

  const previousTeamId = player.currentTeamId;

  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const updatedPlayer: Player = {
    ...player,
    rosterStatus: 'RETIRED',
    currentTeamId: null,
    lastModified: now,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.put(updatedPlayer);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Remove from team roster if they were on one
  if (!previousTeamId) return;

  const roster = await getTeamRoster(previousTeamId);
  if (!roster) return;

  const removeId = (arr: string[]) => arr.filter(id => id !== playerId);
  const removeFromLineup = (slots: LineupSlot[]) => slots.filter(s => s.playerId !== playerId);
  const removeFromDepth = (dc: DepthChart): DepthChart => {
    const cleaned = { ...dc };
    for (const pos of Object.keys(cleaned) as (keyof DepthChart)[]) {
      cleaned[pos] = removeId(cleaned[pos]);
    }
    return cleaned;
  };

  const cleanedRoster: TeamRoster = {
    ...roster,
    mlbRoster: removeId(roster.mlbRoster),
    farmRoster: removeId(roster.farmRoster),
    lineupVsRHP: removeFromLineup(roster.lineupVsRHP),
    lineupVsLHP: removeFromLineup(roster.lineupVsLHP),
    startingRotation: removeId(roster.startingRotation),
    closingPitcher: roster.closingPitcher === playerId ? '' : roster.closingPitcher,
    setupPitchers: removeId(roster.setupPitchers),
    depthChart: removeFromDepth(roster.depthChart),
    pinchHitOrder: removeId(roster.pinchHitOrder),
    pinchRunOrder: removeId(roster.pinchRunOrder),
    defensiveSubOrder: removeId(roster.defensiveSubOrder),
  };

  await saveTeamRoster(cleanedRoster);
}

/**
 * Transfer a player from one team to another.
 * Removes from old team roster arrays, adds to new team's mlbRoster,
 * and updates the player's currentTeamId.
 */
export async function transferPlayer(playerId: string, newTeamId: string): Promise<void> {
  const player = await getPlayer(playerId);
  if (!player) return;

  const oldTeamId = player.currentTeamId;

  // 1. Update player record
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const updatedPlayer: Player = {
    ...player,
    currentTeamId: newTeamId,
    lastModified: now,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.put(updatedPlayer);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Remove from old team roster
  if (oldTeamId) {
    const oldRoster = await getTeamRoster(oldTeamId);
    if (oldRoster) {
      const removeId = (arr: string[]) => arr.filter(id => id !== playerId);
      const removeFromLineup = (slots: LineupSlot[]) => slots.filter(s => s.playerId !== playerId);
      const removeFromDepth = (dc: DepthChart): DepthChart => {
        const cleaned = { ...dc };
        for (const pos of Object.keys(cleaned) as (keyof DepthChart)[]) {
          cleaned[pos] = removeId(cleaned[pos]);
        }
        return cleaned;
      };

      await saveTeamRoster({
        ...oldRoster,
        mlbRoster: removeId(oldRoster.mlbRoster),
        farmRoster: removeId(oldRoster.farmRoster),
        lineupVsRHP: removeFromLineup(oldRoster.lineupVsRHP),
        lineupVsLHP: removeFromLineup(oldRoster.lineupVsLHP),
        startingRotation: removeId(oldRoster.startingRotation),
        closingPitcher: oldRoster.closingPitcher === playerId ? '' : oldRoster.closingPitcher,
        setupPitchers: removeId(oldRoster.setupPitchers),
        depthChart: removeFromDepth(oldRoster.depthChart),
        pinchHitOrder: removeId(oldRoster.pinchHitOrder),
        pinchRunOrder: removeId(oldRoster.pinchRunOrder),
        defensiveSubOrder: removeId(oldRoster.defensiveSubOrder),
      });
    }
  }

  // 3. Add to new team roster
  const newRoster = await getTeamRoster(newTeamId);
  if (newRoster && !newRoster.mlbRoster.includes(playerId)) {
    await saveTeamRoster({
      ...newRoster,
      mlbRoster: [...newRoster.mlbRoster, playerId],
    });
  }
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
import { SUPER_MEGA_LEAGUE } from '../data/leagueStructure';
import { calculateSalary, type PlayerForSalary, type PlayerPosition as SalaryPosition } from '../engines/salaryCalculator';

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
 * Compute salary from SMB4 player ratings using the salary engine
 */
function computeInitialSalary(player: PlayerData, primaryPosition: Position): number {
  const posMap: Record<string, SalaryPosition> = {
    'C': 'C', '1B': '1B', '2B': '2B', 'SS': 'SS', '3B': '3B',
    'LF': 'LF', 'CF': 'CF', 'RF': 'RF', 'DH': 'DH',
    'SP': 'SP', 'RP': 'RP', 'CP': 'CP', 'SP/RP': 'SP/RP',
  };
  const salaryPlayer: PlayerForSalary = {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    primaryPosition: posMap[primaryPosition] || 'UTIL',
    ratings: player.isPitcher
      ? { velocity: player.pitcherRatings?.velocity ?? 50, junk: player.pitcherRatings?.junk ?? 50, accuracy: player.pitcherRatings?.accuracy ?? 50 }
      : { power: player.batterRatings?.power ?? 50, contact: player.batterRatings?.contact ?? 50, speed: player.batterRatings?.speed ?? 50, fielding: player.batterRatings?.fielding ?? 50, arm: player.batterRatings?.arm ?? 50 },
    battingRatings: player.isPitcher && player.batterRatings
      ? { power: player.batterRatings.power, contact: player.batterRatings.contact, speed: player.batterRatings.speed, fielding: player.batterRatings.fielding, arm: player.batterRatings.arm }
      : undefined,
    age: player.age,
    personality: 'Competitive',
    fame: 0,
    traits: [player.traits.trait1, player.traits.trait2].filter((t): t is string => !!t),
  };
  return calculateSalary(salaryPlayer);
}

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
    salary: computeInitialSalary(player, primaryPosition),
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
  // Force-reset the DB singleton to ensure a fresh connection.
  // This prevents silent failures when IndexedDB was externally cleared
  // (e.g., via devtools) and the cached connection is stale.
  dbInstance = null;

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

  // Post-seed verification: read back counts to confirm writes persisted
  const verifyTeams = await getAllTeams();
  const verifyPlayers = await getAllPlayers();
  const persistedTeams = verifyTeams.length;
  const persistedPlayers = verifyPlayers.length;

  if (persistedTeams === 0 && teamCount > 0) {
    throw new Error(
      `SMB4 import verification failed: wrote ${teamCount} teams but read back 0. ` +
      `Database may have been cleared externally. Please try again.`
    );
  }
  if (persistedPlayers === 0 && playerCount > 0) {
    throw new Error(
      `SMB4 import verification failed: wrote ${playerCount} players but read back 0. ` +
      `Database may have been cleared externally. Please try again.`
    );
  }

  console.log(`[LeagueBuilder] Verified: ${persistedTeams} teams, ${persistedPlayers} players in DB`);

  // Step 3: Auto-create "Super Mega League" template from leagueStructure.ts
  // This ensures IMPORT SMB4 DATA is a single-click full recovery.
  const allTeamIds: string[] = [];
  const conferences: Conference[] = [];
  const divisions: Division[] = [];

  for (const conf of SUPER_MEGA_LEAGUE.conferences) {
    const divisionIds: string[] = [];
    for (const div of conf.divisions) {
      divisionIds.push(div.id);
      allTeamIds.push(...div.teamIds);
      divisions.push({
        id: div.id,
        name: div.name,
        conferenceId: conf.id,
        teamIds: [...div.teamIds],
      });
    }
    conferences.push({
      id: conf.id,
      name: conf.name,
      abbreviation: conf.name === 'Super Conference' ? 'SUP' : 'MEG',
      divisionIds,
    });
  }

  await saveLeagueTemplate({
    id: 'sml',
    name: SUPER_MEGA_LEAGUE.name,
    description: 'Default SMB4 league — 20 teams, 2 conferences, 4 divisions',
    teamIds: allTeamIds,
    conferences,
    divisions,
    defaultRulesPreset: 'standard',
  });

  console.log(`[LeagueBuilder] Created "${SUPER_MEGA_LEAGUE.name}" league template with ${allTeamIds.length} teams`);

  return { teams: persistedTeams, players: persistedPlayers };
}

/**
 * Check if the database has been seeded with SMB4 data
 */
export async function isSMB4DatabaseSeeded(): Promise<boolean> {
  const players = await getAllPlayers();
  return players.some(p => p.sourceDatabase === 'SMB4');
}
