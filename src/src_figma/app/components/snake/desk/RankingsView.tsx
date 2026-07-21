import { useEffect, useMemo, useState } from 'react';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { RankReorderList } from '../../shared/RankReorderList';
import { moveRankedId } from '../../shared/RankReorderList';
import { DeskCandidateRow } from './DeskCandidateRow';
import type { DeskCandidate } from './deskModel';

export type SnakeRankingView = 'OVERALL' | TaxonomyPosition;
type SnakeRankingSort = 'BOARD' | 'FIT' | 'IV' | 'TAX' | 'TRUE_COST'
  | 'POW' | 'CON' | 'SPD' | 'FLD' | 'ARM' | 'VEL' | 'JNK' | 'ACC';
type SnakeFitFilter = 'ALL' | 'STRONG' | 'SOLID' | 'WEAK';
type SnakeFinishFilter = 'ALL' | 'DRAFTABLE';

const SORT_OPTIONS: ReadonlyArray<{ id: SnakeRankingSort; label: string }> = [
  { id: 'BOARD', label: 'BOARD' },
  { id: 'FIT', label: 'FIT' },
  { id: 'IV', label: 'IV' },
  { id: 'TAX', label: 'TAX IF PICKED' },
  { id: 'TRUE_COST', label: 'TRUE COST' },
  { id: 'POW', label: 'POW' }, { id: 'CON', label: 'CON' }, { id: 'SPD', label: 'SPD' },
  { id: 'FLD', label: 'FLD' }, { id: 'ARM', label: 'ARM' }, { id: 'VEL', label: 'VEL' },
  { id: 'JNK', label: 'JNK' }, { id: 'ACC', label: 'ACC' },
];

function defaultDirection(sort: SnakeRankingSort): 'ASC' | 'DESC' {
  return sort === 'TAX' || sort === 'TRUE_COST' || sort === 'BOARD' ? 'ASC' : 'DESC';
}

function fitScore(candidate: DeskCandidate): number {
  const value = candidate.fitWord.toUpperCase();
  if (value.includes('STRONG')) return 3;
  if (value.includes('SOLID')) return 2;
  if (value.includes('WEAK')) return 1;
  return 0;
}

function sortValue(candidate: DeskCandidate, sort: SnakeRankingSort): number | null {
  switch (sort) {
    case 'FIT': return fitScore(candidate);
    case 'IV': return candidate.iv;
    case 'TAX': return candidate.marginalTax;
    case 'TRUE_COST': return candidate.trueCost;
    case 'POW': case 'CON': case 'SPD': case 'FLD': case 'ARM':
      return candidate.construction.bat[sort];
    case 'VEL': case 'JNK': case 'ACC':
      return candidate.construction.pit?.[sort] ?? null;
    case 'BOARD': return null;
  }
}

function metricPrefix(candidate: DeskCandidate, sort: SnakeRankingSort, boardRank: number): string {
  if (sort === 'BOARD') return `BOARD #${boardRank}`;
  if (sort === 'FIT') return `${candidate.fitWord} · BOARD #${boardRank}`;
  const value = sortValue(candidate, sort);
  if (sort === 'IV' || sort === 'TRUE_COST') {
    return `${sort === 'IV' ? 'IV' : 'TRUE COST'} ${value === null ? '—' : `$${Math.round(value).toLocaleString()}`} · BOARD #${boardRank}`;
  }
  if (sort === 'TAX') {
    const tax = value ?? 0;
    return `TAX ${tax > 0 ? '+' : tax < 0 ? '−' : ''}$${Math.round(Math.abs(tax)).toLocaleString()} · BOARD #${boardRank}`;
  }
  return `${sort} ${value ?? '—'} · BOARD #${boardRank}`;
}

const POSITION_ORDER: readonly TaxonomyPosition[] = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP',
];
const RANKING_PAGE_SIZE = 20;

export function RankingsView(props: {
  candidates: readonly DeskCandidate[];
  rankings: Partial<Record<TaxonomyPosition, string[]>>;
  overallRankings?: readonly string[];
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  onReorderOverall?: (orderedIds: readonly string[]) => void;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
}) {
  const byId = useMemo(() => new Map(props.candidates.map((candidate) => [candidate.id, candidate])), [props.candidates]);
  const positionButtons = useMemo(() => POSITION_ORDER.filter((position) => (
    props.rankings[position]?.length ?? 0
  ) > 0), [props.rankings]);
  const [view, setView] = useState<SnakeRankingView>(() => (
    props.overallRankings ? 'OVERALL' : positionButtons[0] ?? 'OVERALL'
  ));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SnakeRankingSort>('BOARD');
  const [direction, setDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [fitFilter, setFitFilter] = useState<SnakeFitFilter>('ALL');
  const [finishFilter, setFinishFilter] = useState<SnakeFinishFilter>('ALL');
  const [page, setPage] = useState(0);
  const rankedIds = useMemo(() => (view === 'OVERALL'
    ? props.overallRankings ?? []
    : props.rankings[view] ?? []).filter((id) => byId.has(id)), [byId, props.overallRankings, props.rankings, view]);
  const availableIds = useMemo(() => rankedIds.filter((id) => !byId.get(id)?.drafted), [byId, rankedIds]);
  const boardRankById = useMemo(() => new Map(
    availableIds.map((id, index) => [id, index + 1]),
  ), [availableIds]);
  const rows = useMemo(() => availableIds.flatMap((id) => byId.get(id) ?? []), [availableIds, byId]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingRows = useMemo(() => {
    const filtered = rows.filter((candidate) => (fitFilter === 'ALL'
      || candidate.fitWord.toUpperCase().includes(fitFilter)) && (!normalizedQuery || [
        candidate.name,
        candidate.position,
        ...(candidate.identityChips ?? []),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)))
      && (finishFilter === 'ALL' || candidate.finishStatus === 'DRAFTABLE'));
    if (sort === 'BOARD') return filtered;
    const boardOrder = new Map(availableIds.map((id, index) => [id, index]));
    return [...filtered].sort((left, right) => {
      const leftValue = sortValue(left, sort);
      const rightValue = sortValue(right, sort);
      if (leftValue === null && rightValue !== null) return 1;
      if (leftValue !== null && rightValue === null) return -1;
      const metric = (leftValue ?? 0) - (rightValue ?? 0);
      if (metric !== 0) return direction === 'ASC' ? metric : -metric;
      return (boardOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER)
        - (boardOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
        || left.id.localeCompare(right.id);
    });
  }, [availableIds, direction, finishFilter, fitFilter, normalizedQuery, rows, sort]);
  const pageCount = Math.max(1, Math.ceil(matchingRows.length / RANKING_PAGE_SIZE));
  useEffect(() => {
    if (page >= pageCount) setPage(pageCount - 1);
  }, [page, pageCount]);
  const pageStart = Math.min(page, pageCount - 1) * RANKING_PAGE_SIZE;
  const visibleRows = matchingRows.slice(pageStart, pageStart + RANKING_PAGE_SIZE);
  const changePage = (next: number) => setPage(Math.max(0, Math.min(next, pageCount - 1)));
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
            onClick={() => { setView(next); setPage(0); }}
          >
            {next}
          </button>
        ))}
      </div>
      <section>
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <h3 className="text-lg font-black">{view} RANKINGS</h3>
          <label className="text-[10px] font-black">SORT
            <select
              aria-label="Sort players"
              value={sort}
              onChange={(event) => {
                const next = event.target.value as SnakeRankingSort;
                setSort(next);
                setDirection(defaultDirection(next));
                setPage(0);
              }}
              className="mt-1 block min-h-11 border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-2 text-xs"
            >
              {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11 min-w-11"
            aria-label={`Sort ${direction === 'ASC' ? 'ascending' : 'descending'}`}
            disabled={sort === 'BOARD'}
            onClick={() => { setDirection((current) => current === 'ASC' ? 'DESC' : 'ASC'); setPage(0); }}
          >{direction === 'ASC' ? '↑' : '↓'}</button>
          <label className="text-[10px] font-black">FIT
            <select
              aria-label="Filter by fit"
              value={fitFilter}
              onChange={(event) => { setFitFilter(event.target.value as SnakeFitFilter); setPage(0); }}
              className="mt-1 block min-h-11 border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-2 text-xs"
            >
              {(['ALL', 'STRONG', 'SOLID', 'WEAK'] as const).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-black">FINISH
            <select
              aria-label="Filter by finish safety"
              value={finishFilter}
              onChange={(event) => { setFinishFilter(event.target.value as SnakeFinishFilter); setPage(0); }}
              className="mt-1 block min-h-11 border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-2 text-xs"
            >
              <option value="ALL">ALL</option>
              <option value="DRAFTABLE">DRAFTABLE</option>
            </select>
          </label>
          <label className="text-[10px] font-black">FIND PLAYER
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(0); }}
              className="mt-1 block min-h-11 w-52 border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-2 text-sm"
            />
          </label>
        </div>
        {matchingRows.length > RANKING_PAGE_SIZE ? <nav className="mb-2 flex items-center gap-2" aria-label={`${view} ranking pages`}>
          <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" disabled={pageStart === 0} onClick={() => changePage(page - 1)}>PREV</button>
          <span className="font-black">{pageStart + 1}–{Math.min(pageStart + RANKING_PAGE_SIZE, matchingRows.length)} / {matchingRows.length}</span>
          <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" disabled={pageStart + RANKING_PAGE_SIZE >= matchingRows.length} onClick={() => changePage(page + 1)}>NEXT</button>
        </nav> : null}
        {normalizedQuery || sort !== 'BOARD' || fitFilter !== 'ALL' || finishFilter !== 'ALL' ? <div className="space-y-1.5" aria-label={`${view} ranking results`}>
          {visibleRows.map((candidate) => {
            const rank = boardRankById.get(candidate.id) ?? 0;
            return <div
              key={candidate.id}
              className="grid grid-cols-[1fr_auto] gap-2 border-4 p-2"
              style={{ contentVisibility: 'auto', containIntrinsicSize: '64px' }}
            >
              <DeskCandidateRow
                candidate={candidate}
                prefix={metricPrefix(candidate, sort, rank)}
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
          items={visibleRows}
          getId={(candidate) => candidate.id}
          itemLabel={(candidate) => candidate.name}
          onReorder={persistOrder}
          onMove={(fromIndex, toIndex) => persistOrder(moveRankedId(matchingRows, (candidate) => candidate.id, fromIndex, toIndex))}
          rankOffset={pageStart}
          totalItemCount={matchingRows.length}
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
