import {
  archetypeFitScorer,
  buildIdentityRoster,
  type SimArchetype,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import {
  askSatisfaction,
  isDesignPlayerEligibleForSlot,
  type DesignSlot,
} from './rosterDesignFeasibility';
import type { ShapeClassification } from './playerArchetypeClassifier';
import type { TierKey } from '../data/tierParams';

export const BEST22_TUNING = {
  shapePrimaryMatch: 2.0,
  shapeRunnerUpMatch: 1.2,
  perTagMatch: 0.4,
  tiltClean: 0.4,
  bonusCap: 3.0,
} as const;

export interface Best22TargetPick {
  slotId: string;
  playerId: string;
  playerName?: string;
  salary: number;
  honorsAsk: boolean;
  pinned: boolean;
}

export type Best22PinDropReason = 'out-of-pool' | 'ineligible' | 'duplicate';

export interface Best22PinReport {
  honored: Array<{ slotId: string; playerId: string }>;
  dropped: Array<{ slotId: string; playerId: string; reason: Best22PinDropReason }>;
}

export interface Best22Target {
  picks: Best22TargetPick[];
  pins: Best22PinReport;
  totalSalary: number;
  totalTax: number;
  allIn: number;
  budget: number;
  feasible: boolean;
  embodimentZ: number;
  asksHonored: { honored: number; asked: number };
}

function meanStd(values: readonly number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function playerName(player: SimPlayer): string | undefined {
  const maybe = player as SimPlayer & { name?: string; firstName?: string; lastName?: string };
  return maybe.name ?? ([maybe.firstName, maybe.lastName].filter(Boolean).join(' ') || undefined);
}

type ValidatedBuildPin = { slotId: string; slotIndex: number; playerId: string };

function validatePins(
  slots: readonly DesignSlot[],
  simPool: readonly SimPlayer[],
  pins: ReadonlyMap<string, string> | undefined,
): { report: Best22PinReport; buildPins: ValidatedBuildPin[] } {
  const report: Best22PinReport = { honored: [], dropped: [] };
  const buildPins: ValidatedBuildPin[] = [];
  if (!pins?.size) return { report, buildPins };

  const playerById = new Map(simPool.map((player) => [player.id, player]));
  const slotIndexById = new Map(slots.map((slot, index) => [slot.slotId ?? String(index), index]));
  const validatedPlayerIds = new Set<string>();

  for (const [slotId, playerId] of pins) {
    if (validatedPlayerIds.has(playerId)) {
      report.dropped.push({ slotId, playerId, reason: 'duplicate' });
      continue;
    }
    const player = playerById.get(playerId);
    if (!player) {
      report.dropped.push({ slotId, playerId, reason: 'out-of-pool' });
      continue;
    }
    const slotIndex = slotIndexById.get(slotId);
    if (slotIndex === undefined) {
      report.dropped.push({ slotId, playerId, reason: 'ineligible' });
      continue;
    }
    const slot = slots[slotIndex];
    if (!slot || !isDesignPlayerEligibleForSlot(slot, {
      profile: { isPitcher: player.isPitcher, primaryPosition: player.position },
      slotPlayer: player,
    })) {
      report.dropped.push({ slotId, playerId, reason: 'ineligible' });
      continue;
    }
    buildPins.push({ slotId, slotIndex, playerId });
    validatedPlayerIds.add(playerId);
  }

  return { report, buildPins };
}

export function buildBest22Target(
  slots: readonly DesignSlot[],
  simPool: readonly SimPlayer[],
  classifiedById: ReadonlyMap<string, ShapeClassification>,
  archetype: SimArchetype,
  tier: TierKey,
  budget: number,
  pins?: ReadonlyMap<string, string>,
): Best22Target {
  const fitScore = archetypeFitScorer(archetype, tier, 'optimal');
  const u = meanStd(simPool.map(fitScore)).std || 1;
  const { report: pinValidationReport, buildPins } = validatePins(slots, simPool, pins);

  const slotPreferenceBonus = (playerId: string, slotIndex: number): number => {
    const preference = slots[slotIndex]?.preference;
    if (!preference) return 0;
    const classification = classifiedById.get(playerId);
    if (!classification) return 0;
    const satisfaction = askSatisfaction(preference, classification);

    let bonus = 0;
    if (satisfaction.shapeMatch === 'primary') {
      bonus += BEST22_TUNING.shapePrimaryMatch;
    } else if (satisfaction.shapeMatch === 'runnerUp') {
      bonus += BEST22_TUNING.shapeRunnerUpMatch;
    }
    bonus += satisfaction.tagsMatched * BEST22_TUNING.perTagMatch;

    if (preference.personalityTilt && preference.personalityTilt !== 'any') {
      if (satisfaction.tiltPenalty === 0) {
        bonus += BEST22_TUNING.tiltClean;
      } else if (satisfaction.tiltPenalty === 1) {
        bonus += BEST22_TUNING.tiltClean / 2;
      }
    }

    return Math.min(BEST22_TUNING.bonusCap, bonus) * u;
  };

  const build = buildIdentityRoster([...simPool], archetype, tier, budget, {
    posture: 'optimal',
    slotPreferenceBonus,
    pinned: buildPins,
  });

  let asked = 0;
  let honored = 0;
  const playerBySlotIndex = new Map(build.slotPicks.map((sp) => [sp.slotIndex, sp.player]));
  const pinReport: Best22PinReport = { honored: [], dropped: [...pinValidationReport.dropped] };
  for (const pin of buildPins) {
    const player = playerBySlotIndex.get(pin.slotIndex);
    if (player?.id === pin.playerId) {
      pinReport.honored.push({ slotId: pin.slotId, playerId: pin.playerId });
    } else {
      pinReport.dropped.push({ slotId: pin.slotId, playerId: pin.playerId, reason: 'ineligible' });
    }
  }
  const pinnedPlayerBySlotIndex = new Map(
    buildPins
      .filter((pin) => playerBySlotIndex.get(pin.slotIndex)?.id === pin.playerId)
      .map((pin) => [pin.slotIndex, pin.playerId]),
  );
  const picks = slots.map((slot, index) => {
    const player = playerBySlotIndex.get(index);
    const preference = slot.preference;

    if (!player) {
      if (preference?.shape) asked += 1;
      return {
        slotId: slot.slotId ?? String(index),
        playerId: '',
        playerName: undefined,
        salary: 0,
        honorsAsk: false,
        pinned: false,
      };
    }

    const classification = classifiedById.get(player.id);
    const satisfaction = classification ? askSatisfaction(preference, classification) : null;
    if (preference?.shape) {
      asked += 1;
      if (satisfaction?.satisfiesShape) honored += 1;
    }
    const honorsAsk = !preference || (!preference.shape && !preference.tags)
      ? true
      : Boolean(satisfaction?.satisfiesShape && satisfaction.satisfiesTags);
    return {
      slotId: slot.slotId ?? String(index),
      playerId: player.id,
      playerName: playerName(player),
      salary: player.salary,
      honorsAsk,
      pinned: pinnedPlayerBySlotIndex.get(index) === player.id,
    };
  });

  return {
    picks,
    pins: pinReport,
    totalSalary: build.totalSalary,
    totalTax: build.totalTax,
    allIn: build.totalSalary + build.totalTax,
    budget,
    feasible: build.legalRoster && build.solvent && build.floorMet,
    embodimentZ: build.embodiment.boostZ,
    asksHonored: { honored, asked },
  };
}
