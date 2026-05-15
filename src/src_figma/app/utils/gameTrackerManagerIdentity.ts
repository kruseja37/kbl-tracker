import { getDefaultManagerIdForTeam } from "../../../utils/managerWpaDerivation";

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
    awayManagerId:
      input.awayManagerId || getDefaultManagerIdForTeam(input.awayTeamId),
    homeManagerId:
      input.homeManagerId || getDefaultManagerIdForTeam(input.homeTeamId),
  };
}
