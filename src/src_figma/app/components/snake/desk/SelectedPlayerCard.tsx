import { buildDraftProfileModel, type DraftProfileFullRatings } from '../../../../../utils/draftProfileModel';
import type { Player } from '../../../../../utils/leagueBuilderStorage';
import type { DeskCandidate } from './deskModel';
import { fitToneForWord, type SelectedChemistryDelta } from './draftTruthModel';

const RATINGS: readonly [keyof Omit<DraftProfileFullRatings, 'arsenal'>, string][] = [
  ['power', 'POW'], ['contact', 'CON'], ['speed', 'SPD'], ['fielding', 'FLD'], ['arm', 'ARM'],
  ['velocity', 'VEL'], ['junk', 'JNK'], ['accuracy', 'ACC'],
];

function signedMoney(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}$${Math.abs(rounded).toLocaleString()}`;
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
  chemistryDelta: SelectedChemistryDelta | null;
  moneyKnown?: boolean;
  teamLogoUrl?: string;
  teamName: string;
}) {
  const profile = buildDraftProfileModel(props.player, { revealFull: true });
  const fitTone = fitToneForWord(props.candidate.fitWord);
  const positions = profile.secondaryPosition
    ? `${profile.primaryPosition} · ${profile.secondaryPosition}`
    : profile.primaryPosition;
  const ratings = profile.fullRatings
    ? RATINGS.flatMap(([key, label]) => profile.fullRatings![key] !== 0 ? [{ key, label, value: profile.fullRatings![key] }] : [])
    : [];
  return (
    <section className="mb-3 border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="selected-player-card">
      <div className="flex items-start gap-3">
        {props.teamLogoUrl ? <img className="h-14 w-14 object-contain" src={props.teamLogoUrl} alt={`${props.teamName} logo`} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-[0.16em] text-[var(--ballpark-brass)]">SELECTED PLAYER</p>
          <h2 className="truncate text-xl font-black uppercase">{profile.name}</h2>
          <p className="text-xs font-bold">{positions}</p>
          <p className="text-[10px] font-bold">AGE {profile.age} · B/T {profile.bats}/{profile.throws}{profile.armSlot ? ` · ${profile.armSlot} SLOT` : ''}</p>
        </div>
        <span className={`border-2 px-2 py-1 text-[10px] font-black ${FIT_TONE_CLASS[fitTone]}`}>TEAM FIT · {props.candidate.fitWord}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-black">
        {profile.archetype ? <span className="border-2 border-[var(--ballpark-brass)] px-2 py-1">{profile.archetype}</span> : null}
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">{profile.personality}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">{profile.chemistry}</span>
        {profile.traits.map((trait) => <span key={trait} className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">{trait}</span>)}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-8">
        {ratings.map((rating) => (
          <div key={rating.key} className="border-2 border-[var(--ballpark-panel-border)] p-1 text-center">
            <p className="text-[9px] font-bold text-[var(--ballpark-brass)]">{rating.label}</p>
            <strong className="text-xs">{rating.value}</strong>
          </div>
        ))}
      </div>
      {profile.fullRatings?.arsenal.length ? <p className="mt-2 text-xs font-bold">ARSENAL · {profile.fullRatings.arsenal.join(' · ')}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <p><span className="block text-[9px] font-bold">SALARY</span><strong>${Math.round(props.candidate.iv).toLocaleString()}</strong></p>
        <p><span className="block text-[9px] font-bold">CURRENT TAX</span><strong>{props.moneyKnown === false ? '—' : signedMoney(props.candidate.marginalTax)}</strong></p>
        <p><span className="block text-[9px] font-bold">TRUE COST</span><strong>{props.moneyKnown === false ? '—' : `$${Math.round(props.candidate.trueCost).toLocaleString()}`}</strong></p>
        <p><span className="block text-[9px] font-bold">CHEM VALUE</span><strong>{props.chemistryDelta ? signedMoney(props.chemistryDelta.premium) : '—'}</strong></p>
      </div>
      <p className="mt-2 text-xs font-black">
        {props.chemistryDelta
          ? <>{props.chemistryDelta.word.toUpperCase()} {props.chemistryDelta.before}→{props.chemistryDelta.after}{props.chemistryDelta.crossing ? ` · ${props.chemistryDelta.crossing}` : ''}</>
          : <>{profile.chemistry.toUpperCase()} —→—</>}
      </p>
    </section>
  );
}
