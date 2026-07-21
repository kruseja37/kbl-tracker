import 'fake-indexeddb/auto';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  MemoryRouter as RoomMemoryRouter,
  MemoryRouter as SetupMemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const liveRoomMocks = vi.hoisted(() => ({
  publishSession: vi.fn(),
  seedBoard: vi.fn(),
  resolveClaim: vi.fn(),
  claims: [] as import('../../../utils/snakeLiveRoomTypes').SnakeLiveClaim[],
}));

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    pull: vi.fn(async () => undefined),
    flush: vi.fn(async () => undefined),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../../utils/franchisePhase2Flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/franchisePhase2Flags')>();
  return { ...actual, isSnakeDraftV1Enabled: () => true };
});

vi.mock('../../utils/snakeSounds', () => ({
  loadSnakeSoundsEnabled: () => false,
  saveSnakeSoundsEnabled: vi.fn(),
  createSnakeSoundPlayer: () => ({ play: vi.fn() }),
}));

// JSDOM has no Worker. Exercise the same production engines synchronously at
// the worker seam so this end-to-end storage ritual can still reach the gavel.
vi.mock('../../app/components/snake/desk/useSnakeSelectedConsequences', async () => {
  const model = await import('../../app/components/snake/desk/snakeDeskIntelligenceModel');
  return {
    useSnakeSelectedConsequences: (request: import('../../app/workers/snakeSelectedConsequences.worker').SnakeSelectedConsequencesWorkerRequest | null) => {
      if (!request) return { status: 'idle', consequenceByPlayerId: new Map() };
      const results = request.selectedPlayerIds.map((selectedPlayerId) => model.buildSelectedPlayerConsequence({
        ...request.input,
        selectedPlayerId,
      }));
      return {
        status: 'ready',
        consequenceByPlayerId: new Map(results.map((result) => [result.selectedPlayerId, result])),
      };
    },
  };
});
vi.mock('../../app/components/snake/desk/useSnakePickFinishSafety', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/desk/useSnakePickFinishSafety')>();
  const seating = await import('../../../engines/snakeSeatingProof');
  return {
    ...actual,
    useSnakePickFinishSafety: (request: import('../../app/workers/snakePickFinish.worker').SnakePickFinishWorkerRequest | null) => {
      if (!request) return { status: 'idle', rows: new Map() };
      const rows = seating.createSnakePickFinishSafetyClassifier(request)(request.candidatePlayerIds);
      return { status: 'ready', rows: new Map(rows.map((row) => [row.playerId, row])) };
    },
  };
});

vi.mock('../../app/components/snake/snakeRoomFreshness', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/snakeRoomFreshness')>();
  return { ...actual, startSnakeRoomFreshness: () => () => undefined };
});

vi.mock('../../app/components/snake/companion/useSnakeLiveHostRoom', async () => {
  const React = await import('react');
  return { useSnakeLiveHostRoom: (options: {
    session: import('../../../utils/leagueBuilderStorage').LeagueBuilderMlbDraftSession | null;
    enabled?: boolean;
    catalog?: Record<string, unknown> | null;
  }) => {
    const session = options.session;
    const [, rerenderClaims] = React.useReducer((revision: number) => revision + 1, 0);
    const roomCode = session?.snakeCompanions?.roomCode ?? '';
    const roomRef = React.useRef<null | Record<string, unknown>>(null);
    const publicSessionRef = React.useRef(session);
    if (session && !roomRef.current) {
      roomRef.current = {
        id: `live:${session.id}`,
        sessionId: session.id,
        roomCode,
        phase: session.draftPhase ?? 'MLB',
        status: 'open',
        hostDeviceId: 'test-host',
        publicRevision: session.revision ?? 0,
        publicState: {},
        createdAt: session.createdDate,
        updatedAt: session.lastModified,
      };
      publicSessionRef.current = session;
    }
    if (roomRef.current && roomCode) roomRef.current.roomCode = roomCode;
    const room = roomRef.current;
    return {
      room,
      catalog: room && options.catalog ? {
        roomId: String(room.id), catalogRevision: 1, catalog: options.catalog,
        createdAt: session?.createdDate ?? '2026-07-19T00:00:00.000Z',
      } : null,
      publicSession: publicSessionRef.current,
      claims: liveRoomMocks.claims,
      intents: [],
      events: [],
      status: options.enabled ? 'live' : 'idle',
      subscriptionStatus: options.enabled ? 'live' : null,
      error: null,
      working: false,
      hostAccessReady: Boolean(options.enabled && room),
      liveRoomReady: Boolean(options.enabled && room),
      refresh: vi.fn(async () => undefined),
      publishSession: async (input: { session: import('../../../utils/leagueBuilderStorage').LeagueBuilderMlbDraftSession }) => {
        liveRoomMocks.publishSession(input);
        publicSessionRef.current = input.session;
        if (room) room.publicRevision = input.session.revision ?? 0;
        return room;
      },
      resolveClaim: async (...args: Parameters<typeof liveRoomMocks.resolveClaim>) => {
        const claim = await liveRoomMocks.resolveClaim(...args);
        rerenderClaims();
        return claim;
      },
      resolveIntent: vi.fn(),
      restorePreviousPublicState: vi.fn(),
      submitTradeIntent: vi.fn(),
      seedBoard: liveRoomMocks.seedBoard,
      closeRoom: vi.fn(),
    };
  },
}; });

import { TIER_CAPS } from '../../../data/tierParams';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createEmptyTeamRoster,
  getAllPlayers,
  getLeagueTemplate,
  getMlbDraftSession,
  getRegisteredPool,
  getTeam,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  saveTeamRoster,
  type Player,
  type Team,
} from '../../../utils/leagueBuilderStorage';
import { resolveLockedSeat } from '../../app/components/snake/desk/deskRoomModel';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';
import { snakeRoomMissingLegCopy } from '../../app/components/snake/snakeRoomCopy';
import { LeagueBuilderDraftSetup } from '../../app/pages/LeagueBuilderDraftSetup';

const LEAGUE_ID = 'roomfix-snake-league';
const SOURCE_LEAGUE_ID = 'roomfix-legends';
const TEAM_IDS = Array.from({ length: 2 }, (_, index) => `roomfix-team-${index + 1}`);
const PICKED_LEGEND_ID = 'roomfix-ruth-career';
const UNPICKED_LEGEND_ID = 'roomfix-ruth-peak';
const DRAFT_LEGEND_ID = 'roomfix-ruth-draft';
const LEGEND_VERSION_GROUP_ID = 'historical:ruthba01';

const LEGAL_POSITIONS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
  'CF', 'CF', 'CF', 'CF', 'CF', 'CF',
  'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP',
] as const satisfies readonly Player['primaryPosition'][];

function team(id: string, index: number): Team {
  return {
    id,
    name: `Roomfix Club ${index + 1}`,
    abbreviation: `R${index + 1}`,
    location: 'Roomfix',
    nickname: `Club ${index + 1}`,
    colors: { primary: '#16324f', secondary: '#f5c542', accent: '#f04e30' },
    stadium: 'Roomfix Park',
    controlledBy: 'human',
    leagueIds: [LEAGUE_ID],
    mlbArchetypeKey: index === 0 ? 'murderers-row' : 'bomba-squad',
    farmArchetypeKey: index === 0 ? 'whiteyball' : 'the-opener',
    boardRankOverrides: index === 0 ? { global: [PICKED_LEGEND_ID] } : undefined,
    createdDate: '2026-07-11',
    lastModified: '2026-07-11',
  };
}

function player(
  id: string,
  position: Player['primaryPosition'],
  name?: { first: string; last: string },
  sourceId?: string,
  secondaryPosition?: Player['secondaryPosition'],
  ratings: Partial<Pick<Player, 'power' | 'contact' | 'speed' | 'fielding' | 'arm' | 'velocity' | 'junk' | 'accuracy'>> = {},
): Player {
  const pitcher = position === 'SP' || position === 'RP' || position === 'CP';
  return {
    id,
    firstName: name?.first ?? id,
    lastName: name?.last ?? 'Roomfix',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: position,
    secondaryPosition,
    power: ratings.power ?? (pitcher ? 20 : 5),
    contact: ratings.contact ?? 30,
    speed: ratings.speed ?? 30,
    fielding: ratings.fielding ?? 30,
    arm: ratings.arm ?? 30,
    velocity: ratings.velocity ?? (pitcher ? 30 : 0),
    junk: ratings.junk ?? (pitcher ? 30 : 0),
    accuracy: ratings.accuracy ?? (pitcher ? 30 : 0),
    arsenal: pitcher ? ['4F'] : [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: [
      { leagueId: SOURCE_LEAGUE_ID, teamId: '', rosterStatus: 'FREE_AGENT' },
      { leagueId: LEAGUE_ID, teamId: '', rosterStatus: 'FREE_AGENT' },
    ],
    hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-07-11',
    lastModified: '2026-07-11',
    isCustom: true,
    ...(sourceId ? { sourceId } : {}),
  } as Player;
}

async function seedLeagueFormOutput(): Promise<void> {
  await saveLeagueTemplate({
    id: LEAGUE_ID,
    name: 'Roomfix Snake League',
    teamIds: [...TEAM_IDS],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
    draftFormat: 'snake',
    poolAssemblyMode: 'full-sources',
    sourceLeagueIds: [SOURCE_LEAGUE_ID],
    tier: 'standard',
    balanceMode: 'taxed',
    salaryCap: TIER_CAPS.standard.tierCap * 8,
  });
  await saveLeagueTemplate({
    id: SOURCE_LEAGUE_ID,
    name: 'Roomfix Legends Library',
    teamIds: [],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
    draftFormat: 'auction',
    tier: 'standard',
    balanceMode: 'taxed',
  });
  for (const [index, id] of TEAM_IDS.entries()) {
    await saveTeam(team(id, index));
    await saveTeamRoster(createEmptyTeamRoster(id));
  }

  const players: Player[] = [];
  for (let setIndex = 0; setIndex < TEAM_IDS.length; setIndex += 1) {
    for (const [positionIndex, position] of LEGAL_POSITIONS.entries()) {
      const isLegend = setIndex === 0 && positionIndex === 0;
      const isHitter = positionIndex < 14;
      const nextPlayer = player(
        isLegend ? UNPICKED_LEGEND_ID : `roomfix-player-${setIndex + 1}-${positionIndex + 1}`,
        position,
        isLegend ? { first: 'Babe', last: 'Ruth' } : undefined,
        isLegend ? 'lahman:ruthba01' : undefined,
        positionIndex === 8 ? 'C' : undefined,
        isHitter ? { power: 60 } : undefined,
      );
      players.push(isLegend ? {
        ...nextPlayer,
        versionGroupId: LEGEND_VERSION_GROUP_ID,
        historicalProfileType: 'Peak',
      } : nextPlayer);
    }
  }
  players.push({ ...player(
    PICKED_LEGEND_ID,
    'C',
    { first: 'Babe', last: 'Ruth' },
    'lahman:ruthba01',
    undefined,
    { power: 60 },
  ), versionGroupId: LEGEND_VERSION_GROUP_ID, historicalProfileType: 'Career' });
  players.push({ ...player(
    DRAFT_LEGEND_ID,
    'C',
    { first: 'Babe', last: 'Ruth' },
    'lahman:ruthba01',
    undefined,
    { power: 60 },
  ), versionGroupId: LEGEND_VERSION_GROUP_ID, historicalProfileType: 'Draft Pool' });
  for (let index = 0; index < TEAM_IDS.length; index += 1) {
    players.push(player(`roomfix-extra-first-baseman-${index + 1}`, '1B'));
    players.push(player(`roomfix-extra-catcher-${index + 1}`, 'C'));
    players.push(player(`roomfix-extra-third-baseman-${index + 1}`, '3B'));
    players.push(player(`roomfix-extra-center-fielder-${index + 1}`, 'CF'));
    players.push(player(`roomfix-extra-closer-${index + 1}`, 'CP'));
  }
  for (let index = 0; index < 10; index += 1) {
    players.push(player(`roomfix-extra-swingman-${index + 1}`, 'SP/RP'));
  }
  players.push(player('roomfix-proof-first-baseman-1', '1B'));
  players.push(player('roomfix-proof-first-baseman-2', '1B'));
  for (const row of players) await savePlayer(row);
}

async function resetStorage(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
}

function NavigationTarget() {
  const location = useLocation();
  return <div data-testid="navigation-target">{location.pathname}{location.search}</div>;
}

describe('ROOMFIX setup to playable snake room', () => {
  beforeEach(async () => {
    liveRoomMocks.publishSession.mockReset();
    liveRoomMocks.claims.splice(0);
    liveRoomMocks.seedBoard.mockReset().mockImplementation(async (input: { teamId: string }) => ({
      roomId: 'live-room',
      teamId: input.teamId,
      boardRevision: 0,
      seeded: true,
    }));
    liveRoomMocks.resolveClaim.mockReset().mockImplementation(async (
      claim: import('../../../utils/snakeLiveRoomTypes').SnakeLiveClaim,
      status: 'approved' | 'revoked',
    ) => {
      claim.status = status;
      claim.revision += 1;
      claim.resolvedAt = '2026-07-19T00:00:00.000Z';
      return claim;
    });
    await resetStorage();
    await seedLeagueFormOutput();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await resetStorage();
  });

  test('names each missing room leg in plain words', () => {
    expect(snakeRoomMissingLegCopy({ league: true, pool: false, session: true })).toContain('SAVED DRAFT POOL IS MISSING');
    expect(snakeRoomMissingLegCopy({ league: false, pool: true, session: true })).toContain('LEAGUE IS MISSING');
    expect(snakeRoomMissingLegCopy({ league: true, pool: true, session: false })).toContain('DRAFT SESSION IS MISSING');
  });

  test('registers every remaining card at GO, opens the room, and records the first pick through the real ritual', async () => {
    render(
      <SetupMemoryRouter initialEntries={[`/league-builder/draft-setup?leagueId=${LEAGUE_ID}`]}>
        <Routes>
          <Route path="/league-builder/draft-setup" element={<LeagueBuilderDraftSetup />} />
          <Route path="/snake-room" element={<NavigationTarget />} />
        </Routes>
      </SetupMemoryRouter>,
    );

    expect(await screen.findByTestId('snake-version-count')).toHaveTextContent(/CARDS · .* PEOPLE/);
    expect(screen.queryByLabelText('PICK A BABE RUTH CARD')).not.toBeInTheDocument();
    await waitFor(() => {
      const liveBuildButton = screen.getByRole('button', { name: 'BUILD FULL SOURCES' });
      expect(liveBuildButton).toBeEnabled();
      fireEvent.click(liveBuildButton);
    }, { timeout: 30_000 });
    await screen.findByText(/BUILT FULL SELECTED SOURCES/, {}, { timeout: 30_000 });
    await screen.findByRole('button', { name: 'LOCK POOL' }, { timeout: 30_000 });
    // The accepted Full Sources proof replaces the setup control when BUSY clears. Resolve and
    // click the same live enabled node, just as the relock and GO seams below already do.
    await waitFor(() => {
      const liveLockButton = screen.getByRole('button', { name: 'LOCK POOL' });
      const reasons = screen.queryAllByTestId('draft-readiness-panel')
        .map((panel) => panel.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' | ');
      expect(liveLockButton, `readiness: ${reasons || 'none'}`).toBeEnabled();
      fireEvent.click(liveLockButton);
    }, { timeout: 30_000 });
    await waitFor(async () => expect((await getRegisteredPool(LEAGUE_ID))?.locked).toBe(true), { timeout: 30_000 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'UNLOCK POOL' })).toBeEnabled(), { timeout: 30_000 });

    // All-version round-trip regression: unlock/relock preserves every remaining card.
    fireEvent.click(screen.getByRole('button', { name: 'UNLOCK POOL' }));
    await waitFor(async () => expect((await getRegisteredPool(LEAGUE_ID))?.locked).not.toBe(true), { timeout: 30_000 });
    // Proof completion can replace the control during this transition. Resolve and click the
    // same live enabled node in one wait attempt instead of retaining a possibly stale element.
    await waitFor(() => {
      const liveRelockButton = screen.getByRole('button', { name: 'LOCK POOL' });
      expect(liveRelockButton).toBeEnabled();
      fireEvent.click(liveRelockButton);
    }, { timeout: 30_000 });
    await waitFor(async () => expect((await getRegisteredPool(LEAGUE_ID))?.locked).toBe(true), { timeout: 30_000 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'UNLOCK POOL' })).toBeEnabled(), { timeout: 30_000 });
    expect(screen.queryByLabelText('PICK A BABE RUTH CARD')).not.toBeInTheDocument();
    expect(screen.getByText('POOL LOCKED')).toBeInTheDocument();
    await screen.findByRole('button', { name: 'ENTER SNAKE DRAFT' }, { timeout: 30_000 });
    // The proof can briefly re-check after the pool lock and replace/disable
    // the control between two separate queries. Assert readiness and click the
    // same live node in one waitFor attempt so this test follows a real click.
    await waitFor(() => {
      const liveStartButton = screen.getByRole('button', { name: 'ENTER SNAKE DRAFT' });
      expect(liveStartButton).toBeEnabled();
      fireEvent.click(liveStartButton);
    }, { timeout: 30_000 });
    await waitFor(async () => {
      expect(await getMlbDraftSession(LEAGUE_ID, 1)).not.toBeNull();
    }, { timeout: 30_000 });

    const navigationTarget = await screen.findByTestId('navigation-target', {}, { timeout: 150_000 });
    expect(navigationTarget).toHaveTextContent(`/snake-room?leagueId=${LEAGUE_ID}`);
    const roomTarget = navigationTarget.textContent!;
    const preparedSession = await getMlbDraftSession(LEAGUE_ID, 1);
    liveRoomMocks.claims.push({
      id: 'claim-team-2',
      roomId: `live:${preparedSession!.id}`,
      requestKey: 'claim-team-2-request',
      deviceId: 'companion-device-2',
      gmName: 'Guest GM',
      teamId: TEAM_IDS[1],
      status: 'pending',
      revision: 0,
      createdAt: '2026-07-19T00:00:00.000Z',
      resolvedAt: null,
    });
    cleanup();
    render(<RoomMemoryRouter initialEntries={[roomTarget]}><SnakeDraftRoom /></RoomMemoryRouter>);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    });
    await waitFor(() => {
      expect(screen.queryByText('OPENING THE ROOM…')).not.toBeInTheDocument();
    }, { timeout: 30_000 });

    const legs = {
      league: await getLeagueTemplate(LEAGUE_ID),
      pool: await getRegisteredPool(LEAGUE_ID),
      session: await getMlbDraftSession(LEAGUE_ID, 1),
    };
    const missingLegs = Object.entries(legs).flatMap(([leg, value]) => value ? [] : [leg]);
    expect(missingLegs, `ROOMFIX null leg: ${missingLegs.join(', ') || 'none'}`).toEqual([]);

    const pickedIds = legs.session!.snakeSetup!.poolPlayerIds;
    expect(new Set(legs.pool!.players.map((row) => row.id))).toEqual(new Set(pickedIds));
    expect(pickedIds).toContain(PICKED_LEGEND_ID);
    expect(pickedIds).toContain(UNPICKED_LEGEND_ID);
    expect(pickedIds).toContain(DRAFT_LEGEND_ID);
    expect(legs.session!.snakeSetup!.versionSelections).toEqual({});
    expect(legs.pool!.players.every((row) => Number.isFinite(row.iv) && row.iv > 0)).toBe(true);
    expect(legs.pool).toMatchObject({ locked: true });
    const pickedPositions = (await getAllPlayers())
      .filter((row) => pickedIds.includes(row.id))
      .reduce<Record<string, number>>((counts, row) => {
        counts[row.primaryPosition] = (counts[row.primaryPosition] ?? 0) + 1;
        return counts;
      }, {});
    expect(pickedPositions.C).toBeGreaterThanOrEqual(2);
    expect(pickedPositions.SP).toBeGreaterThanOrEqual(4);
    expect(pickedPositions.RP).toBeGreaterThanOrEqual(3);
    expect(pickedPositions.CP).toBeGreaterThanOrEqual(1);
    expect(pickedPositions['SP/RP']).toBeGreaterThanOrEqual(1);

    const firstTeam = (await getTeam(TEAM_IDS[0]))!;
    const lockedSeat = resolveLockedSeat({ team: firstTeam, session: legs.session! });
    expect(legs.session!.snakeSetup!.clubs[0]).toMatchObject({
      archetypeId: 'murderers-row',
      farmArchetypeId: 'whiteyball',
    });
    expect(legs.session!.seatBoards?.[TEAM_IDS[0]].rankings.global?.[0]).toBe(PICKED_LEGEND_ID);
    expect(lockedSeat.capIdentity).toBeDefined();
    expect(lockedSeat.archetypeName).not.toBe('BALANCED');

    expect(await screen.findByTestId('snake-draft-room')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL ROOMFIX CLUB 1 SEAT' }));
    await act(async () => { await Promise.resolve(); });
    const privateSeat = screen.getByRole('region', { name: 'Private seat' });
    expect(
      screen.queryByTestId('private-draft-desk'),
      `ROOMFIX private seat after reveal: ${privateSeat.textContent}`,
    ).toBeTruthy();
    await waitFor(async () => {
      const stored = await getMlbDraftSession(LEAGUE_ID, 1);
      expect(stored?.seatBoards?.[TEAM_IDS[0]]).toBeDefined();
    }, { timeout: 10_000 });
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('TRUE COST');
    const planTruth = screen.getByTestId('plan-truth-strip').textContent ?? '';
    for (const label of ['SALARY', 'TAX', 'ALL-IN', 'MONEY LEFT']) expect(planTruth).toContain(label);
    expect(planTruth).toMatch(/\$-?[\d,]+/);
    expect(planTruth).not.toMatch(/NaN|Infinity/);

    expect(screen.queryByRole('button', { name: 'THE GUIDE' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 1' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'TRADE PICKS' }).textContent).toMatch(/PICK|NO LEGAL GUIDE TRADE/i));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));

    const careerCard = screen.getAllByRole('button', { name: /^SELECT / })
      .find((button) => button.getAttribute('data-player-id') === PICKED_LEGEND_ID);
    expect(careerCard).toBeTruthy();
    const selectedId = careerCard!.getAttribute('data-player-id');
    const selectedPlayer = (await getAllPlayers()).find((row) => row.id === selectedId)!;
    const selectedName = `${selectedPlayer.firstName} ${selectedPlayer.lastName}`;
    const selectedFrozenIv = legs.pool!.players.find((row) => row.id === selectedId)!.iv;
    fireEvent.click(careerCard!);
    expect(screen.getByTestId('selected-player-card').querySelector('h2')).toHaveTextContent(selectedName);
    expect(screen.getByRole('region', { name: 'Private seat' })).toHaveTextContent(selectedName);
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_600)); });
    expect(await screen.findByText('PICK RECORDED')).toBeInTheDocument();
    expect(liveRoomMocks.publishSession).toHaveBeenCalledWith(expect.objectContaining({
      eventKind: 'PICK_RECORDED',
    }));
    const publishedPick = liveRoomMocks.publishSession.mock.calls.at(-1)?.[0] as {
      session: Record<string, unknown>;
    };
    for (const privateField of [
      'seatBoards',
      'farmSeatBoards',
      'roomLogByTeamId',
      'snakeCompanions',
      'correctionSnapshots',
    ]) {
      expect(publishedPick.session).not.toHaveProperty(privateField);
    }
    expect(screen.getByText(selectedName.toUpperCase())).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ADVANCE TO NEXT PICK' })).not.toBeInTheDocument();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_600)); });

    await waitFor(async () => {
      const stored = await getMlbDraftSession(LEAGUE_ID, 1);
      expect(stored?.completedPicks).toHaveLength(1);
      expect(stored?.completedPicks[0]?.playerId).toBe(selectedId);
      expect(stored?.completedPicks[0]?.settledSalary).toBe(selectedFrozenIv);
      expect(Number.isFinite(stored?.completedPicks[0]?.marginalTax)).toBe(true);
      expect(stored?.correctionSnapshots?.[0]?.priorSession.currentPickIndex).toBe(0);
      expect(stored?.correctionSnapshots?.[0]?.priorSession.completedPicks).toHaveLength(0);
      expect(stored?.currentPickIndex).toBe(1);
      expect(stored?.versionState?.draftedPlayerIdByGroupId[LEGEND_VERSION_GROUP_ID]).toBe(PICKED_LEGEND_ID);
      expect(stored?.versionState?.retiredPlayerIdsByGroupId[LEGEND_VERSION_GROUP_ID]).toEqual([
        DRAFT_LEGEND_ID,
        UNPICKED_LEGEND_ID,
      ]);
    });
    fireEvent.click(await screen.findByRole('button', { name: 'REVEAL ROOMFIX CLUB 2 SEAT' }));
    await waitFor(() => {
      const nextName = screen.getByTestId('selected-player-card').querySelector('h2')?.textContent;
      expect(nextName).toBeTruthy();
      expect(nextName).not.toBe(selectedName);
    });
    fireEvent.click(screen.getByRole('button', { name: 'I HAVE THE ROOM' }));
    await waitFor(() => expect(document.querySelectorAll('[data-player-id]').length).toBeGreaterThan(0));
    const remainingPlayerIds = [...document.querySelectorAll('[data-player-id]')]
      .map((element) => element.getAttribute('data-player-id'));
    expect(remainingPlayerIds).not.toContain(UNPICKED_LEGEND_ID);
    expect(remainingPlayerIds).not.toContain(DRAFT_LEGEND_ID);
    const fallbackBoard = (await getMlbDraftSession(LEAGUE_ID, 1))!.seatBoards![TEAM_IDS[1]];
    fireEvent.click(screen.getByRole('button', { name: /^COMPANIONS/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'APPROVE ROOMFIX CLUB 2' }));
    await waitFor(() => expect(liveRoomMocks.resolveClaim).toHaveBeenCalledTimes(1));
    expect(liveRoomMocks.seedBoard).toHaveBeenCalledWith({
      teamId: TEAM_IDS[1],
      board: JSON.parse(JSON.stringify(fallbackBoard)),
    });
    expect(liveRoomMocks.seedBoard.mock.invocationCallOrder[0])
      .toBeLessThan(liveRoomMocks.resolveClaim.mock.invocationCallOrder[0]);
    await waitFor(() => expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument());
    expect((await getMlbDraftSession(LEAGUE_ID, 1))!.seatBoards![TEAM_IDS[1]])
      .toEqual(fallbackBoard);
  }, 180_000);
});
