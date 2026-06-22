import type { AuctionSession } from '../engines/auctionStateMachine';
import type { DraftFreezePlayerInput, DraftFreezeTier } from '../engines/draftFreeze';
import { perceivedValueRange } from '../engines/scoutValueRange';
import type { HiddenModifiers } from '../types/game';

export interface DraftFreezePlayerMeta {
  personality: string | undefined;
  modifiers: HiddenModifiers;
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
  farmSession: AuctionSession | null;
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>;
  defaultScoutAccuracy?: number;
}): DraftFreezePlayerInput[] {
  const defaultScoutAccuracy = args.defaultScoutAccuracy ?? DEFAULT_FREEZE_SCOUT_ACCURACY;

  return [
    ...buildSessionInputs(args.mlbSession, 'MLB', args.metaByPlayerId, defaultScoutAccuracy),
    ...buildSessionInputs(args.farmSession, 'FARM', args.metaByPlayerId, defaultScoutAccuracy),
  ];
}

function buildSessionInputs(
  session: AuctionSession | null,
  tier: DraftFreezeTier,
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>,
  defaultScoutAccuracy: number,
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
      settledSalary: result.salary,
      scoutRange: { low: scoutRange.low, high: scoutRange.high },
      personality: meta?.personality,
      modifiers: meta?.modifiers ?? { ...NEUTRAL_FREEZE_MODIFIERS },
    });
  }

  return inputs;
}
