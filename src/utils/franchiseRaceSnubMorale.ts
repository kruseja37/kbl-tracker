import {
  composeMoraleConsequence,
  type MoraleMatrixEvent,
} from '../engines/masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';
import { getFranchisePlayer } from './franchisePlayerStorage';
import {
  applyFranchiseMoraleMatrixConsequence,
  getFranchiseMoraleSnapshot,
} from './franchiseMoraleState';
import { isFranchisePhase2L12Enabled } from './franchisePhase2Flags';

export type FranchiseHonorKind = 'MVP' | 'CY_YOUNG' | 'ALL_STAR' | 'ROOKIE_OF_YEAR' | 'RELIEVER_OF_YEAR';

type RaceSnubVictim = {
  playerId: string;
  teamId: string;
};

type RaceSnubCandidate = RaceSnubVictim & {
  marginToWinner: number;
};

type RaceSnubScope = {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
};

type ApplyFranchiseRaceSnubMoraleResult = {
  status: 'dark-noop' | 'applied';
  appliedCount: number;
  reason?: string;
};

const NEUTRAL_HIDDEN_MODIFIERS: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

export const franchiseRaceSnubSeam = {
  getPlayer: getFranchisePlayer,
  getSnapshot: getFranchiseMoraleSnapshot,
  applyConsequence: applyFranchiseMoraleMatrixConsequence,
};

export function buildRaceSnubMoraleEvent(honorKind: FranchiseHonorKind): MoraleMatrixEvent {
  return {
    kind: 'race',
    type: `race.snub.${honorKind.toLowerCase()}`,
  };
}

export function pickRaceSnubVictims(
  candidates: ReadonlyArray<RaceSnubCandidate>,
  winnerIds: ReadonlySet<string>,
  topN: number,
): RaceSnubVictim[] {
  if (topN <= 0) return [];

  return candidates
    .filter((candidate) => !winnerIds.has(candidate.playerId))
    .slice()
    .sort((a, b) => {
      const marginDiff = Math.abs(a.marginToWinner) - Math.abs(b.marginToWinner);
      if (marginDiff !== 0) return marginDiff;
      return a.playerId.localeCompare(b.playerId);
    })
    .slice(0, topN)
    .map(({ playerId, teamId }) => ({ playerId, teamId }));
}

function resolveHiddenModifiers(modifiers: Partial<HiddenModifiers> | null | undefined): HiddenModifiers {
  return {
    loyalty: Number.isFinite(modifiers?.loyalty) ? Number(modifiers?.loyalty) : NEUTRAL_HIDDEN_MODIFIERS.loyalty,
    ambition: Number.isFinite(modifiers?.ambition) ? Number(modifiers?.ambition) : NEUTRAL_HIDDEN_MODIFIERS.ambition,
    resilience: Number.isFinite(modifiers?.resilience) ? Number(modifiers?.resilience) : NEUTRAL_HIDDEN_MODIFIERS.resilience,
    charisma: Number.isFinite(modifiers?.charisma) ? Number(modifiers?.charisma) : NEUTRAL_HIDDEN_MODIFIERS.charisma,
  };
}

function sourceEventId(
  scope: RaceSnubScope,
  honorKind: FranchiseHonorKind,
  playerId: string,
): string {
  return [
    'race-snub',
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    honorKind,
    playerId,
  ].join(':');
}

export async function applyFranchiseRaceSnubMorale(params: {
  victims: RaceSnubVictim[];
  honorKind: FranchiseHonorKind;
  scope: RaceSnubScope;
  timestamp: number;
}): Promise<ApplyFranchiseRaceSnubMoraleResult> {
  if (!isFranchisePhase2L12Enabled()) {
    return {
      status: 'dark-noop',
      appliedCount: 0,
      reason: 'L12 disabled',
    };
  }

  const event = buildRaceSnubMoraleEvent(params.honorKind);
  const timestamp = new Date(params.timestamp).toISOString();
  let appliedCount = 0;

  for (const victim of params.victims) {
    try {
      const player = await franchiseRaceSnubSeam.getPlayer(params.scope.franchiseId, victim.playerId);
      const currentPlayerMorale =
        (await franchiseRaceSnubSeam.getSnapshot(params.scope, 'player', victim.playerId))?.currentValue ??
        player?.morale ??
        50;
      const currentFanMorale =
        (await franchiseRaceSnubSeam.getSnapshot(params.scope, 'team-fan', victim.teamId))?.currentValue ??
        50;
      const consequence = composeMoraleConsequence(
        event,
        player?.personality,
        resolveHiddenModifiers(player?.hiddenPersonalityModifiers),
        currentPlayerMorale,
        currentFanMorale,
      );
      const result = await franchiseRaceSnubSeam.applyConsequence({
        ...params.scope,
        playerId: victim.playerId,
        teamId: victim.teamId,
        consequence,
        sourceEventId: sourceEventId(params.scope, params.honorKind, victim.playerId),
        timestamp,
      });

      if (result.status !== 'failed') {
        appliedCount += 1;
      }
    } catch (error) {
      console.warn('[MoraleMatrix] race snub event skipped:', error);
    }
  }

  return {
    status: 'applied',
    appliedCount,
  };
}
