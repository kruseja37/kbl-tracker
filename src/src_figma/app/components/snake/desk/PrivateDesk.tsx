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

type DeskTab = 'MY_BOARD' | 'ASST_GM_BOARD' | 'RANKINGS' | 'LOG' | 'GUIDE';

const DESK_TABS: ReadonlyArray<{ id: DeskTab; label: string }> = [
  { id: 'MY_BOARD', label: 'MY BOARD' },
  { id: 'ASST_GM_BOARD', label: 'ASST GM BOARD' },
  { id: 'RANKINGS', label: 'RANKINGS' },
  { id: 'LOG', label: 'LOG' },
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
  showHelp?: boolean;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  onReorderOverall?: (orderedIds: readonly string[]) => void;
}) {
  const [tab, setTab] = useState<DeskTab>('MY_BOARD');
  const [seenByScope, setSeenByScope] = useState<Record<string, string[]>>({});
  const logScope = props.logScopeId ?? 'desk';
  const seen = new Set(seenByScope[logScope] ?? []);
  const unseen = props.advisorLog.filter((entry) => !entry.expired && !seen.has(entry.key));
  const latestAdvisor = props.advisorLog.find((entry) => !entry.expired);
  return (
    <section data-testid="private-draft-desk">
      {props.assistantNeed && props.draftedChemistry ? <AssistantGmStatusRow need={props.assistantNeed} chemistry={props.draftedChemistry} showHelp={props.showHelp ?? false} /> : null}
      {latestAdvisor ? <p className="mb-3 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 font-bold uppercase" aria-live="polite">{latestAdvisor.text}</p> : null}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Private draft desk views">
        {[...DESK_TABS, ...(props.tradeGuide ? [{ id: 'GUIDE' as const, label: 'GUIDE' }] : [])].map((next) => (
          <button
            key={next.id}
            id={`private-desk-tab-${next.id.toLowerCase()}`}
            type="button"
            aria-pressed={tab === next.id}
            aria-controls={`private-desk-panel-${next.id.toLowerCase()}`}
            className={`ballpark-press-button ballpark-press-sm ${tab === next.id ? 'ballpark-press-action' : 'ballpark-press-default'}`}
            onClick={() => {
              setTab(next.id);
              if (next.id === 'LOG') {
                setSeenByScope((current) => ({ ...current, [logScope]: props.advisorLog.map((entry) => entry.key) }));
              }
            }}
          >{next.id === 'LOG' && unseen.length > 0 ? `LOG ${unseen.length}` : next.label}</button>
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
      {tab === 'RANKINGS' && <div role="region" id="private-desk-panel-rankings" aria-labelledby="private-desk-tab-rankings"><RankingsView candidates={props.candidates} rankings={props.rankings} overallRankings={props.overallRankings} onReorder={props.onReorder} onReorderOverall={props.onReorderOverall} selectedCandidateId={props.selectedCandidateId} onSelectCandidate={props.onSelectCandidate} /></div>}
      {tab === 'LOG' && <div role="region" id="private-desk-panel-log" aria-labelledby="private-desk-tab-log"><AdvisorLog entries={props.advisorLog} /></div>}
      {tab === 'GUIDE' && <div role="region" id="private-desk-panel-guide" aria-labelledby="private-desk-tab-guide">{props.tradeGuide}</div>}
    </section>
  );
}
