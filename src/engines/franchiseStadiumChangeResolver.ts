import { getAllParks, getStableParkId, type ParkDimensions } from '../data/parkLookup';
import { getDerivedParkFactorsIfAvailable } from './parkFactorDeriver';
import { franchiseL10DeterministicRoll, type FranchiseL10EventCandidate } from './franchiseL10EventEngine';
import type { FranchiseTeamStadiumSnapshot } from '../types/franchise';

/**
 * L10-4 stadium-change concrete resolver (pure, build-DARK).
 *
 * This is the concrete-resolution step for a FIRED L10 `stadium_change` team
 * event (the representative candidate emitted by L10-1's league sweep). Given
 * that the event happened, this module resolves WHICH new park the team lands
 * on and produces the resulting stadium snapshot payload for a future
 * (post-D13) apply step.
 *
 * Purity contract: NO I/O, NO Date, NO Math.random, NO async, NO IndexedDB.
 * Resolution is fully deterministic off the event seed via
 * franchiseL10DeterministicRoll.
 *
 * Wiring status: NO production caller yet. This is ORPHANED-PENDING the
 * post-D13 apply step that will consume FranchiseStadiumChangeResolution and
 * write the snapshot. Do not wire it live until that step exists.
 *
 * The pickStadiumFromPool helper is SHARED with L14 (rebrand): the same
 * exclude-current-then-deterministic-pick logic selects the new park there.
 */

export interface FranchiseStadiumChangeResolution {
  newStadium: ParkDimensions;
  snapshot: FranchiseTeamStadiumSnapshot;
}

/**
 * Deterministically pick a park from the full pool, excluding the current park
 * (matched by normalized stable id) when a non-empty current name is supplied.
 *
 * Falls back to the full pool if exclusion empties the eligible set (e.g. a
 * single-park pool, or the current park is the only park). Throws only if the
 * full pool itself is empty.
 *
 * Pure, total, deterministic. Shared with L14 (rebrand).
 */
export function pickStadiumFromPool(
  currentStadiumName: string | undefined,
  seed: string,
): ParkDimensions {
  const pool = getAllParks();

  const currentId =
    typeof currentStadiumName === 'string' && currentStadiumName.length > 0
      ? getStableParkId(currentStadiumName)
      : undefined;

  const eligible =
    currentId !== undefined
      ? pool.filter((park) => getStableParkId(park.name) !== currentId)
      : pool;

  const candidates = eligible.length > 0 ? eligible : pool;

  if (candidates.length === 0) {
    throw new Error('pickStadiumFromPool: park pool is empty');
  }

  const index = clamp(
    Math.floor(franchiseL10DeterministicRoll(seed) * candidates.length),
    0,
    candidates.length - 1,
  );

  return candidates[index];
}

/**
 * Resolve a fired L10 `stadium_change` team event into a concrete new park and
 * the resulting stadium snapshot payload. Deterministic off the event seed.
 */
export function resolveFranchiseStadiumChange(input: {
  event: FranchiseL10EventCandidate;
  teamName: string;
  currentStadiumName?: string;
  seedBase?: string;
}): FranchiseStadiumChangeResolution {
  const { event } = input;

  if (event.targetKind !== 'team' || event.eventType !== 'stadium_change') {
    throw new Error(
      'resolveFranchiseStadiumChange: expected a team stadium_change event, got ' +
        event.targetKind +
        '/' +
        event.eventType,
    );
  }

  const pickSeed = `${input.seedBase ?? ''}:${event.targetId}:stadium_change:${event.seed}`;
  const newStadium = pickStadiumFromPool(input.currentStadiumName, pickSeed);

  const snapshot: FranchiseTeamStadiumSnapshot = {
    teamId: event.targetId,
    teamName: input.teamName,
    stadium: newStadium.name,
    stadiumId: getStableParkId(newStadium.name),
    hasSeedParkFactors: getDerivedParkFactorsIfAvailable(newStadium.name) !== undefined,
  };

  return { newStadium, snapshot };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
