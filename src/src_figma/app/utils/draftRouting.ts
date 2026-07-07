import type { LeagueTemplate } from "../../../utils/leagueBuilderStorage";

export function mlbDraftRouteForFormat(
  _format: LeagueTemplate["draftFormat"],
): "/league-builder/auction-draft" {
  return "/league-builder/auction-draft";
}

export const draftRouteForFormat = mlbDraftRouteForFormat;

export function farmDraftRouteForFormat(
  _format: LeagueTemplate["draftFormat"],
): "/league-builder/farm-auction-draft" {
  return "/league-builder/farm-auction-draft";
}

type DraftRouteOptions = {
  shillCount?: number | null;
};

export const MAX_DRAFT_SHILL_COUNT = 12;

export function clampDraftShillCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_DRAFT_SHILL_COUNT, Math.max(0, Math.floor(value)));
}

function withLeagueId(route: string, leagueId: string, options: DraftRouteOptions = {}): string {
  const params = new URLSearchParams({ leagueId });
  if (options.shillCount !== null && options.shillCount !== undefined && Number.isFinite(options.shillCount)) {
    params.set("shills", String(clampDraftShillCount(options.shillCount)));
  }
  return `${route}?${params.toString()}`;
}

export function draftRouteForLeague(league: Pick<LeagueTemplate, "id" | "draftFormat">, options?: DraftRouteOptions): string {
  return withLeagueId(mlbDraftRouteForFormat(league.draftFormat), league.id, options);
}

export function farmDraftRouteForLeague(league: Pick<LeagueTemplate, "id" | "draftFormat">): string {
  return withLeagueId(farmDraftRouteForFormat(league.draftFormat), league.id);
}

export function scoutHireRouteForLeague(league: Pick<LeagueTemplate, "id">, options?: DraftRouteOptions): string {
  return withLeagueId("/league-builder/scout-hire", league.id, options);
}

export function staffHireRouteForLeague(league: Pick<LeagueTemplate, "id">): string {
  return withLeagueId("/league-builder/staff-hire", league.id);
}

export function leagueIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get("leagueId");
}

export function shillCountFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get("shills");
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? clampDraftShillCount(parsed) : null;
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
