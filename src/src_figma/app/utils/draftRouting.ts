import {
  getLeagueDraftFormat,
  type LeagueTemplate,
} from "../../../utils/leagueBuilderStorage";

export function mlbDraftRouteForFormat(
  format: LeagueTemplate["draftFormat"],
): "/league-builder/snake-draft" | "/league-builder/auction-draft" {
  return getLeagueDraftFormat({ draftFormat: format }) === "snake"
    ? "/league-builder/snake-draft"
    : "/league-builder/auction-draft";
}

export const draftRouteForFormat = mlbDraftRouteForFormat;

export function farmDraftRouteForFormat(
  format: LeagueTemplate["draftFormat"],
): "/league-builder/draft" | "/league-builder/farm-auction-draft" {
  return getLeagueDraftFormat({ draftFormat: format }) === "snake"
    ? "/league-builder/draft"
    : "/league-builder/farm-auction-draft";
}

function withLeagueId(route: string, leagueId: string): string {
  return `${route}?leagueId=${encodeURIComponent(leagueId)}`;
}

export function draftRouteForLeague(league: Pick<LeagueTemplate, "id" | "draftFormat">): string {
  return withLeagueId(mlbDraftRouteForFormat(league.draftFormat), league.id);
}

export function farmDraftRouteForLeague(league: Pick<LeagueTemplate, "id" | "draftFormat">): string {
  return withLeagueId(farmDraftRouteForFormat(league.draftFormat), league.id);
}

export function scoutHireRouteForLeague(league: Pick<LeagueTemplate, "id">): string {
  return withLeagueId("/league-builder/scout-hire", league.id);
}

export function staffHireRouteForLeague(league: Pick<LeagueTemplate, "id">): string {
  return withLeagueId("/league-builder/staff-hire", league.id);
}

export function leagueIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get("leagueId");
}

export function resolveInitialLeagueId(
  leagues: readonly Pick<LeagueTemplate, "id">[],
  requestedLeagueId: string | null,
): string {
  if (requestedLeagueId && leagues.some((league) => league.id === requestedLeagueId)) {
    return requestedLeagueId;
  }
  return leagues[0]?.id ?? "";
}
