import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { RankReorderList } from '../../shared/RankReorderList';
import { DeskCandidateCard } from './DeskCandidateCard';
import type { DeskCandidate } from './deskModel';

export function RankingsView(props: {
  candidates: readonly DeskCandidate[];
  rankings: Partial<Record<TaxonomyPosition, string[]>>;
  onReorder: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  resolveLegalFinishLine?: (candidateId: string) => string;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  isCandidateSelectable?: (candidateId: string) => boolean;
}) {
  const byId = new Map(props.candidates.map((candidate) => [candidate.id, candidate]));
  return (
    <div className="space-y-5">
      {Object.entries(props.rankings).map(([position, ids]) => {
        const rows = (ids ?? []).flatMap((id) => byId.get(id) ?? []);
        if (rows.length === 0) return null;
        return (
          <section key={position}>
            <h3 className="mb-2 text-lg font-black">{position} RANKINGS</h3>
            <RankReorderList
              items={rows}
              getId={(candidate) => candidate.id}
              itemLabel={(candidate) => candidate.name}
              onReorder={(orderedIds) => props.onReorder(position as TaxonomyPosition, orderedIds)}
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
              dragHandleClassName="cursor-grab p-1"
              arrowButtonClassName="border-2 px-1 font-bold"
              rankBadgeClassName="border-2 border-[var(--ballpark-brass)] px-2 py-1 font-bold"
              rankInputClassName="w-14 border-2 bg-[var(--ballpark-action-green)] px-1"
              sendToTopClassName="border-2 px-1 text-xs font-bold"
            />
          </section>
        );
      })}
    </div>
  );
}
