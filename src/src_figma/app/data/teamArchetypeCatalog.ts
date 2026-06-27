/**
 * teamArchetypeCatalog.ts — the UI-facing display catalog of the 15 historical
 * team archetypes (the curated, sim-balanced set; ARCHETYPE_BALANCE_SIM_RESULTS.md
 * §"Historical archetype set", 15/15 within band). This is DISPLAY data for the
 * Draft Setup archetype picker — name/era/lore + the plain "boost → sacrifice"
 * identity. The precise cap-shift magnitudes are still being tuned and live in the
 * engine (archetypeBalanceSimulator + the historical encoding); the UI shows the
 * plain trade-off, not the numbers. Wire `key` → the engine archetype later.
 *
 * Each card reserves space for a future "strong vs / weak vs" matchup line — the
 * archetype-vs-archetype matrix is EMPIRICAL (discovered over real seasons), so we
 * design the container now and fill it after Season 1 (see the alignment brief §6b).
 */

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

export const TEAM_ARCHETYPES: TeamArchetype[] = [
  {
    key: "murderers-row", name: "Murderers' Row", era: "'27 Yankees", family: "Power",
    lore: "The lineup that buried pitchers under relentless power and contact.",
    boosts: ["Power", "Contact"], sacrifices: ["Speed"],
  },
  {
    key: "bomba-squad", name: "Bomba Squad", era: "'19 Twins", family: "Power",
    lore: "A record home-run barrage — all-or-nothing thump.",
    boosts: ["Power"], sacrifices: ["Contact", "Speed"],
  },
  {
    key: "bash-brothers", name: "Bash Brothers", era: "'89 A's", family: "Power",
    lore: "Forearm bashes, towering blasts, and cannons in the outfield.",
    boosts: ["Power", "Arm"], sacrifices: ["Rotation command", "Bullpen command"],
  },
  {
    key: "whiteyball", name: "Whiteyball", era: "'85 Cardinals", family: "Speed",
    lore: "Speed and leather on the artificial turf — Herzog's track meet.",
    boosts: ["Speed", "Defense"], sacrifices: ["Power"],
  },
  {
    key: "go-go-small-ball", name: "Go-Go Small Ball", era: "'59 Sox · '26 Rays", family: "Small-ball",
    lore: "Slap it, run it, and catch everything in sight.",
    boosts: ["Contact", "Defense"], sacrifices: ["Power"],
  },
  {
    key: "dead-ball-suppressors", name: "Dead-Ball Suppressors", era: "'06 Cubs", family: "Pitching",
    lore: "Junk, contact, and a deadened ball — nobody goes deep.",
    boosts: ["Rotation junk", "Contact"], sacrifices: ["Power", "Bullpen velocity"],
  },
  {
    key: "billy-ball-burners", name: "Billy Ball Burners", era: "Rickey's A's", family: "Speed",
    lore: "Steal first, ask questions later. Chaos on the bases.",
    boosts: ["Speed"], sacrifices: ["Power", "Rotation command"],
  },
  {
    key: "junkball-surgeons", name: "Junkball Surgeons", era: "'95 Braves", family: "Pitching",
    lore: "Pinpoint command and a deep bag of breaking junk.",
    boosts: ["Rotation command", "Rotation junk"], sacrifices: ["Power", "Rotation velocity"],
  },
  {
    key: "flamethrowers", name: "Flamethrowers", era: "'63 Dodgers", family: "Pitching",
    lore: "Pure rotation velocity — Koufax-and-Drysdale heat.",
    boosts: ["Rotation velocity"], sacrifices: ["Power", "Contact"],
  },
  {
    key: "nasty-boys", name: "Nasty Boys", era: "'90 Reds", family: "Pitching",
    lore: "Three flamethrowers out of the pen — lights out late.",
    boosts: ["Bullpen velocity"], sacrifices: ["Bullpen command"],
  },
  {
    key: "hdh-royals", name: "HDH Royals", era: "'14 Royals", family: "Pitching",
    lore: "Speed, defense, and a shutdown back end — Herrera-Davis-Holland.",
    boosts: ["Bullpen command", "Speed"], sacrifices: ["Power", "Rotation command"],
  },
  {
    key: "the-opener", name: "The Opener", era: "'18 Rays", family: "Pitching",
    lore: "Bullpen-first — no traditional rotation, all arms on deck.",
    boosts: ["Bullpen"], sacrifices: ["Rotation"],
  },
  {
    key: "the-oriole-way", name: "The Oriole Way", era: "'69 Orioles", family: "Defense",
    lore: "Defense and command — fundamentals über alles.",
    boosts: ["Defense", "Rotation command"], sacrifices: ["Speed", "Bullpen velocity"],
  },
  {
    key: "shift-era-suppressors", name: "Shift-Era Suppressors", era: "'08 Rays", family: "Defense",
    lore: "Defense and velocity — the shift-era run suppressors.",
    boosts: ["Defense", "Rotation velocity"], sacrifices: ["Contact", "Bullpen command"],
  },
  {
    key: "big-red-machine", name: "Big Red Machine", era: "'75 Reds", family: "Balanced",
    lore: "Contact, defense, and pop — a balanced juggernaut.",
    boosts: ["Contact", "Defense", "Power"], sacrifices: ["Rotation"],
  },
];

export function archetypeByKey(key: string | null | undefined): TeamArchetype | undefined {
  if (!key) return undefined;
  return TEAM_ARCHETYPES.find((a) => a.key === key);
}
