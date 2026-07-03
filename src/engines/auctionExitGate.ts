import { LEGAL_ROSTER, isLegalRoster } from '../data/rosterConstruction';
import {
  teamRosterNeed,
  type RosterNeedBreakdown,
  type RosterPositionMap,
} from './rosterNeed';

export interface ExitClubInput {
  teamId: string;
  rosterIds: readonly string[];
}

export interface ExitClubVerdict {
  teamId: string;
  rosterCount: number;
  target: number;
  known: boolean;
  legal: boolean;
  need: RosterNeedBreakdown | null;
  blockers: string[];
}

export interface AuctionExitReport {
  clubs: ExitClubVerdict[];
  allLegal: boolean;
  blockedCount: number;
}

function plural(value: number, singular: string, pluralValue = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function pluralPossessive(value: number, singular: string, pluralValue = `${singular}s`): string {
  return value === 1 ? `${plural(value, singular)}'s` : `${plural(value, singular, pluralValue)}'`;
}

function missingPositionCount(rosterIds: readonly string[], positions: RosterPositionMap): number {
  let count = 0;
  for (const playerId of rosterIds) {
    if (!positions[playerId]) count += 1;
  }
  return count;
}

function resolvedShapes(rosterIds: readonly string[], positions: RosterPositionMap) {
  return rosterIds.map((playerId) => positions[playerId]);
}

function classNeedsAfterSwingAllocation(need: RosterNeedBreakdown): { rotationNeed: number; bullpenNeed: number } {
  const swingCredits = Math.max(0, need.rotationDeficit + need.bullpenDeficit - need.pitcherNeed);
  const rotationNeed = Math.max(0, need.rotationDeficit - swingCredits);
  const remainingSwingCredits = Math.max(0, swingCredits - need.rotationDeficit);
  const bullpenNeed = Math.max(0, need.bullpenDeficit - remainingSwingCredits);
  return { rotationNeed, bullpenNeed };
}

export function describeRosterLawGaps(
  rosterCount: number,
  need: RosterNeedBreakdown,
): string[] {
  const blockers: string[] = [];
  if (rosterCount < LEGAL_ROSTER.size) {
    blockers.push(`Short ${plural(LEGAL_ROSTER.size - rosterCount, 'body', 'bodies')} — ${rosterCount} of ${LEGAL_ROSTER.size}.`);
  } else if (rosterCount > LEGAL_ROSTER.size) {
    blockers.push(`Over ${LEGAL_ROSTER.size} — ${rosterCount} rostered.`);
  }

  if (need.missingPrimaries.length > 0) {
    blockers.push(`Still needs a starting ${need.missingPrimaries.join(', ')}.`);
  }
  if (need.catcherCoverNeed > 0) {
    blockers.push('Needs a second catcher — a backup C or a Two Way (C) arm.');
  }

  const { rotationNeed, bullpenNeed } = classNeedsAfterSwingAllocation(need);
  if (rotationNeed > 0) blockers.push(`Needs ${plural(rotationNeed, 'more starter')}.`);
  if (bullpenNeed > 0) blockers.push(`Needs ${plural(bullpenNeed, 'more reliever')}.`);
  if (need.hitterFloorNeed > 0) blockers.push(`Needs ${plural(need.hitterFloorNeed, 'more position player')}.`);
  if (need.pitcherFloorNeed > 0) blockers.push(`Needs ${plural(need.pitcherFloorNeed, 'more pitcher')}.`);

  return blockers;
}

export function buildAuctionExitReport(
  clubs: readonly ExitClubInput[],
  positions: RosterPositionMap,
): AuctionExitReport {
  const verdicts: ExitClubVerdict[] = clubs.map((club) => {
    const unresolved = missingPositionCount(club.rosterIds, positions);
    const known = unresolved === 0;
    if (!known) {
      return {
        teamId: club.teamId,
        rosterCount: club.rosterIds.length,
        target: LEGAL_ROSTER.size,
        known: false,
        legal: false,
        need: null,
        blockers: [
          `Can't read ${pluralPossessive(unresolved, 'player')} positions — legality can't be verified.`,
        ],
      };
    }

    const shapes = resolvedShapes(club.rosterIds, positions);
    const need = teamRosterNeed(club.rosterIds, positions);
    const legal = Boolean(
      need &&
      club.rosterIds.length === LEGAL_ROSTER.size &&
      isLegalRoster(shapes),
    );
    return {
      teamId: club.teamId,
      rosterCount: club.rosterIds.length,
      target: LEGAL_ROSTER.size,
      known: true,
      legal,
      need,
      blockers: legal || !need ? [] : describeRosterLawGaps(club.rosterIds.length, need),
    };
  });

  const blockedCount = verdicts.filter((club) => !club.legal).length;
  return {
    clubs: verdicts,
    allLegal: verdicts.every((club) => club.legal),
    blockedCount,
  };
}
