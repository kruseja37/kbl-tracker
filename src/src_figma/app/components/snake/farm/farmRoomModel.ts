import type {
  FarmSeatBoardRecord,
  Grade,
  LeagueBuilderMlbDraftSession,
} from '../../../../../utils/leagueBuilderStorage';
import {
  scoutProspect,
  type LeagueBuilderProspectPlayerDto,
  type ProspectScoutDescriptor,
} from '../../../../../utils/prospectScoutingDraftEngine';

const GRADES: Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];

export interface FarmFogCardModel {
  id: string;
  name: string;
  position: string;
  scoutedGrade: Grade;
  gradeRange: string;
  confidence: 'low' | 'medium' | 'high';
  scoutName: string;
  scoutsCall: string;
  eligiblePositions: string[];
}

export interface FarmBoardCandidate {
  id: string;
  eligiblePositions: readonly string[];
}

function expandFarmPosition(position: string | null | undefined): string[] {
  if (!position) return [];
  if (position === 'IF' || position === 'INF') return ['1B', '2B', 'SS', '3B'];
  if (position === 'OF') return ['LF', 'CF', 'RF'];
  if (position === 'P') return ['SP', 'SP/RP', 'RP', 'CP'];
  if (position === 'SP/RP') return ['SP/RP', 'SP', 'RP'];
  if (position.includes('/')) return [position, ...position.split('/').flatMap(expandFarmPosition)];
  return [position];
}

/** Public positional eligibility only; no scouting or rating input. */
export function canonicalFarmEligiblePositions(primary: string, secondary?: string | null): string[] {
  return [...new Set([...expandFarmPosition(primary), ...expandFarmPosition(secondary)])];
}

function availablePlan(overall: readonly string[], unavailable: ReadonlySet<string>, remainingTurns: number): string[] {
  return overall.filter((id) => !unavailable.has(id)).slice(0, Math.max(0, remainingTurns));
}

export function seedFarmSeatBoard(input: {
  candidates: readonly FarmBoardCandidate[];
  rankedIds: readonly string[];
  remainingTurns: number;
}): FarmSeatBoardRecord {
  const candidateById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const overall = [...new Set(input.rankedIds)].filter((id) => candidateById.has(id));
  const missing = input.candidates.map((candidate) => candidate.id).filter((id) => !overall.includes(id)).sort();
  overall.push(...missing);
  const positions = [...new Set(input.candidates.flatMap((candidate) => candidate.eligiblePositions))].sort();
  const byPosition = Object.fromEntries(positions.map((position) => [position, overall.filter((id) => (
    candidateById.get(id)?.eligiblePositions.includes(position)
  ))]));
  return {
    overall,
    byPosition,
    frozenProspectIds: [],
    plannedProspectIds: availablePlan(overall, new Set(), input.remainingTurns),
    revision: 0,
  };
}

function mergePositionOrder(overall: readonly string[], positionIds: readonly string[]): string[] {
  const relevant = new Set(positionIds);
  let cursor = 0;
  return overall.map((id) => relevant.has(id) ? positionIds[cursor++] ?? id : id);
}

export function reorderFarmBoard(input: {
  board: FarmSeatBoardRecord;
  view: 'OVERALL' | string;
  orderedIds: readonly string[];
  candidates: readonly FarmBoardCandidate[];
  remainingTurns: number;
  unavailableProspectIds?: ReadonlySet<string>;
}): FarmSeatBoardRecord {
  const candidateById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const currentIds = input.view === 'OVERALL'
    ? input.board.overall
    : input.board.byPosition[input.view] ?? [];
  const accepted = [...new Set(input.orderedIds)].filter((id) => currentIds.includes(id));
  const ordered = [...accepted, ...currentIds.filter((id) => !accepted.includes(id))];
  const overall = input.view === 'OVERALL'
    ? [...ordered, ...input.board.overall.filter((id) => !ordered.includes(id))]
    : mergePositionOrder(input.board.overall, ordered);
  const byPosition = input.view === 'OVERALL'
    ? Object.fromEntries(Object.keys(input.board.byPosition).map((position) => [position, overall.filter((id) => (
        candidateById.get(id)?.eligiblePositions.includes(position)
      ))]))
    : { ...input.board.byPosition, [input.view]: ordered };
  return {
    ...input.board,
    overall,
    byPosition,
    frozenProspectIds: [...new Set([...input.board.frozenProspectIds, ...ordered])],
    plannedProspectIds: availablePlan(overall, input.unavailableProspectIds ?? new Set(), input.remainingTurns),
    revision: input.board.revision + 1,
  };
}

export function reconcileFarmSeatBoards(input: {
  session: LeagueBuilderMlbDraftSession;
  unavailableProspectIds: ReadonlySet<string>;
  remainingTurnsByTeamId: Readonly<Record<string, number>>;
}): { session: LeagueBuilderMlbDraftSession; changed: boolean } {
  if (!input.session.farmSeatBoards) return { session: input.session, changed: false };
  let changed = false;
  const nextBoards = Object.fromEntries(Object.entries(input.session.farmSeatBoards).map(([teamId, board]) => {
    const plannedProspectIds = availablePlan(
      board.overall,
      input.unavailableProspectIds,
      input.remainingTurnsByTeamId[teamId] ?? 0,
    );
    if (plannedProspectIds.join('\0') === board.plannedProspectIds.join('\0')) return [teamId, board];
    changed = true;
    return [teamId, { ...board, plannedProspectIds }];
  }));
  return changed ? {
    changed: true,
    session: {
      ...input.session,
      farmSeatBoards: nextBoards,
      revision: (input.session.revision ?? 0) + 1,
    },
  } : { session: input.session, changed: false };
}

function gradeRange(grade: Grade, confidence: FarmFogCardModel['confidence']): string {
  const center = Math.max(0, GRADES.indexOf(grade));
  const width = confidence === 'high' ? 1 : confidence === 'medium' ? 2 : 3;
  const best = GRADES[Math.max(0, center - width)];
  const worst = GRADES[Math.min(GRADES.length - 1, center + width)];
  return `${best}–${worst}`;
}

/** Builds only the club's own saved scouting snapshot; true ratings never leave this function. */
export function buildFarmFogCard(input: {
  prospect: LeagueBuilderProspectPlayerDto;
  scout: ProspectScoutDescriptor | undefined;
  seed: string;
}): FarmFogCardModel {
  const report = scoutProspect({
    candidateId: input.prospect.id,
    position: input.prospect.primaryPosition,
    trueGrade: input.prospect.prospectProfile.trueGrade,
  }, input.scout, input.seed);
  return {
    id: input.prospect.id,
    name: `${input.prospect.firstName} ${input.prospect.lastName}`.trim(),
    position: input.prospect.primaryPosition,
    scoutedGrade: report.scoutedGrade,
    gradeRange: gradeRange(report.scoutedGrade, report.scoutConfidence),
    confidence: report.scoutConfidence,
    scoutName: report.scout.scoutName ?? 'YOUR SCOUT',
    scoutsCall: report.scoutedGrade.startsWith('A') || report.scoutedGrade.startsWith('B')
      ? 'SCOUT’S CALL — KEEP THIS PLAYER NEAR THE TOP OF YOUR LIST.'
      : 'SCOUT’S CALL — KNOW THE RISK BEFORE YOU USE THIS PICK.',
    eligiblePositions: canonicalFarmEligiblePositions(input.prospect.primaryPosition, input.prospect.secondaryPosition),
  };
}

/** Farm board order is scout-visible only; stable id tie-break keeps it deterministic. */
export function rankFarmFogCards(cards: readonly FarmFogCardModel[]): FarmFogCardModel[] {
  return [...cards].sort((left, right) => (
    GRADES.indexOf(left.scoutedGrade) - GRADES.indexOf(right.scoutedGrade)
    || left.id.localeCompare(right.id)
  ));
}

function role(position: string): 'ARMS' | 'BATS' {
  return ['SP', 'RP', 'CP', 'SP/RP', 'P'].includes(position) ? 'ARMS' : 'BATS';
}

/** Public need count plus one named-player read from this seat's own card. */
export function buildFarmScoutPressure(input: {
  card: FarmFogCardModel;
  publicRosters: Readonly<Record<string, readonly { position: string }[]>>;
  farmTarget: number;
}): string {
  const targetRole = role(input.card.position);
  const clubsStillNeedingRole = Object.values(input.publicRosters).filter((roster) => (
    roster.length < input.farmTarget && !roster.some((player) => role(player.position) === targetRole)
  )).length;
  return `YOUR SCOUT LIKES ${input.card.name.toUpperCase()} — ${clubsStillNeedingRole} ${clubsStillNeedingRole === 1 ? 'CLUB STILL NEEDS' : 'CLUBS STILL NEED'} ${targetRole}.`;
}
