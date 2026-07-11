import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Eye, EyeOff, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

import { useSeatReveal } from '../../hooks/useSeatReveal';
import { createSnakeSoundPlayer } from '../../../utils/snakeSounds';
import { createSnakeRoomState, snakeRoomReducer } from './snakeRoomReducer';

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
  activeSeatId: string | null;
  candidate: SnakeReviewCandidate | null;
  paused: boolean;
  soundsEnabled: boolean;
  correctionAvailable: boolean;
  tradeRevision?: number;
  hotseatNextName?: string | null;
  practiceMode?: boolean;
  privateSnipeKey?: string | null;
  dangerKey?: string | null;
  privateDesk?: ReactNode;
  onPauseChange: (paused: boolean) => void;
  onRecordPick: (candidateId: string) => void | Promise<void>;
  onCorrectLatest: () => void | Promise<void>;
  onSoundsEnabledChange: (enabled: boolean) => void;
}

function teamName(team: SnakeRoomTeam | undefined): string {
  return team?.name ?? 'CLUB';
}

export function SnakeDraftRoomView(props: SnakeDraftRoomViewProps) {
  const [state, dispatch] = useReducer(snakeRoomReducer, props.paused, createSnakeRoomState);
  const [lensId, setLensId] = useState(props.activeSeatId ?? props.teams[0]?.id ?? null);
  const [passCoverOpen, setPassCoverOpen] = useState(Boolean(props.hotseatNextName));
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedHold = useRef(false);
  const stateRef = useRef(state);
  const priorTradeRevision = useRef(props.tradeRevision ?? 0);
  const soundPlayer = useMemo(() => createSnakeSoundPlayer(props.soundsEnabled), [props.soundsEnabled]);
  const currentOrder = props.order[props.currentPickIndex];
  const currentTeam = props.teams.find((team) => team.id === currentOrder?.teamId);
  const lensTeam = props.teams.find((team) => team.id === lensId);
  const reveal = useSeatReveal({
    seatId: props.activeSeatId,
    pickKey: `${props.currentPickIndex}:${props.candidate?.id ?? 'none'}`,
    tradeKey: props.tradeRevision ?? 0,
    lensId,
  });
  stateRef.current = state;

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    completedHold.current = false;
  };

  useEffect(() => {
    if (props.paused) cancelHold();
    dispatch({ type: props.paused ? 'PAUSE' : 'RESUME' });
  }, [props.paused]);

  useEffect(() => {
    dispatch({ type: 'NEXT_TURN', candidateId: props.candidate?.id ?? null });
    setPassCoverOpen(Boolean(props.hotseatNextName));
    if (props.activeSeatId && currentOrder?.teamId === props.activeSeatId) soundPlayer.play('turn');
  }, [props.activeSeatId, props.candidate?.id, props.currentPickIndex, props.hotseatNextName]);

  useEffect(() => {
    const nextRevision = props.tradeRevision ?? 0;
    if (nextRevision !== priorTradeRevision.current) {
      cancelHold();
      dispatch({ type: 'LIVE_PICK_MOVED' });
    }
    priorTradeRevision.current = nextRevision;
  }, [props.tradeRevision]);

  useEffect(() => {
    if (reveal.revealed && props.privateSnipeKey) soundPlayer.play('snipe');
  }, [props.privateSnipeKey, reveal.revealed, soundPlayer]);

  useEffect(() => {
    if (reveal.revealed && props.dangerKey) soundPlayer.play('danger');
  }, [props.dangerKey, reveal.revealed, soundPlayer]);

  useEffect(() => () => cancelHold(), []);

  const selectLens = (teamId: string) => {
    setLensId(teamId);
    soundPlayer.play('nav');
  };

  const requestPauseChange = () => {
    if (!props.paused) {
      cancelHold();
      dispatch({ type: 'PAUSE' });
    } else {
      dispatch({ type: 'RESUME' });
    }
    props.onPauseChange(!props.paused);
  };

  const startHold = () => {
    if (state.phase !== 'ARM' || state.paused || !props.candidate) return;
    completedHold.current = false;
    dispatch({ type: 'GAVEL_DOWN' });
    holdTimer.current = setTimeout(async () => {
      holdTimer.current = null;
      const liveState = stateRef.current;
      if (liveState.paused || liveState.phase !== 'ANNOUNCE' || props.paused) return;
      completedHold.current = true;
      const recordedPick = {
        playerId: props.candidate!.id,
        playerName: props.candidate!.name,
        teamId: currentTeam?.id ?? currentOrder?.teamId ?? '',
        teamName: teamName(currentTeam),
      };
      try {
        await props.onRecordPick(props.candidate!.id);
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
    await props.onCorrectLatest();
    dispatch({ type: 'CORRECTION_DONE' });
    soundPlayer.play('nav');
  };
  const recordedTeam = state.recordedPick
    ? props.teams.find((team) => team.id === state.recordedPick?.teamId)
    : undefined;
  const ritualTeam = state.phase === 'RECORDED' ? recordedTeam : currentTeam;

  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-draft-room">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--ballpark-brass)]">SHARED DRAFT ROOM</p>
          <h1 className="ballpark-title text-3xl">THE ROOM</h1>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Commissioner controls">
          <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={() => props.onSoundsEnabledChange(!props.soundsEnabled)}>
            {props.soundsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            SOUND {props.soundsEnabled ? 'ON' : 'OFF'}
          </button>
          <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={requestPauseChange}>
            {props.paused ? <Play size={15} /> : <Pause size={15} />}
            {props.paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button
            className="ballpark-press-button ballpark-press-sm ballpark-press-default"
            disabled={!props.correctionAvailable}
            onClick={() => dispatch({ type: 'OPEN_CORRECTION', available: props.correctionAvailable })}
          >
            <RotateCcw size={15} /> CORRECT LAST ACTION
          </button>
          <span className="ballpark-press-button ballpark-press-sm ballpark-press-default opacity-60">TRADE APPROVAL — S4</span>
        </div>
      </header>

      {props.practiceMode && <p className="mb-3 border-2 border-[var(--ballpark-brass)] p-2 text-sm font-bold">PRACTICE MODE — PAUSE AND CORRECTION WORK THE SAME.</p>}
      {props.paused && <p className="mb-3 bg-[var(--ballpark-warn-panel)] p-3 font-bold text-[var(--ballpark-warn-text)]">THE DRAFT IS PAUSED</p>}

      <section className="mb-5 overflow-x-auto border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-panel)] p-3" aria-label="Draft order">
        <div className="flex min-w-max gap-2">
          {props.order.map((slot, index) => {
            const team = props.teams.find((entry) => entry.id === slot.teamId);
            const active = index === props.currentPickIndex;
            return (
              <button
                key={`${slot.pick}-${slot.teamId}`}
                aria-label={`${teamName(team)} pick ${slot.pick}`}
                className={`min-w-28 border-4 p-2 text-left font-bold ${active ? 'scale-105' : ''}`}
                style={{ backgroundColor: team?.colors.primary, color: team?.colors.secondary, borderColor: team?.colors.accent ?? team?.colors.secondary }}
                onClick={() => selectLens(slot.teamId)}
              >
                <span className="block text-[10px]">PICK {slot.pick}{slot.endpoint ? ' · BACK-TO-BACK' : ''}</span>
                <span>{team?.abbreviation ?? slot.teamId}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="ballpark-panel" aria-label="Draft ritual">
          <div className="ballpark-panel-strip">
            <span className="font-bold">{state.phase}</span>
            <span className="text-sm">PICK {currentOrder?.pick ?? '—'} · {state.recordedPick?.teamName ?? teamName(currentTeam)}</span>
          </div>

          {state.phase === 'REVIEW' && (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">REVIEW</p>
              <h2 className="text-3xl font-bold">{teamName(currentTeam).toUpperCase()} IS REVIEWING THE BOARD</h2>
              <p className="mt-3">The shared room stays covered until the club arms its pick.</p>
            </div>
          )}

          {(state.phase === 'ARM' || state.phase === 'ANNOUNCE' || state.phase === 'RECORDED') && (
            <div
              className="flex min-h-80 flex-col items-center justify-center border-[6px] p-8 text-center"
              data-testid="ritual-card"
              style={{
                backgroundColor: ritualTeam?.colors.primary,
                color: ritualTeam?.colors.secondary,
                borderColor: ritualTeam?.colors.accent ?? ritualTeam?.colors.secondary,
              }}
            >
              {ritualTeam?.logoUrl && <img className="mb-4 h-24 w-24 object-contain" src={ritualTeam.logoUrl} alt={`${ritualTeam.name} logo`} />}
              <p className="text-2xl font-black tracking-wider">THE {(state.recordedPick?.teamName ?? teamName(ritualTeam)).toUpperCase()} SELECT…</p>
              {state.phase === 'RECORDED' && <p className="mt-5 text-4xl font-black">{state.recordedPick!.playerName.toUpperCase()}</p>}
              {state.phase !== 'RECORDED' && (
                <button
                  className="ballpark-press-button ballpark-press-lg mt-7 border-current bg-black/30"
                  onPointerDown={startHold}
                  onPointerUp={releaseHold}
                  onPointerLeave={releaseHold}
                  onPointerCancel={releaseHold}
                >
                  {state.phase === 'ANNOUNCE' ? 'KEEP HOLDING' : 'HOLD THE GAVEL'}
                </button>
              )}
              {state.phase === 'ANNOUNCE' && <div className="mt-4 h-4 w-full border-2 border-current"><div className="h-full animate-[snakeHold_1s_linear_forwards] bg-current" /></div>}
              {state.phase === 'RECORDED' && (
                <button className="ballpark-press-button ballpark-press-lg mt-7 border-current bg-black/30" onClick={() => dispatch({ type: 'ADVANCE', candidateId: props.candidate?.id ?? null })}>
                  ADVANCE TO NEXT PICK
                </button>
              )}
            </div>
          )}

          {state.phase === 'CORRECTION' && (
            <div className="py-8 text-center">
              <h2 className="mb-3 text-2xl font-bold">UNDO THE MOST RECENT ACTION?</h2>
              <p className="mb-5">Only the latest completed pick or trade can be restored.</p>
              <button className="ballpark-press-button ballpark-press-lg ballpark-press-destruct" onClick={() => void correctLatest()}>UNDO LAST ACTION</button>
            </div>
          )}
          {state.notice && <p className="mt-4 font-bold text-[var(--ballpark-scoreboard-yellow)]" role="status">{state.notice}</p>}
        </section>

        <aside className="space-y-5">
          <section className="ballpark-panel" aria-label="Private seat">
            <div className="ballpark-panel-strip"><span className="font-bold">YOUR PRIVATE DRAFT DESK</span></div>
            {!props.activeSeatId ? <p>NO SEAT IS ACTIVE.</p> : reveal.revealed ? (
              <div>
                {props.privateDesk}
                {props.candidate ? (
                  <>
                    <p className="text-xs font-bold text-[var(--ballpark-brass)]">READ THE PICK</p>
                    <h2 className="mt-1 text-2xl font-bold">{props.candidate.name}</h2>
                    <p className="mb-3 text-sm">{props.candidate.position}</p>
                    <p className={`mb-3 border-4 p-3 font-bold ${props.candidate.blockReason ? 'border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] text-[var(--ballpark-warn-text)]' : 'border-[var(--ballpark-panel-border)]'}`}>
                      {props.candidate.consequence}
                    </p>
                    <p className="mb-3 text-sm font-bold">{props.candidate.privateNote}</p>
                    {!props.candidate.blockReason && !props.paused && (
                      <button className="ballpark-press-button ballpark-press-lg ballpark-press-gold mb-3" onClick={() => { reveal.cover(); dispatch({ type: 'ARM', candidateId: props.candidate!.id }); }}>
                        COVER &amp; ARM
                      </button>
                    )}
                  </>
                ) : <p className="mb-3 font-bold">OPEN YOUR BOARD AND CHOOSE A PLAYER.</p>}
                <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={reveal.cover}><EyeOff size={15} /> COVER SEAT</button>
              </div>
            ) : (
              <button className="ballpark-press-button ballpark-press-md ballpark-press-default" onClick={reveal.reveal}>
                <Eye size={15} /> REVEAL {teamName(props.teams.find((team) => team.id === props.activeSeatId)).toUpperCase()} SEAT
              </button>
            )}
          </section>

          <section className="ballpark-panel" aria-label="Club lens">
            <div className="ballpark-panel-strip" style={{ borderColor: lensTeam?.colors.accent ?? lensTeam?.colors.secondary }}>
              <span className="font-bold">CLUB LENS</span>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {props.teams.map((team) => <button key={team.id} className="border-2 px-2 py-1 text-xs font-bold" style={{ borderColor: team.colors.primary }} onClick={() => selectLens(team.id)}>{team.name.toUpperCase()}</button>)}
            </div>
            <h3 className="mb-2 text-xl font-bold" style={{ color: lensTeam?.colors.secondary }}>{teamName(lensTeam)}</h3>
            <p className="mb-2 text-xs font-bold text-[var(--ballpark-brass)]">PUBLIC ROSTER</p>
            <ul className="mb-4 space-y-1 text-sm">
              {(lensId ? props.rostersByTeamId[lensId] : [])?.map((player) => <li key={player.id}>{player.position} · {player.name}</li>)}
              {(lensId ? props.rostersByTeamId[lensId] : [])?.length === 0 && <li>NO PICKS RECORDED YET.</li>}
            </ul>
            <p className="text-xs font-bold text-[var(--ballpark-brass)]">OWNED, TRADEABLE PICKS</p>
            <p>{(lensId ? props.ownedPicksByTeamId[lensId] : [])?.join(', ') || 'NONE'}</p>
          </section>
        </aside>
      </div>

      <section className="mt-5 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3" aria-label="Recent picks">
        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">RECENT PICKS</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {props.ticker.map((item) => <p key={item.id} className="font-bold">{item.text}</p>)}
          {props.ticker.length === 0 && <p>THE BOARD IS OPEN.</p>}
        </div>
      </section>

      {passCoverOpen && props.hotseatNextName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ballpark-page-bg)] p-6" role="dialog" aria-modal="true">
          <div className="ballpark-panel max-w-lg text-center">
            <h2 className="mb-4 text-3xl font-black">PASS TO {props.hotseatNextName.toUpperCase()}</h2>
            <p className="mb-5">The private seat is covered.</p>
            <button className="ballpark-press-button ballpark-press-lg ballpark-press-gold" onClick={() => setPassCoverOpen(false)}>I HAVE THE ROOM</button>
          </div>
        </div>
      )}
    </main>
  );
}
