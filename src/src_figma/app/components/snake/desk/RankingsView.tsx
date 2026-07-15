import { useState } from 'react';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { RankReorderList } from '../../shared/RankReorderList';
import { DeskCandidateRow } from './DeskCandidateRow';
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
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
}) {
  const byId = new Map(props.candidates.map((candidate) => [candidate.id, candidate]));
  const positionButtons = POSITION_ORDER.filter((position) => (props.rankings[position]?.length ?? 0) > 0);
  const [view, setView] = useState<SnakeRankingView>(() => (
    props.overallRankings ? 'OVERALL' : positionButtons[0] ?? 'OVERALL'
  ));
  const [query, setQuery] = useState('');
  const ids = view === 'OVERALL'
    ? props.overallRankings ?? []
    : props.rankings[view] ?? [];
  const rankedIds = ids.filter((id) => byId.has(id));
  const availableIds = rankedIds.filter((id) => !byId.get(id)?.drafted);
  const rows = availableIds.flatMap((id) => byId.get(id) ?? []);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingRows = normalizedQuery
    ? rows.filter((candidate) => [
        candidate.name,
        candidate.position,
        ...(candidate.identityChips ?? []),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)))
    : rows;
  const persistOrder = (orderedAvailableIds: readonly string[]) => {
    let availableIndex = 0;
    const completeOrder = rankedIds.map((id) => (
      byId.get(id)?.drafted ? id : orderedAvailableIds[availableIndex++]
    )).filter((id): id is string => Boolean(id));
    return view === 'OVERALL'
      ? props.onReorderOverall?.(completeOrder)
      : props.onReorder(view, completeOrder);
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Ranking view">
        {([...(props.overallRankings ? ['OVERALL' as const] : []), ...positionButtons] as const).map((next) => (
          <button
            key={next}
            type="button"
            aria-pressed={view === next}
            className={`ballpark-press-button ballpark-press-sm min-h-11 min-w-11 ${view === next ? 'ballpark-press-action' : 'ballpark-press-default'}`}
            onClick={() => setView(next)}
          >
            {next}
          </button>
        ))}
      </div>
      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-lg font-black">{view} RANKINGS</h3>
          <label className="text-[10px] font-black">FIND PLAYER
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-1 block min-h-11 w-52 border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-2 text-sm"
            />
          </label>
        </div>
        {normalizedQuery ? <div className="space-y-1.5" aria-label={`${view} ranking search results`}>
          {matchingRows.map((candidate) => {
            const rank = availableIds.indexOf(candidate.id) + 1;
            return <div key={candidate.id} className="grid grid-cols-[1fr_auto] gap-2 border-4 p-2">
              <DeskCandidateRow
                candidate={candidate}
                prefix={`#${rank}`}
                selected={props.selectedCandidateId === candidate.id}
                onSelect={props.onSelectCandidate}
              />
              <button
                type="button"
                className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11 min-w-11"
                disabled={rank === 1}
                aria-label={`Send ${candidate.name} to top`}
                onClick={() => persistOrder([candidate.id, ...availableIds.filter((id) => id !== candidate.id)])}
              >TOP</button>
            </div>;
          })}
          {matchingRows.length === 0 ? <p className="border-2 border-[var(--ballpark-panel-border)] p-3 font-black">NO MATCHES</p> : null}
        </div> : <RankReorderList
          items={matchingRows}
          getId={(candidate) => candidate.id}
          itemLabel={(candidate) => candidate.name}
          onReorder={persistOrder}
          renderContent={(candidate) => <DeskCandidateRow
            candidate={candidate}
            selected={props.selectedCandidateId === candidate.id}
            onSelect={props.onSelectCandidate}
          />}
          rowClassName={(_candidate, _index, dragged) => `grid grid-cols-[1fr_auto] gap-2 border-4 p-2 ${dragged ? 'opacity-60' : ''}`}
          leftWrapClassName="flex min-w-0 items-start gap-2"
          rightWrapClassName="flex items-center gap-1"
          dragHandleClassName="min-h-11 min-w-11 cursor-grab touch-none p-2"
          arrowButtonClassName="min-h-11 min-w-11 border-2 px-2 font-bold"
          rankBadgeClassName="min-h-11 min-w-11 border-2 border-[var(--ballpark-brass)] px-2 py-1 font-bold"
          rankInputClassName="min-h-11 w-16 border-2 bg-[var(--ballpark-action-green)] px-2"
          sendToTopClassName="min-h-11 min-w-11 border-2 px-2 text-xs font-bold"
        />}
      </section>
    </div>
  );
}
