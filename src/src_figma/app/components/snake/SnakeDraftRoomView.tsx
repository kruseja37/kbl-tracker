import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Eye, EyeOff, HelpCircle, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

import { useSeatReveal } from '../../hooks/useSeatReveal';
import { createSnakeSoundPlayer } from '../../../utils/snakeSounds';
import type { Player } from '../../../../utils/leagueBuilderStorage';
import { PressButton } from '../ballpark/BallparkKit';
import { PlayerProfilePopover } from '../shared/PlayerProfilePopover';
import { createSnakeRoomState, snakeRoomReducer } from './snakeRoomReducer';
import { DraftTruthStrip } from './desk/DraftTruthStrip';
import type { ChemistryStripRow, DraftMoneyLedger } from './desk/draftTruthModel';
import { companionTeamBranding } from './companion/companionBranding';

type HelpAwareRoomContent = ReactNode | ((showHelp: boolean) => ReactNode);

export interface SnakeRoomTeam {
  id: string;
  name: string;
  abbreviation: string;
  colors: { primary: string; secondary: string; accent?: string };
  logoUrl?: string;
}

export interface SnakeRoomOrderSlot {
  pick: number;
  teamId: string;
  endpoint?: boolean;
}

export interface SnakeTickerItem {
  id: string;
  teamId: string;
  text: string;
}

export interface SnakePublicRosterPlayer {
  id: string;
  name: string;
  position: string;
}

export interface SnakeReviewCandidate {
  id: string;
  name: string;
  position: string;
  consequence: string;
  blockReason?: string | null;
  privateNote?: string;
}

export interface SnakeDraftRoomViewProps {
  teams: readonly SnakeRoomTeam[];
  order: readonly SnakeRoomOrderSlot[];
  currentPickIndex: number;
  ticker: readonly SnakeTickerItem[];
  rostersByTeamId: Readonly<Record<string, readonly SnakePublicRosterPlayer[]>>;
  ownedPicksByTeamId: Readonly<Record<string, readonly number[]>>;
  publicTruthByTeamId?: Readonly<Record<string, { ledger: DraftMoneyLedger; chemistry: readonly ChemistryStripRow[] }>>;
  activeSeatId: string | null;
  canDraftFromActiveSeat?: boolean;
  candidate: SnakeReviewCandidate | null;
  candidateProfile?: Player | null;
  selectedPlayerCard?: ReactNode | ((draftAction: ReactNode) => ReactNode);
  selectedFitLabel?: string | null;
  draftActionLabel?: string;
  paused: boolean;
  soundsEnabled: boolean;
  correctionAvailable: boolean;
  tradeRevision?: number;
  livePickMoveRevision?: number;
  hotseatNextName?: string | null;
  practiceMode?: boolean;
  practiceFastForward?: boolean;
  privateSnipeKey?: string | null;
  dangerKey?: string | null;
  consolidatedMlb?: boolean;
  privateDesk?: HelpAwareRoomContent;
  tradeGuide?: HelpAwareRoomContent;
  commissionerTrade?: HelpAwareRoomContent;
  companionApproval?: ReactNode;
  roomHelpNotes?: readonly string[];
  writeNotice?: string | null;
  onReloadRoom?: () => void | Promise<void>;
  onDismissWriteNotice?: () => void;
  onPauseChange: (paused: boolean) => void | Promise<void>;
  onPracticeFastForwardChange?: (enabled: boolean) => void;
  onRecordPick: (candidateId: string) => void | Promise<void>;
  onCorrectLatest: () => void | Promise<void>;
  onSoundsEnabledChange: (enabled: boolean) => void;
  onPrivateSeatRevealedChange?: (revealed: boolean) => void;
  onActiveSeatChange?: (teamId: string) => void;
  onDraftComplete?: () => void | Promise<void>;
}

function teamName(team: SnakeRoomTeam | undefined): string {
  return team?.name ?? 'UNKNOWN TEAM';
}

export function SnakeDraftRoomView(props: SnakeDraftRoomViewProps) {
  const [state, dispatch] = useReducer(snakeRoomReducer, props.paused, createSnakeRoomState);
  const [lensSelection, setLensSelection] = useState<{ seatId: string | null; teamId: string | null }>(() => ({
    seatId: props.activeSeatId,
    teamId: props.activeSeatId ?? props.teams[0]?.id ?? null,
  }));
  const [pendingSeatId, setPendingSeatId] = useState<string | null>(null);
  const effectivePendingSeatId = pendingSeatId === props.activeSeatId ? null : pendingSeatId;
  const onActiveSeatChange = props.onActiveSeatChange;
  const requestedSeatId = useRef<string | null>(null);
  const defaultLensId = props.activeSeatId ?? props.teams[0]?.id ?? null;
  const lensId = props.consolidatedMlb
    ? props.activeSeatId
    : lensSelection.seatId === props.activeSeatId
    && props.teams.some((team) => team.id === lensSelection.teamId)
      ? lensSelection.teamId
      : defaultLensId;
  const initialHotseatCover = Boolean(
    props.hotseatNextName
    && props.activeSeatId
    && props.order[props.currentPickIndex]?.teamId === props.activeSeatId,
  );
  const [dismissedCoverPick, setDismissedCoverPick] = useState<number | null>(null);
  const [openRoomTool, setOpenRoomTool] = useState<'GUIDE' | 'TRADE' | 'COMPANIONS' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedHold = useRef(false);
  const completionRequested = useRef(false);
  const lastHotseatCoverPick = useRef<number | null>(initialHotseatCover ? props.currentPickIndex : null);
  const selectedPlayerRef = useRef<HTMLDivElement | null>(null);
  const armedCandidate = useRef<SnakeReviewCandidate | null>(null);
  const stateRef = useRef(state);
  const priorLivePickMoveRevision = useRef(props.livePickMoveRevision ?? props.tradeRevision ?? 0);
  const soundPlayer = useMemo(() => createSnakeSoundPlayer(props.soundsEnabled), [props.soundsEnabled]);
  const currentOrder = props.order[props.currentPickIndex];
  const currentTeam = props.teams.find((team) => team.id === currentOrder?.teamId);
  const lensTeam = props.teams.find((team) => team.id === lensId);
  const activeSeatTeam = props.teams.find((team) => team.id === props.activeSeatId);
  const activeSeatBrand = companionTeamBranding(activeSeatTeam?.colors);
  const lensBrand = companionTeamBranding(lensTeam?.colors);
  const activeSeatOnClock = Boolean(props.activeSeatId && currentOrder?.teamId === props.activeSeatId);
  const draftComplete = props.currentPickIndex >= props.order.length;
  const orderWindow = useMemo(() => {
    if (props.order.length <= 7) return props.order.map((slot, index) => ({ slot, index }));
    const liveIndex = Math.min(Math.max(props.currentPickIndex, 0), props.order.length - 1);
    const start = Math.min(Math.max(liveIndex - 2, 0), props.order.length - 7);
    return props.order.slice(start, start + 7).map((slot, offset) => ({ slot, index: start + offset }));
  }, [props.currentPickIndex, props.order]);
  const { revealed, reveal: revealSeat, cover: coverSeat } = useSeatReveal({
    seatId: props.activeSeatId,
    pickKey: props.currentPickIndex,
    tradeKey: props.tradeRevision ?? 0,
    lensId,
  });
  const passCoverOpen = Boolean(
    props.hotseatNextName
    && props.activeSeatId
    && currentOrder?.teamId === props.activeSeatId
    && dismissedCoverPick !== props.currentPickIndex,
  );
  const onPrivateSeatRevealedChangeRef = useRef(props.onPrivateSeatRevealedChange);
  useLayoutEffect(() => {
    onPrivateSeatRevealedChangeRef.current = props.onPrivateSeatRevealedChange;
  }, [props.onPrivateSeatRevealedChange]);
  const coverPrivateSeat = useCallback(() => {
    onPrivateSeatRevealedChangeRef.current?.(false);
    coverSeat();
  }, [coverSeat]);
  useLayoutEffect(() => {
    if (!effectivePendingSeatId) {
      requestedSeatId.current = null;
      return;
    }
    if (requestedSeatId.current === effectivePendingSeatId) return;
    requestedSeatId.current = effectivePendingSeatId;
    onActiveSeatChange?.(effectivePendingSeatId);
  }, [effectivePendingSeatId, onActiveSeatChange]);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    completedHold.current = false;
  }, []);
  const cancelAdvance = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  }, []);

  useEffect(() => {
    if (props.paused) {
      cancelHold();
      cancelAdvance();
    }
    dispatch({ type: props.paused ? 'PAUSE' : 'RESUME' });
  }, [cancelAdvance, cancelHold, props.paused]);

  useEffect(() => {
    cancelAdvance();
    if (state.phase !== 'RECORDED' || state.paused || props.paused || props.currentPickIndex >= props.order.length) return;
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      dispatch({ type: 'ADVANCE', candidateId: props.candidate?.id ?? null });
    }, 1_200);
    return cancelAdvance;
  }, [cancelAdvance, props.candidate?.id, props.currentPickIndex, props.order.length, props.paused, state.paused, state.phase]);

  useEffect(() => {
    armedCandidate.current = null;
    dispatch({ type: 'NEXT_TURN', candidateId: props.candidate?.id ?? null });
    const shouldCover = Boolean(
      props.hotseatNextName
      && props.activeSeatId
      && currentOrder?.teamId === props.activeSeatId,
    );
    if (shouldCover && lastHotseatCoverPick.current !== props.currentPickIndex) {
      coverPrivateSeat();
      lastHotseatCoverPick.current = props.currentPickIndex;
    }
    if (props.activeSeatId && currentOrder?.teamId === props.activeSeatId) soundPlayer.play('turn');
  }, [coverPrivateSeat, currentOrder?.teamId, props.activeSeatId, props.candidate?.id, props.currentPickIndex, props.hotseatNextName, soundPlayer]);

  useEffect(() => {
    if (!revealed || !props.candidate?.id) return;
    selectedPlayerRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [props.candidate?.id, revealed]);

  useEffect(() => {
    const nextRevision = props.livePickMoveRevision ?? props.tradeRevision ?? 0;
    if (nextRevision !== priorLivePickMoveRevision.current) {
      // A recorded pick is already persisted and latched for the public beat.
      // A trade of the *next* live pick must not cancel that beat's scheduled
      // advance, while a move during the gavel ritual still invalidates it.
      if (stateRef.current.phase !== 'RECORDED') {
        cancelHold();
        cancelAdvance();
        dispatch({ type: 'LIVE_PICK_MOVED' });
      }
    }
    priorLivePickMoveRevision.current = nextRevision;
  }, [cancelAdvance, cancelHold, props.livePickMoveRevision, props.tradeRevision]);

  useEffect(() => {
    if (revealed && props.privateSnipeKey) soundPlayer.play('snipe');
  }, [props.privateSnipeKey, revealed, soundPlayer]);

  useEffect(() => {
    if (revealed && props.dangerKey) soundPlayer.play('danger');
  }, [props.dangerKey, revealed, soundPlayer]);

  useEffect(() => {
    onPrivateSeatRevealedChangeRef.current?.(revealed);
  }, [revealed]);

  useEffect(() => () => {
    cancelHold();
    cancelAdvance();
  }, [cancelAdvance, cancelHold]);

  useEffect(() => {
    if (props.currentPickIndex < props.order.length) completionRequested.current = false;
  }, [props.currentPickIndex, props.order.length]);

  const selectLens = (teamId: string) => {
    if (props.onActiveSeatChange && teamId !== props.activeSeatId) {
      cancelHold();
      armedCandidate.current = null;
      if (stateRef.current.phase === 'ARM' || stateRef.current.phase === 'ANNOUNCE') {
        if (stateRef.current.phase === 'ANNOUNCE') dispatch({ type: 'GAVEL_RELEASE' });
        dispatch({ type: 'NEXT_TURN', candidateId: props.candidate?.id ?? null });
      }
    }
    setLensSelection({ seatId: props.activeSeatId, teamId });
    props.onActiveSeatChange?.(teamId);
    soundPlayer.play('nav');
  };

  const requestTeamSwitch = (teamId: string) => {
    if (!onActiveSeatChange || teamId === props.activeSeatId || effectivePendingSeatId) return;
    cancelHold();
    armedCandidate.current = null;
    if (stateRef.current.phase === 'ARM' || stateRef.current.phase === 'ANNOUNCE') {
      if (stateRef.current.phase === 'ANNOUNCE') dispatch({ type: 'GAVEL_RELEASE' });
      dispatch({ type: 'NEXT_TURN', candidateId: props.candidate?.id ?? null });
    }
    coverPrivateSeat();
    requestedSeatId.current = null;
    setPendingSeatId(teamId);
    soundPlayer.play('nav');
  };

  const armSelectedCandidate = () => {
    if (!props.candidate || props.candidate.blockReason || props.paused || props.canDraftFromActiveSeat === false) return;
    armedCandidate.current = props.candidate;
    setDismissedCoverPick(props.currentPickIndex);
    coverPrivateSeat();
    dispatch({ type: 'ARM', candidateId: props.candidate.id });
  };

  const requestPauseChange = async () => {
    if (!props.paused) {
      cancelHold();
      cancelAdvance();
    }
    try {
      await props.onPauseChange(!props.paused);
      dispatch({ type: props.paused ? 'RESUME' : 'PAUSE' });
    } catch {
      // Persistence owns the truth. Leave the reducer in its prior state when
      // an optimistic-lock rejection says another device already moved it.
    }
  };

  const startHold = () => {
    const frozenCandidate = armedCandidate.current;
    if (holdTimer.current || props.canDraftFromActiveSeat === false || state.phase !== 'ARM' || state.paused || !frozenCandidate) return;
    completedHold.current = false;
    dispatch({ type: 'GAVEL_DOWN' });
    holdTimer.current = setTimeout(async () => {
      holdTimer.current = null;
      const liveState = stateRef.current;
      if (liveState.paused || liveState.phase !== 'ANNOUNCE' || props.paused) return;
      completedHold.current = true;
      const recordedPick = {
        playerId: frozenCandidate.id,
        playerName: frozenCandidate.name,
        teamId: currentTeam?.id ?? currentOrder?.teamId ?? '',
        teamName: teamName(currentTeam),
      };
      try {
        await props.onRecordPick(frozenCandidate.id);
        const postSaveState = stateRef.current;
        if (!postSaveState.paused && postSaveState.phase === 'ANNOUNCE' && !props.paused) {
          dispatch({ type: 'GAVEL_HOME', recordedPick });
          soundPlayer.play('gavel');
        }
      } catch {
        completedHold.current = false;
        dispatch({ type: 'RECORD_FAILED' });
      }
    }, 1000);
  };

  const releaseHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (!completedHold.current) dispatch({ type: 'GAVEL_RELEASE' });
  };

  const correctLatest = async () => {
    try {
      await props.onCorrectLatest();
      dispatch({ type: 'CORRECTION_DONE' });
      soundPlayer.play('nav');
    } catch {
      // Keep the correction window open; the page surfaces the durable-write
      // rejection and no success beat is allowed to fire.
    }
  };
  const recordedTeam = state.recordedPick
    ? props.teams.find((team) => team.id === state.recordedPick?.teamId)
    : undefined;
  const ritualTeam = state.phase === 'RECORDED' ? recordedTeam : currentTeam;
  const renderHelpAware = (content: HelpAwareRoomContent | undefined) => (
    typeof content === 'function' ? content(showHelp) : content
  );
  const draftControl = props.candidate && !props.candidate.blockReason && !props.paused && props.canDraftFromActiveSeat !== false ? (
    <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" onClick={armSelectedCandidate}>
      {props.draftActionLabel ?? 'COVER & ARM'}
    </button>
  ) : props.candidate?.blockReason ? (
    <span className="flex min-h-11 items-center border-2 border-[var(--ballpark-warn-border)] px-3 text-xs font-black text-[var(--ballpark-warn-text)]">BLOCKED</span>
  ) : null;

  return (
    <main
      className="ballpark-page min-h-screen min-w-0 overflow-x-hidden"
      data-testid="snake-draft-room"
      onPointerDownCapture={() => {
        if (props.practiceMode && props.practiceFastForward) props.onPracticeFastForwardChange?.(false);
      }}
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--ballpark-brass)]">SHARED DRAFT ROOM</p>
          <h1 className="ballpark-title text-3xl">THE ROOM</h1>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Commissioner controls">
          <PressButton
            size="sm"
            variant="default"
            className="min-h-11 min-w-11"
            aria-pressed={showHelp}
            aria-label="HELP"
            onClick={() => setShowHelp((value) => !value)}
          >
            <HelpCircle size={15} /> ?
          </PressButton>
          <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={() => props.onSoundsEnabledChange(!props.soundsEnabled)}>
            {props.soundsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            SOUND {props.soundsEnabled ? 'ON' : 'OFF'}
          </button>
          {!draftComplete ? <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={() => void requestPauseChange()}>
            {props.paused ? <Play size={15} /> : <Pause size={15} />}
            {props.paused ? 'RESUME' : 'PAUSE'}
          </button> : null}
          {props.practiceMode && !draftComplete ? <button
            className={`ballpark-press-button ballpark-press-sm min-h-11 ${props.practiceFastForward ? 'ballpark-press-gold' : 'ballpark-press-default'}`}
            aria-pressed={Boolean(props.practiceFastForward)}
            onClick={() => props.onPracticeFastForwardChange?.(!props.practiceFastForward)}
          >{props.practiceFastForward ? 'FAST FORWARD ON' : 'FAST FORWARD'}</button> : null}
          {(!props.consolidatedMlb || props.correctionAvailable) ? <button
            className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11"
            disabled={!props.correctionAvailable}
            onClick={() => dispatch({ type: 'OPEN_CORRECTION', available: props.correctionAvailable })}
          >
            <RotateCcw size={15} /> CORRECT LAST ACTION
          </button> : null}
          {!props.consolidatedMlb && !draftComplete && props.tradeGuide && <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={() => setOpenRoomTool((current) => current === 'GUIDE' ? null : 'GUIDE')}>THE GUIDE</button>}
          {!draftComplete && props.commissionerTrade && <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={() => setOpenRoomTool((current) => current === 'TRADE' ? null : 'TRADE')}>TRADE</button>}
          {!draftComplete && props.companionApproval && <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={() => setOpenRoomTool((current) => current === 'COMPANIONS' ? null : 'COMPANIONS')}>COMPANIONS</button>}
        </div>
      </header>

      {showHelp ? (
        <div className="mb-4 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs leading-relaxed text-[var(--ballpark-chalk)]/75">
          <p>THE SHARED ROOM STAYS COVERED UNTIL THE CLUB ARMS ITS PICK.</p>
          {props.practiceMode ? <p className="mt-1">PAUSE AND CORRECTION WORK THE SAME.</p> : null}
          {props.roomHelpNotes?.map((note) => <p key={note} className="mt-1">{note}</p>)}
        </div>
      ) : null}

      {openRoomTool && (
        <section className="ballpark-panel mb-5" aria-label={openRoomTool === 'GUIDE' ? 'Shared trade guide' : openRoomTool === 'TRADE' ? 'Commissioner trade flow' : 'Companion device approval'}>
          <div className="ballpark-panel-strip mb-4 flex items-center justify-between">
            <span className="font-bold">{openRoomTool === 'GUIDE' ? 'THE GUIDE' : openRoomTool === 'TRADE' ? 'COMMISSIONER TRADE' : 'COMPANION DEVICES'}</span>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={() => setOpenRoomTool(null)}>CLOSE</button>
          </div>
          {openRoomTool === 'GUIDE' ? renderHelpAware(props.tradeGuide) : openRoomTool === 'TRADE' ? renderHelpAware(props.commissionerTrade) : props.companionApproval}
        </section>
      )}

      {props.practiceMode && <p className="mb-3 border-2 border-[var(--ballpark-brass)] p-2 text-sm font-bold">PRACTICE MODE</p>}
      {props.writeNotice ? (
        <section className="mb-3 border-2 border-[var(--ballpark-status-warn)] bg-[var(--ballpark-warn-panel)] p-3" data-testid="room-write-notice">
          <p className="font-bold text-[var(--ballpark-warn-text)]">{props.writeNotice.toUpperCase()}</p>
          <div className="mt-2 flex gap-2">
            {props.onReloadRoom ? <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={() => void props.onReloadRoom?.()}>RELOAD ROOM</button> : null}
            {props.onDismissWriteNotice ? <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={props.onDismissWriteNotice}>DISMISS</button> : null}
          </div>
        </section>
      ) : null}
      {props.paused && <p className="mb-3 bg-[var(--ballpark-warn-panel)] p-3 font-bold text-[var(--ballpark-warn-text)]">THE DRAFT IS PAUSED</p>}

      <section className="mb-5 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-panel)] p-3" aria-label="Draft order">
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-black tracking-[0.12em] text-[var(--ballpark-brass)]">
          <span>LIVE PICK WINDOW</span>
          <span>{orderWindow.length ? `PICKS ${orderWindow[0].slot.pick}–${orderWindow.at(-1)!.slot.pick} OF ${props.order.length}` : 'NO PICKS'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {orderWindow.map(({ slot, index }) => {
            const team = props.teams.find((entry) => entry.id === slot.teamId);
            const active = index === props.currentPickIndex;
            const className = `min-h-16 min-w-0 border-4 p-2 text-left font-bold ${active ? 'ring-4 ring-[var(--ballpark-brass)] ring-offset-2 ring-offset-[var(--ballpark-page-bg)]' : ''}`;
            const style = { backgroundColor: companionTeamBranding(team?.colors).primary, color: companionTeamBranding(team?.colors).foreground, borderColor: companionTeamBranding(team?.colors).border };
            const content = <>
              <span className="block text-[10px]">PICK {slot.pick}{slot.endpoint ? ' · BACK-TO-BACK' : ''}</span>
              <span className="flex items-center gap-2">
                {team?.logoUrl && <img className="h-7 w-7 object-contain" src={team.logoUrl} alt={`${team.name} logo in draft order`} />}
                {team?.abbreviation ?? 'UNKNOWN TEAM'}
              </span>
            </>;
            return props.consolidatedMlb ? (
              <div
                key={`${slot.pick}-${slot.teamId}`}
                aria-label={`${teamName(team)} pick ${slot.pick}`}
                aria-current={active ? 'step' : undefined}
                className={className}
                style={style}
              >{content}</div>
            ) : (
              <button
                key={`${slot.pick}-${slot.teamId}`}
                aria-label={`${teamName(team)} pick ${slot.pick}`}
                aria-current={active ? 'step' : undefined}
                className={className}
                style={style}
                onClick={() => selectLens(slot.teamId)}
              >{content}</button>
            );
          })}
        </div>
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,38vw)]" data-testid="room-layout">
        <section className="ballpark-panel min-w-0 overflow-hidden" aria-label="Private seat">
          <div
            className="ballpark-panel-strip sticky top-0 z-20 mb-3 flex min-h-11 items-center justify-between gap-3"
            style={{ backgroundColor: activeSeatBrand.primary, color: activeSeatBrand.foreground, borderColor: activeSeatBrand.border }}
          >
            <span className="flex min-w-0 items-center gap-2 font-bold">
              {activeSeatTeam?.logoUrl ? <img className="h-8 w-8 shrink-0 object-contain" src={activeSeatTeam.logoUrl} alt={`${activeSeatTeam.name} private desk logo`} /> : null}
              <span className="truncate">{teamName(activeSeatTeam).toUpperCase()} · {activeSeatOnClock ? 'ON CLOCK' : 'VIEWING'}</span>
            </span>
            {props.consolidatedMlb ? <label className="flex min-h-11 items-center gap-2 text-[10px] font-black">
              TEAM
              <select
                aria-label="TEAM"
                className="min-h-11 max-w-52 border-2 border-current bg-[var(--ballpark-page-bg)] px-2 text-[var(--ballpark-chalk)]"
                value={props.activeSeatId ?? ''}
                disabled={Boolean(effectivePendingSeatId)}
                onChange={(event) => requestTeamSwitch(event.target.value)}
              >
                <option value="" disabled>CHOOSE TEAM</option>
                {props.teams.map((team) => <option key={team.id} value={team.id}>{team.name.toUpperCase()}</option>)}
              </select>
            </label> : null}
            {revealed && !effectivePendingSeatId ? (
              <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11 shrink-0" onClick={coverPrivateSeat}><EyeOff size={15} /> COVER</button>
            ) : null}
          </div>
          {draftComplete ? (
            <div className="border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-4 text-center" data-testid="draft-complete-private-state">
              <p className="text-xs font-black tracking-[0.16em] text-[var(--ballpark-brass)]">DRAFT COMPLETE</p>
              <p className="mt-2 font-bold">THE BOARD IS CLOSED. CORRECT THE LAST ACTION OR RETURN TO THE RECAP.</p>
            </div>
          ) : !props.activeSeatId ? <p>NO SEAT IS ACTIVE.</p> : revealed && !effectivePendingSeatId ? (
            <div>
              {props.candidate ? (
                <div ref={selectedPlayerRef} data-testid="selected-player-action">
                  {props.consolidatedMlb ? (
                    typeof props.selectedPlayerCard === 'function'
                      ? props.selectedPlayerCard(draftControl)
                      : props.selectedPlayerCard ?? <section className="mb-3 border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="selected-player-card">
                          <h2 className="break-words text-xl font-black uppercase">{props.candidate.name}</h2>
                          <p className="text-xs font-bold">{props.candidate.position}{props.selectedFitLabel ? ` · ${props.selectedFitLabel}` : ''}</p>
                          <p className="mt-3 font-bold">{props.candidate.consequence}</p>
                          <div className="mt-3">{draftControl}</div>
                        </section>
                  ) : <>
                    <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-3 border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="selected-player-action-header">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black tracking-[0.16em] text-[var(--ballpark-brass)]">SELECTED</p>
                        <h2 className="break-words text-xl font-black uppercase leading-tight">{props.candidate.name}</h2>
                        <p className="text-xs font-bold">{props.candidate.position}{props.selectedFitLabel ? ` · ${props.selectedFitLabel}` : ''}</p>
                      </div>
                      {draftControl}
                    </div>
                    {props.selectedPlayerCard ?? <>
                    <p className="text-xs font-bold text-[var(--ballpark-brass)]">READ THE PICK</p>
                    <h2 className="mt-1 text-2xl font-bold">{props.candidate.name}</h2>
                    <p className="mb-3 text-sm">{props.candidate.position}</p>
                  {props.candidateProfile ? (
                    <PlayerProfilePopover player={props.candidateProfile} revealFull={true}>
                      <span className="ballpark-press-button ballpark-press-sm ballpark-press-default mb-3">VIEW FULL PROFILE</span>
                    </PlayerProfilePopover>
                  ) : null}</>}
                    <p className={`mb-3 border-4 p-3 font-bold ${props.candidate.blockReason ? 'border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] text-[var(--ballpark-warn-text)]' : 'border-[var(--ballpark-panel-border)]'}`}>
                      {props.candidate.consequence}
                    </p>
                    {props.candidate.privateNote ? <p className="mb-3 text-sm font-bold">{props.candidate.privateNote}</p> : null}
                  </>}
                </div>
              ) : <p className="mb-3 font-bold">OPEN YOUR BOARD AND CHOOSE A PLAYER.</p>}
              {renderHelpAware(props.privateDesk)}
            </div>
          ) : (
            <button className="ballpark-press-button ballpark-press-md ballpark-press-default min-h-11" onClick={revealSeat}>
              <Eye size={15} /> REVEAL {teamName(props.teams.find((team) => team.id === props.activeSeatId)).toUpperCase()} SEAT
            </button>
          )}
        </section>

        <aside className="space-y-5 self-start lg:sticky lg:top-4">
          <section className="ballpark-panel" aria-label="Draft ritual">
          <div className="ballpark-panel-strip">
            <span className="font-bold">{state.phase}</span>
            <span className="text-sm">PICK {currentOrder?.pick ?? '—'} · {state.recordedPick?.teamName ?? teamName(currentTeam)}</span>
          </div>

          {state.phase === 'REVIEW' && draftComplete && (
            <div className="flex min-h-36 flex-col items-center justify-center text-center" data-testid="draft-complete-ritual-state">
              <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPLETE</p>
              <h2 className="text-xl font-bold">THE DRAFT IS COMPLETE</h2>
              <button className="ballpark-press-button ballpark-press-lg ballpark-press-gold mt-5 min-h-11" onClick={() => {
                if (completionRequested.current) return;
                completionRequested.current = true;
                void props.onDraftComplete?.();
              }}>VIEW DRAFT RECAP</button>
            </div>
          )}

          {state.phase === 'REVIEW' && !draftComplete && (
            <div className="flex min-h-36 flex-col items-center justify-center text-center">
              <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">REVIEW</p>
              <h2 className="text-xl font-bold">{teamName(currentTeam).toUpperCase()} IS REVIEWING THE BOARD</h2>
            </div>
          )}

          {(state.phase === 'ARM' || state.phase === 'ANNOUNCE' || state.phase === 'RECORDED') && (
            <div
              className="flex min-h-44 flex-col items-center justify-center border-[6px] p-4 text-center"
              data-testid="ritual-card"
              style={{
                backgroundColor: companionTeamBranding(ritualTeam?.colors).primary,
                color: companionTeamBranding(ritualTeam?.colors).foreground,
                borderColor: companionTeamBranding(ritualTeam?.colors).border,
              }}
            >
              {ritualTeam?.logoUrl && <img className="mb-4 h-14 w-14 object-contain" src={ritualTeam.logoUrl} alt={`${ritualTeam.name} logo`} />}
              <p className="text-lg font-black tracking-wider">THE {(state.recordedPick?.teamName ?? teamName(ritualTeam)).toUpperCase()} SELECT…</p>
              {state.phase === 'RECORDED' && <p className="mt-5 text-2xl font-black">{state.recordedPick!.playerName.toUpperCase()}</p>}
              {state.phase !== 'RECORDED' && (
                <button
                  className="ballpark-press-button ballpark-press-lg mt-7 min-h-11 border-current bg-black/30 touch-none select-none"
                  onPointerDown={startHold}
                  onPointerUp={releaseHold}
                  onPointerLeave={releaseHold}
                  onPointerCancel={releaseHold}
                  onKeyDown={(event) => {
                    if (event.key !== ' ' && event.key !== 'Enter') return;
                    event.preventDefault();
                    startHold();
                  }}
                  onKeyUp={(event) => {
                    if (event.key !== ' ' && event.key !== 'Enter') return;
                    event.preventDefault();
                    releaseHold();
                  }}
                >
                  {state.phase === 'ANNOUNCE' ? 'KEEP HOLDING' : 'HOLD THE GAVEL'}
                </button>
              )}
              {state.phase === 'ANNOUNCE' && <div className="mt-4 h-4 w-full border-2 border-current"><div className="h-full animate-[snakeHold_1s_linear_forwards] bg-current" /></div>}
              {state.phase === 'RECORDED' && (
                props.currentPickIndex >= props.order.length ? (
                  <button className="ballpark-press-button ballpark-press-lg mt-7 min-h-11 border-current bg-black/30" onClick={() => {
                    if (completionRequested.current) return;
                    completionRequested.current = true;
                    void props.onDraftComplete?.();
                  }}>
                    VIEW DRAFT RECAP
                  </button>
                ) : null
              )}
            </div>
          )}

          {state.phase === 'CORRECTION' && (
            <div className="py-4 text-center">
              <h2 className="mb-3 text-lg font-bold">UNDO THE MOST RECENT ACTION?</h2>
              <p className="mb-5">ONLY THE LATEST PICK OR TRADE CAN BE UNDONE.</p>
              <button className="ballpark-press-button ballpark-press-lg ballpark-press-destruct min-h-11" onClick={() => void correctLatest()}>UNDO LAST ACTION</button>
            </div>
          )}
          {state.notice && <p className="mt-4 font-bold text-[var(--ballpark-scoreboard-yellow)]" role="status">{state.notice}</p>}
          </section>

          <section className="ballpark-panel min-w-0 overflow-hidden" aria-label={props.consolidatedMlb ? 'Selected team public roster' : 'Club lens'}>
            <div className="ballpark-panel-strip" style={{ borderColor: lensBrand.border }}>
              <span className="font-bold">{props.consolidatedMlb ? 'TEAM ROSTER' : 'CLUB LENS'}</span>
            </div>
            {!props.consolidatedMlb ? <div className="mb-4 flex flex-wrap gap-2">
              {props.teams.map((team) => <button key={team.id} type="button" aria-pressed={lensId === team.id} className={`min-h-11 border-2 px-2 py-1 text-xs font-bold ${lensId === team.id ? 'ring-2 ring-[var(--ballpark-brass)]' : ''}`} style={{ borderColor: team.colors.primary }} onClick={() => selectLens(team.id)}>{team.name.toUpperCase()}</button>)}
            </div> : null}
            <div className="mb-2 flex items-center gap-3">
              {lensTeam?.logoUrl && <img className="h-14 w-14 object-contain" src={lensTeam.logoUrl} alt={props.consolidatedMlb ? `${lensTeam.name} team logo` : `${lensTeam.name} logo in club lens`} />}
              <h3 className="text-xl font-bold">{teamName(lensTeam)}</h3>
            </div>
            {lensId && props.publicTruthByTeamId?.[lensId] ? (
              <div className="mb-4"><DraftTruthStrip
                title="DRAFTED ROSTER"
                ledger={props.publicTruthByTeamId[lensId].ledger}
                chemistry={props.publicTruthByTeamId[lensId].chemistry}
                testId={`drafted-truth-${lensId}`}
                compact
              /></div>
            ) : null}
            <p className="mb-2 text-xs font-bold text-[var(--ballpark-brass)]">PUBLIC ROSTER</p>
            <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto text-sm">
              {(lensId ? props.rostersByTeamId[lensId] : [])?.map((player) => <li key={player.id}>{player.position} · {player.name}</li>)}
              {(lensId ? props.rostersByTeamId[lensId] : [])?.length === 0 && <li>NO PICKS RECORDED YET.</li>}
            </ul>
            <p className="text-xs font-bold text-[var(--ballpark-brass)]">OWNED, TRADEABLE PICKS</p>
            <p>{(lensId ? props.ownedPicksByTeamId[lensId] : [])?.join(', ') || 'NONE'}</p>
          </section>
        </aside>
      </div>

      {props.consolidatedMlb ? <details className="mt-5 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3" aria-label="Recent picks">
        <summary className="min-h-11 cursor-pointer py-2 text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">RECENT PICKS</summary>
        <div className="mt-2 flex min-w-0 flex-wrap gap-x-6 gap-y-2">
          {props.ticker.map((item) => {
            const team = props.teams.find((candidate) => candidate.id === item.teamId);
            const brand = companionTeamBranding(team?.colors);
            return <p key={item.id} className="flex items-center gap-2 border-l-4 pl-2 font-bold" style={{ borderColor: brand.primary }}>
              {team?.logoUrl ? <img className="h-6 w-6 object-contain" src={team.logoUrl} alt="" /> : <span className="h-3 w-3 rounded-full" style={{ backgroundColor: brand.primary }} aria-hidden="true" />}
              {item.text}
            </p>;
          })}
          {props.ticker.length === 0 && <p>THE BOARD IS OPEN.</p>}
        </div>
      </details> : <section className="mt-5 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3" aria-label="Recent picks">
        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">RECENT PICKS</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {props.ticker.map((item) => {
            const team = props.teams.find((candidate) => candidate.id === item.teamId);
            const brand = companionTeamBranding(team?.colors);
            return <p key={item.id} className="flex items-center gap-2 border-l-4 pl-2 font-bold" style={{ borderColor: brand.primary }}>
              {team?.logoUrl ? <img className="h-6 w-6 object-contain" src={team.logoUrl} alt="" /> : <span className="h-3 w-3 rounded-full" style={{ backgroundColor: brand.primary }} aria-hidden="true" />}
              {item.text}
            </p>;
          })}
          {props.ticker.length === 0 && <p>THE BOARD IS OPEN.</p>}
        </div>
      </section>}

      {passCoverOpen && props.hotseatNextName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ballpark-page-bg)] p-6" role="dialog" aria-modal="true">
          <div className="ballpark-panel max-w-lg text-center">
            <h2 className="mb-4 text-3xl font-black">PASS TO {props.hotseatNextName.toUpperCase()}</h2>
            <p className="mb-5">THE PRIVATE SEAT IS COVERED.</p>
            <button className="ballpark-press-button ballpark-press-lg ballpark-press-gold min-h-11" onClick={() => setDismissedCoverPick(props.currentPickIndex)}>I HAVE THE ROOM</button>
          </div>
        </div>
      )}
    </main>
  );
}
