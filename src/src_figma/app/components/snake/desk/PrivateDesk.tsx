import { useState, type ReactNode } from 'react';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import type { SnakeBoardSlotId } from '../../../../../utils/leagueBuilderStorage';
import type { RosterNeedBreakdown } from '../../../../../engines/rosterNeed';
import { AdvisorLog } from './AdvisorLog';
import { BoardView } from './BoardView';
import { AssistantGmStatusRow } from './DraftTruthStrip';
import { RankingsView } from './RankingsView';
import { WhatIfSandbox, type DeskWhatIf } from './WhatIfSandbox';
import type { ChemistryStripRow } from './draftTruthModel';
import type { AdvisorLogEntry, DeskCandidate, TaxCoreRow } from './deskModel';

type DeskTab = 'BOARD' | 'RANKINGS' | 'LOG' | 'GUIDE';

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
  taxCoreRows: readonly TaxCoreRow[];
  slotDepth: Partial<Record<SnakeBoardSlotId, number>>;
  whatIf?: DeskWhatIf | null;
  tradeGuide?: ReactNode;
  showHelp?: boolean;
  resolveLegalFinishLine?: (candidateId: string) => string;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  isCandidateSelectable?: (candidateId: string) => boolean;
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  onReorderOverall?: (orderedIds: readonly string[]) => void;
  onStartWhatIf: (slotId: SnakeBoardSlotId, playerId: string) => void;
  onKeepWhatIf: () => void;
  onRevertWhatIf: () => void;
}) {
  const [tab, setTab] = useState<DeskTab>('BOARD');
  const availableWhatIfCandidates = props.candidates.filter((candidate) => !candidate.drafted);
  return (
    <section data-testid="private-draft-desk">
      {props.assistantNeed && props.draftedChemistry ? <AssistantGmStatusRow need={props.assistantNeed} chemistry={props.draftedChemistry} showHelp={props.showHelp ?? false} /> : null}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Private draft desk views">
        {(['BOARD', 'RANKINGS', 'LOG', ...(props.tradeGuide ? ['GUIDE' as const] : [])] as const).map((next) => (
          <button
            key={next}
            id={`private-desk-tab-${next.toLowerCase()}`}
            type="button"
            aria-pressed={tab === next}
            aria-controls={`private-desk-panel-${next.toLowerCase()}`}
            className={`ballpark-press-button ballpark-press-sm ${tab === next ? 'ballpark-press-action' : 'ballpark-press-default'}`}
            onClick={() => setTab(next)}
          >{next}</button>
        ))}
      </div>
      {tab === 'BOARD' && <div role="region" id="private-desk-panel-board" aria-labelledby="private-desk-tab-board">
        <BoardView candidates={props.candidates} boardSlots={props.boardSlots} brokenSlots={props.brokenSlots} planBill={props.planBill} planChemistry={props.planChemistry} taxCoreRows={props.taxCoreRows} slotDepth={props.slotDepth} resolveLegalFinishLine={props.resolveLegalFinishLine} selectedCandidateId={props.selectedCandidateId} onSelectCandidate={props.onSelectCandidate} isCandidateSelectable={props.isCandidateSelectable} showHelp={props.showHelp ?? false} />
        <div className="mt-4"><WhatIfSandbox candidates={availableWhatIfCandidates} boardSlots={props.boardSlots} whatIf={props.whatIf ?? null} onStart={props.onStartWhatIf} onKeep={props.onKeepWhatIf} onRevert={props.onRevertWhatIf} showHelp={props.showHelp ?? false} /></div>
      </div>}
      {tab === 'RANKINGS' && <div role="region" id="private-desk-panel-rankings" aria-labelledby="private-desk-tab-rankings"><RankingsView candidates={props.candidates} rankings={props.rankings} overallRankings={props.overallRankings} onReorder={props.onReorder} onReorderOverall={props.onReorderOverall} resolveLegalFinishLine={props.resolveLegalFinishLine} selectedCandidateId={props.selectedCandidateId} onSelectCandidate={props.onSelectCandidate} isCandidateSelectable={props.isCandidateSelectable} /></div>}
      {tab === 'LOG' && <div role="region" id="private-desk-panel-log" aria-labelledby="private-desk-tab-log"><AdvisorLog entries={props.advisorLog} /></div>}
      {tab === 'GUIDE' && <div role="region" id="private-desk-panel-guide" aria-labelledby="private-desk-tab-guide">{props.tradeGuide}</div>}
    </section>
  );
}
