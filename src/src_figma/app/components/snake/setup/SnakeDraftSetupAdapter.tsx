import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { SnakeSeatingProof } from '../../../../../engines/snakeSeatingProof';
import type { Player, Team } from '../../../../../utils/leagueBuilderStorage';
import { snakePlayerVersionLabel } from '../../../../../utils/snakePlayerIdentity';
import { type SnakeVersionGroup } from './SnakeDraftSetupAdapter.helpers';

const UNKNOWN_TEAM = 'UNKNOWN TEAM';

export interface SnakeDraftSetupAdapterState {
  groups: SnakeVersionGroup[];
  versionSelections: Record<string, string>;
  setVersionSelections: Dispatch<SetStateAction<Record<string, string>>>;
  selectedPoolIds: string[];
  gmNames: Record<string, string>;
  setGmNames: Dispatch<SetStateAction<Record<string, string>>>;
  seatModes: Record<string, 'hotseat' | 'companion'>;
  setSeatModes: Dispatch<SetStateAction<Record<string, 'hotseat' | 'companion'>>>;
  seed: string;
  setSeed: Dispatch<SetStateAction<string>>;
  order: string[];
  swapFirst: string | null;
  proof: SnakeSeatingProof | null;
  checking: boolean;
  readinessReasons: string[];
  companionSeatReasons: string[];
  lockProofBlocked: boolean;
  ready: boolean;
  shuffleOrder: () => void;
  tapOrder: (teamId: string) => void;
  enterDraft: () => Promise<void>;
  enterPractice: () => Promise<void>;
}

function fullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

function HelpNote({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs leading-relaxed text-[var(--ballpark-chalk)]/75">
      {children}
    </div>
  );
}

export function SnakeDraftSetupPanels({ adapter, teams, locked, disabled, lockDisabled = false, showHelp = false, poolSources, poolControls, clubControls, onLock, onUnlock }: {
  adapter: SnakeDraftSetupAdapterState;
  teams: readonly Team[];
  locked: boolean;
  disabled: boolean;
  lockDisabled?: boolean;
  showHelp?: boolean;
  poolSources?: ReactNode;
  poolControls?: ReactNode;
  clubControls?: ReactNode;
  onLock?: () => void;
  onUnlock?: () => void;
}) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const turn = adapter.order.length > 1
    ? `${teamById.get(adapter.order.at(-1)!)?.name.toUpperCase() ?? UNKNOWN_TEAM} picks twice at one turn. ${teamById.get(adapter.order[0])?.name.toUpperCase() ?? UNKNOWN_TEAM} picks twice at the next.`
    : '';
  return (
    <div className="space-y-6" data-testid="snake-setup-adapter">
      <section className="ballpark-panel" aria-label="Snake pool">
        <div className="ballpark-panel-strip"><strong>1 · POOL</strong></div>
        <div className="space-y-3 p-4">
          {showHelp ? <HelpNote>Pick one card for each real person before you lock the pool. Choose each player version, then LOCK POOL. The room check runs on those locked players and prices.</HelpNote> : null}
          {poolSources}
          {adapter.groups.filter(({ cards }) => cards.length > 1).map(({ groupId, cards }) => (
            <label key={groupId} className="grid gap-2 sm:grid-cols-[1fr_240px] sm:items-center">
              <span className="font-bold">{fullName(cards[0]).toUpperCase()}</span>
              <select
                aria-label={`PICK A ${fullName(cards[0]).toUpperCase()} CARD`}
                disabled={disabled || locked}
                value={adapter.versionSelections[groupId] ?? cards[0].id}
                onChange={(event) => adapter.setVersionSelections((current) => ({ ...current, [groupId]: event.target.value }))}
                className="border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 font-bold"
              >
                {cards.map((card) => <option key={card.id} value={card.id}>{(snakePlayerVersionLabel(card, cards) ?? card.overallGrade).toUpperCase()}</option>)}
              </select>
            </label>
          ))}
          {adapter.groups.every(({ cards }) => cards.length === 1) ? <p className="text-sm">No duplicate player versions in this pool.</p> : null}
          {poolControls}
          {locked ? <p className="font-bold text-[var(--ballpark-brass)]">UNLOCK THE POOL TO CHANGE VERSIONS.</p> : null}
          <button type="button" disabled={disabled || (!locked && lockDisabled)} onClick={locked ? onUnlock : onLock} className="ballpark-press-button ballpark-press-md ballpark-press-gold">
            {locked ? 'UNLOCK POOL' : 'LOCK POOL'}
          </button>
        </div>
      </section>

      <section className="ballpark-panel" aria-label="Snake club extras">
        <div className="ballpark-panel-strip"><strong>2 · CLUBS</strong></div>
        {clubControls ? <div className="p-4 pb-0">{clubControls}</div> : null}
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="grid gap-2 border-4 border-[var(--ballpark-panel-border)] p-3">
              <strong>{team.name.toUpperCase()}</strong>
              <label className="text-xs font-bold">GM NAME
                <input aria-label={`${team.name} GM NAME`} disabled={disabled} value={adapter.gmNames[team.id] ?? ''} onChange={(event) => adapter.setGmNames((current) => ({ ...current, [team.id]: event.target.value }))} className="mt-1 w-full border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 disabled:opacity-45" />
              </label>
              <label className="text-xs font-bold">SEAT
                <select aria-label={`${team.name} SEAT`} disabled={disabled} value={adapter.seatModes[team.id] ?? 'hotseat'} onChange={(event) => adapter.setSeatModes((current) => ({ ...current, [team.id]: event.target.value as 'hotseat' | 'companion' }))} className="mt-1 w-full border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 disabled:opacity-45">
                  <option value="hotseat">HOTSEAT</option>
                  <option value="companion">COMPANION</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="ballpark-panel" aria-label="Snake order">
        <div className="ballpark-panel-strip"><strong>3 · ORDER</strong></div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold">DRAFT SEED
              <input aria-label="DRAFT SEED" disabled={disabled} value={adapter.seed} onChange={(event) => adapter.setSeed(event.target.value)} className="mt-1 block border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 disabled:opacity-45" />
            </label>
            <button type="button" disabled={disabled} onClick={adapter.shuffleOrder} className="border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-brass)] px-4 py-2 font-bold text-black disabled:opacity-45">SHUFFLE</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {adapter.order.map((teamId, index) => <button key={teamId} type="button" disabled={disabled} onClick={() => adapter.tapOrder(teamId)} aria-pressed={adapter.swapFirst === teamId} className="border-4 border-[var(--ballpark-panel-border)] p-3 text-left font-bold disabled:opacity-45">{index + 1}. {teamById.get(teamId)?.name.toUpperCase() ?? UNKNOWN_TEAM}</button>)}
          </div>
          <p className="font-bold text-[var(--ballpark-brass)]">R1: 1→{adapter.order.length} · R2: {adapter.order.length}→1</p>
          {showHelp && turn ? <HelpNote>{turn}</HelpNote> : null}
        </div>
      </section>
    </div>
  );
}
