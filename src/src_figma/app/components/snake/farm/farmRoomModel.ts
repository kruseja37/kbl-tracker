import type { Grade } from '../../../../../utils/leagueBuilderStorage';
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
