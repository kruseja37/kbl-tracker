import type { HiddenModifiers } from '../types/game';
import {
  classifyDraftSlot,
  computeDraftMoraleFromRaw,
  type DraftMoraleResult,
  type DraftSlotClass,
} from './draftMorale';
import { computeDraftFanMorale, type DraftFanMoraleResult } from './draftFanMorale';

// RB-7a measurement defaults:
// D-7a-1: Slot order is global-within-tier won order, not per-team won order.
// D-7a-2: Fan-morale payroll defaults to MLB winning bids only; farm bids count only with 'mlb+farm'.

export type DraftFreezeTier = 'MLB' | 'FARM';

/** One SOLD/rostered draftee, already resolved by the caller (RB-7b) from the persisted auction session.
 *  The array passed to computeDraftFreeze MUST be in WON ORDER (results-array order) - the engine derives
 *  each player's within-tier won index + the tier's total-won from that ordering. */
export interface DraftFreezePlayerInput {
  playerId: string;
  teamId: string;
  tier: DraftFreezeTier;
  settledSalary: number;
  scoutRange: { low: number; high: number };
  personality: string | undefined;
  modifiers: HiddenModifiers;
}

export interface DraftFreezePlayerResult {
  playerId: string;
  teamId: string;
  tier: DraftFreezeTier;
  settledSalary: number;
  wonOrderIndex: number;
  totalWonInTier: number;
  slotClass: DraftSlotClass;
  startingMorale: number;
  morale: DraftMoraleResult;
}

export interface DraftFreezeTeamResult {
  teamId: string;
  payroll: number;
  startingFanMorale: number;
  fanMorale: DraftFanMoraleResult;
}

export interface DraftFreezeOptions {
  /** which tiers' winning bids count toward the per-team payroll fed to fan morale.
   *  DEFAULT 'mlb' (§7 win-now/relocation-risk intent = the MLB competitive spend). */
  fanMoralePayrollScope?: 'mlb' | 'mlb+farm';
}

export interface DraftFreezeResult {
  players: DraftFreezePlayerResult[];
  teams: DraftFreezeTeamResult[];
}

export function computeDraftFreeze(
  wonPlayersInOrder: readonly DraftFreezePlayerInput[],
  options?: DraftFreezeOptions,
): DraftFreezeResult {
  if (wonPlayersInOrder.length === 0) {
    return { players: [], teams: [] };
  }

  const totalWonByTier: Record<DraftFreezeTier, number> = { MLB: 0, FARM: 0 };
  const teamIdsInFirstSeenOrder: string[] = [];
  const seenTeamIds = new Set<string>();

  for (const player of wonPlayersInOrder) {
    totalWonByTier[player.tier] += 1;

    if (!seenTeamIds.has(player.teamId)) {
      seenTeamIds.add(player.teamId);
      teamIdsInFirstSeenOrder.push(player.teamId);
    }
  }

  const nextWonIndexByTier: Record<DraftFreezeTier, number> = { MLB: 0, FARM: 0 };
  const players = wonPlayersInOrder.map((player): DraftFreezePlayerResult => {
    const wonOrderIndex = nextWonIndexByTier[player.tier];
    nextWonIndexByTier[player.tier] += 1;
    const totalWonInTier = totalWonByTier[player.tier];
    const morale = computeDraftMoraleFromRaw(
      wonOrderIndex,
      totalWonInTier,
      player.settledSalary,
      player.scoutRange,
      player.personality,
      player.modifiers,
    );

    return {
      playerId: player.playerId,
      teamId: player.teamId,
      tier: player.tier,
      settledSalary: player.settledSalary,
      wonOrderIndex,
      totalWonInTier,
      slotClass: classifyDraftSlot(wonOrderIndex, totalWonInTier),
      startingMorale: morale.startingMorale,
      morale,
    };
  });

  const includeFarmPayroll = options?.fanMoralePayrollScope === 'mlb+farm';
  const payrollByTeamId = new Map<string, number>(
    teamIdsInFirstSeenOrder.map((teamId) => [teamId, 0]),
  );

  for (const player of wonPlayersInOrder) {
    if (player.tier !== 'MLB' && !includeFarmPayroll) {
      continue;
    }

    payrollByTeamId.set(
      player.teamId,
      (payrollByTeamId.get(player.teamId) ?? 0) + player.settledSalary,
    );
  }

  const teamPayrolls = teamIdsInFirstSeenOrder.map((teamId) => ({
    teamId,
    payroll: payrollByTeamId.get(teamId) ?? 0,
  }));
  const fanMoraleByTeamId = new Map(
    computeDraftFanMorale(teamPayrolls).map((fanMorale) => [fanMorale.teamId, fanMorale]),
  );

  return {
    players,
    teams: teamPayrolls.map((team): DraftFreezeTeamResult => {
      const fanMorale = fanMoraleByTeamId.get(team.teamId);
      if (!fanMorale) {
        throw new Error(`Missing draft fan morale result for team ${team.teamId}`);
      }

      return {
        teamId: team.teamId,
        payroll: team.payroll,
        startingFanMorale: fanMorale.startingFanMorale,
        fanMorale,
      };
    }),
  };
}
