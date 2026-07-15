import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const patchCompanions = vi.hoisted(() => vi.fn());

vi.mock('../../../../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../utils/leagueBuilderStorage')>();
  return { ...actual, patchMlbDraftSessionSnakeCompanions: patchCompanions };
});

import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import { CompanionApprovalCard } from '../CompanionApprovalCard';
import {
  companionRoomCodeFromSearch,
  discoverCompanionOrigin,
  resolveCompanionJoinUrl,
} from '../companionJoinUrl';
import { CompanionClaimScreen } from '../CompanionClaimScreen';
import { CompanionSignInScreen } from '../CompanionSignInScreen';
import { SnakeCompanionFrame } from '../SnakeCompanionFrame';

const session = {
  id: 'session', leagueId: 'league', seasonNumber: 1, seed: 'seed', workflowVersion: 'snake-v2',
  engineMethodVersion: 'snake-v2', tier: 'standard', balanceMode: 'balanced', rounds: 22,
  pickOrder: [], completedPicks: [], currentPickIndex: 0, createdDate: '', lastModified: '', revision: 1,
  snakeCompanions: {
    roomCode: '4821',
    claims: [
      { deviceId: 'ipad-a', gmName: 'Alex', teamId: 'team-a', status: 'pending' },
      { deviceId: 'ipad-b', gmName: 'Blair', teamId: 'team-b', status: 'approved' },
    ],
  },
} satisfies LeagueBuilderMlbDraftSession;

describe('S5 companion surfaces', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ origin: null }), {
      headers: { 'Content-Type': 'application/json' },
    }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('lets the main device approve, refuse, and revoke from a standalone card', async () => {
    const fetchMock = vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({
      origin: 'http://192.168.68.54:5173',
    }), { headers: { 'Content-Type': 'application/json' } }));
    const onChange = vi.fn();
    patchCompanions.mockImplementation(async (input) => ({
      ...session,
      snakeCompanions: input.patch(session.snakeCompanions, session),
    }));
    render(<CompanionApprovalCard
      session={session}
      teams={[{ id: 'team-a', name: 'Kodiaks' }, { id: 'team-b', name: 'Comets' }]}
      onChange={onChange}
    />);
    expect(screen.getByText('ROOM CODE 4821')).toBeInTheDocument();
    expect(screen.queryByText("USE THIS CODE ONLY ON THE LEAGUE OWNER'S SIGNED-IN DEVICES AT THE TABLE.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'COMPANION HELP' }));
    expect(screen.getByText('FINDING THE SHAREABLE ADDRESS…')).toBeInTheDocument();
    expect(await screen.findByTestId('companion-join-url')).toHaveTextContent('http://192.168.68.54:5173/snake-companion?room=4821');
    expect(screen.getByText("USE THIS CODE ONLY ON THE LEAGUE OWNER'S SIGNED-IN DEVICES AT THE TABLE.")).toBeInTheDocument();
    expect(screen.getByText('LET ALEX SEE THE KODIAKS DESK?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'APPROVE' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      snakeCompanions: expect.objectContaining({ claims: expect.arrayContaining([expect.objectContaining({ deviceId: 'ipad-a', status: 'approved' })]) }),
    })));
    fireEvent.click(screen.getByRole('button', { name: 'REFUSE' }));
    fireEvent.click(screen.getByRole('button', { name: 'REVOKE BLAIR' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenCalledWith('/__kbl/companion-address', expect.objectContaining({ cache: 'no-store' }));
  });

  it('shows the exact companion choice and sends approval through the main pick callback', async () => {
    const onApprovePick = vi.fn().mockResolvedValue(undefined);
    const withPickRequest = {
      ...session,
      pickOrder: [{ round: 1, pick: 1, teamId: 'team-b' }],
      snakeCompanions: {
        ...session.snakeCompanions,
        pickRequest: {
          id: 'request-1', teamId: 'team-b', playerId: 'player-b', pick: 1,
          submittedAt: '2026-07-14T12:00:00.000Z', deviceId: 'ipad-b', sessionRevision: 1,
        },
      },
    } satisfies LeagueBuilderMlbDraftSession;
    render(<CompanionApprovalCard
      session={withPickRequest}
      teams={[{ id: 'team-b', name: 'Comets' }]}
      playerName={(playerId) => playerId === 'player-b' ? 'Punchie Patterson' : 'Unknown Player'}
      onApprovePick={onApprovePick}
      onChange={vi.fn()}
    />);

    expect(screen.getByTestId('companion-pick-request')).toHaveTextContent('#1 · COMETS · PUNCHIE PATTERSON');
    fireEvent.click(screen.getByRole('button', { name: 'APPROVE PICK' }));
    await waitFor(() => expect(onApprovePick).toHaveBeenCalledWith(withPickRequest.snakeCompanions.pickRequest));
  });

  it('accepts only LAN-safe http companion origins', () => {
    expect(resolveCompanionJoinUrl('http://127.0.0.1:5173')).toBeNull();
    expect(resolveCompanionJoinUrl('http://0.0.0.0:5173')).toBeNull();
    expect(resolveCompanionJoinUrl('http://[::]:5173')).toBeNull();
    expect(resolveCompanionJoinUrl('http://localhost:5173', 'javascript:alert(1)')).toBeNull();
    expect(resolveCompanionJoinUrl('http://localhost:5173', 'https://draft.example.test/path')).toBe('https://draft.example.test/snake-companion');
    expect(resolveCompanionJoinUrl('http://localhost:5173', 'http://192.168.68.54:5173', '4821')).toBe('http://192.168.68.54:5173/snake-companion?room=4821');
    expect(resolveCompanionJoinUrl('http://localhost:5173', 'http://192.168.68.54:5173', 'SECRET')).toBe('http://192.168.68.54:5173/snake-companion');
  });

  it('accepts only a four-digit room query and pre-fills the claim screen from it', () => {
    window.history.replaceState({}, '', '/snake-companion?room=4821');
    expect(companionRoomCodeFromSearch(window.location.search)).toBe('4821');
    render(<CompanionClaimScreen accountEmail="owner@example.com" onSignOut={vi.fn()} onClaim={vi.fn()} />);
    expect(screen.getByLabelText('ROOM CODE')).toHaveValue('4821');
    expect(companionRoomCodeFromSearch('?room=PRIVATE')).toBe('');
    expect(companionRoomCodeFromSearch('?room=12345')).toBe('');
  });

  it('fails closed when companion address discovery is unavailable or not JSON', async () => {
    expect(await discoverCompanionOrigin(vi.fn().mockResolvedValue(new Response('<html></html>', {
      headers: { 'Content-Type': 'text/html' },
    })))).toBeNull();
    expect(await discoverCompanionOrigin(vi.fn().mockRejectedValue(new Error('offline')))).toBeNull();
  });

  it('maps a rejected Safari network sign-in to the canonical unreachable state and keeps troubleshooting behind Help', async () => {
    render(<CompanionSignInScreen
      error={null}
      onSignIn={vi.fn().mockRejectedValue(new TypeError('Load failed'))}
    />);

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('AUTH SERVICE UNREACHABLE — CHECK PROJECT CONNECTION.');
    expect(document.body).not.toHaveTextContent('Load failed');
    expect(screen.queryByText(/THIS DEVICE REACHED THE DRAFT/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'COMPANION HELP' }));
    expect(screen.getByText(/THIS DEVICE REACHED THE DRAFT/i)).toBeInTheDocument();
  });

  it('cannot approve a stale pending row after that seat was replaced', async () => {
    const stale = {
      ...session,
      snakeCompanions: {
        roomCode: '4821',
        claims: [{ claimId: 'old-claim', claimVersion: 1, deviceId: 'ipad-old', gmName: 'Alex', teamId: 'team-a', status: 'pending' as const }],
      },
    };
    const fresh = {
      ...stale,
      snakeCompanions: {
        roomCode: '4821',
        claims: [
          { ...stale.snakeCompanions.claims[0], status: 'revoked' as const, claimVersion: 2 },
          { claimId: 'new-claim', claimVersion: 1, deviceId: 'ipad-new', gmName: 'Alex', teamId: 'team-a', status: 'pending' as const },
        ],
      },
    };
    const onChange = vi.fn();
    patchCompanions.mockImplementation(async (input) => ({
      ...fresh,
      snakeCompanions: input.patch(fresh.snakeCompanions, fresh),
    }));
    render(<CompanionApprovalCard
      session={stale}
      teams={[{ id: 'team-a', name: 'Kodiaks' }]}
      onChange={onChange}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'APPROVE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('THAT COMPANION REQUEST IS STALE. REFRESH.');
    expect(onChange).not.toHaveBeenCalled();
    expect(fresh.snakeCompanions.claims.find((claim) => claim.claimId === 'old-claim')?.status).toBe('revoked');
  });

  it('uses the exact unknown-team fallback without exposing a missing companion team id', async () => {
    const missingTeamId = 'internal-companion-team-key';
    const missingTeamSession = {
      ...session,
      snakeCompanions: {
        roomCode: '4821',
        claims: [{
          deviceId: 'ipad-missing',
          gmName: 'Alex',
          teamId: missingTeamId,
          status: 'pending' as const,
        }],
      },
    };
    const { container } = render(<CompanionApprovalCard
      session={missingTeamSession}
      teams={[]}
      onChange={vi.fn()}
    />);

    expect(screen.getByText('LET ALEX SEE THE UNKNOWN TEAM DESK?')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('CLUB');
    expect(container).not.toHaveTextContent(missingTeamId);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });

  it('renders only the supplied claimed-seat desk and public read surfaces, with no execute controls', () => {
    const { container } = render(<SnakeCompanionFrame
      team={{ id: 'team-a', name: 'Kodiaks', abbreviation: 'KOD' }}
      currentPick={7}
      order={[{ pick: 7, teamName: 'Kodiaks' }, { pick: 8, teamName: 'Comets' }]}
      ticker={['COMETS SELECTED PLAYER B']}
      privateDesk={<div>TEAM A PRIVATE BOARD</div>}
      onCover={() => undefined}
    />);
    expect(screen.getByText('YOUR PRIVATE DRAFT DESK')).toBeInTheDocument();
    expect(screen.getByText('TEAM A PRIVATE BOARD')).toBeInTheDocument();
    expect(screen.getByTestId('snake-companion-frame')).toHaveClass('snake-workspace-page');
    expect(screen.getByTestId('companion-private-workspace-layout')).toHaveClass('snake-private-workspace');
    expect(screen.getByTestId('companion-selected-player-pane')).toHaveClass('snake-selected-pane');
    expect(screen.getByTestId('companion-private-workspace-scroll')).toHaveClass('snake-board-pane');
    expect(container.textContent).not.toMatch(/TEAM B PRIVATE BOARD|GAVEL|COMMISSIONER|EXECUTE TRADE|RECORD PICK/i);
  });

  it('keeps pending-device explanation behind Help and exposes the signed-in account control', () => {
    const signOut = vi.fn();
    render(<CompanionClaimScreen
      pending
      accountEmail="owner@example.com"
      onSignOut={signOut}
      onClaim={vi.fn()}
    />);

    expect(screen.getByText(/ACCOUNT OWNER@EXAMPLE.COM/)).toBeInTheDocument();
    expect(screen.queryByText('YOUR DESK STAYS COVERED UNTIL THE COMMISSIONER APPROVES THIS DEVICE.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'COMPANION HELP' }));
    expect(screen.getByText('YOUR DESK STAYS COVERED UNTIL THE COMMISSIONER APPROVES THIS DEVICE.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SIGN OUT' }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('keeps claim instructions behind Help while leaving only the claim fields visible', () => {
    render(<CompanionClaimScreen
      accountEmail="owner@example.com"
      onSignOut={vi.fn()}
      onClaim={vi.fn()}
    />);

    expect(screen.getByLabelText('GM NAME')).toBeInTheDocument();
    expect(screen.getByLabelText('ROOM CODE')).toBeInTheDocument();
    expect(screen.queryByText(/ENTER THE GM NAME FROM THE MAIN SCREEN/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'COMPANION HELP' }));
    expect(screen.getByText(/ENTER THE GM NAME FROM THE MAIN SCREEN/i)).toBeInTheDocument();
    expect(screen.getByText(/USE THE SAME SIGNED-IN ACCOUNT/i)).toBeInTheDocument();
  });
});
