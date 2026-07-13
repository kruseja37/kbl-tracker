import { useEffect, useState } from 'react';

import {
  patchMlbDraftSessionSnakeCompanions,
  type LeagueBuilderMlbDraftSession,
  type SnakeCompanionState,
} from '../../../../../utils/leagueBuilderStorage';
import { CompanionHelp } from './CompanionHelp';
import {
  approveCompanionClaim,
  companionClaimIdentity,
  ensureCompanionRoom,
  type CompanionClaim,
} from './companionModel';

export interface CompanionApprovalCardProps {
  session: LeagueBuilderMlbDraftSession;
  teams: readonly { id: string; name: string }[];
  onChange: (session: LeagueBuilderMlbDraftSession) => void | Promise<void>;
  createRoomCode?: () => string;
}

export function CompanionApprovalCard(props: CompanionApprovalCardProps) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (props.session.snakeCompanions?.roomCode) return;
    void patchMlbDraftSessionSnakeCompanions({
      leagueId: props.session.leagueId,
      seasonNumber: props.session.seasonNumber,
      patch: (current, fresh) => ensureCompanionRoom(
        { ...fresh, snakeCompanions: current },
        props.createRoomCode,
      ).snakeCompanions as SnakeCompanionState,
    }).then(props.onChange);
  }, [props.createRoomCode, props.onChange, props.session.leagueId, props.session.seasonNumber, props.session.snakeCompanions?.roomCode]);

  const companions = props.session.snakeCompanions;
  if (!companions) return <section className="ballpark-panel"><p>OPENING THE COMPANION ROOM…</p></section>;
  const teamName = (teamId: string) => props.teams.find((team) => team.id === teamId)?.name ?? 'CLUB';
  const update = async (claim: CompanionClaim, status: 'approved' | 'revoked') => {
    setError(null);
    const identity = companionClaimIdentity(claim);
    try {
      const saved = await patchMlbDraftSessionSnakeCompanions({
        leagueId: props.session.leagueId,
        seasonNumber: props.session.seasonNumber,
        patch: (current, fresh) => approveCompanionClaim(
          { ...fresh, snakeCompanions: current },
          identity,
          status,
        ).snakeCompanions as SnakeCompanionState,
      });
      await props.onChange(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <section className="ballpark-panel" aria-label="Companion approvals">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICES</p>
      <h2 className="ballpark-title mt-1 text-2xl">ROOM CODE {companions.roomCode}</h2>
      <CompanionHelp>
        <p>ON YOUR PHONE, GO TO: {`${window.location.origin}/snake-companion`} — SAME WI-FI.</p>
        <p>USE THIS CODE ONLY ON THE LEAGUE OWNER'S SIGNED-IN DEVICES AT THE TABLE.</p>
      </CompanionHelp>
      {error ? <p className="mt-3 font-bold text-[var(--ballpark-warn-text)]" role="alert">{error}</p> : null}
      <div className="mt-4 grid gap-3">
        {companions.claims.filter((claim) => claim.status === 'pending').map((claim) => (
          <div key={claim.claimId ?? `${claim.deviceId}:${claim.teamId}:${claim.claimVersion ?? 0}`} className="border-4 border-[var(--ballpark-panel-border)] p-3">
            <p className="font-bold">LET {claim.gmName.toUpperCase()} SEE THE {teamName(claim.teamId).toUpperCase()} DESK?</p>
            <div className="mt-2 flex gap-2">
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold" onClick={() => void update(claim, 'approved')}>APPROVE</button>
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={() => void update(claim, 'revoked')}>REFUSE</button>
            </div>
          </div>
        ))}
        {companions.claims.filter((claim) => claim.status === 'approved').map((claim) => (
          <div key={claim.claimId ?? `${claim.deviceId}:${claim.teamId}:${claim.claimVersion ?? 0}`} className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--ballpark-panel-border)] p-3">
            <p><strong>{claim.gmName.toUpperCase()}</strong> — {teamName(claim.teamId).toUpperCase()}</p>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={() => void update(claim, 'revoked')}>REVOKE {claim.gmName.toUpperCase()}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
