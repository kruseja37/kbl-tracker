import { useEffect } from 'react';

import type { LeagueBuilderMlbDraftSession } from '../../../../../utils/leagueBuilderStorage';
import { approveCompanionClaim, ensureCompanionRoom } from './companionModel';

export interface CompanionApprovalCardProps {
  session: LeagueBuilderMlbDraftSession;
  teams: readonly { id: string; name: string }[];
  onChange: (session: LeagueBuilderMlbDraftSession) => void | Promise<void>;
  createRoomCode?: () => string;
}

export function CompanionApprovalCard(props: CompanionApprovalCardProps) {
  useEffect(() => {
    if (!props.session.snakeCompanions?.roomCode) {
      void props.onChange(ensureCompanionRoom(props.session, props.createRoomCode));
    }
  }, [props]);

  const companions = props.session.snakeCompanions;
  if (!companions) return <section className="ballpark-panel"><p>OPENING THE COMPANION ROOM…</p></section>;
  const teamName = (teamId: string) => props.teams.find((team) => team.id === teamId)?.name ?? 'CLUB';
  const update = (deviceId: string, status: 'approved' | 'revoked') => {
    void props.onChange(approveCompanionClaim(props.session, deviceId, status));
  };

  return (
    <section className="ballpark-panel" aria-label="Companion approvals">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICES</p>
      <h2 className="ballpark-title mt-1 text-2xl">ROOM CODE {companions.roomCode}</h2>
      <p className="mt-2 text-sm">Use this code only on the league owner's signed-in devices at the table.</p>
      <div className="mt-4 grid gap-3">
        {companions.claims.filter((claim) => claim.status === 'pending').map((claim) => (
          <div key={claim.deviceId} className="border-4 border-[var(--ballpark-panel-border)] p-3">
            <p className="font-bold">LET {claim.gmName.toUpperCase()} SEE THE {teamName(claim.teamId).toUpperCase()} DESK?</p>
            <div className="mt-2 flex gap-2">
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold" onClick={() => update(claim.deviceId, 'approved')}>APPROVE</button>
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={() => update(claim.deviceId, 'revoked')}>REFUSE</button>
            </div>
          </div>
        ))}
        {companions.claims.filter((claim) => claim.status === 'approved').map((claim) => (
          <div key={claim.deviceId} className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--ballpark-panel-border)] p-3">
            <p><strong>{claim.gmName.toUpperCase()}</strong> — {teamName(claim.teamId).toUpperCase()}</p>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={() => update(claim.deviceId, 'revoked')}>REVOKE {claim.gmName.toUpperCase()}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
