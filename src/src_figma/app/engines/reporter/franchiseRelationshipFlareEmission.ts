import { isFranchisePhase2L13Enabled } from '../../../../utils/franchisePhase2Flags';
import {
  applyFranchiseMoraleEffect,
  type ApplyFranchiseMoraleEffectResult,
} from '../../../../utils/franchiseMoraleState';
import { loadSeasonEmissionConfig } from '../../../../utils/seasonEmissionConfigStorage';
import { listSeasonNewsItemsByEvent, persistSeasonNewsItem } from '../../../../utils/seasonNewsStorage';
import { getReporterForTeam } from '../../../../utils/reporterStorage';
import { generateSeasonNewsTake, shouldEmitSeasonNews } from './seasonNewsGenerator';
import {
  buildFranchiseRelationshipFlareSeasonNewsEvent,
  type FranchiseRelationshipFlareNewsInput,
} from './franchiseL13RelationshipFlareNewsAdapter';

export const L13_RELATIONSHIP_FAN_NUDGE_TUNING = {
  baseDelta: 1,
  intensityScale: 2,
  maxMagnitude: 3,
} as const;

export type EmitRelationshipFlareStatus = 'dark-noop' | 'gated' | 'deduped' | 'no-reporter' | 'take-failed' | 'emitted';
export type EmitRelationshipFlareResult = { status: EmitRelationshipFlareStatus; reason?: string };

export const relationshipFlareEmissionSeam = {
  loadConfig: loadSeasonEmissionConfig,
  listByEvent: listSeasonNewsItemsByEvent,
  getReporter: getReporterForTeam,
  generateTake: generateSeasonNewsTake,
  persist: persistSeasonNewsItem,
  applyFanNudge: applyFranchiseMoraleEffect,
};

export function relationshipFlareFanNudgeSourceEventId(
  input: Pick<FranchiseRelationshipFlareNewsInput, 'franchiseId' | 'seasonId'> & {
    statsScopeId: string;
    edge: Pick<FranchiseRelationshipFlareNewsInput['edge'], 'id'>;
  },
  gameKey: string,
): string {
  return [
    'relationship-visible-fan-nudge',
    input.franchiseId,
    input.seasonId,
    input.statsScopeId,
    input.edge.id,
    gameKey,
  ].join(':');
}

export function relationshipFlareFanNudgeDelta(
  edge: Pick<FranchiseRelationshipFlareNewsInput['edge'], 'type' | 'intensity'>,
): number {
  const direction = relationshipFanNudgeDirection(edge.type);
  if (direction === 0) return 0;

  const intensity = Number.isFinite(edge.intensity) ? Math.max(0, Math.min(1, edge.intensity)) : 0;
  const magnitude = Math.min(
    L13_RELATIONSHIP_FAN_NUDGE_TUNING.maxMagnitude,
    L13_RELATIONSHIP_FAN_NUDGE_TUNING.baseDelta +
      Math.round(intensity * L13_RELATIONSHIP_FAN_NUDGE_TUNING.intensityScale),
  );

  return direction * magnitude;
}

export async function emitFranchiseRelationshipFlareNews(params: {
  flareInput: FranchiseRelationshipFlareNewsInput;
  teamId: string;
  leagueId?: string;
}): Promise<EmitRelationshipFlareResult> {
  if (!isFranchisePhase2L13Enabled()) return { status: 'dark-noop', reason: 'Phase-2 L13 disabled.' };

  const config = await relationshipFlareEmissionSeam.loadConfig();
  if (!shouldEmitSeasonNews('RELATIONSHIP_FLARE', config)) return { status: 'gated' };

  const existing = await relationshipFlareEmissionSeam.listByEvent(
    params.flareInput.franchiseId,
    params.flareInput.seasonId,
    'RELATIONSHIP_FLARE',
  );
  const sourceEventId = params.flareInput.relationshipFlareSourceEventId;
  if (
    sourceEventId &&
    existing.some((item) => item.facts?.relationshipFlareSourceEventId === sourceEventId)
  ) {
    return { status: 'deduped' };
  }

  const reporter = await relationshipFlareEmissionSeam.getReporter(
    params.teamId,
    params.leagueId,
    params.flareInput.franchiseId,
  );
  if (!reporter) return { status: 'no-reporter' };

  const event = buildFranchiseRelationshipFlareSeasonNewsEvent(params.flareInput);
  const item = await relationshipFlareEmissionSeam.generateTake(event, reporter, config);
  if (!item) return { status: 'take-failed' };

  await relationshipFlareEmissionSeam.persist(item);
  return { status: 'emitted' };
}

export async function emitFranchiseRelationshipFlareNewsAndApplyFanNudge(params: {
  flareInput: FranchiseRelationshipFlareNewsInput;
  statsScopeId: string;
  teamId: string;
  leagueId?: string;
  gameKey: string;
  timestamp: string;
}): Promise<{
  emission: EmitRelationshipFlareResult;
  fanNudge: ApplyFranchiseMoraleEffectResult | null;
  sourceEventId: string;
}> {
  const sourceEventId = relationshipFlareFanNudgeSourceEventId({
    franchiseId: params.flareInput.franchiseId,
    seasonId: params.flareInput.seasonId,
    statsScopeId: params.statsScopeId,
    edge: params.flareInput.edge,
  }, params.gameKey);

  const flareInput: FranchiseRelationshipFlareNewsInput = {
    ...params.flareInput,
    relationshipFlareSourceEventId: sourceEventId,
    facts: {
      ...params.flareInput.facts,
      fanNudgeSourceEventId: sourceEventId,
    },
  };
  const emission = await emitFranchiseRelationshipFlareNews({
    flareInput,
    teamId: params.teamId,
    leagueId: params.leagueId,
  });

  if (emission.status !== 'emitted') {
    return { emission, fanNudge: null, sourceEventId };
  }

  const delta = relationshipFlareFanNudgeDelta(params.flareInput.edge);
  if (delta === 0) {
    return { emission, fanNudge: null, sourceEventId };
  }

  const fanNudge = await relationshipFlareEmissionSeam.applyFanNudge({
    franchiseId: params.flareInput.franchiseId,
    seasonId: params.flareInput.seasonId,
    statsScopeId: params.statsScopeId,
    seasonNumber: params.flareInput.seasonNumber,
    targetType: 'team-fan',
    teamId: params.teamId,
    delta,
    reason: `Reporter-amplified relationship drama (${params.flareInput.edge.type}).`,
    sourceEventId,
    sourceKind: 'relationship-reporter',
    actorDisplayName: 'Beat Reporter',
    timestamp: params.timestamp,
  });

  return { emission, fanNudge, sourceEventId };
}

function relationshipFanNudgeDirection(
  type: FranchiseRelationshipFlareNewsInput['edge']['type'],
): -1 | 0 | 1 {
  switch (type) {
    case 'FEUD':
    case 'RIVALRY':
    case 'HISTORY':
      return -1;
    case 'MENTORSHIP':
    case 'FRIENDSHIP':
    case 'ROMANCE':
      return 1;
    default:
      return 0;
  }
}
