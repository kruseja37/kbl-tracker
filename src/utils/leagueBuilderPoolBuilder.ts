/**
 * Draft-pool builder — the logic seam behind the Draft Setup screen.
 *
 * First-principles model (see spec-docs/DRAFT_POOL_SETUP_REDESIGN_DESIGN.md):
 *   A draft pool is a league-scoped, lockable SET of players, each carrying a computed IV.
 *   Membership lives on `player.leagueAssignments` (Source A) ∪ the league's team rosters
 *   (Source B) — exactly what `registerLeaguePoolForLeague` already unions. This module adds
 *   the BULK membership writes + the LOCK that the redesign needs, reusing the existing
 *   registration/IV seam. Nothing here reshapes `leagueBuilderStorage.ts` (additive-only,
 *   cross-branch overlap file) — only its existing exports are called.
 *
 * The lock makes emptying the teams safe: once the pool is registered + locked, the snapshot
 * is independent of the team rosters, so Start Draft can clear the teams without losing pool
 * members. Lock is reversible (Unlock) until the draft actually starts.
 */
import {
  registerLeaguePoolForLeague,
  toSalaryPlayer,
} from './leagueBuilderPoolRegistration';
import { calculateIvBaseSalary } from '../engines/salaryCalculator';
import {
  getAllPlayers,
  getLeagueTemplate,
  getPlayer,
  getRegisteredPool,
  getTeamRoster,
  savePlayer,
  saveRegisteredPool,
  saveTeamRoster,
  type Player,
} from './leagueBuilderStorage';
import { MLB_AUCTION_ROSTER_SLOTS } from './leagueBuilderAuctionPipeline';
import { POOL_SURPLUS_MAX } from '../data/rosterEngineConstants';
import type { RegisteredPool } from '../engines/leagueConstruction';

/** A player is IN the league pool iff it carries an assignment for that league. */
export function isPlayerInLeaguePool(player: Player, leagueId: string): boolean {
  return Boolean(player.leagueAssignments?.some((assignment) => assignment.leagueId === leagueId));
}

/**
 * The live per-player IV for the Draft Setup pool table — the SAME calc the registration seam
 * uses per player, so the value shown as you build is identical to the value frozen at lock.
 */
export function computePlayerIv(player: Player): number {
  return calculateIvBaseSalary(toSalaryPlayer(player)).ivBase;
}

/** Throws if the league's pool is locked — membership is frozen until unlocked. */
async function assertPoolUnlocked(leagueId: string): Promise<void> {
  const pool = await getRegisteredPool(leagueId);
  if (pool?.locked) {
    throw new Error('Draft pool is locked. Unlock it before changing the pool.');
  }
}

/**
 * Add players to the league pool in bulk. Appends a FREE_AGENT league assignment (the same
 * shape the auction commit later rewrites to MLB/the winning team). Idempotent: a player
 * already in the pool is skipped. Rejected while the pool is locked.
 */
export async function addPlayersToLeaguePool(playerIds: string[], leagueId: string): Promise<void> {
  await assertPoolUnlocked(leagueId);
  for (const id of playerIds) {
    const player = await getPlayer(id);
    if (!player) continue;
    if (isPlayerInLeaguePool(player, leagueId)) continue;
    await savePlayer({
      ...player,
      leagueAssignments: [
        ...(player.leagueAssignments ?? []),
        { leagueId, teamId: '', rosterStatus: 'FREE_AGENT' },
      ],
    });
  }
}

/**
 * Remove players from the league pool in bulk. Rejected while the pool is locked. Removal is
 * AUTHORITATIVE against BOTH membership sources: it drops the league assignment AND pulls the
 * player off the league's branded-team rosters. The latter is essential — registration unions
 * team rosters into the pool (Source B), so a removed-but-still-rostered player would otherwise
 * reappear in the locked snapshot the auction consumes. (Team rosters are team-scoped; a team
 * shared across leagues has the player removed everywhere, consistent with clearTeamRoster.)
 */
export async function removePlayersFromLeaguePool(playerIds: string[], leagueId: string): Promise<void> {
  await assertPoolUnlocked(leagueId);
  const removeSet = new Set(playerIds);

  // 1) Drop the league assignment for each removed player.
  for (const id of removeSet) {
    const player = await getPlayer(id);
    if (!player) continue;
    if (!isPlayerInLeaguePool(player, leagueId)) continue;
    await savePlayer({
      ...player,
      leagueAssignments: (player.leagueAssignments ?? []).filter(
        (assignment) => assignment.leagueId !== leagueId,
      ),
    });
  }

  // 2) Pull them off the league's team rosters so the registration roster-union can't re-add them.
  const league = await getLeagueTemplate(leagueId);
  if (!league) return;
  for (const teamId of league.teamIds) {
    const roster = await getTeamRoster(teamId);
    if (!roster) continue;
    const mlbRoster = (roster.mlbRoster ?? []).filter((pid) => !removeSet.has(pid));
    const farmRoster = (roster.farmRoster ?? []).filter((pid) => !removeSet.has(pid));
    if (
      mlbRoster.length !== (roster.mlbRoster?.length ?? 0) ||
      farmRoster.length !== (roster.farmRoster?.length ?? 0)
    ) {
      await saveTeamRoster({ ...roster, mlbRoster, farmRoster });
    }
  }
}

/**
 * Pool mode (a): seed the pool from the players already rostered on the league's branded
 * teams (MLB + farm rosters, unioned). Returns the count added. Rejected while locked.
 */
export async function importRosteredPlayersToLeaguePool(leagueId: string): Promise<number> {
  await assertPoolUnlocked(leagueId);
  const league = await getLeagueTemplate(leagueId);
  if (!league) throw new Error('League not found');

  const allPlayers = await getAllPlayers();
  const playerById = new Map(allPlayers.map((player) => [player.id, player]));

  const rosteredIds = new Set<string>();
  for (const teamId of league.teamIds) {
    const roster = await getTeamRoster(teamId);
    for (const playerId of [...(roster?.mlbRoster ?? []), ...(roster?.farmRoster ?? [])]) {
      if (playerById.has(playerId)) rosteredIds.add(playerId);
    }
  }

  const toAdd = [...rosteredIds].filter((id) => {
    const player = playerById.get(id);
    return player ? !isPlayerInLeaguePool(player, leagueId) : false;
  });
  await addPlayersToLeaguePool(toAdd, leagueId);
  return toAdd.length;
}

/**
 * Lock the pool: register it (authoritative IV compute + persist via the existing seam),
 * then stamp `locked`/`lockedAt`. After this the snapshot is frozen and pool edits are
 * rejected; the auction consumes this exact snapshot. Returns the locked RegisteredPool.
 */
export async function lockLeaguePool(leagueId: string): Promise<RegisteredPool> {
  const pool = await registerLeaguePoolForLeague(leagueId);
  const locked: RegisteredPool = { ...pool, locked: true, lockedAt: Date.now() };
  await saveRegisteredPool(locked);
  return locked;
}

/** Re-open a locked pool for editing. Returns the unlocked pool, or null if none exists. */
export async function unlockLeaguePool(leagueId: string): Promise<RegisteredPool | null> {
  const pool = await getRegisteredPool(leagueId);
  if (!pool) return null;
  const unlocked: RegisteredPool = { ...pool, locked: false };
  await saveRegisteredPool(unlocked);
  return unlocked;
}

export type PoolSufficiency = {
  poolSize: number;
  mlbSlots: number;
  /** poolSize ≥ mlbSlots — the hard floor that gates Start Draft. */
  meetsFloor: boolean;
  /** poolSize − mlbSlots (can be negative when under-supplied). */
  surplus: number;
  /** poolSize > mlbSlots × POOL_SURPLUS_MAX — a soft warning (long auction), never a block. */
  overSupplyWarning: boolean;
};

/**
 * Slots-vs-pool sufficiency for the live indicator. mlbSlots = teamCount × 22. The floor is
 * the hard gate (you cannot fill rosters with fewer players than slots); the over-supply
 * warning reuses the existing POOL_SURPLUS_MAX (1.2×) threshold.
 */
export function evaluatePoolSufficiency(poolSize: number, teamCount: number): PoolSufficiency {
  const mlbSlots = teamCount * MLB_AUCTION_ROSTER_SLOTS;
  return {
    poolSize,
    mlbSlots,
    meetsFloor: poolSize >= mlbSlots,
    surplus: poolSize - mlbSlots,
    overSupplyWarning: mlbSlots > 0 && poolSize > mlbSlots * POOL_SURPLUS_MAX,
  };
}
