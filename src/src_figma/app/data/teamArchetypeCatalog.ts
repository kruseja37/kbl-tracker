/**
 * teamArchetypeCatalog.ts — the UI-facing display catalog of the historical team archetypes for the
 * Draft Setup archetype picker (name/era/lore + the plain "boost → sacrifice" identity).
 *
 * SOURCE OF TRUTH = the canonical engine module `src/data/historicalArchetypes.ts`
 * (`HISTORICAL_ARCHETYPES`). Per JK ruling (FRANCHISE_DRAFT_SETUP_REALDATA_PLAN.md §7): the archetype
 * set is still being finalized by a parallel thread, so the picker READS the module dynamically and
 * never hardcodes the list/count — `TEAM_ARCHETYPES` is DERIVED from it here, so the picker inherits
 * whatever that thread lands. The picker/preview keep consuming this `TeamArchetype` display shape
 * unchanged; only the data source moved.
 *
 * Each card reserves space for a future "strong vs / weak vs" matchup line — the archetype-vs-archetype
 * matrix is EMPIRICAL (discovered over real seasons), filled after Season 1 (alignment brief §6b).
 */
import {
  HISTORICAL_ARCHETYPES,
  type ArchetypeStat,
  type HistoricalArchetype,
} from "../../../data/historicalArchetypes";

export type ArchetypeFamily = "Power" | "Small-ball" | "Speed" | "Pitching" | "Defense" | "Balanced";

export interface TeamArchetype {
  key: string;
  name: string;
  era: string;            // the real team/year it's drawn from
  lore: string;           // one-line identity
  boosts: string[];       // what it lets you over-stack (the edge)
  sacrifices: string[];   // what it gives up
  family: ArchetypeFamily;
  /** Reserved — the empirical matchup profile lands after Season 1 (do not assert values). */
  strongVs?: string[];
  weakVs?: string[];
}

/** Accent color per family (neo-brutalist KBL palette). */
export const FAMILY_COLOR: Record<ArchetypeFamily, string> = {
  Power: "#C4A853",       // gold
  "Small-ball": "#5A8352",// green
  Speed: "#6FB36F",       // light green
  Pitching: "#3B7DD8",    // blue
  Defense: "#B0B7BC",     // steel
  Balanced: "#D4B863",    // light gold
};

/** Plain-English label for each engine stat code (for the boost/sacrifice chips). */
const STAT_LABEL: Record<ArchetypeStat, string> = {
  POW: "Power",
  CON: "Contact",
  SPD: "Speed",
  FLD: "Defense",
  ARM: "Arm",
  ROT_VEL: "Rotation velocity",
  ROT_JNK: "Rotation junk",
  ROT_ACC: "Rotation command",
  PEN_VEL: "Bullpen velocity",
  PEN_JNK: "Bullpen junk",
  PEN_ACC: "Bullpen command",
};

function statLabel(stat: ArchetypeStat): string {
  return STAT_LABEL[stat] ?? stat;
}

/** Derive a display family (accent only) from the boosted stats. */
function deriveFamily(boosts: ArchetypeStat[]): ArchetypeFamily {
  if (boosts.length >= 3) return "Balanced";
  if (boosts.some((s) => s.startsWith("ROT_") || s.startsWith("PEN_"))) return "Pitching";
  if (boosts.includes("SPD")) return "Speed";
  if (boosts.includes("FLD")) return "Defense";
  if (boosts.includes("POW")) return "Power";
  if (boosts.includes("CON")) return "Small-ball";
  return "Balanced";
}

function toTeamArchetype(archetype: HistoricalArchetype): TeamArchetype {
  return {
    key: archetype.id,
    name: archetype.name,
    // Show the exemplar team/year on the card (e.g. "1927 Yankees"); fall back to the period.
    era: archetype.exemplars[0] ?? archetype.era,
    lore: archetype.lore,
    boosts: archetype.boosts.map(statLabel),
    sacrifices: archetype.nerfs.map(statLabel),
    family: deriveFamily(archetype.boosts),
  };
}

/** DERIVED from the canonical module — do not hardcode (JK ruling §7). */
export const TEAM_ARCHETYPES: TeamArchetype[] = HISTORICAL_ARCHETYPES.map(toTeamArchetype);

export function archetypeByKey(key: string | null | undefined): TeamArchetype | undefined {
  if (!key) return undefined;
  return TEAM_ARCHETYPES.find((a) => a.key === key);
}
