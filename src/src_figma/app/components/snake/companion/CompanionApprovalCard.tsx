import { useEffect } from 'react';

import {
  patchMlbDraftSessionSnakeCompanions,
  type LeagueBuilderMlbDraftSession,
  type SnakeCompanionState,
} from '../../../../../utils/leagueBuilderStorage';
import { CompanionHelp } from './CompanionHelp';
import { approveCompanionClaim, ensureCompanionRoom } from './companionModel';

export interface CompanionApprovalCardProps {
  session: LeagueBuilderMlbDraftSession;
  teams: readonly { id: string; name: string }[];
  onChange: (session: LeagueBuilderMlbDraftSession) => void | Promise<void>;
  createRoomCode?: () => string;
}

export function CompanionApprovalCard(props: CompanionApprovalCardProps) {
  useEffect(() => {
    if (props.session.snakeCompanions?.roomCode) return;
    void patchMlbDraftSessionSnakeCompanions({
      leagueId: props.session.leagueId,
      seasonNumber: props.session.seasonNumber,
      patch: (current) => ensureCompanionRoom(
        { ...props.session, snakeCompanions: current },
        props.createRoomCode,
      ).snakeCompanions as SnakeCompanionState,
    }).then(props.onChange);
  }, [props.createRoomCode, props.onChange, props.session.leagueId, props.session.seasonNumber, props.session.snakeCompanions?.roomCode]);

  const companions = props.session.snakeCompanions;
  if (!companions) return <section className="ballpark-panel"><p>OPENING THE COMPANION ROOM…</p></section>;
  const teamName = (teamId: string) => props.teams.find((team) => team.id === teamId)?.name ?? 'CLUB';
  const update = (deviceId: string, status: 'approved' | 'revoked') => {
    void patchMlbDraftSessionSnakeCompanions({
      leagueId: props.session.leagueId,
      seasonNumber: props.session.seasonNumber,
      patch: (current) => approveCompanionClaim(
        { ...props.session, snakeCompanions: current },
        deviceId,
        status,
      ).snakeCompanions as SnakeCompanionState,
    }).then(props.onChange);
  };

  return (
    <section className="ballpark-panel" aria-label="Companion approvals">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICES</p>
      <h2 className="ballpark-title mt-1 text-2xl">ROOM CODE {companions.roomCode}</h2>
      <p className="mt-2 font-bold">ON YOUR PHONE, GO TO: {`${window.location.origin}/snake-companion`} — SAME WI-FI</p>
      <CompanionHelp>
        <p>USE THIS CODE ONLY ON THE LEAGUE OWNER'S SIGNED-IN DEVICES AT THE TABLE.</p>
      </CompanionHelp>
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
