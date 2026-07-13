import { useState } from 'react';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { RankReorderList } from '../../shared/RankReorderList';
import { DeskCandidateCard } from './DeskCandidateCard';
import type { DeskCandidate } from './deskModel';

export type SnakeRankingView = 'OVERALL' | TaxonomyPosition;

const POSITION_ORDER: readonly TaxonomyPosition[] = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP',
];

export function RankingsView(props: {
  candidates: readonly DeskCandidate[];
  rankings: Partial<Record<TaxonomyPosition, string[]>>;
  overallRankings?: readonly string[];
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  onReorderOverall?: (orderedIds: readonly string[]) => void;
  resolveLegalFinishLine?: (candidateId: string) => string;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  isCandidateSelectable?: (candidateId: string) => boolean;
}) {
  const byId = new Map(props.candidates.map((candidate) => [candidate.id, candidate]));
  const positionButtons = POSITION_ORDER.filter((position) => (props.rankings[position]?.length ?? 0) > 0);
  const [view, setView] = useState<SnakeRankingView>(() => (
    props.overallRankings ? 'OVERALL' : positionButtons[0] ?? 'OVERALL'
  ));
  const ids = view === 'OVERALL'
    ? props.overallRankings ?? []
    : props.rankings[view] ?? [];
  const rows = ids.flatMap((id) => byId.get(id) ?? []);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Ranking view">
        {([...(props.overallRankings ? ['OVERALL' as const] : []), ...positionButtons] as const).map((next) => (
          <button
            key={next}
            type="button"
            aria-pressed={view === next}
            className={`ballpark-press-button ballpark-press-sm ${view === next ? 'ballpark-press-action' : 'ballpark-press-default'}`}
            onClick={() => setView(next)}
          >
            {next}
          </button>
        ))}
      </div>
      <section>
        <h3 className="mb-2 text-lg font-black">{view} RANKINGS</h3>
        <RankReorderList
          items={rows}
          getId={(candidate) => candidate.id}
          itemLabel={(candidate) => candidate.name}
          onReorder={(orderedIds) => view === 'OVERALL'
            ? props.onReorderOverall?.(orderedIds)
            : props.onReorder(view, orderedIds)}
          renderContent={(candidate) => <DeskCandidateCard
            candidate={candidate}
            legalFinishLine={props.resolveLegalFinishLine?.(candidate.id)}
            selected={props.selectedCandidateId === candidate.id}
            selectable={props.isCandidateSelectable?.(candidate.id) ?? true}
            onSelect={props.onSelectCandidate}
          />}
          rowClassName={(_candidate, _index, dragged) => `grid grid-cols-[1fr_auto] gap-2 border-4 p-2 ${dragged ? 'opacity-60' : ''}`}
          leftWrapClassName="flex min-w-0 items-start gap-2"
          rightWrapClassName="flex items-center gap-1"
          dragHandleClassName="min-h-11 min-w-11 cursor-grab touch-none p-2"
          arrowButtonClassName="min-h-11 min-w-11 border-2 px-2 font-bold"
          rankBadgeClassName="border-2 border-[var(--ballpark-brass)] px-2 py-1 font-bold"
          rankInputClassName="min-h-11 w-16 border-2 bg-[var(--ballpark-action-green)] px-2"
          sendToTopClassName="min-h-11 border-2 px-2 text-xs font-bold"
        />
      </section>
    </div>
  );
}
