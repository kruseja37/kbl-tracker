import type { AuctionSession } from '../engines/auctionStateMachine';
import type { RegisteredPool } from '../engines/leagueConstruction';
import type { DraftFreezePlayerInput, DraftFreezeTier } from '../engines/draftFreeze';
import type { DraftPayClass } from '../engines/draftMorale';
import { perceivedValueRange } from '../engines/scoutValueRange';
import type { PlayerPosition } from '../engines/salaryCalculator';
import type { HiddenModifiers } from '../types/game';
import type { LeagueBuilderMlbDraftSession } from './leagueBuilderStorage';

export interface DraftFreezePlayerMeta {
  personality: string | undefined;
  modifiers: HiddenModifiers;
  position?: PlayerPosition | null;
  /** Canonical farm IV, computed through the same price seam as farm-auction players. */
  iv?: number;
}

// §11/§13 sim-tune (D-7b-2): post-hoc freeze uses an IV-centered range because
// the nomination-time chemistry-adjusted displayed range is not reconstructable.
export const DEFAULT_FREEZE_SCOUT_ACCURACY = 70;

const NEUTRAL_FREEZE_MODIFIERS: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

export function buildDraftFreezeInputs(args: {
  mlbSession: AuctionSession | null;
  mlbSnakeSession?: LeagueBuilderMlbDraftSession | null;
  mlbRegisteredPool?: RegisteredPool | null;
  farmSession: AuctionSession | null;
  farmSnakeSession?: LeagueBuilderMlbDraftSession | null;
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>;
  defaultScoutAccuracy?: number;
  mlbExcludedTeamIds?: ReadonlySet<string>;
  farmExcludedTeamIds?: ReadonlySet<string>;
}): DraftFreezePlayerInput[] {
  const defaultScoutAccuracy = args.defaultScoutAccuracy ?? DEFAULT_FREEZE_SCOUT_ACCURACY;

  const mlbInputs = args.mlbSnakeSession
    ? buildSnakeSessionInputs(args.mlbSnakeSession, args.mlbRegisteredPool ?? null, args.metaByPlayerId)
    : buildSessionInputs(
        args.mlbSession,
        'MLB',
        args.metaByPlayerId,
        defaultScoutAccuracy,
        args.mlbExcludedTeamIds,
      );

  return [
    ...mlbInputs,
    ...(args.farmSnakeSession
      ? buildFarmSnakeSessionInputs(args.farmSnakeSession, args.metaByPlayerId, defaultScoutAccuracy)
      : buildSessionInputs(
          args.farmSession,
          'FARM',
          args.metaByPlayerId,
          defaultScoutAccuracy,
          args.farmExcludedTeamIds,
        )),
  ];
}

function payClassForSlotVsTalent(slotRank: number, talentRank: number, totalPicks: number): DraftPayClass {
  const threshold = Math.max(3, Math.round(0.05 * totalPicks));
  const delta = slotRank - talentRank;
  return delta <= -threshold
    ? 'above'
    : delta >= threshold
      ? 'below'
      : 'within';
}

function buildSnakeSessionInputs(
  session: LeagueBuilderMlbDraftSession,
  pool: RegisteredPool | null,
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>,
): DraftFreezePlayerInput[] {
  if (session.currentPickIndex < session.pickOrder.length) return [];
  if (!pool) {
    throw new Error(`Completed snake draft for league "${session.leagueId}" is missing its RegisteredPool.`);
  }

  const rankedPool = [...pool.players]
    .filter((player) => Number.isFinite(player.iv) && player.iv > 0)
    .sort((left, right) => right.iv - left.iv || left.id.localeCompare(right.id));
  const ivRankByPlayerId = new Map(rankedPool.map((player, index) => [player.id, index + 1]));
  const poolById = new Map(pool.players.map((player) => [player.id, player]));
  const totalPicks = session.pickOrder.length;

  return session.completedPicks.map((pick) => {
    const poolPlayer = poolById.get(pick.playerId);
    const ivRank = ivRankByPlayerId.get(pick.playerId);
    if (!poolPlayer || !Number.isFinite(poolPlayer.iv) || poolPlayer.iv <= 0 || !ivRank) {
      throw new Error(`Completed snake pick ${pick.pick} player "${pick.playerId}" is missing a finite RegisteredPool IV.`);
    }
    const payClassOverride = payClassForSlotVsTalent(pick.pick, ivRank, totalPicks);
    const meta = metaByPlayerId.get(pick.playerId);

    return {
      playerId: pick.playerId,
      teamId: pick.teamId,
      tier: 'MLB',
      iv: poolPlayer.iv,
      settledSalary: poolPlayer.iv,
      position: meta?.position ?? null,
      scoutRange: { low: poolPlayer.iv, high: poolPlayer.iv },
      personality: meta?.personality,
      modifiers: meta?.modifiers ?? { ...NEUTRAL_FREEZE_MODIFIERS },
      payClassOverride,
    };
  });
}

function buildFarmSnakeSessionInputs(
  session: LeagueBuilderMlbDraftSession,
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>,
  defaultScoutAccuracy: number,
): DraftFreezePlayerInput[] {
  if (session.currentPickIndex < session.pickOrder.length) return [];
  if (session.draftPhase !== 'FARM') {
    throw new Error(`Completed farm snake input for league "${session.leagueId}" is not a FARM session.`);
  }
  if (!session.farmSlotSalaries) {
    throw new Error(`Completed farm snake draft for league "${session.leagueId}" is missing its frozen slot table.`);
  }

  const rankedPicks = session.completedPicks
    .map((pick) => ({ pick, iv: metaByPlayerId.get(pick.playerId)?.iv }))
    .filter((row): row is { pick: typeof row.pick; iv: number } => Number.isFinite(row.iv) && row.iv! > 0)
    .sort((left, right) => right.iv - left.iv || left.pick.playerId.localeCompare(right.pick.playerId));
  if (rankedPicks.length !== session.completedPicks.length) {
    const rankedIds = new Set(rankedPicks.map((row) => row.pick.playerId));
    const missing = session.completedPicks.find((pick) => !rankedIds.has(pick.playerId));
    throw new Error(`Completed farm snake pick ${missing?.pick ?? '?'} player "${missing?.playerId ?? 'unknown'}" is missing a finite farm IV.`);
  }

  const talentRankByPlayerId = new Map(
    rankedPicks.map((row, index) => [row.pick.playerId, index + 1]),
  );
  const totalPicks = session.pickOrder.length;

  return session.completedPicks.map((pick) => {
    const meta = metaByPlayerId.get(pick.playerId)!;
    const iv = meta.iv!;
    const settledSalary = session.farmSlotSalaries![pick.pick - 1];
    const talentRank = talentRankByPlayerId.get(pick.playerId)!;
    if (!Number.isFinite(settledSalary) || settledSalary < 0) {
      throw new Error(`Completed farm snake pick ${pick.pick} has no finite frozen slot salary.`);
    }
    const scoutRange = perceivedValueRange(
      iv,
      defaultScoutAccuracy,
      `freeze:${pick.playerId}`,
    );

    return {
      playerId: pick.playerId,
      teamId: pick.teamId,
      tier: 'FARM',
      iv,
      settledSalary,
      position: meta.position ?? null,
      scoutRange: { low: scoutRange.low, high: scoutRange.high },
      personality: meta.personality,
      modifiers: meta.modifiers ?? { ...NEUTRAL_FREEZE_MODIFIERS },
      payClassOverride: payClassForSlotVsTalent(pick.pick, talentRank, totalPicks),
    };
  });
}

function buildSessionInputs(
  session: AuctionSession | null,
  tier: DraftFreezeTier,
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>,
  defaultScoutAccuracy: number,
  excludedTeamIds?: ReadonlySet<string>,
): DraftFreezePlayerInput[] {
  if (!session) return [];

  const inputs: DraftFreezePlayerInput[] = [];
  for (const result of session.results) {
    if (
      result.disposition !== 'SOLD' ||
      !result.winnerTeamId ||
      result.salary === null ||
      !Number.isFinite(result.salary)
    ) {
      continue;
    }

    if (excludedTeamIds?.has(result.winnerTeamId)) {
      continue;
    }

    const iv = session.players[result.playerId]?.iv;
    if (!Number.isFinite(iv) || iv <= 0) {
      continue;
    }

    const scoutRange = perceivedValueRange(
      iv,
      defaultScoutAccuracy,
      `freeze:${result.playerId}`,
    );
    const meta = metaByPlayerId.get(result.playerId);

    inputs.push({
      playerId: result.playerId,
      teamId: result.winnerTeamId,
      tier,
      iv,
      settledSalary: result.salary,
      position: meta?.position ?? null,
      scoutRange: { low: scoutRange.low, high: scoutRange.high },
      personality: meta?.personality,
      modifiers: meta?.modifiers ?? { ...NEUTRAL_FREEZE_MODIFIERS },
    });
  }

  return inputs;
}
