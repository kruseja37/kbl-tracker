import type { CompetitionType } from './gameStorage';

export type ModeCompetitionScope = {
  competitionType: CompetitionType;
  competitionId?: string;
  franchiseId?: string;
  eliminationId?: string;
  seasonId?: string;
  seasonNumber?: number;
  statsScopeId?: string;
  playoffId?: string;
};

export function getEliminationStatsScopeId(eliminationId: string): string {
  return `elimination-${eliminationId}`;
}

export function validateModeCompetitionScope(scope: ModeCompetitionScope): string[] {
  const errors: string[] = [];

  if (scope.competitionType === 'exhibition') {
    if (scope.franchiseId) errors.push('exhibition scope must not include franchiseId');
    if (scope.eliminationId) errors.push('exhibition scope must not include eliminationId');
    return errors;
  }

  if (scope.competitionType === 'franchise') {
    if (!scope.franchiseId) errors.push('franchise scope requires franchiseId');
    if (!scope.seasonId) errors.push('franchise scope requires canonical seasonId');
    if (!scope.statsScopeId) errors.push('franchise scope requires statsScopeId');
    if (scope.eliminationId) errors.push('franchise scope must not include eliminationId');
    return errors;
  }

  if (scope.competitionType === 'playoff') {
    if (!scope.franchiseId) errors.push('franchise playoff scope requires franchiseId');
    if (!scope.seasonId) errors.push('franchise playoff scope requires canonical seasonId');
    if (!scope.statsScopeId) errors.push('franchise playoff scope requires statsScopeId');
    if (!scope.playoffId && !scope.competitionId) errors.push('franchise playoff scope requires playoffId');
    if (scope.eliminationId) errors.push('franchise playoff scope must not include eliminationId');
    return errors;
  }

  if (scope.competitionType === 'elimination') {
    const eliminationId = scope.eliminationId ?? scope.competitionId;
    if (!eliminationId) errors.push('elimination scope requires eliminationId');
    if (scope.franchiseId) errors.push('elimination scope must not include franchiseId');
    if (scope.seasonId?.includes('-season-')) {
      errors.push('elimination scope must not include franchise seasonId');
    }
    if (!scope.statsScopeId) {
      errors.push('elimination scope requires statsScopeId');
    } else if (eliminationId && scope.statsScopeId !== getEliminationStatsScopeId(eliminationId)) {
      errors.push('elimination scope requires canonical statsScopeId');
    }
  }

  return errors;
}

export function assertModeCompetitionScope(scope: ModeCompetitionScope): void {
  const errors = validateModeCompetitionScope(scope);
  if (errors.length > 0) {
    throw new Error(`Invalid competition scope: ${errors.join('; ')}`);
  }
}
