/**
 * L11-3 — shared, flag-gated manager firing resolver.
 *
 * Build-dark by default: the Phase-2 L11 flag gates every load/write, and no
 * live caller is wired in this ticket. Manual GM firing, the L11-3b
 * auto-backstop, and L14 rebrand should all enter through `fireManager`.
 */

import {
  computeFranchiseL11Firing,
  type FranchiseL11FiringInput,
  type FranchiseL11FiringPlayer,
  type FranchiseL11FiringReport,
} from '../engines/franchiseL11FiringEngine';
import { normalizePersonality } from '../engines/masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';
import type { ManagerAssignment, ManagerFiredReason, ManagerMode } from '../types/managerWpa';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from './franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
  type Player,
} from './leagueBuilderStorage';
import { getFranchiseTrueValueRows } from './franchiseTrueValueStorage';
import {
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  type ApplyFranchiseMoraleEffectInput,
  type FranchiseMoraleScope,
} from './franchiseMoraleState';
import { isFranchisePhase2L11Enabled } from './franchisePhase2Flags';
import {
  buildDefaultManagerProfile,
  getManagerAssignment,
  recordManagerTenureEnd,
  saveManagerAssignment,
  saveManagerProfile,
  setManagerFired,
  type ManagerTeamIdentity,
} from './managerIdentityStorage';

export interface FireManagerParams extends FranchiseMoraleScope {
  leagueId: string;
  teamId: string;
  mode?: ManagerMode;
  instanceId: string;
  reason: ManagerFiredReason;
  endDate: string;
  skipUserConfirm?: boolean;
  suppressFanReliefBump?: boolean;
  expectedManagerId?: string;
  executionGameId?: string;
}

export interface FireManagerResult {
  status: 'dark-noop' | 'fired' | 'no-active-manager' | 'manager-mismatch' | 'already-fired-for-game';
  firingReport?: FranchiseL11FiringReport;
  reliefApplied: boolean;
  ripplesApplied: number;
  firedManagerId?: string;
  successorManagerId?: string;
  reason?: string;
}

interface ResolvedFiringSnapshot {
  players: FranchiseL11FiringInput['players'];
  teamFanMorale: number;
  teamIdentity: ManagerTeamIdentity | null;
}

async function resolveFiringSnapshot(params: RequiredFireManagerParams): Promise<ResolvedFiringSnapshot> {
  const [teams, players, trueValueRows] = await Promise.all([
    getAllFranchiseTeams(params.franchiseId),
    getAllFranchisePlayers(params.franchiseId),
    getFranchiseTrueValueRows({
      franchiseId: params.franchiseId,
      seasonId: params.seasonId,
      statsScopeId: params.statsScopeId,
    }),
  ]);

  const team = teams.find((candidate) => candidate.id === params.teamId) ?? null;
  const trueValueRowsByPlayerId = new Map(trueValueRows.map((row) => [row.playerId, row]));
  const firingPlayers: FranchiseL11FiringPlayer[] = [];

  for (const player of players) {
    if (getPlayerRosterStatusForLeague(player, params.leagueId) !== 'MLB') continue;
    if (getPlayerTeamIdForLeague(player, params.leagueId) !== params.teamId) continue;

    const hidden = getHiddenModifiers(player);
    firingPlayers.push({
      id: player.id,
      valueDelta: trueValueRowsByPlayerId.get(player.id)?.valueDelta ?? 0,
      personality: normalizePersonality(player.personality),
      loyalty: hidden?.loyalty,
      resilience: hidden?.resilience,
    });
  }

  const teamFanMorale = (await getFranchiseMoraleSnapshot(
    params,
    'team-fan',
    params.teamId,
  ))?.currentValue ?? 50;

  return {
    players: firingPlayers.sort((left, right) => left.id.localeCompare(right.id)),
    teamFanMorale,
    teamIdentity: team
      ? {
          id: team.id,
          name: team.name,
          managerId: team.managerId,
          managerName: team.managerName,
          location: team.location,
        }
      : null,
  };
}

async function writeMoraleEffect(input: ApplyFranchiseMoraleEffectInput): Promise<boolean> {
  const result = await applyFranchiseMoraleEffect(input);
  return result.status === 'applied';
}

function computeFiring(input: FranchiseL11FiringInput): FranchiseL11FiringReport {
  return computeFranchiseL11Firing(input);
}

export const managerFiringSeam = {
  resolveFiringSnapshot,
  computeFranchiseL11Firing: computeFiring,
  applyFranchiseMoraleEffect: writeMoraleEffect,
};

type RequiredFireManagerParams = FireManagerParams & { mode: ManagerMode };
type GameStampedManagerAssignment = ManagerAssignment & { lastFiredGameId?: string };

export async function fireManager(params: FireManagerParams): Promise<FireManagerResult> {
  if (!isFranchisePhase2L11Enabled()) {
    return {
      status: 'dark-noop',
      reliefApplied: false,
      ripplesApplied: 0,
      reason: 'Phase-2 L11 disabled.',
    };
  }

  const mode = params.mode ?? 'franchise';
  const resolvedParams: RequiredFireManagerParams = { ...params, mode };
  const assignment = await getManagerAssignment({
    teamId: params.teamId,
    mode,
    instanceId: params.instanceId,
  });
  if (!assignment) {
    return { status: 'no-active-manager', reliefApplied: false, ripplesApplied: 0 };
  }
  const stampedAssignment = assignment as GameStampedManagerAssignment;
  if (params.executionGameId && stampedAssignment.lastFiredGameId === params.executionGameId) {
    return {
      status: 'already-fired-for-game',
      reliefApplied: false,
      ripplesApplied: 0,
      reason: `Manager firing already executed for game "${params.executionGameId}".`,
    };
  }
  if (params.expectedManagerId && assignment.managerId !== params.expectedManagerId) {
    return {
      status: 'manager-mismatch',
      reliefApplied: false,
      ripplesApplied: 0,
      reason: `Expected manager "${params.expectedManagerId}" but found "${assignment.managerId}".`,
    };
  }
  if (assignment.fired || assignment.endDate) {
    return { status: 'no-active-manager', reliefApplied: false, ripplesApplied: 0 };
  }

  const snapshot = await managerFiringSeam.resolveFiringSnapshot(resolvedParams);
  if (!snapshot.teamIdentity) {
    throw new Error(`Cannot resolve manager team identity for team "${params.teamId}".`);
  }

  const firingReport = managerFiringSeam.computeFranchiseL11Firing({
    teamFanMorale: snapshot.teamFanMorale,
    players: snapshot.players,
    reason: params.reason,
  });
  const sourceEventId = [
    'manager-fired',
    params.teamId,
    params.seasonId,
    params.instanceId,
    ...(params.executionGameId ? [params.executionGameId] : []),
  ].join(':');
  let reliefApplied = false;
  let ripplesApplied = 0;

  if (!params.suppressFanReliefBump && firingReport.reliefBumpDelta !== 0) {
    reliefApplied = await managerFiringSeam.applyFranchiseMoraleEffect({
      ...resolvedParams,
      targetType: 'team-fan',
      teamId: params.teamId,
      delta: firingReport.reliefBumpDelta,
      reason: 'manager.fired.relief',
      sourceEventId,
      timestamp: params.endDate,
    });
  }

  for (const ripple of firingReport.playerRipples) {
    if (ripple.moraleDelta === 0) continue;
    const applied = await managerFiringSeam.applyFranchiseMoraleEffect({
      ...resolvedParams,
      targetType: 'player',
      playerId: ripple.playerId,
      delta: ripple.moraleDelta,
      reason: 'manager.fired.ripple',
      sourceEventId: `${sourceEventId}:${ripple.playerId}`,
      timestamp: params.endDate,
    });
    if (applied) ripplesApplied += 1;
  }

  await setManagerFired({
    teamId: params.teamId,
    mode,
    instanceId: params.instanceId,
    endDate: params.endDate,
    reason: params.reason,
  });

  // Durably persist the fired tenure-end on the fired manager's profile BEFORE
  // the successor overwrites the team-keyed assignment row (resolves the L11-3
  // OPEN: the setManagerFired tombstone on the assignment key is transient).
  // The profile is keyed by the unique managerId, so it survives the swap.
  // hireDate comes from the fired assignment's startDate (also about to be
  // overwritten). Per L11-Q9: ride the identity store, no new store.
  await recordManagerTenureEnd({
    managerId: assignment.managerId,
    teamId: params.teamId,
    mode,
    instanceId: params.instanceId,
    hireDate: assignment.startDate,
    endDate: params.endDate,
    reason: params.reason,
  });

  const successorProfile = await saveManagerProfile(buildDefaultManagerProfile(snapshot.teamIdentity));
  const successorAssignment: GameStampedManagerAssignment = {
    managerId: successorProfile.managerId,
    teamId: params.teamId,
    mode,
    instanceId: params.instanceId,
    startDate: params.endDate,
    ...(params.executionGameId ? { lastFiredGameId: params.executionGameId } : {}),
  };
  await saveManagerAssignment(successorAssignment);

  return {
    status: 'fired',
    firingReport,
    reliefApplied,
    ripplesApplied,
    firedManagerId: assignment.managerId,
    successorManagerId: successorProfile.managerId,
  };
}

function getHiddenModifiers(player: Player): Partial<Pick<HiddenModifiers, 'loyalty' | 'resilience'>> | null {
  const modifiers = player.hiddenPersonalityModifiers;
  if (!modifiers) return null;
  return {
    loyalty: Number.isFinite(modifiers.loyalty) ? modifiers.loyalty : undefined,
    resilience: Number.isFinite(modifiers.resilience) ? modifiers.resilience : undefined,
  };
}
