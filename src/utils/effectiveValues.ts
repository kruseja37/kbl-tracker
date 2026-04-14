import type { LeaguePlayerOverrideRecord, Player } from "./leagueBuilderStorage";
import type { FameTier } from "../types/reporter";

type FamePlayer = Pick<Player, "baseFameTier"> | null | undefined;
type FameInstance = Pick<LeaguePlayerOverrideRecord, "fameTierOverride"> | null | undefined;

/**
 * Editorial effective-value helpers.
 *
 * Guardrail note: relationship and team-affinity resolution remain deferred to
 * v2 alongside their data model. A3 is fame-only to stay aligned with the
 * global guardrails.
 */
export function getEffectiveFame(
  player?: FamePlayer,
  instance?: FameInstance,
): FameTier {
  return instance?.fameTierOverride ?? player?.baseFameTier ?? 3;
}
