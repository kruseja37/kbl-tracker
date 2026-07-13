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
  logScopeId?: string;
  taxCoreRows: readonly TaxCoreRow[];
  slotDepth: Partial<Record<SnakeBoardSlotId, number>>;
  whatIf?: DeskWhatIf | null;
  tradeGuide?: ReactNode;
  showHelp?: boolean;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  onReorderOverall?: (orderedIds: readonly string[]) => void;
  onStartWhatIf: (slotId: SnakeBoardSlotId, playerId: string) => void;
  onKeepWhatIf: () => void;
  onRevertWhatIf: () => void;
}) {
  const [tab, setTab] = useState<DeskTab>('BOARD');
  const [seenByScope, setSeenByScope] = useState<Record<string, string[]>>({});
  const availableWhatIfCandidates = props.candidates.filter((candidate) => !candidate.drafted);
  const logScope = props.logScopeId ?? 'desk';
  const seen = new Set(seenByScope[logScope] ?? []);
  const unseen = props.advisorLog.filter((entry) => !entry.expired && !seen.has(entry.key));
  const latestAdvisor = props.advisorLog.find((entry) => !entry.expired);
  return (
    <section data-testid="private-draft-desk">
      {props.assistantNeed && props.draftedChemistry ? <AssistantGmStatusRow need={props.assistantNeed} chemistry={props.draftedChemistry} showHelp={props.showHelp ?? false} /> : null}
      {latestAdvisor ? <p className="mb-3 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 font-bold uppercase" aria-live="polite">{latestAdvisor.text}</p> : null}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Private draft desk views">
        {(['BOARD', 'RANKINGS', 'LOG', ...(props.tradeGuide ? ['GUIDE' as const] : [])] as const).map((next) => (
          <button
            key={next}
            id={`private-desk-tab-${next.toLowerCase()}`}
            type="button"
            aria-pressed={tab === next}
            aria-controls={`private-desk-panel-${next.toLowerCase()}`}
            className={`ballpark-press-button ballpark-press-sm ${tab === next ? 'ballpark-press-action' : 'ballpark-press-default'}`}
            onClick={() => {
              setTab(next);
              if (next === 'LOG') {
                setSeenByScope((current) => ({ ...current, [logScope]: props.advisorLog.map((entry) => entry.key) }));
              }
            }}
          >{next === 'LOG' && unseen.length > 0 ? `LOG ${unseen.length}` : next}</button>
        ))}
      </div>
      {tab === 'BOARD' && <div role="region" id="private-desk-panel-board" aria-labelledby="private-desk-tab-board">
        <BoardView candidates={props.candidates} boardSlots={props.boardSlots} brokenSlots={props.brokenSlots} planBill={props.planBill} planChemistry={props.planChemistry} taxCoreRows={props.taxCoreRows} slotDepth={props.slotDepth} selectedCandidateId={props.selectedCandidateId} onSelectCandidate={props.onSelectCandidate} showHelp={props.showHelp ?? false} />
        <div className="mt-4"><WhatIfSandbox candidates={availableWhatIfCandidates} boardSlots={props.boardSlots} whatIf={props.whatIf ?? null} onStart={props.onStartWhatIf} onKeep={props.onKeepWhatIf} onRevert={props.onRevertWhatIf} showHelp={props.showHelp ?? false} /></div>
      </div>}
      {tab === 'RANKINGS' && <div role="region" id="private-desk-panel-rankings" aria-labelledby="private-desk-tab-rankings"><RankingsView candidates={props.candidates} rankings={props.rankings} overallRankings={props.overallRankings} onReorder={props.onReorder} onReorderOverall={props.onReorderOverall} selectedCandidateId={props.selectedCandidateId} onSelectCandidate={props.onSelectCandidate} /></div>}
      {tab === 'LOG' && <div role="region" id="private-desk-panel-log" aria-labelledby="private-desk-tab-log"><AdvisorLog entries={props.advisorLog} /></div>}
      {tab === 'GUIDE' && <div role="region" id="private-desk-panel-guide" aria-labelledby="private-desk-tab-guide">{props.tradeGuide}</div>}
    </section>
  );
}
