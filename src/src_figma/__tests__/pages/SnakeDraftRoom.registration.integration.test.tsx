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

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
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
import SnakeDraftRoom, { snakeRoomMissingLegCopy } from '../../app/pages/SnakeDraftRoom';
import { LeagueBuilderDraftSetup } from '../../app/pages/LeagueBuilderDraftSetup';

const LEAGUE_ID = 'roomfix-snake-league';
const SOURCE_LEAGUE_ID = 'roomfix-legends';
const TEAM_IDS = Array.from({ length: 2 }, (_, index) => `roomfix-team-${index + 1}`);
const PICKED_LEGEND_ID = 'roomfix-ruth-yankees';
const UNPICKED_LEGEND_ID = 'roomfix-ruth-red-sox';

const LEGAL_POSITIONS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', '1B', '2B', 'SS', 'LF', 'RF',
  'SP', 'SP', 'SP', 'SP/RP', 'RP', 'RP', 'RP', 'CP', 'SP/RP',
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
    power: pitcher ? 20 : 55,
    contact: pitcher ? 20 : 55,
    speed: 55,
    fielding: 55,
    arm: 55,
    velocity: pitcher ? 55 : 0,
    junk: pitcher ? 55 : 0,
    accuracy: pitcher ? 55 : 0,
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
      players.push(player(
        isLegend ? UNPICKED_LEGEND_ID : `roomfix-player-${setIndex + 1}-${positionIndex + 1}`,
        position,
        isLegend ? { first: 'Babe', last: 'Ruth' } : undefined,
        isLegend ? 'lahman:ruthba01' : undefined,
        positionIndex === 8 ? 'C' : undefined,
      ));
    }
  }
  players.push(player(PICKED_LEGEND_ID, 'C', { first: 'Babe', last: 'Ruth' }, 'lahman:ruthba01'));
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

  test('registers the picked pool at GO, opens the room, and records the first pick through the real ritual', async () => {
    render(
      <SetupMemoryRouter initialEntries={[`/league-builder/draft-setup?leagueId=${LEAGUE_ID}`]}>
        <Routes>
          <Route path="/league-builder/draft-setup" element={<LeagueBuilderDraftSetup />} />
          <Route path="/snake-room" element={<NavigationTarget />} />
        </Routes>
      </SetupMemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('PICK A BABE RUTH CARD'), {
      target: { value: PICKED_LEGEND_ID },
    });
    const lockButton = await screen.findByRole('button', { name: 'LOCK POOL' }, { timeout: 30_000 });
    await waitFor(() => expect(lockButton).toBeEnabled(), { timeout: 30_000 });
    fireEvent.click(lockButton);
    await waitFor(async () => expect((await getRegisteredPool(LEAGUE_ID))?.locked).toBe(true), { timeout: 30_000 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'UNLOCK' })).toBeEnabled(), { timeout: 30_000 });
    expect(screen.queryByLabelText('PICK A BABE RUTH CARD')).not.toBeInTheDocument();
    expect(screen.getByText('UNLOCK THE POOL TO CHANGE VERSIONS.')).toBeInTheDocument();
    const startButton = await screen.findByRole('button', { name: 'ENTER SNAKE DRAFT' }, { timeout: 30_000 });
    await waitFor(() => expect(startButton).toBeEnabled(), { timeout: 30_000 });
    fireEvent.click(startButton);

    const navigationTarget = await screen.findByTestId('navigation-target', {}, { timeout: 150_000 });
    expect(navigationTarget).toHaveTextContent(`/snake-room?leagueId=${LEAGUE_ID}`);
    const roomTarget = navigationTarget.textContent!;
    cleanup();
    render(<RoomMemoryRouter initialEntries={[roomTarget]}><SnakeDraftRoom /></RoomMemoryRouter>);
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
    expect(pickedIds).not.toContain(UNPICKED_LEGEND_ID);
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
    expect(legs.session!.snakeSetup!.clubs[0]).toMatchObject({ archetypeId: 'murderers-row' });
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
    expect(screen.getAllByText(/TRUE COST \$/).length).toBeGreaterThan(0);
    for (const label of ['PLAN COST', 'PLAN TAX', 'PLAN CUSHION']) {
      const text = screen.getByText(label).parentElement?.textContent ?? '';
      expect(text).toMatch(/\$-?[\d,]+/);
      expect(text).not.toMatch(/NaN|Infinity/);
    }

    fireEvent.click(screen.getByRole('button', { name: 'THE GUIDE' }));
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 1' }));
    await waitFor(() => expect(screen.getByLabelText('Shared trade guide').textContent).toMatch(/PICK|NO LEGAL GUIDE TRADE/i));
    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));

    const chosenName = screen.getByText('READ THE PICK').parentElement?.querySelector('h2')?.textContent;
    expect(chosenName).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'COVER & ARM' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1_100)); });
    expect(await screen.findByText('PICK RECORDED')).toBeInTheDocument();
    expect(screen.getByText(chosenName!.toUpperCase())).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ADVANCE TO NEXT PICK' }));

    await waitFor(async () => {
      const stored = await getMlbDraftSession(LEAGUE_ID, 1);
      expect(stored?.completedPicks).toHaveLength(1);
      expect(stored?.currentPickIndex).toBe(1);
    });
  }, 180_000);
});
