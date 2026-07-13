import type { LeagueTemplate } from "../../../utils/leagueBuilderStorage";
import {
  DEFAULT_RESERVE_PRICE_K,
  normalizeReservePriceK,
  type ReservePriceK,
} from "../../../engines/auctionReservePrice";

export function mlbDraftRouteForFormat(
  format: LeagueTemplate["draftFormat"],
): "/league-builder/auction-draft" | "/snake-room" {
  return format === "snake" ? "/snake-room" : "/league-builder/auction-draft";
}

export const draftRouteForFormat = mlbDraftRouteForFormat;

export function farmDraftRouteForFormat(
  format: LeagueTemplate["draftFormat"],
): "/league-builder/farm-auction-draft" | "/snake-room" {
  return format === "snake" ? "/snake-room" : "/league-builder/farm-auction-draft";
}

type DraftRouteOptions = {
  shillCount?: number | null;
  reservePriceK?: ReservePriceK | number | null;
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
  if (options.reservePriceK !== null && options.reservePriceK !== undefined && Number.isFinite(options.reservePriceK)) {
    params.set("reserveK", String(normalizeReservePriceK(options.reservePriceK, DEFAULT_RESERVE_PRICE_K)));
  }
  return `${route}?${params.toString()}`;
}

export function draftRouteForLeague(league: Pick<LeagueTemplate, "id" | "draftFormat">, options?: DraftRouteOptions): string {
  return withLeagueId(mlbDraftRouteForFormat(league.draftFormat), league.id, options);
}

export function farmDraftRouteForLeague(league: Pick<LeagueTemplate, "id" | "draftFormat">): string {
  const route = withLeagueId(farmDraftRouteForFormat(league.draftFormat), league.id);
  return league.draftFormat === "snake" ? `${route}&phase=farm` : route;
}

export function draftSetupRouteForLeague(league: Pick<LeagueTemplate, "id">, options?: DraftRouteOptions): string {
  return withLeagueId("/league-builder/draft-setup", league.id, options);
}

export function scoutHireRouteForLeague(league: Pick<LeagueTemplate, "id">, options?: DraftRouteOptions): string {
  return withLeagueId("/league-builder/scout-hire", league.id, options);
}

export function staffHireRouteForLeague(league: Pick<LeagueTemplate, "id">): string {
  return withLeagueId("/league-builder/staff-hire", league.id);
}

export function franchiseSetupRouteForLeague(league: Pick<LeagueTemplate, "id">): string {
  return withLeagueId("/franchise/setup", league.id);
}

export function draftArcRouteChainForLeague(
  league: Pick<LeagueTemplate, "id" | "draftFormat">,
  options?: DraftRouteOptions,
): string[] {
  return [
    draftSetupRouteForLeague(league, options),
    draftRouteForLeague(league, options),
    scoutHireRouteForLeague(league, options),
    farmDraftRouteForLeague(league),
    staffHireRouteForLeague(league),
    franchiseSetupRouteForLeague(league),
  ];
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

export function reservePriceKFromSearch(search: string): ReservePriceK | null {
  const raw = new URLSearchParams(search).get("reserveK");
  if (raw === null) return null;
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed)) return null;
  const normalized = normalizeReservePriceK(parsed, DEFAULT_RESERVE_PRICE_K);
  return Math.abs(normalized - parsed) < 0.000001 ? normalized : null;
}

export function resolveInitialLeagueId(
  leagues: readonly Pick<LeagueTemplate, "id">[],
  requestedLeagueId: string | null,
): string {
  if (requestedLeagueId !== null) {
    return leagues.some((league) => league.id === requestedLeagueId) ? requestedLeagueId : "";
  }
  return leagues[0]?.id ?? "";
}
