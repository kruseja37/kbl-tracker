import { useEffect, useState } from 'react';

import {
  declineCompanionPickRequest,
  fallBackCompanionSeatToHotseat,
  patchMlbDraftSessionSnakeCompanions,
  type LeagueBuilderMlbDraftSession,
  type SnakeCompanionPickRequest,
  type SnakeCompanionState,
} from '../../../../../utils/leagueBuilderStorage';
import { CompanionHelp } from './CompanionHelp';
import {
  discoverCompanionOrigin,
  isLoopbackCompanionHost,
  resolveCompanionJoinUrl,
} from './companionJoinUrl';
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
  playerName?: (playerId: string) => string;
  onApprovePick?: (request: SnakeCompanionPickRequest) => void | Promise<void>;
}

export function CompanionApprovalCard(props: CompanionApprovalCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [pickWorking, setPickWorking] = useState(false);
  const configuredOrigin = import.meta.env.VITE_COMPANION_ORIGIN as string | undefined;
  const currentIsLoopback = (() => {
    try { return isLoopbackCompanionHost(new URL(window.location.origin).hostname); } catch { return true; }
  })();
  const [discoveredOrigin, setDiscoveredOrigin] = useState<string | null | undefined>(() => (
    currentIsLoopback && !configuredOrigin ? undefined : null
  ));
  const shareableOrigin = configuredOrigin ?? discoveredOrigin;
  const joinUrl = resolveCompanionJoinUrl(
    window.location.origin,
    shareableOrigin,
    props.session.snakeCompanions?.roomCode,
  );
  useEffect(() => {
    if (!currentIsLoopback || configuredOrigin) return;
    let cancelled = false;
    void discoverCompanionOrigin().then((origin) => {
      if (!cancelled) setDiscoveredOrigin(origin);
    });
    return () => { cancelled = true; };
  }, [configuredOrigin, currentIsLoopback]);
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
  const teamName = (teamId: string) => props.teams.find((team) => team.id === teamId)?.name ?? 'UNKNOWN TEAM';
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
  const fallBackToHotseat = async (claim: CompanionClaim) => {
    setError(null);
    try {
      const saved = await fallBackCompanionSeatToHotseat({
        leagueId: props.session.leagueId,
        seasonNumber: props.session.seasonNumber,
        claimId: claim.claimId,
        claimVersion: claim.claimVersion,
        deviceId: claim.deviceId,
        teamId: claim.teamId,
      });
      await props.onChange(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const actOnPickRequest = async (action: 'APPROVE' | 'DECLINE') => {
    const request = props.session.snakeCompanions?.pickRequest;
    if (!request || pickWorking) return;
    setError(null);
    setPickWorking(true);
    try {
      if (action === 'APPROVE') {
        if (!props.onApprovePick) throw new Error('THE MAIN PICK PATH IS NOT READY.');
        await props.onApprovePick(request);
      } else {
        const saved = await declineCompanionPickRequest({
          leagueId: props.session.leagueId,
          seasonNumber: props.session.seasonNumber,
          requestId: request.id,
        });
        await props.onChange(saved);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPickWorking(false);
    }
  };

  return (
    <section className="ballpark-panel" aria-label="Companion approvals">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICES</p>
      <h2 className="ballpark-title mt-1 text-2xl">ROOM CODE {companions.roomCode}</h2>
      <CompanionHelp>
        {joinUrl
          ? <p>ON YOUR PHONE, GO TO: <strong data-testid="companion-join-url">{joinUrl}</strong> — SAME WI-FI.</p>
          : discoveredOrigin === undefined
            ? <p>FINDING THE SHAREABLE ADDRESS…</p>
            : <p className="font-bold text-[var(--ballpark-warn-text)]" role="alert">COMPANION SHARING IS OFF. RESTART THE PREVIEW WITH <strong>NPM RUN DEV</strong>.</p>}
        <p>USE THIS CODE ONLY ON THE LEAGUE OWNER'S SIGNED-IN DEVICES AT THE TABLE.</p>
      </CompanionHelp>
      {error ? <p className="mt-3 font-bold text-[var(--ballpark-warn-text)]" role="alert">{error}</p> : null}
      <div className="mt-4 grid gap-3">
        {companions.pickRequest ? (
          <div className="border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="companion-pick-request">
            <p className="text-xs font-black tracking-[0.16em] text-[var(--ballpark-brass)]">PICK REQUEST</p>
            <p className="mt-1 text-lg font-black">#{companions.pickRequest.pick} · {teamName(companions.pickRequest.teamId).toUpperCase()} · {(props.playerName?.(companions.pickRequest.playerId) ?? companions.pickRequest.playerId).toUpperCase()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" disabled={pickWorking} onClick={() => void actOnPickRequest('APPROVE')}>APPROVE PICK</button>
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" disabled={pickWorking} onClick={() => void actOnPickRequest('DECLINE')}>DECLINE</button>
            </div>
          </div>
        ) : null}
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
            <div className="flex flex-wrap gap-2">
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold" onClick={() => void fallBackToHotseat(claim)}>FALL BACK TO HOTSEAT</button>
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={() => void update(claim, 'revoked')}>REVOKE {claim.gmName.toUpperCase()}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
