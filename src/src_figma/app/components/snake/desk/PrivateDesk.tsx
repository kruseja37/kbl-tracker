import { useState, type ReactNode } from 'react';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import type { SnakeBoardSlotId } from '../../../../../utils/leagueBuilderStorage';
import { AdvisorLog } from './AdvisorLog';
import { BoardView } from './BoardView';
import { RankingsView } from './RankingsView';
import { WhatIfSandbox, type DeskWhatIf } from './WhatIfSandbox';
import type { AdvisorLogEntry, DeskCandidate, TaxCoreRow } from './deskModel';

type DeskTab = 'BOARD' | 'RANKINGS' | 'LOG' | 'GUIDE';

export function PrivateDesk(props: {
  candidates: readonly DeskCandidate[];
  rankings: Partial<Record<TaxonomyPosition, string[]>>;
  boardSlots: Partial<Record<SnakeBoardSlotId, string>>;
  brokenSlots: readonly SnakeBoardSlotId[];
  planBill: SnakePlanBill | null;
  advisorLog: readonly AdvisorLogEntry[];
  taxCoreRows: readonly TaxCoreRow[];
  slotDepth: Partial<Record<SnakeBoardSlotId, number>>;
  whatIf?: DeskWhatIf | null;
  tradeGuide?: ReactNode;
  showHelp?: boolean;
  resolveLegalFinishLine?: (candidateId: string) => string;
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  onStartWhatIf: (slotId: SnakeBoardSlotId, playerId: string) => void;
  onKeepWhatIf: () => void;
  onRevertWhatIf: () => void;
}) {
  const [tab, setTab] = useState<DeskTab>('BOARD');
  return (
    <section data-testid="private-draft-desk">
      <div className="mb-3 flex flex-wrap gap-2">
        {(['BOARD', 'RANKINGS', 'LOG', ...(props.tradeGuide ? ['GUIDE' as const] : [])] as const).map((next) => (
          <button key={next} className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={() => setTab(next)}>{next}</button>
        ))}
      </div>
      {tab === 'BOARD' && <>
        <BoardView candidates={props.candidates} boardSlots={props.boardSlots} brokenSlots={props.brokenSlots} planBill={props.planBill} taxCoreRows={props.taxCoreRows} slotDepth={props.slotDepth} resolveLegalFinishLine={props.resolveLegalFinishLine} showHelp={props.showHelp ?? false} />
        <div className="mt-4"><WhatIfSandbox candidates={props.candidates} boardSlots={props.boardSlots} whatIf={props.whatIf ?? null} onStart={props.onStartWhatIf} onKeep={props.onKeepWhatIf} onRevert={props.onRevertWhatIf} showHelp={props.showHelp ?? false} /></div>
      </>}
      {tab === 'RANKINGS' && <RankingsView candidates={props.candidates} rankings={props.rankings} onReorder={props.onReorder} resolveLegalFinishLine={props.resolveLegalFinishLine} />}
      {tab === 'LOG' && <AdvisorLog entries={props.advisorLog} />}
      {tab === 'GUIDE' && props.tradeGuide}
    </section>
  );
}
