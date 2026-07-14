import { useState, type ReactNode } from 'react';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import type { SnakeBoardSlotId } from '../../../../../utils/leagueBuilderStorage';
import type { RosterNeedBreakdown } from '../../../../../engines/rosterNeed';
import { AdvisorLog } from './AdvisorLog';
import { BoardView } from './BoardView';
import { AssistantGmStatusRow } from './DraftTruthStrip';
import { RankingsView } from './RankingsView';
import type { ChemistryStripRow } from './draftTruthModel';
import type { AdvisorLogEntry, DeskCandidate, TaxCoreRow } from './deskModel';
import type { SnakeAssistantBoardState } from './useSnakeAssistantBoard';

type DeskTab = 'MY_BOARD' | 'ASST_GM_BOARD' | 'PLAYER_POOL' | 'TRADE_PICKS' | 'ACTIVITY';

const DESK_TABS: ReadonlyArray<{ id: DeskTab; label: string }> = [
  { id: 'MY_BOARD', label: 'MY BOARD' },
  { id: 'ASST_GM_BOARD', label: 'ASST GM BOARD' },
  { id: 'PLAYER_POOL', label: 'PLAYER POOL' },
];

export function PrivateDesk(props: {
  candidates: readonly DeskCandidate[];
  rankings: Partial<Record<TaxonomyPosition, string[]>>;
  overallRankings?: readonly string[];
  boardSlots: Partial<Record<SnakeBoardSlotId, string>>;
  brokenSlots: readonly SnakeBoardSlotId[];
  planBill: SnakePlanBill | null;
  planChemistry?: readonly ChemistryStripRow[];
  draftedChemistry?: readonly ChemistryStripRow[];
  assistantNeed?: RosterNeedBreakdown;
  advisorLog: readonly AdvisorLogEntry[];
  logScopeId?: string;
  taxCoreRows: readonly TaxCoreRow[];
  slotDepth: Partial<Record<SnakeBoardSlotId, number>>;
  assistantBoard: SnakeAssistantBoardState;
  tradeGuide?: ReactNode;
  tradePrefillKey?: string | null;
  showHelp?: boolean;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  onReorderOverall?: (orderedIds: readonly string[]) => void;
  privateScopeKey?: string;
}) {
  const scopeKey = props.privateScopeKey ?? props.logScopeId ?? 'desk';
  const [tabState, setTabState] = useState<{ scopeKey: string; tab: DeskTab; tradePrefillKey: string | null }>({
    scopeKey,
    tab: 'MY_BOARD',
    tradePrefillKey: null,
  });
  const consequentialActivity = props.advisorLog.filter((entry) => entry.actionable && !entry.expired);
  const currentPrefillKey = props.tradePrefillKey ?? null;
  const stateMatchesScope = tabState.scopeKey === scopeKey;
  const hasUnseenTradePrefill = Boolean(
    props.tradeGuide
    && currentPrefillKey
    && (!stateMatchesScope || tabState.tradePrefillKey !== currentPrefillKey),
  );
  const requestedTab = hasUnseenTradePrefill
    ? 'TRADE_PICKS'
    : stateMatchesScope
      ? tabState.tab
      : 'MY_BOARD';
  const tab = requestedTab === 'TRADE_PICKS' && !props.tradeGuide
    ? 'MY_BOARD'
    : requestedTab === 'ACTIVITY' && consequentialActivity.length === 0
      ? 'MY_BOARD'
      : requestedTab;
  const setTab = (next: DeskTab) => setTabState({ scopeKey, tab: next, tradePrefillKey: currentPrefillKey });
  const [seenByScope, setSeenByScope] = useState<Record<string, string[]>>({});
  const logScope = props.logScopeId ?? 'desk';
  const seen = new Set(seenByScope[logScope] ?? []);
  const unseen = consequentialActivity.filter((entry) => !seen.has(entry.key));
  const tabs = [
    ...DESK_TABS,
    ...(props.tradeGuide ? [{ id: 'TRADE_PICKS' as const, label: 'TRADE PICKS' }] : []),
    ...(consequentialActivity.length > 0 ? [{ id: 'ACTIVITY' as const, label: 'ACTIVITY' }] : []),
  ];
  return (
    <section data-testid="private-draft-desk">
      {props.assistantNeed && props.draftedChemistry ? <AssistantGmStatusRow need={props.assistantNeed} chemistry={props.draftedChemistry} showHelp={props.showHelp ?? false} /> : null}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Private draft desk views">
        {tabs.map((next) => (
          <button
            key={next.id}
            id={`private-desk-tab-${next.id.toLowerCase()}`}
            type="button"
            aria-label={next.label}
            aria-pressed={tab === next.id}
            aria-controls={`private-desk-panel-${next.id.toLowerCase()}`}
            className={`ballpark-press-button ballpark-press-sm min-h-11 ${tab === next.id ? 'ballpark-press-action' : 'ballpark-press-default'}`}
            onClick={() => {
              setTab(next.id);
              if (next.id === 'ACTIVITY') {
                setSeenByScope((current) => ({ ...current, [logScope]: consequentialActivity.map((entry) => entry.key) }));
              }
            }}
          >{next.label}{next.id === 'ACTIVITY' && unseen.length > 0 ? <span aria-hidden="true"> {unseen.length}</span> : null}</button>
        ))}
      </div>
      {tab === 'MY_BOARD' && <div role="region" id="private-desk-panel-my_board" aria-labelledby="private-desk-tab-my_board">
        <BoardView candidates={props.candidates} boardSlots={props.boardSlots} brokenSlots={props.brokenSlots} planBill={props.planBill} planChemistry={props.planChemistry} taxCoreRows={props.taxCoreRows} slotDepth={props.slotDepth} selectedCandidateId={props.selectedCandidateId} onSelectCandidate={props.onSelectCandidate} showHelp={props.showHelp ?? false} />
      </div>}
      {tab === 'ASST_GM_BOARD' && <div role="region" id="private-desk-panel-asst_gm_board" aria-labelledby="private-desk-tab-asst_gm_board" data-testid="assistant-board-panel">
        {props.assistantBoard.status === 'ready' && props.assistantBoard.board ? (
          <BoardView
            candidates={props.candidates}
            boardSlots={Object.fromEntries(props.assistantBoard.board.slots.map((slot) => [slot.slotId, slot.playerId]))}
            brokenSlots={[]}
            planBill={null}
            planLedger={props.assistantBoard.board.ledger}
            planTitle="ASST GM 22"
            planChemistry={props.assistantBoard.board.chemistry}
            taxCoreRows={[]}
            slotDepth={{}}
            selectedCandidateId={props.selectedCandidateId}
            onSelectCandidate={props.onSelectCandidate}
            readOnly
          />
        ) : <p className="border-4 border-[var(--ballpark-panel-border)] p-3 font-black" role="status">
          {props.assistantBoard.status === 'pending' ? 'ASST GM BOARD CALCULATING…' : 'ASST GM BOARD UNAVAILABLE'}
        </p>}
      </div>}
      {tab === 'PLAYER_POOL' && <div role="region" id="private-desk-panel-player_pool" aria-labelledby="private-desk-tab-player_pool"><RankingsView candidates={props.candidates} rankings={props.rankings} overallRankings={props.overallRankings} onReorder={props.onReorder} onReorderOverall={props.onReorderOverall} selectedCandidateId={props.selectedCandidateId} onSelectCandidate={props.onSelectCandidate} /></div>}
      {tab === 'TRADE_PICKS' && <div role="region" id="private-desk-panel-trade_picks" aria-labelledby="private-desk-tab-trade_picks">{props.tradeGuide}</div>}
      {tab === 'ACTIVITY' && <div role="region" id="private-desk-panel-activity" aria-labelledby="private-desk-tab-activity"><AdvisorLog entries={consequentialActivity} /></div>}
    </section>
  );
}
