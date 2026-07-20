import { useState, type ReactNode } from 'react';
import { buildDraftProfileModel, type DraftProfileFullRatings } from '../../../../../utils/draftProfileModel';
import type { Player } from '../../../../../utils/leagueBuilderStorage';
import type { DeskCandidate } from './deskModel';
import { fitToneForWord } from './draftTruthModel';
import type { SnakeDraftDecision } from './snakeDraftDecisionModel';
import type {
  SelectedPlayerConsequence,
  SelectedPlayerLegalFinish,
} from './snakeDeskIntelligenceModel';

const RATINGS: readonly [keyof Omit<DraftProfileFullRatings, 'arsenal'>, string][] = [
  ['power', 'POW'], ['contact', 'CON'], ['speed', 'SPD'], ['fielding', 'FLD'], ['arm', 'ARM'],
  ['velocity', 'VEL'], ['junk', 'JNK'], ['accuracy', 'ACC'],
];

function money(value: number | null): string {
  return value === null ? '—' : `$${Math.round(value).toLocaleString()}`;
}

function legalFinishLabel(value: SelectedPlayerLegalFinish): string {
  if (value.affordability === 'OPEN') return 'OPEN';
  return value.feasible ? money(value.moneyLeft) : 'NO';
}

const FIT_TONE_CLASS = {
  green: 'border-[var(--ballpark-status-green)] text-[var(--ballpark-status-green)]',
  yellow: 'border-[var(--ballpark-brass)] text-[var(--ballpark-brass)]',
  red: 'border-[var(--ballpark-warn-border)] text-[var(--ballpark-warn-text)]',
  unknown: 'border-[var(--ballpark-panel-border)] text-[var(--ballpark-chalk)]',
} as const;

export function SelectedPlayerCard(props: {
  player: Player;
  candidate: DeskCandidate;
  consequence: SelectedPlayerConsequence | null;
  teamLogoUrl?: string;
  teamName: string;
  onOptimizeAround?: () => void;
  onKeep?: () => void;
  zeroInterest?: boolean;
  onSetZeroInterest?: (zeroInterest: boolean) => void;
  /** Legacy preview seam only. Production undo is owned by the revision-safe board transaction banner. */
  onRevert?: () => void;
  decision?: SnakeDraftDecision | null;
  onTradeDecision?: (decision: Extract<SnakeDraftDecision, { kind: 'TRADE_TO_PICK' }>) => void;
  actionConsequence?: string | null;
  blockReason?: string | null;
  draftAction?: ReactNode;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profile = buildDraftProfileModel(props.player, { revealFull: true });
  const displayedFitWord = props.consequence?.status === 'ready'
    ? props.consequence.after.fitWord
    : props.candidate.fitWord;
  const fitTone = fitToneForWord(displayedFitWord);
  const positions = profile.secondaryPosition
    ? `${profile.primaryPosition} · ${profile.secondaryPosition}`
    : profile.primaryPosition;
  const ratings = profile.fullRatings
    ? RATINGS.flatMap(([key, label]) => profile.fullRatings![key] !== 0 ? [{ key, label, value: profile.fullRatings![key] }] : [])
    : [];
  const nextPickRiskText = props.candidate.riskPending
    ? 'CALCULATING'
    : props.candidate.riskUnavailable
      ? 'UNAVAILABLE'
      : props.candidate.riskReason
        ?? (props.candidate.hasNextPick ? props.candidate.risk.replaceAll('_', ' ') : '—');
  const likelyGone = nextPickRiskText.toUpperCase().includes('LIKELY GONE');
  const consequence = props.consequence;
  const decision = props.decision?.playerId === props.candidate.id ? props.decision : null;
  const decisionLabel = decision?.kind === 'TAKE_NOW'
    ? 'TAKE NOW'
    : decision?.kind === 'SAFE_TO_WAIT'
      ? 'SAFE TO WAIT'
      : decision?.kind === 'PASS'
        ? 'PASS'
        : null;
  const profileBodyId = `selected-player-profile-${props.candidate.id}`;
  return (
    <section className="mb-3 border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)]" data-testid="selected-player-card">
      <div
        className="sticky top-0 z-10 border-b-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3"
        data-testid="selected-player-action-strip"
      >
        <div className="flex items-start gap-3">
        {props.teamLogoUrl ? <img className="h-14 w-14 shrink-0 object-contain" src={props.teamLogoUrl} alt={`${props.teamName} logo`} /> : (
          <svg className="h-14 w-14 shrink-0 border-2 border-[var(--ballpark-brass)] bg-[var(--ballpark-page-bg)]" viewBox="0 0 16 16" role="img" aria-label={`${profile.name} pixel portrait`} shapeRendering="crispEdges">
            <rect x="5" y="2" width="6" height="2" fill="var(--ballpark-brass)" />
            <rect x="4" y="4" width="8" height="6" fill={props.player.gender === 'F' ? 'var(--ballpark-status-green)' : 'var(--ballpark-chalk)'} />
            <rect x="5" y="6" width="2" height="2" fill="var(--ballpark-page-bg)" />
            <rect x="9" y="6" width="2" height="2" fill="var(--ballpark-page-bg)" />
            <rect x="6" y="10" width="4" height="2" fill="var(--ballpark-brass)" />
            <rect x="3" y="12" width="10" height="3" fill="var(--ballpark-action-green)" />
          </svg>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-[0.16em] text-[var(--ballpark-brass)]">SELECTED PLAYER</p>
          <h2 className="break-words text-xl font-black uppercase leading-tight">{profile.name}</h2>
          {props.candidate.identityChips?.length ? <p className="text-[10px] font-black text-[var(--ballpark-brass)]">{props.candidate.identityChips.join(' · ')}</p> : null}
          <p className="text-xs font-bold">{positions}</p>
          <p className="text-[10px] font-bold">AGE {profile.age} · B/T {profile.bats}/{profile.throws}{profile.armSlot ? ` · ${profile.armSlot} SLOT` : ''}</p>
        </div>
        </div>
        <span className={`mt-2 inline-block max-w-full border-2 px-2 py-1 text-[10px] font-black ${FIT_TONE_CLASS[fitTone]}`}>FIT · {displayedFitWord}</span>
        {props.actionConsequence ? <p className={`mt-2 border-2 p-2 text-xs font-black ${props.blockReason ? 'border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] text-[var(--ballpark-warn-text)]' : 'border-[var(--ballpark-panel-border)]'}`}>{props.actionConsequence}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {props.draftAction}
          <div className="lg:hidden">
            <button
              type="button"
              className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11"
              aria-expanded={profileOpen}
              aria-controls={profileBodyId}
              aria-label={profileOpen ? 'CLOSE PLAYER CARD' : 'OPEN PLAYER CARD'}
              onClick={() => setProfileOpen((open) => !open)}
            >{profileOpen ? 'CLOSE CARD' : 'PLAYER CARD'}</button>
          </div>
        </div>
      </div>
      <div
        id={profileBodyId}
        className={`${profileOpen ? 'block' : 'hidden'} p-3 lg:block`}
        data-testid="selected-player-profile-body"
      >
      <div className="flex flex-wrap gap-1 text-[10px] font-black">
        {profile.archetype ? <span className="border-2 border-[var(--ballpark-brass)] px-2 py-1">PLAYER ARCHETYPE · {profile.archetype}</span> : null}
        <span className="border-2 border-[var(--ballpark-brass)] px-2 py-1">TEAM ARCHETYPE · {props.candidate.archetypeChip}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">{profile.personality}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">{profile.chemistry}</span>
        {profile.traits.map((trait) => <span key={trait} className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">{trait}</span>)}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-8">
        <div className="border-2 border-[var(--ballpark-brass)] p-1 text-center">
          <p className="text-[9px] font-bold text-[var(--ballpark-brass)]">OVR</p>
          <strong className="text-xs">{props.player.overallGrade}</strong>
        </div>
        {ratings.map((rating) => (
          <div key={rating.key} className="border-2 border-[var(--ballpark-panel-border)] p-1 text-center">
            <p className="text-[9px] font-bold text-[var(--ballpark-brass)]">{rating.label}</p>
            <strong className="text-xs">{rating.value}</strong>
            <span className="mt-1 block h-1.5 bg-[var(--ballpark-page-bg)]" aria-hidden="true">
              <span
                className="block h-full bg-[var(--ballpark-brass)]"
                style={{ width: `${Math.max(0, Math.min(100, rating.value))}%` }}
              />
            </span>
          </div>
        ))}
      </div>
      {profile.fullRatings?.arsenal.length ? <p className="mt-2 text-xs font-bold">ARSENAL · {profile.fullRatings.arsenal.join(' · ')}</p> : null}
      <p className={`mt-3 border-2 border-[var(--ballpark-panel-border)] p-2 text-[10px] font-black ${likelyGone ? 'text-[var(--ballpark-status-red-bright)]' : ''}`} data-testid="selected-player-next-pick-risk">
        NEXT PICK · {nextPickRiskText}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <p><span className="block text-[9px] font-bold">SALARY</span><strong>${Math.round(props.candidate.salary ?? props.candidate.iv).toLocaleString()}</strong></p>
        <p><span className="block text-[9px] font-bold">TAX IMPACT</span><strong>{props.candidate.drafted ? 'SEE TAX CORE' : props.candidate.consequencesKnown === false ? '—' : `${props.candidate.marginalTax >= 0 ? '+' : '−'}$${Math.round(Math.abs(props.candidate.marginalTax)).toLocaleString()}`}</strong></p>
        <p><span className="block text-[9px] font-bold">TRUE COST</span><strong>{props.candidate.drafted ? '—' : props.candidate.consequencesKnown === false ? '—' : `$${Math.round(props.candidate.trueCost).toLocaleString()}`}</strong></p>
        <p><span className="block text-[9px] font-bold">MY BOARD</span><strong>{consequence?.status === 'already-on-board' ? 'ON BOARD' : consequence?.status === 'ready' ? `REPLACES ${consequence.displacedSlotId}` : '—'}</strong></p>
      </div>
      {consequence?.status === 'ready' ? <div className="mt-3 border-t-4 border-[var(--ballpark-panel-border)] pt-3" data-testid="selected-player-consequence">
        <p className="font-black">OUT · {consequence.displacedPlayerName.toUpperCase()} · {consequence.before.fitWord}</p>
        <p className="font-black">IN · {profile.name.toUpperCase()} · {consequence.after.fitWord}</p>
        <div className="mt-2 grid grid-cols-[auto_repeat(2,minmax(0,1fr))] gap-x-2 gap-y-1 text-xs">
          <span /> <strong>BEFORE</strong> <strong>AFTER</strong>
          <span>SALARY</span><strong>{money(consequence.before.ledger.salary)}</strong><strong>{money(consequence.after.ledger.salary)}</strong>
          <span>TAX</span><strong>{money(consequence.before.ledger.tax)}</strong><strong>{money(consequence.after.ledger.tax)}</strong>
          <span>ALL-IN</span><strong>{money(consequence.before.ledger.allIn)}</strong><strong>{money(consequence.after.ledger.allIn)}</strong>
          <span>LEFT</span><strong>{money(consequence.before.ledger.moneyLeft)}</strong><strong>{money(consequence.after.ledger.moneyLeft)}</strong>
          <span>LEGAL FINISH</span><strong>{legalFinishLabel(consequence.before.legalFinish)}</strong><strong>{legalFinishLabel(consequence.after.legalFinish)}</strong>
          <span>FINAL SALARY</span><strong>{money(consequence.before.legalFinish.projectedSalary ?? null)}</strong><strong>{money(consequence.after.legalFinish.projectedSalary ?? null)}</strong>
          <span>FINAL TAX</span><strong>{money(consequence.before.legalFinish.projectedTax ?? null)}</strong><strong>{money(consequence.after.legalFinish.projectedTax ?? null)}</strong>
          <span>FINAL ALL-IN</span><strong>{money(consequence.before.legalFinish.projectedAllIn ?? null)}</strong><strong>{money(consequence.after.legalFinish.projectedAllIn ?? null)}</strong>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1 text-[10px] sm:grid-cols-5" aria-label="Selected player chemistry consequences">
          {consequence.before.chemistry.map((row, index) => {
            const after = consequence.after.chemistry[index];
            return <p key={row.family} className="border-2 border-[var(--ballpark-panel-border)] p-1 font-black">{row.word.toUpperCase()} {row.count ?? '—'} · {row.tier ?? '—'} → {after?.count ?? '—'} · {after?.tier ?? '—'}<span className="block opacity-75">TRAITS {row.traitCount ?? '—'} → {after?.traitCount ?? '—'}</span></p>;
          })}
        </div>
      </div> : consequence?.status === 'already-on-board' ? <p className="mt-3 border-2 border-[var(--ballpark-status-green)] p-2 font-black text-[var(--ballpark-status-green)]">ON MY BOARD</p> : null}
      <div className="sticky bottom-0 -mx-3 -mb-3 mt-3 flex flex-wrap gap-2 border-t-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3">
        {decision?.kind === 'TRADE_TO_PICK' ? <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" onClick={() => props.onTradeDecision?.(decision)}>TRADE TO #{decision.targetPick}</button> : null}
        {decisionLabel ? <span className="flex min-h-11 items-center border-2 border-[var(--ballpark-brass)] px-3 text-xs font-black" data-testid="selected-player-decision">{decisionLabel}</span> : null}
        {props.onOptimizeAround ? <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-action min-h-11" onClick={props.onOptimizeAround}>OPTIMIZE AROUND</button> : null}
        {consequence?.status === 'ready' && props.onKeep ? <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" onClick={props.onKeep}>KEEP ON MY BOARD</button> : null}
        {props.onSetZeroInterest && !props.candidate.drafted ? <button
          type="button"
          className={`ballpark-press-button ballpark-press-sm min-h-11 ${props.zeroInterest ? 'ballpark-press-action' : 'ballpark-press-default'}`}
          aria-pressed={props.zeroInterest}
          onClick={() => props.onSetZeroInterest?.(!props.zeroInterest)}
        >{props.zeroInterest ? 'RESTORE INTEREST' : 'ZERO INTEREST'}</button> : null}
      </div>
      </div>
    </section>
  );
}
