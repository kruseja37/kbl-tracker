import { useEffect, useMemo, useState } from 'react';

import type {
  SnakeCompanionPickRequest,
} from '../../../../../utils/leagueBuilderStorage';
import type {
  SnakeLiveClaim,
  SnakeLiveIntent,
} from '../../../../../utils/snakeLiveRoomTypes';
import { CompanionHelp } from './CompanionHelp';
import {
  discoverCompanionOrigin,
  isLoopbackCompanionHost,
  resolveCompanionJoinUrl,
} from './companionJoinUrl';

export interface CompanionApprovalCardProps {
  roomCode: string;
  teams: readonly { id: string; name: string }[];
  claims: readonly SnakeLiveClaim[];
  intents: readonly SnakeLiveIntent[];
  ready: boolean;
  working?: boolean;
  liveError?: string | null;
  playerName?: (playerId: string) => string;
  onResolveClaim: (
    claim: SnakeLiveClaim,
    status: 'approved' | 'revoked',
  ) => void | Promise<void>;
  onApprovePick: (
    intent: SnakeLiveIntent,
    request: SnakeCompanionPickRequest,
  ) => void | Promise<void>;
  onRejectPick: (intent: SnakeLiveIntent) => void | Promise<void>;
}

interface PendingPick {
  intent: SnakeLiveIntent;
  request: SnakeCompanionPickRequest;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function readLivePickRequest(intent: SnakeLiveIntent): SnakeCompanionPickRequest | null {
  if (intent.kind !== 'pick' || intent.status !== 'pending') return null;
  const playerId = intent.payload.playerId;
  const pick = intent.payload.pick;
  const submittedAt = intent.payload.submittedAt;
  const sessionRevision = intent.payload.sessionRevision;
  if (typeof playerId !== 'string' || !playerId.trim() || !positiveInteger(pick)
    || typeof submittedAt !== 'string' || !submittedAt.trim()
    || typeof sessionRevision !== 'number' || !Number.isInteger(sessionRevision) || sessionRevision < 0) {
    return null;
  }
  return {
    id: intent.id,
    teamId: intent.teamId,
    playerId,
    pick,
    submittedAt,
    deviceId: intent.deviceId,
    sessionRevision,
  };
}

export function CompanionApprovalCard(props: CompanionApprovalCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [actionWorking, setActionWorking] = useState(false);
  const configuredOrigin = import.meta.env.VITE_COMPANION_ORIGIN as string | undefined;
  const currentIsLoopback = (() => {
    try { return isLoopbackCompanionHost(new URL(window.location.origin).hostname); } catch { return true; }
  })();
  const [discoveredOrigin, setDiscoveredOrigin] = useState<string | null | undefined>(() => (
    currentIsLoopback && !configuredOrigin ? undefined : null
  ));
  const shareableOrigin = configuredOrigin ?? discoveredOrigin;
  const joinUrl = resolveCompanionJoinUrl(window.location.origin, shareableOrigin, props.roomCode);

  useEffect(() => {
    if (!currentIsLoopback || configuredOrigin) return;
    let cancelled = false;
    void discoverCompanionOrigin().then((origin) => {
      if (!cancelled) setDiscoveredOrigin(origin);
    });
    return () => { cancelled = true; };
  }, [configuredOrigin, currentIsLoopback]);

  const pendingPackages = useMemo(() => [...props.claims
    .filter((claim) => claim.status === 'pending')
    .reduce((packages, claim) => {
      const rows = packages.get(claim.deviceId) ?? [];
      rows.push(claim);
      packages.set(claim.deviceId, rows);
      return packages;
    }, new Map<string, SnakeLiveClaim[]>())
    .values()], [props.claims]);
  const approvedClaims = useMemo(
    () => props.claims.filter((claim) => claim.status === 'approved'),
    [props.claims],
  );
  const pendingPicks = useMemo(() => props.intents
    .map((intent): PendingPick | null => {
      const request = readLivePickRequest(intent);
      return request ? { intent, request } : null;
    })
    .filter((entry): entry is PendingPick => Boolean(entry))
    .sort((left, right) => left.intent.createdAt.localeCompare(right.intent.createdAt)), [props.intents]);
  const pendingPick = pendingPicks[0] ?? null;
  const teamName = (teamId: string) => props.teams.find((team) => team.id === teamId)?.name ?? 'UNKNOWN TEAM';
  const disabled = actionWorking || props.working || !props.ready;

  const act = async (operation: () => void | Promise<void>) => {
    if (disabled) return;
    setError(null);
    setActionWorking(true);
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setActionWorking(false);
    }
  };

  return (
    <section className="ballpark-panel" aria-label="Companion approvals">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICES</p>
          <h2 className="ballpark-title mt-1 text-2xl">ROOM CODE {props.roomCode || '—'}</h2>
        </div>
        <p
          className={`border-2 px-3 py-2 text-xs font-black ${props.ready ? 'border-[var(--ballpark-status-good)] text-[var(--ballpark-status-good)]' : 'border-[var(--ballpark-status-warn)] text-[var(--ballpark-warn-text)]'}`}
          role="status"
        >{props.ready ? 'LIVE' : 'CONNECTING'}</p>
      </div>
      <CompanionHelp>
        {joinUrl
          ? <p>ON THE COMPANION DEVICE, GO TO: <strong data-testid="companion-join-url">{joinUrl}</strong></p>
          : discoveredOrigin === undefined
            ? <p>FINDING THE SHAREABLE ADDRESS…</p>
            : <p className="font-bold text-[var(--ballpark-warn-text)]" role="alert">COMPANION SHARING IS OFF. RESTART THE PREVIEW WITH <strong>NPM RUN DEV</strong>.</p>}
        <p>USE THIS CODE ON THE LEAGUE OWNER'S SIGNED-IN DEVICES.</p>
      </CompanionHelp>
      {props.liveError || error ? (
        <p className="mt-3 font-bold text-[var(--ballpark-warn-text)]" role="alert">
          {(error ?? props.liveError)?.toUpperCase()}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3">
        {pendingPick ? (
          <div className="border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="companion-pick-request">
            <p className="text-xs font-black tracking-[0.16em] text-[var(--ballpark-brass)]">PICK REQUEST</p>
            <p className="mt-1 text-lg font-black">
              #{pendingPick.request.pick} · {teamName(pendingPick.request.teamId).toUpperCase()} · {(props.playerName?.(pendingPick.request.playerId) ?? pendingPick.request.playerId).toUpperCase()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11"
                disabled={disabled}
                onClick={() => void act(() => props.onApprovePick(pendingPick.intent, pendingPick.request))}
              >APPROVE PICK</button>
              <button
                className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11"
                disabled={disabled}
                onClick={() => void act(() => props.onRejectPick(pendingPick.intent))}
              >DECLINE</button>
            </div>
          </div>
        ) : null}
        {pendingPackages.map((claims) => (
          <div key={claims[0].deviceId} className="border-4 border-[var(--ballpark-panel-border)] p-3" data-testid="companion-pending-package">
            <p className="text-xs font-black tracking-[0.14em] text-[var(--ballpark-brass)]">
              {claims[0].gmName.toUpperCase()} · {claims.length} TEAM{claims.length === 1 ? '' : 'S'}
            </p>
            {claims.map((claim) => (
              <div key={claim.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--ballpark-panel-border)] pt-2">
                <p className="font-bold">{teamName(claim.teamId).toUpperCase()}</p>
                <div className="flex gap-2">
                  <button
                    className="ballpark-press-button ballpark-press-sm ballpark-press-gold"
                    disabled={disabled}
                    onClick={() => void act(() => props.onResolveClaim(claim, 'approved'))}
                  >APPROVE {teamName(claim.teamId).toUpperCase()}</button>
                  <button
                    className="ballpark-press-button ballpark-press-sm ballpark-press-default"
                    disabled={disabled}
                    onClick={() => void act(() => props.onResolveClaim(claim, 'revoked'))}
                  >REFUSE</button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {approvedClaims.map((claim) => (
          <div key={claim.id} className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--ballpark-panel-border)] p-3">
            <p><strong>{claim.gmName.toUpperCase()}</strong> — {teamName(claim.teamId).toUpperCase()}</p>
            <button
              className="ballpark-press-button ballpark-press-sm ballpark-press-gold"
              disabled={disabled}
              onClick={() => void act(() => props.onResolveClaim(claim, 'revoked'))}
            >RETURN TO HOTSEAT</button>
          </div>
        ))}
      </div>
    </section>
  );
}
