import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import { CompanionApprovalCard } from '../CompanionApprovalCard';
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
  it('lets the main device approve, refuse, and revoke from a standalone card', () => {
    const onChange = vi.fn();
    render(<CompanionApprovalCard
      session={session}
      teams={[{ id: 'team-a', name: 'Kodiaks' }, { id: 'team-b', name: 'Comets' }]}
      onChange={onChange}
    />);
    expect(screen.getByText('ROOM CODE 4821')).toBeInTheDocument();
    expect(screen.getByText('LET ALEX SEE THE KODIAKS DESK?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'APPROVE' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      snakeCompanions: expect.objectContaining({ claims: expect.arrayContaining([expect.objectContaining({ deviceId: 'ipad-a', status: 'approved' })]) }),
    }));
    fireEvent.click(screen.getByRole('button', { name: 'REFUSE' }));
    fireEvent.click(screen.getByRole('button', { name: 'REVOKE BLAIR' }));
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('renders only the supplied claimed-seat desk and public read surfaces, with no execute controls', () => {
    const { container } = render(<SnakeCompanionFrame
      team={{ id: 'team-a', name: 'Kodiaks', abbreviation: 'KOD' }}
      currentPick={7}
      order={[{ pick: 7, teamName: 'Kodiaks' }, { pick: 8, teamName: 'Comets' }]}
      ticker={['COMETS SELECTED PLAYER B']}
      privateDesk={<div>TEAM A PRIVATE BOARD</div>}
      tradeGuide={<div>READ-ONLY POSTED GUIDE</div>}
      onSignOut={() => undefined}
    />);
    expect(screen.getByText('YOUR PRIVATE DRAFT DESK')).toBeInTheDocument();
    expect(screen.getByText('TEAM A PRIVATE BOARD')).toBeInTheDocument();
    expect(screen.getByText('READ-ONLY POSTED GUIDE')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/TEAM B PRIVATE BOARD|GAVEL|COMMISSIONER|EXECUTE TRADE|RECORD PICK/i);
  });
});
