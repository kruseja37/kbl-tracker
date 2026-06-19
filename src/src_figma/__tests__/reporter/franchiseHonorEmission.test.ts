import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  emitFranchiseHonorNews,
  franchiseHonorEmissionSeam,
} from '../../app/engines/reporter/franchiseHonorEmission';
import type { FranchiseHonorNewsInput } from '../../app/engines/reporter/franchiseL12AwardNewsAdapter';
import { setFranchisePhase2L12EnabledForTests } from '../../../utils/franchisePhase2Flags';
import type { BeatReporter, SeasonEmissionConfig, SeasonNewsItem } from '../../../types/reporter';

const originalSeam = { ...franchiseHonorEmissionSeam };

const honorInput: FranchiseHonorNewsInput = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  seasonNumber: 1,
  honorKind: 'MVP',
  triggerPhase: 'season-end',
  subjectIds: ['player-mvp'],
  facts: {
    winnerId: 'player-mvp',
    winnerName: 'Marina Moon',
  },
  magnitude: 0.5,
};

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
    perEventRate: {},
    raceTopN: 3,
    simWritable: true,
    lastModified: 0,
    ...overrides,
  };
}

function newsItem(overrides: Partial<SeasonNewsItem> = {}): SeasonNewsItem {
  return {
    id: 'season-news-1',
    franchiseId: honorInput.franchiseId,
    seasonId: honorInput.seasonId,
    seasonNumber: honorInput.seasonNumber,
    eventType: 'AWARD_RESULT',
    subjectIds: [...honorInput.subjectIds],
    facts: {
      honorKind: honorInput.honorKind,
      winnerId: 'player-mvp',
    },
    headline: 'Moon Takes MVP',
    body: 'Marina Moon turned the season race into a headline.',
    reporterId: reporter.id,
    dramaticWeight: 0.95,
    createdAt: 1000,
    changed_at: 1000,
    ...overrides,
  };
}

function installSeamMocks(params: {
  seasonConfig?: SeasonEmissionConfig;
  existingItems?: SeasonNewsItem[];
  beatReporter?: BeatReporter | null;
  generatedItem?: SeasonNewsItem | null;
} = {}) {
  const generatedItem = params.generatedItem === undefined ? newsItem() : params.generatedItem;
  const beatReporter = params.beatReporter === undefined ? reporter : params.beatReporter;
  const loadConfig = vi.fn(async () => params.seasonConfig ?? config());
  const listByEvent = vi.fn(async () => params.existingItems ?? []);
  const getReporter = vi.fn(async () => beatReporter);
  const generateTake = vi.fn(async () => generatedItem);
  const persist = vi.fn(async () => undefined);

  franchiseHonorEmissionSeam.loadConfig = loadConfig;
  franchiseHonorEmissionSeam.listByEvent = listByEvent;
  franchiseHonorEmissionSeam.getReporter = getReporter;
  franchiseHonorEmissionSeam.generateTake = generateTake;
  franchiseHonorEmissionSeam.persist = persist;

  return {
    generatedItem,
    loadConfig,
    listByEvent,
    getReporter,
    generateTake,
    persist,
  };
}

describe('emitFranchiseHonorNews', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(franchiseHonorEmissionSeam, originalSeam);
    setFranchisePhase2L12EnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(franchiseHonorEmissionSeam, originalSeam);
    setFranchisePhase2L12EnabledForTests(null);
  });

  test('flag off returns dark-noop before any seam work', async () => {
    setFranchisePhase2L12EnabledForTests(false);
    const seam = installSeamMocks();

    const result = await emitFranchiseHonorNews({
      honorInput,
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(result).toEqual({
      status: 'dark-noop',
      reason: 'Phase-2 L12 disabled.',
    });
    expect(seam.loadConfig).not.toHaveBeenCalled();
    expect(seam.listByEvent).not.toHaveBeenCalled();
    expect(seam.getReporter).not.toHaveBeenCalled();
    expect(seam.generateTake).not.toHaveBeenCalled();
    expect(seam.persist).not.toHaveBeenCalled();
  });

  test('explicit AWARD_RESULT opt-out returns gated before reporter or take work', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({
      seasonConfig: config({ perEventRate: { AWARD_RESULT: 0 } }),
    });

    const result = await emitFranchiseHonorNews({
      honorInput,
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(result).toEqual({ status: 'gated' });
    expect(seam.loadConfig).toHaveBeenCalledTimes(1);
    expect(seam.listByEvent).not.toHaveBeenCalled();
    expect(seam.getReporter).not.toHaveBeenCalled();
    expect(seam.generateTake).not.toHaveBeenCalled();
    expect(seam.persist).not.toHaveBeenCalled();
  });

  test('matching honorKind in prior AWARD_RESULT items dedups before take generation', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({
      existingItems: [newsItem({ facts: { honorKind: 'MVP', winnerId: 'old-mvp' } })],
    });

    const result = await emitFranchiseHonorNews({
      honorInput,
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(result).toEqual({ status: 'deduped' });
    expect(seam.listByEvent).toHaveBeenCalledWith('franchise-1', 'season-1', 'AWARD_RESULT');
    expect(seam.getReporter).not.toHaveBeenCalled();
    expect(seam.generateTake).not.toHaveBeenCalled();
    expect(seam.persist).not.toHaveBeenCalled();
  });

  test('different honorKind in prior AWARD_RESULT items does not dedup', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const generatedItem = newsItem({ id: 'cy-news', facts: { honorKind: 'CY_YOUNG', winnerId: 'pitcher-cy' } });
    const cyInput: FranchiseHonorNewsInput = {
      ...honorInput,
      honorKind: 'CY_YOUNG',
      subjectIds: ['pitcher-cy'],
      facts: { winnerId: 'pitcher-cy' },
    };
    const seam = installSeamMocks({
      existingItems: [newsItem({ facts: { honorKind: 'MVP', winnerId: 'player-mvp' } })],
      generatedItem,
    });

    const result = await emitFranchiseHonorNews({
      honorInput: cyInput,
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(result).toEqual({ status: 'emitted' });
    expect(seam.generateTake).toHaveBeenCalledTimes(1);
    expect(seam.persist).toHaveBeenCalledWith(generatedItem);
  });

  test('missing reporter returns no-reporter', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({ beatReporter: null });

    const result = await emitFranchiseHonorNews({
      honorInput,
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(result).toEqual({ status: 'no-reporter' });
    expect(seam.getReporter).toHaveBeenCalledWith('team-1', 'league-1', 'franchise-1');
    expect(seam.generateTake).not.toHaveBeenCalled();
    expect(seam.persist).not.toHaveBeenCalled();
  });

  test('null generated take returns take-failed without persisting', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({ generatedItem: null });

    const result = await emitFranchiseHonorNews({
      honorInput,
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(result).toEqual({ status: 'take-failed' });
    expect(seam.generateTake).toHaveBeenCalledTimes(1);
    expect(seam.persist).not.toHaveBeenCalled();
  });

  test('happy path builds the event, generates a take with effective config, and persists it', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const generatedItem = newsItem();
    const seam = installSeamMocks({ generatedItem });

    const result = await emitFranchiseHonorNews({
      honorInput,
      teamId: 'team-1',
      leagueId: 'league-1',
    });

    expect(result).toEqual({ status: 'emitted' });
    expect(seam.listByEvent).toHaveBeenCalledWith('franchise-1', 'season-1', 'AWARD_RESULT');
    expect(seam.getReporter).toHaveBeenCalledWith('team-1', 'league-1', 'franchise-1');
    expect(seam.generateTake).toHaveBeenCalledWith(
      expect.objectContaining({
        franchiseId: 'franchise-1',
        seasonId: 'season-1',
        seasonNumber: 1,
        eventType: 'AWARD_RESULT',
        subjectIds: ['player-mvp'],
        facts: expect.objectContaining({
          honorKind: 'MVP',
          triggerPhase: 'season-end',
          winnerId: 'player-mvp',
        }),
      }),
      reporter,
      expect.objectContaining({
        marqueeOnly: true,
        perEventRate: expect.objectContaining({ AWARD_RESULT: 1 }),
      }),
    );
    expect(seam.persist).toHaveBeenCalledWith(generatedItem);
  });
});
