import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const patchCompanions = vi.hoisted(() => vi.fn());

vi.mock('../../../../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../utils/leagueBuilderStorage')>();
  return { ...actual, patchMlbDraftSessionSnakeCompanions: patchCompanions };
});

import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import { CompanionApprovalCard } from '../CompanionApprovalCard';
import { resolveCompanionJoinUrl } from '../companionJoinUrl';
import { CompanionClaimScreen } from '../CompanionClaimScreen';
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
  beforeEach(() => localStorage.clear());

  it('lets the main device approve, refuse, and revoke from a standalone card', async () => {
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
    expect(screen.getByRole('alert')).toHaveTextContent('THIS BROWSER ADDRESS ONLY WORKS ON THIS DEVICE.');
    expect(document.body).not.toHaveTextContent(`${window.location.origin}/snake-companion`);
    fireEvent.change(screen.getByRole('textbox', { name: 'SHAREABLE ADDRESS' }), { target: { value: 'http://192.168.68.54:5173' } });
    expect(screen.getByText(/http:\/\/192\.168\.68\.54:5173\/snake-companion/)).toBeInTheDocument();
    expect(screen.getByText("USE THIS CODE ONLY ON THE LEAGUE OWNER'S SIGNED-IN DEVICES AT THE TABLE.")).toBeInTheDocument();
    expect(screen.getByText('LET ALEX SEE THE KODIAKS DESK?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'APPROVE' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      snakeCompanions: expect.objectContaining({ claims: expect.arrayContaining([expect.objectContaining({ deviceId: 'ipad-a', status: 'approved' })]) }),
    })));
    fireEvent.click(screen.getByRole('button', { name: 'REFUSE' }));
    fireEvent.click(screen.getByRole('button', { name: 'REVOKE BLAIR' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(3));
  });

  it('accepts only LAN-safe http companion origins', () => {
    expect(resolveCompanionJoinUrl('http://127.0.0.1:5173')).toBeNull();
    expect(resolveCompanionJoinUrl('http://0.0.0.0:5173')).toBeNull();
    expect(resolveCompanionJoinUrl('http://[::]:5173')).toBeNull();
    expect(resolveCompanionJoinUrl('http://localhost:5173', 'javascript:alert(1)')).toBeNull();
    expect(resolveCompanionJoinUrl('http://localhost:5173', 'https://draft.example.test/path')).toBe('https://draft.example.test/snake-companion');
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

  it('uses the exact unknown-team fallback without exposing a missing companion team id', () => {
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
