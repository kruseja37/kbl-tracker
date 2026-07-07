/**
 * Draft-pool builder — the logic seam behind the Draft Setup screen.
 *
 * First-principles model (see spec-docs/DRAFT_POOL_SETUP_REDESIGN_DESIGN.md):
 *   A draft pool is a league-scoped, lockable SET of players, each carrying a computed IV.
 *   Membership lives on `player.leagueAssignments` (Source A) always, plus the league's team
 *   rosters (Source B) in pool-first only. This module adds the BULK membership writes + the
 *   LOCK that the redesign needs, reusing the existing
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
import { regenerateAndPersistLeaguePoolAxes } from './leaguePoolAxisRegenPersist';
import { calculateIvBaseSalary } from '../engines/salaryCalculator';
import {
  getAllPlayers,
  getLeagueTemplate,
  getPlayer,
  getRegisteredPool,
  resolveLeagueSalaryCap,
  getTeamRoster,
  savePlayer,
  saveRegisteredPool,
  saveTeamRoster,
  type Grade,
  type Player,
} from './leagueBuilderStorage';
import { MLB_AUCTION_ROSTER_SLOTS } from './leagueBuilderAuctionPipeline';
import { POOL_SURPLUS_MAX } from '../data/rosterEngineConstants';
import type { RegisteredPool } from '../engines/leagueConstruction';
import { scoreSmb4Player, type Smb4Grade } from '../engines/smb4GradeEmulator';
import {
  poolCompletionOutlook,
  poolDemandModel,
  type ArchetypeCompletionOutlook,
  type PoolDemandModel,
} from '../engines/auctionPoolSizing';
import { analyzePoolFeasibility, type PoolFeasibilityReport } from '../engines/poolFeasibility';
import { HISTORICAL_ARCHETYPES } from '../data/historicalArchetypes';
import { toRosterSlotPlayer } from '../engines/rosterNeed';
import type { SimPlayer } from '../engines/archetypeBalanceSimulator';

/** A player is IN the league pool iff it carries an assignment for that league. */
export function isPlayerInLeaguePool(player: Player, leagueId: string): boolean {
  return Boolean(player.leagueAssignments?.some((assignment) => assignment.leagueId === leagueId));
}

function sortedUniqueIds(ids: readonly string[] | undefined): string[] {
  return [...new Set(ids ?? [])].sort((a, b) => a.localeCompare(b));
}

export function foldHandEditLedger(input: {
  previousAdds?: readonly string[];
  previousRemoves?: readonly string[];
  lastExtractedIds?: readonly string[];
  currentMemberIds: readonly string[];
  universeIds: readonly string[];
}): { handAdds: string[]; handRemoves: string[] } {
  if (!input.lastExtractedIds) {
    return { handAdds: [], handRemoves: [] };
  }

  const universe = new Set(input.universeIds);
  const last = new Set(input.lastExtractedIds);
  const current = new Set(input.currentMemberIds);
  const dAdd = new Set([...current].filter((id) => !last.has(id)));
  const dRem = new Set([...last].filter((id) => !current.has(id)));

  const handAdds = new Set([...sortedUniqueIds(input.previousAdds), ...dAdd]);
  for (const id of dRem) handAdds.delete(id);
  for (const id of [...handAdds]) {
    if (!universe.has(id)) handAdds.delete(id);
  }

  const handRemoves = new Set([...sortedUniqueIds(input.previousRemoves), ...dRem]);
  for (const id of dAdd) handRemoves.delete(id);
  for (const id of [...handRemoves]) {
    if (!universe.has(id) || handAdds.has(id)) handRemoves.delete(id);
  }

  return {
    handAdds: sortedUniqueIds([...handAdds]),
    handRemoves: sortedUniqueIds([...handRemoves]),
  };
}

/**
 * The live per-player IV for the Draft Setup pool table — the SAME calc the registration seam
 * uses per player, so the value shown as you build is identical to the value frozen at lock.
 */
export function computePlayerIv(player: Player): number {
  return calculateIvBaseSalary(toSalaryPlayer(player)).ivBase;
}

function smb4GradeToPlayerGrade(grade: Smb4Grade): Grade {
  switch (grade) {
    case 'S':
      return 'S';
    case 'A+':
      return 'A+';
    case 'A':
      return 'A';
    case 'A-':
      return 'A-';
    case 'B+':
      return 'B+';
    case 'B':
      return 'B';
    case 'B-':
      return 'B-';
    case 'C+':
      return 'C+';
    case 'C':
      return 'C';
    case 'C-':
      return 'C-';
    case 'D+':
      return 'D+';
    case 'D':
      return 'D';
    case 'D-':
      return 'D-';
    case 'E+':
    case 'E':
    case 'E-':
    case 'F':
      return 'D-';
    default: {
      const exhaustive: never = grade;
      return exhaustive;
    }
  }
}

/** Canonical live grade for League Builder records, derived from the SMB4 grader. */
export function computePlayerGrade(player: Player): Grade {
  return smb4GradeToPlayerGrade(
    scoreSmb4Player({
      name: `${player.firstName} ${player.lastName}`.trim(),
      age: player.age,
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition,
      bats: player.bats,
      throws: player.throws,
      power: player.power,
      contact: player.contact,
      speed: player.speed,
      fielding: player.fielding,
      arm: player.arm,
      velocity: player.velocity,
      junk: player.junk,
      accuracy: player.accuracy,
      arsenal: player.arsenal,
      trait1: player.trait1,
      trait2: player.trait2,
    }).grade,
  );
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
export async function addPlayersToLeaguePool(playerIds: string[], leagueId: string): Promise<Player[]> {
  await assertPoolUnlocked(leagueId);
  const changedPlayers: Player[] = [];
  for (const id of playerIds) {
    const player = await getPlayer(id);
    if (!player) continue;
    if (isPlayerInLeaguePool(player, leagueId)) continue;
    const saved = await savePlayer({
      ...player,
      leagueAssignments: [
        ...(player.leagueAssignments ?? []),
        { leagueId, teamId: '', rosterStatus: 'FREE_AGENT' },
      ],
    });
    changedPlayers.push(saved);
  }
  return changedPlayers;
}

/**
 * Remove players from the league pool in bulk. Rejected while the pool is locked. Removal is
 * AUTHORITATIVE against BOTH pool-first membership sources: it drops the league assignment AND
 * pulls the player off the league's branded-team rosters. The latter is essential in pool-first
 * because registration unions team rosters into the pool (Source B), so a removed-but-still-
 * rostered player would otherwise reappear in the locked snapshot the auction consumes. (Team
 * rosters are team-scoped; a team shared across leagues has the player removed everywhere,
 * consistent with clearTeamRoster.)
 */
export async function removePlayersFromLeaguePool(playerIds: string[], leagueId: string): Promise<Player[]> {
  await assertPoolUnlocked(leagueId);
  const removeSet = new Set(playerIds);
  const changedPlayers: Player[] = [];

  // 1) Drop the league assignment for each removed player.
  for (const id of removeSet) {
    const player = await getPlayer(id);
    if (!player) continue;
    if (!isPlayerInLeaguePool(player, leagueId)) continue;
    const saved = await savePlayer({
      ...player,
      leagueAssignments: (player.leagueAssignments ?? []).filter(
        (assignment) => assignment.leagueId !== leagueId,
      ),
    });
    changedPlayers.push(saved);
  }

  // 2) Pull them off the league's team rosters so the registration roster-union can't re-add them.
  const league = await getLeagueTemplate(leagueId);
  if (!league) return changedPlayers;
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
  return changedPlayers;
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
 * Lock the pool: register the pool first (authoritative membership + IV compute), regenerate the
 * league-scoped player axes (personality / chemistry / hidden personality modifiers) over that
 * exact registered membership, then stamp `locked`/`lockedAt`. After this the snapshot is frozen
 * and pool edits are rejected; the auction consumes this exact snapshot.
 *
 * CHEM-POTENCY ruling 5 (JK 2026-07-02): hidden modifiers are generated when the draft pool
 * is generated — the lock is the common chokepoint for BOTH draft formats. The axis regen is
 * deterministic in `${leagueId}:${player.id}`, so the auction-init regen (useAuctionDraft)
 * re-stamps byte-identical values over the same locked ids, and the franchise-freeze backfill
 * remains a no-op guard for leagues that never pass through a draft. Axes do not feed IV, so
 * registering before regen does not perturb the IV snapshot; it guarantees regen covers the
 * frozen membership itself.
 */
export async function lockLeaguePool(leagueId: string): Promise<RegisteredPool> {
  const pool = await registerLeaguePoolForLeague(leagueId);
  await regenerateAndPersistLeaguePoolAxes(leagueId, pool.players.map((p) => p.id));
  const locked: RegisteredPool = { ...pool, locked: true, lockedAt: Date.now() };
  await saveRegisteredPool(locked);
  return locked;
}

/** Players on this league's team rosters that hold NO league assignment (design-first strays). */
export async function listRosteredButUnassigned(
  leagueId: string,
): Promise<{ id: string; name: string }[]> {
  const league = await getLeagueTemplate(leagueId);
  if (!league) return [];
  if ((league.draftPoolMode ?? 'pool-first') !== 'design-first') return [];

  const allPlayers = await getAllPlayers();
  const playerById = new Map(allPlayers.map((player) => [player.id, player]));
  const rosteredIds: string[] = [];
  const seen = new Set<string>();

  for (const teamId of league.teamIds) {
    const roster = await getTeamRoster(teamId);
    for (const playerId of [...(roster?.mlbRoster ?? []), ...(roster?.farmRoster ?? [])]) {
      if (!seen.has(playerId) && playerById.has(playerId)) {
        seen.add(playerId);
        rosteredIds.push(playerId);
      }
    }
  }

  return rosteredIds.flatMap((id) => {
    const player = playerById.get(id);
    if (!player) return [];
    if (isPlayerInLeaguePool(player, leagueId)) return [];
    return [{ id, name: `${player.firstName} ${player.lastName}`.trim() || id }];
  });
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

// ---------------------------------------------------------------------------------------------
// FABLE-C3 — the market-clearing sufficiency + composition surface (audit POOL-01/02).
// ---------------------------------------------------------------------------------------------

export interface PoolDemandSufficiency extends PoolSufficiency {
  /** Players the pure-pressure shills are expected to WIN; advisory only, never lock-floor demand. */
  expectedShillWins: number;
  /** The full sizing model's recommendation (identity-roomy), above the hard floor. */
  targetSize: number;
}

/**
 * The sufficiency gate is real drafting clubs only. Pure-pressure shills affect auction pressure
 * and routing, but JK ruled on 2026-07-07 that they do not count toward pool-lock sufficiency.
 */
export function evaluatePoolDemandSufficiency(
  poolSize: number,
  teamCount: number,
  shillCount: number,
  targetOverride?: number,
): PoolDemandSufficiency {
  const model = poolDemandModel(teamCount, shillCount);
  // CUT2-2: keep the class-feasibility floor for real clubs, but exclude shill wins from the
  // lock gate so the generator's real-club target can satisfy the floor by itself.
  const hardFloor = Math.max(
    model.baseSlots,
    model.feasibilityFloor,
  );
  const targetSize = targetOverride ?? model.targetSize;
  return {
    poolSize,
    mlbSlots: hardFloor,
    meetsFloor: poolSize >= hardFloor,
    surplus: poolSize - hardFloor,
    overSupplyWarning: targetSize > 0 && poolSize > targetSize * POOL_SURPLUS_MAX,
    expectedShillWins: model.expectedShillWins,
    targetSize,
  };
}

export interface PoolCompositionReport {
  demand: PoolDemandModel;
  feasibility: PoolFeasibilityReport;
  outlooks: ArchetypeCompletionOutlook[];
}

/** Legality-shape + ratings bridge from a stored league player to the composition engines. */
function toFeasibilitySimPlayer(player: Player, priced: { iv: number; salary: number }): SimPlayer {
  const shape = toRosterSlotPlayer({
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? null,
    traits: [player.trait1, player.trait2],
  });
  return {
    id: player.id,
    iv: priced.iv,
    salary: priced.salary,
    isPitcher: shape.isPitcher,
    position: shape.position,
    role: shape.role as SimPlayer['role'],
    secondaryPosition: shape.secondaryPosition,
    twoWayVariant: shape.twoWayVariant,
    bat: {
      POW: player.power,
      CON: player.contact,
      SPD: player.speed,
      FLD: player.fielding,
      ARM: player.arm,
    },
    pit: shape.isPitcher
      ? { VEL: player.velocity, JNK: player.junk, ACC: player.accuracy }
      : undefined,
  };
}

/**
 * The composition intelligence for the Draft Setup panel (FABLE-C3, audit POOL-01: surfaces the
 * orphaned `analyzePoolFeasibility` + the completion-probability outlooks). Rides the REGISTERED
 * pool snapshot — the exact membership + IV the auction will consume — so it returns null until
 * a pool is registered (the body gate alone covers the pre-registration shuttle phase).
 */
export async function evaluatePoolComposition(
  leagueId: string,
  shillCount: number,
): Promise<PoolCompositionReport | null> {
  const pool = await getRegisteredPool(leagueId);
  if (!pool || pool.players.length === 0) return null;
  const leagueTemplate = await getLeagueTemplate(leagueId);
  const teamCount = leagueTemplate?.teamIds.length ?? 0;
  if (teamCount === 0) return null;

  const sims: SimPlayer[] = [];
  for (const priced of pool.players) {
    const player = await getPlayer(priced.id);
    if (!player) continue;
    sims.push(toFeasibilitySimPlayer(player, priced));
  }
  if (sims.length === 0) return null;

  const feasibility = analyzePoolFeasibility(
    sims,
    [...HISTORICAL_ARCHETYPES],
    pool.tier,
    undefined,
    resolveLeagueSalaryCap(leagueTemplate),
  );
  return {
    demand: poolDemandModel(teamCount, shillCount),
    feasibility,
    outlooks: poolCompletionOutlook(sims, feasibility, teamCount, shillCount),
  };
}
