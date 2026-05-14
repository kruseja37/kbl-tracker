import { getDefaultManagerIdForTeam } from "../../../utils/managerWpaDerivation";

export interface PregameManagerNavigationInput {
  awayTeamId?: string;
  homeTeamId?: string;
  awayManagerId?: string | null;
  awayManagerName?: string | null;
  homeManagerId?: string | null;
  homeManagerName?: string | null;
}

export type PregameManagerNavigationState<T> = T & {
  awayManagerId?: string;
  awayManagerName?: string;
  homeManagerId?: string;
  homeManagerName?: string;
};

export function withPregameManagerNavigationState<
  T extends { awayTeamId?: string; homeTeamId?: string },
>(
  state: T,
  managers: PregameManagerNavigationInput,
): PregameManagerNavigationState<T> {
  return {
    ...state,
    awayManagerId:
      managers.awayManagerId ||
      (state.awayTeamId ? getDefaultManagerIdForTeam(state.awayTeamId) : undefined),
    awayManagerName: managers.awayManagerName || undefined,
    homeManagerId:
      managers.homeManagerId ||
      (state.homeTeamId ? getDefaultManagerIdForTeam(state.homeTeamId) : undefined),
    homeManagerName: managers.homeManagerName || undefined,
  };
}
