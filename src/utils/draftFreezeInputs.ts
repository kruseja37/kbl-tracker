import type { AuctionSession } from '../engines/auctionStateMachine';
import type { RegisteredPool } from '../engines/leagueConstruction';
import type { DraftFreezePlayerInput, DraftFreezeResult, DraftFreezeTier } from '../engines/draftFreeze';
import type { DraftSlotClass } from '../engines/draftMorale';
import { perceivedValueRange } from '../engines/scoutValueRange';
import type { PlayerPosition } from '../engines/salaryCalculator';
import type { HiddenModifiers } from '../types/game';
import type { LeagueBuilderMlbDraftSession, SnakeDraftManifestMoraleSnapshot } from './leagueBuilderStorage';
import { readSnakeDraftTruth } from './snakeDraftManifest';
import { priceFarmAuctionProspect } from './farmAuctionPool';

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

function moraleClassForSlotVsTalent(slotRank: number, talentRank: number, totalPicks: number): DraftSlotClass {
  const threshold = Math.max(3, Math.round(0.05 * totalPicks));
  const delta = slotRank - talentRank;
  return delta <= -threshold
    ? 'early'
    : delta >= threshold
      ? 'late'
      : 'middle';
}

export function rankExpectedTalentByIv(
  rows: readonly { id: string; iv: number }[],
): Map<string, number> {
  const ranked = [...rows]
    .filter((row) => Number.isFinite(row.iv) && row.iv > 0)
    .sort((left, right) => right.iv - left.iv || left.id.localeCompare(right.id));
  if (ranked.length !== rows.length) throw new Error('Snake talent ranking requires a finite positive IV for every source-pool player.');
  return new Map(ranked.map((row, index) => [row.id, index + 1]));
}

export function buildSnakeDraftMoraleSnapshot(args: {
  freeze: DraftFreezeResult;
  expectedTalentRankByPlayerId: ReadonlyMap<string, number>;
  includeFan: boolean;
  includeExpectedTalentRanks?: boolean;
}): SnakeDraftManifestMoraleSnapshot {
  const expectedTalentRankByPlayerId = args.includeExpectedTalentRanks === false
    ? {}
    : Object.fromEntries(args.expectedTalentRankByPlayerId);
  const playerByPlayerId = Object.fromEntries(args.freeze.players.map((player) => {
    if (!args.expectedTalentRankByPlayerId.has(player.playerId)) {
      throw new Error(`Snake morale snapshot is missing expected talent rank for ${player.playerId}.`);
    }
    return [player.playerId, {
      slotClass: player.slotClass,
      startingMorale: player.morale.startingMorale,
      slotBase: player.morale.slotBase,
      payBase: player.morale.payBase,
      totalDelta: player.morale.totalDelta,
    }];
  }));
  const fanByTeamId = args.includeFan
    ? Object.fromEntries(args.freeze.teams.map((team) => {
        if (!('alignmentGrade' in team.fanMorale)) {
          throw new Error(`Snake morale snapshot is missing alignment truth for ${team.teamId}.`);
        }
        return [team.teamId, {
          pickCount: team.fanMorale.pickCount,
          alignmentScore: team.fanMorale.alignmentScore,
          alignmentGrade: team.fanMorale.alignmentGrade,
          normalizedRank: team.fanMorale.normalizedRank,
          delta: team.fanMorale.delta,
          startingFanMorale: team.fanMorale.startingFanMorale,
        }];
      }))
    : null;
  return { expectedTalentRankByPlayerId, playerByPlayerId, fanByTeamId };
}

function buildSnakeSessionInputs(
  session: LeagueBuilderMlbDraftSession,
  pool: RegisteredPool | null,
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>,
): DraftFreezePlayerInput[] {
  if (!session.draftManifest && session.currentPickIndex < session.pickOrder.length) return [];
  const truth = readSnakeDraftTruth(session, 'MLB');
  if (!pool) {
    throw new Error(`Completed snake draft for league "${session.leagueId}" is missing its RegisteredPool.`);
  }
  const availablePoolIds = new Set(pool.players.map((player) => player.id));
  if (truth.manifest && truth.manifest.pool.playerIds.some((playerId) => !availablePoolIds.has(playerId))) {
    throw new Error(`Completed snake draft for league "${session.leagueId}" does not match its frozen pool membership.`);
  }

  const frozenPoolIds = new Set(
    truth.manifest?.pool.playerIds
      ?? session.snakeSetup?.poolPlayerIds
      ?? pool.players.map((player) => player.id),
  );
  const rankedPool = [...pool.players]
    .filter((player) => (
      frozenPoolIds.has(player.id)
      && (truth.manifest || (Number.isFinite(player.iv) && player.iv > 0))
    ))
    .map((player) => truth.manifest
      ? { ...player, iv: truth.manifest.pool.mlbIvByPlayerId![player.id] }
      : player)
    .sort((left, right) => right.iv - left.iv || left.id.localeCompare(right.id));
  const ivRankByPlayerId = new Map(rankedPool.map((player, index) => [player.id, index + 1]));
  const poolById = new Map(pool.players.map((player) => [player.id, player]));
  const totalPicks = truth.pickOrder.length;

  return truth.completedPicks.map((pick) => {
    const poolPlayer = poolById.get(pick.playerId);
    const ivRank = ivRankByPlayerId.get(pick.playerId);
    const frozenIv = truth.manifest ? pick.launchSalary : poolPlayer?.iv;
    if (!poolPlayer || !Number.isFinite(frozenIv) || frozenIv! <= 0 || !ivRank) {
      throw new Error(`Completed snake pick ${pick.pick} player "${pick.playerId}" is missing a finite RegisteredPool IV.`);
    }
    const frozenExpectedRank = truth.manifest?.morale?.expectedTalentRankByPlayerId[pick.playerId];
    const slotClassOverride = truth.manifest?.morale?.playerByPlayerId[pick.playerId]?.slotClass
      ?? moraleClassForSlotVsTalent(pick.pick, frozenExpectedRank ?? ivRank, totalPicks);
    const meta = metaByPlayerId.get(pick.playerId);
    const frozenMorale = truth.manifest?.morale?.playerByPlayerId[pick.playerId];

    return {
      playerId: pick.playerId,
      teamId: pick.teamId,
      tier: 'MLB',
      iv: frozenIv!,
      settledSalary: frozenIv!,
      position: meta?.position ?? null,
      scoutRange: { low: frozenIv!, high: frozenIv! },
      personality: meta?.personality,
      modifiers: meta?.modifiers ?? { ...NEUTRAL_FREEZE_MODIFIERS },
      slotClassOverride,
      // Snake salaries are frozen by IV/slot rather than won in bidding, so price is never a
      // second morale driver. Actual pick versus frozen talent rank is the only input.
      payClassOverride: 'within',
      ...(frozenMorale ? { moraleOverride: {
        startingMorale: frozenMorale.startingMorale,
        slotBase: frozenMorale.slotBase,
        payBase: frozenMorale.payBase,
        totalDelta: frozenMorale.totalDelta,
      } } : {}),
    };
  });
}

function buildFarmSnakeSessionInputs(
  session: LeagueBuilderMlbDraftSession,
  metaByPlayerId: ReadonlyMap<string, DraftFreezePlayerMeta>,
  defaultScoutAccuracy: number,
): DraftFreezePlayerInput[] {
  if (!session.draftManifest && session.currentPickIndex < session.pickOrder.length) return [];
  if (!session.draftManifest && session.draftPhase !== 'FARM') {
    throw new Error(`Completed farm snake input for league "${session.leagueId}" is not a FARM session.`);
  }
  if (!session.draftManifest && !session.farmSlotSalaries) {
    throw new Error(`Completed farm snake draft for league "${session.leagueId}" is missing its frozen slot table.`);
  }
  const truth = readSnakeDraftTruth(session, 'FARM');

  const frozenProspects = session.farmProspectSnapshot ?? [];
  const frozenPoolIds = new Set(
    truth.manifest?.pool.playerIds
      ?? session.snakeSetup?.poolPlayerIds
      ?? frozenProspects.map((prospect) => prospect.id),
  );
  const rankedProspects = frozenProspects
    .filter((prospect) => frozenPoolIds.has(prospect.id))
    .map((prospect) => ({ prospect, iv: priceFarmAuctionProspect(prospect) }))
    .sort((left, right) => right.iv - left.iv || left.prospect.id.localeCompare(right.prospect.id));
  if (rankedProspects.length !== frozenPoolIds.size) {
    throw new Error(`Completed farm snake draft for league "${session.leagueId}" is missing its frozen prospect talent pool.`);
  }

  const talentRankByPlayerId = new Map(
    rankedProspects.map((row, index) => [row.prospect.id, index + 1]),
  );
  const ivByPlayerId = new Map(rankedProspects.map((row) => [row.prospect.id, row.iv]));
  const totalPicks = truth.pickOrder.length;

  return truth.completedPicks.map((pick) => {
    const meta = metaByPlayerId.get(pick.playerId);
    const iv = ivByPlayerId.get(pick.playerId);
    const settledSalary = truth.manifest ? pick.launchSalary : session.farmSlotSalaries![pick.pick - 1];
    const talentRank = talentRankByPlayerId.get(pick.playerId)!;
    const frozenMorale = truth.manifest?.morale?.playerByPlayerId[pick.playerId];
    if (!Number.isFinite(iv) || iv! <= 0) {
      throw new Error(`Completed farm snake pick ${pick.pick} player "${pick.playerId}" is missing a finite frozen farm IV.`);
    }
    if (!Number.isFinite(settledSalary) || settledSalary < 0) {
      throw new Error(`Completed farm snake pick ${pick.pick} has no finite frozen slot salary.`);
    }
    const scoutRange = perceivedValueRange(
      iv!,
      defaultScoutAccuracy,
      `freeze:${pick.playerId}`,
    );

    return {
      playerId: pick.playerId,
      teamId: pick.teamId,
      tier: 'FARM',
      iv: iv!,
      settledSalary,
      position: meta?.position ?? null,
      scoutRange: { low: scoutRange.low, high: scoutRange.high },
      personality: meta?.personality,
      modifiers: meta?.modifiers ?? { ...NEUTRAL_FREEZE_MODIFIERS },
      slotClassOverride: frozenMorale?.slotClass
        ?? moraleClassForSlotVsTalent(
          pick.pick,
          truth.manifest?.morale?.expectedTalentRankByPlayerId[pick.playerId] ?? talentRank,
          totalPicks,
        ),
      payClassOverride: 'within',
      ...(frozenMorale ? { moraleOverride: {
        startingMorale: frozenMorale.startingMorale,
        slotBase: frozenMorale.slotBase,
        payBase: frozenMorale.payBase,
        totalDelta: frozenMorale.totalDelta,
      } } : {}),
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
