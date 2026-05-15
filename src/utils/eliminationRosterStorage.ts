import { getTrackerDb } from '../utils/trackerDb';
import {
  getTeamRoster,
  type LineupSlot,
  type Player,
  type TeamRoster,
  type Position,
} from '../utils/leagueBuilderStorage';
import type { Player as GameTrackerPlayer, Pitcher as GameTrackerPitcher } from '../src_figma/app/components/TeamRoster';
import {
  getEliminationPlayersByTeam,
  getEliminationTeam,
} from './eliminationPlayerStorage';
import { syncEngine } from './syncEngine';
import type { OptimalLineupSnapshot } from '../types/managerWpa';

const SNAPSHOT_STORE = 'rosterSnapshots';
const FIELD_POSITIONS_WITH_DH: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const FIELD_POSITIONS_NO_DH: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CP', 'SP/RP']);

export interface EliminationRosterSnapshot {
  key: string;
  eliminationId: string;
  teamId: string;
  teamName: string;
  players: Player[];
  lineup: LineupSlot[];
  lineupWithoutDH?: LineupSlot[];
  optimalLineupVsRHPWithDH?: OptimalLineupSnapshot;
  optimalLineupVsLHPWithDH?: OptimalLineupSnapshot;
  optimalLineupVsRHPWithoutDH?: OptimalLineupSnapshot;
  optimalLineupVsLHPWithoutDH?: OptimalLineupSnapshot;
  startingRotation: string[];
  snapshotAt: number;
}

function isPitcher(player: Player): boolean {
  return PITCHER_POSITIONS.has(player.primaryPosition);
}

function getPlayerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function getBestPosition(
  player: Player,
  usedPositions: Set<Position>,
  availablePositions: readonly Position[],
  fallback: Position,
): Position {
  if (player.primaryPosition && availablePositions.includes(player.primaryPosition) && !usedPositions.has(player.primaryPosition)) {
    return player.primaryPosition;
  }

  if (player.secondaryPosition && availablePositions.includes(player.secondaryPosition) && !usedPositions.has(player.secondaryPosition)) {
    return player.secondaryPosition;
  }

  return availablePositions.find((position) => !usedPositions.has(position)) ?? fallback;
}

export function getNormalizedEliminationLineup(
  snapshot: EliminationRosterSnapshot,
  useDH = true,
): LineupSlot[] {
  const fieldPositions = useDH ? FIELD_POSITIONS_WITH_DH : FIELD_POSITIONS_NO_DH;
  const targetNonPitchers = useDH ? 9 : 8;
  const playerMap = new Map(snapshot.players.map((player) => [player.id, player]));
  // Select the correct stored lineup variant; fall back to DH lineup if no-DH isn't configured
  const sourceLineup = (!useDH && snapshot.lineupWithoutDH && snapshot.lineupWithoutDH.length > 0)
    ? snapshot.lineupWithoutDH
    : snapshot.lineup;
  const validExisting = [...sourceLineup]
    .filter((slot) => {
      const player = playerMap.get(slot.playerId);
      if (!player || isPitcher(player)) return false;
      return useDH || slot.fieldingPosition !== 'DH';
    })
    .sort((a, b) => a.battingOrder - b.battingOrder);

  const normalized: LineupSlot[] = [];
  const usedPlayerIds = new Set<string>();
  const usedPositions = new Set<Position>();

  for (const slot of validExisting) {
    if (usedPlayerIds.has(slot.playerId)) continue;
    normalized.push({
      battingOrder: normalized.length + 1,
      playerId: slot.playerId,
      fieldingPosition: slot.fieldingPosition,
    });
    usedPlayerIds.add(slot.playerId);
    usedPositions.add(slot.fieldingPosition);
    if (normalized.length === targetNonPitchers) break;
  }

  const availablePlayers = snapshot.players.filter((player) => !isPitcher(player) && !usedPlayerIds.has(player.id));
  for (const player of availablePlayers) {
    normalized.push({
      battingOrder: normalized.length + 1,
      playerId: player.id,
      fieldingPosition: getBestPosition(
        player,
        usedPositions,
        fieldPositions,
        useDH ? 'DH' : fieldPositions[fieldPositions.length - 1],
      ),
    });
    usedPlayerIds.add(player.id);
    usedPositions.add(normalized[normalized.length - 1].fieldingPosition);
    if (normalized.length === targetNonPitchers) break;
  }

  if (!useDH) {
    const starterId = getNormalizedEliminationRotation(snapshot)[0]
      ?? snapshot.players.find(isPitcher)?.id;
    if (starterId && !usedPlayerIds.has(starterId)) {
      normalized.push({
        battingOrder: normalized.length + 1,
        playerId: starterId,
        fieldingPosition: 'P' as unknown as Position,
      });
    }
  }

  return normalized;
}

export function getNormalizedEliminationRotation(snapshot: EliminationRosterSnapshot): string[] {
  const pitcherIds = snapshot.players.filter(isPitcher).map((player) => player.id);
  const orderedExisting = snapshot.startingRotation.filter((playerId) => pitcherIds.includes(playerId));
  const remaining = pitcherIds.filter((playerId) => !orderedExisting.includes(playerId));
  return [...orderedExisting, ...remaining];
}

function convertToGameTrackerPlayer(
  player: Player,
  battingOrder?: number,
  position?: string
): GameTrackerPlayer {
  return {
    name: getPlayerName(player),
    position: position || player.primaryPosition || 'DH',
    battingOrder,
    stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
    battingHand: player.bats === 'S' ? 'S' : player.bats,
    playerId: player.id,
    primaryPosition: player.primaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fieldingRating: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    arsenal: player.arsenal as string[] | undefined,
    overallGrade: player.overallGrade,
    trait1: player.trait1,
    trait2: player.trait2,
    personality: player.personality,
    chemistry: player.chemistry,
    age: player.age,
    throws: player.throws,
    secondaryPosition: player.secondaryPosition,
  };
}

function convertToGameTrackerPitcher(
  player: Player,
  isActive: boolean,
  isStarter: boolean
): GameTrackerPitcher {
  return {
    name: getPlayerName(player),
    stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
    throwingHand: player.throws,
    isStarter,
    isActive,
    playerId: player.id,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    arsenal: player.arsenal as string[] | undefined,
    overallGrade: player.overallGrade,
    trait1: player.trait1,
    trait2: player.trait2,
    personality: player.personality,
    chemistry: player.chemistry,
    age: player.age,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fieldingRating: player.fielding,
    arm: player.arm,
  };
}

function getSnapshotKey(eliminationId: string, teamId: string): string {
  return `elim-roster-${eliminationId}-${teamId}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function buildSnapshot(
  eliminationId: string,
  teamId: string,
  teamName: string,
  players: Player[],
  roster: TeamRoster
): EliminationRosterSnapshot {
  return {
    key: getSnapshotKey(eliminationId, teamId),
    eliminationId,
    teamId,
    teamName,
    players,
    lineup: roster.lineupWithDH,
    lineupWithoutDH: roster.lineupWithoutDH,
    optimalLineupVsRHPWithDH: roster.optimalLineupVsRHPWithDH,
    optimalLineupVsLHPWithDH: roster.optimalLineupVsLHPWithDH,
    optimalLineupVsRHPWithoutDH: roster.optimalLineupVsRHPWithoutDH,
    optimalLineupVsLHPWithoutDH: roster.optimalLineupVsLHPWithoutDH,
    startingRotation: roster.startingRotation,
    snapshotAt: Date.now(),
  };
}

function buildFallbackLineup(
  players: Player[],
  useDH: boolean,
): LineupSlot[] {
  const fieldPositions = useDH ? FIELD_POSITIONS_WITH_DH : FIELD_POSITIONS_NO_DH;
  const positionPlayers = players.filter((player) => !isPitcher(player));
  const pitchers = players.filter(isPitcher);
  const usedPositions = new Set<Position>();
  const lineup: LineupSlot[] = [];

  for (const player of positionPlayers) {
    if (lineup.length >= fieldPositions.length) break;
    const fieldingPosition = getBestPosition(
      player,
      usedPositions,
      fieldPositions,
      fieldPositions[lineup.length] ?? fieldPositions[fieldPositions.length - 1],
    );
    usedPositions.add(fieldingPosition);
    lineup.push({
      battingOrder: lineup.length + 1,
      playerId: player.id,
      fieldingPosition,
    });
  }

  if (!useDH) {
    const starter = pitchers.find((player) => player.primaryPosition === 'SP') ?? pitchers[0];
    if (starter) {
      lineup.push({
        battingOrder: lineup.length + 1,
        playerId: starter.id,
        fieldingPosition: 'P',
      });
    }
  }

  return lineup;
}

function buildFallbackRoster(teamId: string, players: Player[]): TeamRoster {
  const pitchers = players.filter(isPitcher);
  const startingRotation = pitchers
    .filter((player) => player.primaryPosition === 'SP')
    .map((player) => player.id);
  const closingPitcher = pitchers.find((player) => player.primaryPosition === 'CP')?.id ?? '';
  const assignedPitchers = new Set([...startingRotation, closingPitcher].filter(Boolean));

  const depthChart = {
    C: [] as string[],
    '1B': [] as string[],
    '2B': [] as string[],
    SS: [] as string[],
    '3B': [] as string[],
    LF: [] as string[],
    CF: [] as string[],
    RF: [] as string[],
    DH: [] as string[],
    SP: [] as string[],
    RP: [] as string[],
    CP: [] as string[],
  };

  for (const player of players) {
    const primary = player.primaryPosition;
    if (primary in depthChart) {
      depthChart[primary as keyof typeof depthChart].push(player.id);
    }
  }

  return {
    teamId,
    mlbRoster: players.map((player) => player.id),
    farmRoster: [],
    lineupWithDH: buildFallbackLineup(players, true),
    lineupWithoutDH: buildFallbackLineup(players, false),
    startingRotation: startingRotation.length > 0 ? startingRotation : pitchers.map((player) => player.id),
    longRelievers: pitchers.filter((player) => player.primaryPosition === 'SP/RP').map((player) => player.id),
    closingPitcher,
    setupPitchers: pitchers.filter((player) => !assignedPitchers.has(player.id)).map((player) => player.id),
    depthChart,
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: new Date().toISOString(),
  };
}

/**
 * Create frozen roster snapshots for every team in an elimination bracket.
 */
export async function createRosterSnapshots(eliminationId: string, teamIds: string[]): Promise<void> {
  const snapshots = await Promise.all(
    teamIds.map(async (teamId) => {
      const [team, roster] = await Promise.all([
        getEliminationTeam(eliminationId, teamId),
        getTeamRoster(teamId),
      ]);

      if (!team) {
        throw new Error(`Elimination team not found for snapshot: ${teamId}`);
      }

      const players = await getEliminationPlayersByTeam(eliminationId, teamId);
      if (players.length === 0) {
        throw new Error(`No copied elimination players found for snapshot: ${teamId}`);
      }

      return buildSnapshot(
        eliminationId,
        teamId,
        team.name,
        players,
        roster ?? buildFallbackRoster(teamId, players),
      );
    })
  );

  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
  const store = tx.objectStore(SNAPSHOT_STORE);

  for (const snapshot of snapshots) {
    await requestToPromise(store.put(snapshot));
    if (!syncEngine.isSuppressed()) {
      syncEngine.upsert('kbl-tracker', SNAPSHOT_STORE, snapshot.key, snapshot);
    }
  }

  await transactionToPromise(tx);
}

/**
 * Get a single roster snapshot by elimination ID and team ID.
 */
export async function getEliminationRosterSnapshot(
  eliminationId: string,
  teamId: string
): Promise<EliminationRosterSnapshot | null> {
  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
  const store = tx.objectStore(SNAPSHOT_STORE);
  const snapshot = await requestToPromise(store.get(getSnapshotKey(eliminationId, teamId)));

  return (snapshot as EliminationRosterSnapshot | undefined) ?? null;
}

/**
 * Get every roster snapshot for a single elimination bracket.
 */
export async function getAllEliminationRosterSnapshots(
  eliminationId: string
): Promise<EliminationRosterSnapshot[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
  const store = tx.objectStore(SNAPSHOT_STORE);
  const index = store.index('eliminationId');
  const snapshots = await requestToPromise(index.getAll(eliminationId));

  return (snapshots as EliminationRosterSnapshot[]).sort((a, b) => a.teamName.localeCompare(b.teamName));
}

/**
 * Update lineup or rotation data for a frozen roster snapshot.
 */
export async function updateEliminationRosterSnapshot(
  eliminationId: string,
  teamId: string,
  updates: Partial<Pick<
    EliminationRosterSnapshot,
    | 'lineup'
    | 'lineupWithoutDH'
    | 'startingRotation'
    | 'optimalLineupVsRHPWithDH'
    | 'optimalLineupVsLHPWithDH'
    | 'optimalLineupVsRHPWithoutDH'
    | 'optimalLineupVsLHPWithoutDH'
  >>
): Promise<void> {
  const existing = await getEliminationRosterSnapshot(eliminationId, teamId);

  if (!existing) {
    throw new Error(`Roster snapshot not found: ${eliminationId}/${teamId}`);
  }

  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
  const store = tx.objectStore(SNAPSHOT_STORE);

  const updated = {
    ...existing,
    ...updates,
  };

  await requestToPromise(store.put(updated));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert('kbl-tracker', SNAPSHOT_STORE, updated.key, updated);
  }
}

export async function buildEliminationGameTrackerRoster(
  eliminationId: string,
  teamId: string,
  useDH = true,
): Promise<{
  players: GameTrackerPlayer[];
  pitchers: GameTrackerPitcher[];
  optimalLineups?: {
    vsRHP?: OptimalLineupSnapshot;
    vsLHP?: OptimalLineupSnapshot;
  };
}> {
  const snapshot = await getEliminationRosterSnapshot(eliminationId, teamId);
  if (!snapshot) {
    throw new Error(`Roster snapshot not found: ${eliminationId}/${teamId}`);
  }

  const normalizedLineup = getNormalizedEliminationLineup(snapshot, useDH);
  const normalizedRotation = getNormalizedEliminationRotation(snapshot);
  const playerMap = new Map(snapshot.players.map((player) => [player.id, player]));
  const lineupIds = new Set(normalizedLineup.map((slot) => slot.playerId));

  const players: GameTrackerPlayer[] = normalizedLineup
    .map((slot) => {
      const player = playerMap.get(slot.playerId);
      return player
        ? convertToGameTrackerPlayer(player, slot.battingOrder, slot.fieldingPosition)
        : null;
    })
    .filter((player): player is GameTrackerPlayer => Boolean(player));

  const benchPlayers = snapshot.players
    .filter((player) => !isPitcher(player) && !lineupIds.has(player.id))
    .map((player) => convertToGameTrackerPlayer(player));

  const pitchers = normalizedRotation
    .map((playerId, index) => {
      const player = playerMap.get(playerId);
      return player
        ? convertToGameTrackerPitcher(player, index === 0, index === 0 || player.primaryPosition === 'SP')
        : null;
    })
    .filter((player): player is GameTrackerPitcher => Boolean(player));

  return {
    players: [...players, ...benchPlayers],
    pitchers,
    optimalLineups: useDH
      ? {
          vsRHP: snapshot.optimalLineupVsRHPWithDH,
          vsLHP: snapshot.optimalLineupVsLHPWithDH,
        }
      : {
          vsRHP: snapshot.optimalLineupVsRHPWithoutDH,
          vsLHP: snapshot.optimalLineupVsLHPWithoutDH,
        },
  };
}

/**
 * Delete every roster snapshot tied to an elimination bracket.
 */
export async function deleteEliminationRosterSnapshots(eliminationId: string): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
  const store = tx.objectStore(SNAPSHOT_STORE);
  const index = store.index('eliminationId');
  const keys = await requestToPromise(index.getAllKeys(eliminationId));

  for (const key of keys as IDBValidKey[]) {
    await requestToPromise(store.delete(key));
    if (!syncEngine.isSuppressed()) {
      syncEngine.remove('kbl-tracker', SNAPSHOT_STORE, String(key));
    }
  }

  await transactionToPromise(tx);
}
