import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  emitFranchiseRelationshipFlareNewsAndApplyFanNudge,
  relationshipFlareEmissionSeam,
} from '../../app/engines/reporter/franchiseRelationshipFlareEmission';
import type { FranchiseRelationshipFlareNewsInput } from '../../app/engines/reporter/franchiseL13RelationshipFlareNewsAdapter';
import {
  buildRelationshipIntelTake,
} from '../../../utils/franchiseRelationshipIntel';
import {
  franchiseRelationshipEdgeId,
  type RelationshipEdgeRow,
} from '../../../utils/franchiseRelationshipEdgesStorage';
import {
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../../../utils/franchiseMoraleState';
import { setFranchisePhase2L13EnabledForTests } from '../../../utils/franchisePhase2Flags';
import { syncEngine } from '../../../utils/syncEngine';
import type { BeatReporter, SeasonEmissionConfig, SeasonNewsItem } from '../../../types/reporter';

const originalSeam = { ...relationshipFlareEmissionSeam };

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  statsScopeId: 'scope-1',
  seasonNumber: 1,
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const reporter: BeatReporter = {
  id: 'reporter-1',
  teamId: 'team-1',
  leagueId: 'league-1',
  name: 'Mina Pressbox',
  personality: 'ANALYTICAL',
  voiceStyle: 'THE_PROFESSOR',
  eraFlavor: 'MODERN_LOCAL',
  avatarEra: 'headset',
  avatarColors: {
    primary: '#112233',
    secondary: '#445566',
  },
  currentMood: 'BALANCED',
  moodMomentum: 0,
  createdAt: 1,
  updatedAt: 1,
  changed_at: 1,
};

function config(overrides: Partial<SeasonEmissionConfig> = {}): SeasonEmissionConfig {
  return {
    id: 'default',
    marqueeOnly: true,
    perEventRate: { RELATIONSHIP_FLARE: 1 },
    raceTopN: 3,
    simWritable: true,
    lastModified: 0,
    ...overrides,
  };
}

function edge(overrides: Partial<RelationshipEdgeRow> = {}): RelationshipEdgeRow {
  const player1Id = overrides.player1Id ?? 'player-a';
  const player2Id = overrides.player2Id ?? 'player-b';
  const type = overrides.type ?? 'FEUD';
  return {
    ...scope,
    id: franchiseRelationshipEdgeId(scope, player1Id, player2Id, type),
    player1Id,
    player2Id,
    type,
    intensity: 0.9,
    potential: false,
    accuracy: 0.8,
    formedAtGameNumber: 3,
    dissolvedAtGameNumber: null,
    createdAt: 1781990400000,
    updatedAt: 1781990400000,
    ...overrides,
  };
}

function flareInput(row = edge()): FranchiseRelationshipFlareNewsInput {
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    seasonNumber: scope.seasonNumber,
    teamId: 'team-1',
    teamName: 'Moonstars',
    edge: row,
    take: buildRelationshipIntelTake(row, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      moveId: 'move-1',
    }),
    trigger: 'pre-move',
  };
}

function newsItem(event: Parameters<typeof relationshipFlareEmissionSeam.generateTake>[0]): SeasonNewsItem {
  return {
    id: 'season-news-1',
    franchiseId: event.franchiseId,
    seasonId: event.seasonId,
    seasonNumber: event.seasonNumber,
    eventType: event.eventType,
    subjectIds: [...event.subjectIds],
    facts: { ...event.facts },
    headline: 'Clubhouse Edge Gets Loud',
    body: 'The relationship drama made it into the local conversation.',
    reporterId: reporter.id,
    dramaticWeight: event.dramaticWeight,
    createdAt: 1000,
    changed_at: 1000,
  };
}

function installSeamMocks(params: {
  seasonConfig?: SeasonEmissionConfig;
  existingItems?: SeasonNewsItem[];
  beatReporter?: BeatReporter | null;
} = {}) {
  const loadConfig = vi.fn(async () => params.seasonConfig ?? config());
  const listByEvent = vi.fn(async () => params.existingItems ?? []);
  const getReporter = vi.fn(async () => params.beatReporter === undefined ? reporter : params.beatReporter);
  const generateTake = vi.fn(async (event: Parameters<typeof relationshipFlareEmissionSeam.generateTake>[0]) => newsItem(event));
  const persist = vi.fn(async () => undefined);
  const applyFanNudge = vi.fn(applyFranchiseMoraleEffect);

  relationshipFlareEmissionSeam.loadConfig = loadConfig;
  relationshipFlareEmissionSeam.listByEvent = listByEvent;
  relationshipFlareEmissionSeam.getReporter = getReporter;
  relationshipFlareEmissionSeam.generateTake = generateTake;
  relationshipFlareEmissionSeam.persist = persist;
  relationshipFlareEmissionSeam.applyFanNudge = applyFanNudge;

  return {
    loadConfig,
    listByEvent,
    getReporter,
    generateTake,
    persist,
    applyFanNudge,
  };
}

describe('relationship flare emission fan nudge', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    Object.assign(relationshipFlareEmissionSeam, originalSeam);
    resetFranchiseMoraleDatabaseForTests();
    await deleteDatabase('kbl-franchise-morale');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
    setFranchisePhase2L13EnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(relationshipFlareEmissionSeam, originalSeam);
    resetFranchiseMoraleDatabaseForTests();
    setFranchisePhase2L13EnabledForTests(null);
  });

  test('SEA-2 gated: config-gated relationship flare does not apply the direct fan nudge', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    const seam = installSeamMocks({
      seasonConfig: config({ perEventRate: { RELATIONSHIP_FLARE: 0 } }),
    });

    const result = await emitFranchiseRelationshipFlareNewsAndApplyFanNudge({
      flareInput: flareInput(),
      statsScopeId: scope.statsScopeId,
      teamId: 'team-1',
      leagueId: 'league-1',
      gameKey: 'game-7',
      timestamp: '2026-06-20T00:00:00.000Z',
    });

    expect(result.emission).toEqual({ status: 'gated' });
    expect(result.fanNudge).toBeNull();
    expect(seam.applyFanNudge).not.toHaveBeenCalled();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-1')).resolves.toBeNull();
  });

  test('emitted relationship flare writes only team-fan morale and is idempotent by deterministic sourceEventId', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    const seam = installSeamMocks();
    const input = flareInput();

    const first = await emitFranchiseRelationshipFlareNewsAndApplyFanNudge({
      flareInput: input,
      statsScopeId: scope.statsScopeId,
      teamId: 'team-1',
      leagueId: 'league-1',
      gameKey: 'game-7',
      timestamp: '2026-06-20T00:00:00.000Z',
    });
    const duplicate = await emitFranchiseRelationshipFlareNewsAndApplyFanNudge({
      flareInput: input,
      statsScopeId: scope.statsScopeId,
      teamId: 'team-1',
      leagueId: 'league-1',
      gameKey: 'game-7',
      timestamp: '2026-06-20T00:00:00.000Z',
    });

    expect(first.emission.status).toBe('emitted');
    expect(first.fanNudge?.status).toBe('applied');
    expect(duplicate.emission.status).toBe('emitted');
    expect(duplicate.fanNudge?.status).toBe('skipped');
    expect(first.sourceEventId).toBe(duplicate.sourceEventId);
    expect(first.sourceEventId).toMatch(/^relationship-visible-fan-nudge:/);
    expect(seam.generateTake.mock.calls[0][0].facts).toMatchObject({
      fanNudgeSourceEventId: first.sourceEventId,
      relationshipFlareSourceEventId: first.sourceEventId,
    });

    const fan = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-1');
    const playerA = await getFranchiseMoraleSnapshot(scope, 'player', 'player-a');
    const playerB = await getFranchiseMoraleSnapshot(scope, 'player', 'player-b');

    expect(fan?.history).toHaveLength(1);
    expect(fan?.history[0]).toMatchObject({
      sourceEventId: first.sourceEventId,
      sourceKind: 'relationship-reporter',
      actorDisplayName: 'Beat Reporter',
    });
    expect(fan?.currentValue).toBeLessThan(50);
    expect(playerA).toBeNull();
    expect(playerB).toBeNull();
  });
});
