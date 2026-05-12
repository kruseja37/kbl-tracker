export interface ManagerNavigationInput {
  awayTeamId: string;
  homeTeamId: string;
  awayManagerId?: string | null;
  homeManagerId?: string | null;
}

export interface ResolvedGameTrackerManagerIds {
  awayManagerId: string;
  homeManagerId: string;
}

export function resolveGameTrackerManagerIds(
  input: ManagerNavigationInput,
): ResolvedGameTrackerManagerIds {
  return {
    awayManagerId: input.awayManagerId || `${input.awayTeamId}-manager`,
    homeManagerId: input.homeManagerId || `${input.homeTeamId}-manager`,
  };
}
