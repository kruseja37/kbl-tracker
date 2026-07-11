import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SnakeSeatingProof } from '../../../engines/snakeSeatingProof';
import { deleteMlbDraftSession, getMlbDraftSession } from '../../../utils/leagueBuilderStorage';
import {
  SnakeDraftSetup,
  type SnakeSetupClub,
  type SnakeSetupPlayer,
} from '../../app/pages/SnakeDraftSetup';

function player(id: string, name: string, sourceId?: string): SnakeSetupPlayer {
  return {
    playerId: id,
    name,
    sourceId,
    sourceLeagueId: 'legends',
    versionLabel: id.toUpperCase(),
    price: 10,
    shape: { id, isPitcher: false, position: 'SS', secondaryPosition: null },
    construction: {
      id,
      isPitcher: false,
      bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50 },
    },
  };
}

const clubs: SnakeSetupClub[] = Array.from({ length: 8 }, (_, index) => ({
  teamId: `team-${index + 1}`,
  teamName: `Club ${index + 1}`,
  gmName: `GM ${index + 1}`,
  seatMode: index === 0 ? 'companion' : 'hotseat',
  archetype: 'BALANCED',
}));

const goodProof: SnakeSeatingProof = {
  feasible: true,
  assignments: [],
  shortfall: null,
  message: 'ALL 8 CLUBS CAN SEAT A LEGAL 22 ✓',
};

function setup(players = [player('one', 'Babe Ruth', 'lahman:ruthba01')], proof = vi.fn(async () => goodProof)) {
  return render(
    <MemoryRouter>
      <SnakeDraftSetup
        leagueId="league-1"
        sourceLeagues={[{ id: 'legends', name: 'Legends Library' }]}
        initialPlayers={players}
        initialClubs={clubs}
        runProof={proof}
        createSession={vi.fn(async () => undefined)}
      />
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('SnakeDraftSetup', () => {
  it('renders the four lean setup cards and plain-language chrome', async () => {
    setup();
    for (const heading of ['POOL', 'CLUBS', 'ORDER', 'GO']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(await screen.findByText('ALL 8 CLUBS CAN SEAT A LEGAL 22 ✓')).toBeInTheDocument();
    expect(screen.getByText('R1: 1→8 · R2: 8→1')).toBeInTheDocument();
    expect(screen.queryByText(/percent|optimize|reserve/i)).not.toBeInTheDocument();
  });

  it('renders the engine named shortfall without re-deriving it', async () => {
    setup(undefined, vi.fn(async () => ({
      ...goodProof,
      feasible: false,
      message: 'NOT ENOUGH CATCHERS FOR 8 CLUBS — ADD PLAYERS OR REMOVE A CLUB',
    })));
    expect((await screen.findAllByText('NOT ENOUGH CATCHERS FOR 8 CLUBS — ADD PLAYERS OR REMOVE A CLUB')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'START THE DRAFT' })).toBeDisabled();
  });

  it('groups historical versions and sends only the picked card to the proof', async () => {
    const proof = vi.fn(async () => goodProof);
    setup([
      player('ruth-red-sox', 'Babe Ruth', 'lahman:ruthba01'),
      player('ruth-yankees', 'Babe Ruth', 'lahman:ruthba01'),
    ], proof);
    expect(await screen.findByText('BABE RUTH — 2 CARDS')).toBeInTheDocument();
    const picker = screen.getByLabelText('PICK A BABE RUTH CARD');
    fireEvent.change(picker, { target: { value: 'ruth-yankees' } });
    await waitFor(() => {
      const latestPool = proof.mock.calls.at(-1)?.[0].pool as SnakeSetupPlayer[];
      expect(latestPool.map((entry) => entry.playerId)).toEqual(['ruth-yankees']);
    });
  });

  it('marks GO stale after an edit and only enables it from the latest proof', async () => {
    const releases: Array<(proof: SnakeSeatingProof) => void> = [];
    const proof = vi.fn(() => new Promise<SnakeSeatingProof>((resolve) => releases.push(resolve)));
    setup(undefined, proof);
    expect(screen.getAllByText('CHECKING…').length).toBeGreaterThan(0);
    releases.shift()?.(goodProof);
    await waitFor(() => expect(screen.getByRole('button', { name: 'START THE DRAFT' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('DRAFT SEED'), { target: { value: 'NEW-SEED' } });
    fireEvent.change(screen.getByLabelText('DRAFT SEED'), { target: { value: 'LATEST-SEED' } });
    expect(screen.getAllByText('CHECKING…').length).toBeGreaterThan(0);
    releases.shift()?.({ ...goodProof, feasible: false, message: 'OLD CHECK' });
    releases.shift()?.(goodProof);
    await waitFor(() => expect(screen.getByRole('button', { name: 'START THE DRAFT' })).toBeEnabled());
  });

  it('warns loudly when same-name cards have no historical identity', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setup([player('ruth-a', 'Babe Ruth'), player('ruth-b', 'Babe Ruth')]);
    expect(await screen.findByText('TWO CARDS NAMED BABE RUTH — TREATED AS DIFFERENT PEOPLE. REBUILD THE POOL FROM THE LEGENDS LIBRARY TO LINK THEM.')).toBeInTheDocument();
    expect(warn).toHaveBeenCalled();
  });

  it('removes the picked card and can hand add that exact card back', async () => {
    setup([
      player('ruth-red-sox', 'Babe Ruth', 'lahman:ruthba01'),
      player('ruth-yankees', 'Babe Ruth', 'lahman:ruthba01'),
    ]);
    fireEvent.change(screen.getByLabelText('PICK A BABE RUTH CARD'), { target: { value: 'ruth-yankees' } });
    fireEvent.click(screen.getByRole('button', { name: 'REMOVE' }));
    expect(await screen.findByText(/RUTH-YANKEES/)).toBeInTheDocument();
    expect(screen.getByText('HAND ADD')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ADD BACK' }));
    expect(screen.queryByText('HAND ADD')).not.toBeInTheDocument();
    expect(screen.getByText('BABE RUTH — 2 CARDS')).toBeInTheDocument();
  });

  it('writes the complete snake setup and S1a session fields through real storage at GO', async () => {
    await deleteMlbDraftSession('league-go');
    render(
      <MemoryRouter>
        <SnakeDraftSetup
          leagueId="league-go"
          sourceLeagues={[{ id: 'legends', name: 'Legends Library' }]}
          initialPlayers={[
            player('ruth-red-sox', 'Babe Ruth', 'lahman:ruthba01'),
            player('ruth-yankees', 'Babe Ruth', 'lahman:ruthba01'),
            player('mays', 'Willie Mays', 'lahman:mayswi01'),
          ]}
          initialClubs={clubs}
          runProof={vi.fn(async () => goodProof)}
        />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('PICK A BABE RUTH CARD'), { target: { value: 'ruth-yankees' } });
    fireEvent.change(screen.getByLabelText('DRAFT SEED'), { target: { value: 'VISIBLE-SEED' } });
    fireEvent.click(screen.getByText(/SEAT 1/));
    fireEvent.change(screen.getByLabelText('Club 1 GM NAME'), { target: { value: 'Captain One' } });
    fireEvent.change(screen.getByLabelText('Club 1 TEAM STYLE'), { target: { value: 'POWER' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'START THE DRAFT' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'START THE DRAFT' }));

    await waitFor(async () => {
      const stored = await getMlbDraftSession('league-go', 1);
      expect(stored?.snakeSetup).toEqual({
        poolPlayerIds: ['ruth-yankees', 'mays'],
        versionSelections: { 'source:ruthba01': 'ruth-yankees' },
        clubs: clubs.map((club, index) => ({
          teamId: club.teamId,
          gmName: index === 0 ? 'Captain One' : club.gmName,
          hotseat: club.seatMode === 'hotseat',
          archetypeId: index === 0 ? 'POWER' : club.archetype,
        })),
        orderSeed: 'VISIBLE-SEED',
      });
      expect(stored).toMatchObject({
        leagueId: 'league-go',
        seasonNumber: 1,
        workflowVersion: 'snake-v1',
        engineMethodVersion: 'snake-s1a',
        rounds: 22,
        completedPicks: [],
        currentPickIndex: 0,
        revision: 0,
      });
      expect(stored?.pickOrder).toHaveLength(176);
    });
    await deleteMlbDraftSession('league-go');
  });
});
