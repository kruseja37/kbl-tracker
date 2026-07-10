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
    ...buildSessionInputs(
      args.farmSession,
      'FARM',
      args.metaByPlayerId,
      defaultScoutAccuracy,
      args.farmExcludedTeamIds,
    ),
  ];
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
  const threshold = Math.max(3, Math.round(0.05 * totalPicks));

  return session.completedPicks.map((pick) => {
    const poolPlayer = poolById.get(pick.playerId);
    const ivRank = ivRankByPlayerId.get(pick.playerId);
    if (!poolPlayer || !Number.isFinite(poolPlayer.iv) || poolPlayer.iv <= 0 || !ivRank) {
      throw new Error(`Completed snake pick ${pick.pick} player "${pick.playerId}" is missing a finite RegisteredPool IV.`);
    }
    const delta = pick.pick - ivRank;
    const payClassOverride: DraftPayClass = delta <= -threshold
      ? 'above'
      : delta >= threshold
        ? 'below'
        : 'within';
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
