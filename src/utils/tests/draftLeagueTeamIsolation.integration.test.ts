import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFAULT_AUCTION_SETUP_CONFIG } from '../../data/auctionEngineConstants';
import type { AuctionSession } from '../../engines/auctionStateMachine';
import {
  commitCompletedMlbAuctionSessionToLeagueRosters,
  resetCompletedDraftArc,
} from '../leagueBuilderAuctionPipeline';
import {
  __resetLeagueBuilderDatabaseForTests,
  createEmptyTeamRoster,
  getTeamRoster,
  saveLeagueTemplate,
  saveTeamRoster,
} from '../leagueBuilderStorage';
import { DRAFT_LEAGUE_TEAM_ISOLATION_MESSAGE } from '../draftLeagueTeamIsolation';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

async function seedSharedLegacyTeam(): Promise<void> {
  const teamId = 'shared-herbisaurs';
  await saveLeagueTemplate({
    id: 'source-sml',
    name: 'Super Mega League',
    teamIds: [teamId],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
  });
  await saveLeagueTemplate({
    id: 'legacy-draft',
    name: 'Legacy Draft',
    teamIds: [teamId],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
    draftFormat: 'snake',
  });
  await saveTeamRoster({
    ...createEmptyTeamRoster(teamId),
    mlbRoster: Array.from({ length: 22 }, (_value, index) => `source-${index + 1}`),
  });
}

function completedAuctionSession(): AuctionSession {
  return {
    state: 'AUCTION_COMPLETE',
    config: { ...DEFAULT_AUCTION_SETUP_CONFIG, nominationOrderSeed: 'shared-team-test' },
    teams: [],
    nominationOrder: [],
    nominationIndex: 0,
    nominationRound: 0,
    players: {},
    playerOrder: [],
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    results: [],
    saleCount: 0,
  };
}

describe('legacy shared team fail-closed guards', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase('kbl-league-builder');
    await seedSharedLegacyTeam();
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase('kbl-league-builder');
  });

  test('Run It Back refuses the legacy league and does not clear the source roster', async () => {
    const rosterBefore = await getTeamRoster('shared-herbisaurs');

    await expect(resetCompletedDraftArc('legacy-draft')).rejects.toThrow(
      DRAFT_LEAGUE_TEAM_ISOLATION_MESSAGE,
    );

    expect(await getTeamRoster('shared-herbisaurs')).toEqual(rosterBefore);
  });

  test('auction handoff refuses the legacy league before it can write the shared roster', async () => {
    const rosterBefore = await getTeamRoster('shared-herbisaurs');

    await expect(commitCompletedMlbAuctionSessionToLeagueRosters({
      leagueId: 'legacy-draft',
      session: completedAuctionSession(),
    })).rejects.toThrow(DRAFT_LEAGUE_TEAM_ISOLATION_MESSAGE);

    expect(await getTeamRoster('shared-herbisaurs')).toEqual(rosterBefore);
  });
});
