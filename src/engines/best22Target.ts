import {
  archetypeFitScorer,
  buildIdentityRoster,
  type SimArchetype,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import {
  askSatisfaction,
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
}

export interface Best22Target {
  picks: Best22TargetPick[];
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

export function buildBest22Target(
  slots: readonly DesignSlot[],
  simPool: readonly SimPlayer[],
  classifiedById: ReadonlyMap<string, ShapeClassification>,
  archetype: SimArchetype,
  tier: TierKey,
  budget: number,
): Best22Target {
  const fitScore = archetypeFitScorer(archetype, tier, 'optimal');
  const u = meanStd(simPool.map(fitScore)).std || 1;

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
  });

  let asked = 0;
  let honored = 0;
  const playerBySlotIndex = new Map(build.slotPicks.map((sp) => [sp.slotIndex, sp.player]));
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
    };
  });

  return {
    picks,
    totalSalary: build.totalSalary,
    totalTax: build.totalTax,
    allIn: build.totalSalary + build.totalTax,
    budget,
    feasible: build.legalRoster && build.solvent && build.floorMet,
    embodimentZ: build.embodiment.boostZ,
    asksHonored: { honored, asked },
  };
}
