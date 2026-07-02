/**
 * PLAYER-ARCHETYPE TAXONOMY — the canonical shape registry (Move 2).
 *
 * Design: spec-docs/FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md (JK-chartered:
 * a comprehensive strengths-AND-weaknesses map, per position, bench + pitchers included,
 * derived from the WHOLE profile; shape classes × orthogonal tags; exhaustive lattice
 * sweep, sim-pruned).
 *
 * TWO TIERS in this registry:
 * - GENERATOR_FAMILIES: the 17 families LIFTED BYTE-IDENTICAL from
 *   prospectScoutingDraftEngine (which now imports them from here). These drive prospect
 *   GENERATION and must never drift without re-running the generator's seeded tests.
 * - EXTENDED_SHAPES: taxonomy-only additions (classifier targets + menu entries) from the
 *   tool-combination lattice sweep. NOT in the generation draw pool — adding them there
 *   would change seeded generation behavior.
 *
 * The classifier (src/engines/playerArchetypeClassifier.ts) matches players to ALL_SHAPES;
 * shape = tool-DEVIATION pattern (level removed), so flat-shape players stratify by level:
 * high → Five-Tool, mid → Balanced, depth → the Filler classes.
 */

// NO 'DH' and NO 'UTIL': not positions in this app (JK rulings 2026-06-20 + 2026-07-02
// "DH is not part of the app and should be eradicated wherever found"). Lineup-RULE DH
// (useDH / lineupWithDH) is a different concept and not a player position.
export type TaxonomyPosition =
  | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF'
  | 'SP' | 'SP/RP' | 'RP' | 'CP';

export type TaxonomyTool =
  | 'power' | 'contact' | 'speed' | 'fielding' | 'arm'
  | 'velocity' | 'junk' | 'accuracy';

export type TaxonomyRole = 'hitter' | 'pitcher' | 'both';

export type ShapeBiasVector = Partial<Record<TaxonomyTool, number>>;

export interface ArchetypeFamilyDefinition {
  family: string;
  role: TaxonomyRole;
  template: ShapeBiasVector;
  positionAffinity: Partial<Record<TaxonomyPosition, number>>;
  baseWeight?: number;
}

/**
 * LIFTED BYTE-IDENTICAL from prospectScoutingDraftEngine (2026-07-02 relocation; the
 * generator imports this array). Values are generation-behavior-pinning: the seeded
 * prospect tests fail if any number here drifts.
 */
export const GENERATOR_FAMILIES = [
  {
    family: 'Slugger',
    role: 'hitter',
    template: { power: 1, arm: 0.3, contact: -0.35, speed: -0.55, fielding: -0.25 },
    positionAffinity: { '1B': 1.55, LF: 1.35, RF: 1.3, '3B': 1.2, C: 0.9, CF: 0.75, SS: 0.7, '2B': 0.75 },
    baseWeight: 1.1,
  },
  {
    family: 'Pure-Power',
    role: 'hitter',
    template: { power: 1, contact: -0.6, speed: -0.45, fielding: -0.3, arm: 0.2 },
    positionAffinity: { '1B': 1.65, LF: 1.45, RF: 1.35, '3B': 1.25, C: 0.8, CF: 0.65, SS: 0.6, '2B': 0.65 },
  },
  {
    family: 'Power-Speed',
    role: 'hitter',
    template: { power: 0.9, speed: 1, arm: 0.25, contact: -0.25, fielding: -0.2 },
    positionAffinity: { CF: 1.35, LF: 1.25, RF: 1.25, SS: 1.05, '2B': 1.0, '3B': 0.95, '1B': 0.75, C: 0.65 },
  },
  {
    family: 'Five-Tool',
    role: 'hitter',
    template: { power: 0.65, contact: 0.65, speed: 0.65, fielding: 0.55, arm: 0.55 },
    positionAffinity: { CF: 1.35, SS: 1.2, RF: 1.1, '2B': 1.0, '3B': 1.0, LF: 0.95, C: 0.85, '1B': 0.75 },
    baseWeight: 0.9,
  },
  {
    family: 'Speedster',
    role: 'hitter',
    template: { speed: 1, contact: 0.35, fielding: 0.25, power: -0.65, arm: -0.2 },
    positionAffinity: { CF: 1.6, '2B': 1.3, SS: 1.25, LF: 1.15, RF: 1.0, '3B': 0.75, C: 0.65, '1B': 0.55 },
  },
  {
    family: 'Slap-Hitter',
    role: 'hitter',
    template: { contact: 1, speed: 0.55, fielding: 0.2, power: -0.75, arm: -0.25 },
    positionAffinity: { '2B': 1.45, CF: 1.35, SS: 1.25, LF: 1.1, RF: 0.95, C: 0.8, '3B': 0.75, '1B': 0.65 },
  },
  {
    family: 'Contact-Glove',
    role: 'hitter',
    template: { contact: 1, fielding: 0.75, speed: 0.25, power: -0.55, arm: -0.1 },
    positionAffinity: { '2B': 1.45, SS: 1.35, CF: 1.2, C: 1.05, '3B': 0.95, LF: 0.85, RF: 0.85, '1B': 0.75 },
  },
  {
    family: 'Defensive-Wizard',
    role: 'hitter',
    template: { fielding: 1, arm: 0.75, speed: 0.35, power: -0.65, contact: -0.25 },
    positionAffinity: { C: 1.45, SS: 1.45, CF: 1.35, '2B': 1.25, '3B': 1.1, RF: 1.0, LF: 0.75, '1B': 0.65 },
  },
  {
    family: 'Cannon-Corner',
    role: 'hitter',
    template: { arm: 1, power: 0.65, fielding: 0.25, speed: -0.55, contact: -0.25 },
    positionAffinity: { RF: 1.55, '3B': 1.45, C: 1.25, LF: 1.0, '1B': 0.9, SS: 0.85, CF: 0.8, '2B': 0.75 },
  },
  {
    family: 'Project',
    role: 'hitter',
    template: { power: 0.75, speed: 0.6, arm: 0.45, contact: -0.55, fielding: -0.45 },
    positionAffinity: { '1B': 1.15, LF: 1.1, RF: 1.1, CF: 1.0, '3B': 1.0, C: 0.95, SS: 0.95, '2B': 0.95 },
    baseWeight: 0.85,
  },
  {
    family: 'Balanced',
    role: 'both',
    template: {
      power: 0.35,
      contact: 0.35,
      speed: 0.25,
      fielding: 0.25,
      arm: 0.25,
      velocity: 0.35,
      junk: 0.35,
      accuracy: 0.35,
    },
    positionAffinity: {},
    baseWeight: 1.15,
  },
  {
    family: 'Power-Ace',
    role: 'pitcher',
    template: { velocity: 1, junk: 0.55, accuracy: -0.5, power: 0.2, speed: -0.25 },
    positionAffinity: { SP: 1.35, 'SP/RP': 1.25, RP: 1.2, CP: 1.45 },
    baseWeight: 1.1,
  },
  {
    family: 'Power-Reliever',
    role: 'pitcher',
    template: { velocity: 1, junk: 0.75, accuracy: -0.65, fielding: -0.2 },
    positionAffinity: { CP: 1.65, RP: 1.45, 'SP/RP': 1.05, SP: 0.75 },
  },
  {
    family: 'Crafty-Ace',
    role: 'pitcher',
    template: { junk: 1, accuracy: 0.55, velocity: -0.55, fielding: 0.2 },
    positionAffinity: { SP: 1.3, 'SP/RP': 1.25, RP: 1.1, CP: 0.9 },
  },
  {
    family: 'Command-Artist',
    role: 'pitcher',
    template: { accuracy: 1, junk: 0.55, velocity: -0.45, contact: 0.2 },
    positionAffinity: { SP: 1.35, 'SP/RP': 1.25, RP: 1.0, CP: 0.95 },
  },
  {
    family: 'Pitchability',
    role: 'pitcher',
    template: { accuracy: 0.85, junk: 0.85, velocity: -0.35, fielding: 0.25 },
    positionAffinity: { SP: 1.25, 'SP/RP': 1.25, RP: 1.05, CP: 0.9 },
  },
  {
    family: 'Pitching-Project',
    role: 'pitcher',
    template: { velocity: 0.85, junk: 0.65, accuracy: -0.85, fielding: -0.25 },
    positionAffinity: { SP: 1.1, 'SP/RP': 1.25, RP: 1.2, CP: 1.15 },
    baseWeight: 0.85,
  },
] as const satisfies readonly ArchetypeFamilyDefinition[];

export type GeneratorArchetypeFamily = typeof GENERATOR_FAMILIES[number]['family'];

/**
 * Extended taxonomy shapes — the lattice-sweep additions (design §2.1). Classifier targets
 * and menu entries ONLY; never drawn by the prospect generator.
 *
 * `depthClass: true` marks the deliberate cheap classes (Bench Bat / Pinch Runner / the
 * Fillers): they claim a player only in the DEPTH level stratum — at regular levels the
 * same deviation pattern classifies to its star-shape cousin (a cheap glove-first C is a
 * cheap Defensive-Wizard, not a Filler).
 */
export interface ExtendedShapeDefinition extends ArchetypeFamilyDefinition {
  identityLine: string;
  depthClass?: boolean;
  /** Arsenal-size qualifier (pitchers): shape claims only players with ≤ this many pitches. */
  maxArsenal?: number;
}

export const EXTENDED_SHAPES: readonly ExtendedShapeDefinition[] = [
  {
    family: 'Professional-Hitter',
    role: 'hitter',
    template: { contact: 1, power: -0.2, speed: -0.15, fielding: 0.15 },
    positionAffinity: { '2B': 1.2, C: 1.1, LF: 1.05, '1B': 1.05, '3B': 1.0, RF: 0.95, SS: 0.9, CF: 0.9 },
    identityLine: 'Pure hit tool → ordinary everywhere else',
  },
  {
    family: 'Complete-Bat',
    role: 'hitter',
    template: { power: 0.85, contact: 0.85, speed: -0.2, fielding: -0.15 },
    positionAffinity: { '1B': 1.35, '3B': 1.25, RF: 1.2, LF: 1.15, C: 0.9, CF: 0.8, '2B': 0.8, SS: 0.7 },
    identityLine: 'Power AND average → pays for it with the glove and legs',
  },
  {
    family: 'Table-Setter',
    role: 'hitter',
    template: { contact: 0.9, speed: 0.9, power: -0.55, arm: -0.15 },
    positionAffinity: { '2B': 1.4, CF: 1.35, SS: 1.15, LF: 1.05, RF: 0.9, '3B': 0.75, C: 0.65, '1B': 0.6 },
    identityLine: 'On base and running → no thump',
  },
  {
    family: 'Range-Runner',
    role: 'hitter',
    template: { speed: 0.9, fielding: 0.9, power: -0.5, contact: -0.2, arm: -0.1 },
    positionAffinity: { CF: 1.55, '2B': 1.3, SS: 1.2, LF: 1.0, RF: 0.85, '3B': 0.7, C: 0.55, '1B': 0.5 },
    identityLine: 'Covers ground up the middle → light bat, ordinary arm',
  },
  {
    family: 'Power-Corner',
    role: 'hitter',
    template: { power: 0.9, arm: 0.9, contact: -0.35, speed: -0.45 },
    positionAffinity: { RF: 1.5, '3B': 1.3, '1B': 1.1, LF: 1.05, C: 1.0, CF: 0.7, SS: 0.6, '2B': 0.6 },
    identityLine: 'Thump plus a cannon → station to station',
  },
  {
    family: 'Bench-Bat',
    role: 'hitter',
    template: { power: 0.9, contact: 0.1, speed: -0.3, fielding: -0.4, arm: -0.2 },
    positionAffinity: { '1B': 1.2, LF: 1.15, RF: 1.1, '3B': 1.0, C: 0.8, CF: 0.7, '2B': 0.7, SS: 0.6 },
    identityLine: 'One swing off the bench → nothing else asked',
    depthClass: true,
  },
  {
    family: 'Pinch-Runner',
    role: 'hitter',
    template: { speed: 1, power: -0.6, contact: -0.1, arm: -0.2 },
    positionAffinity: { CF: 1.3, '2B': 1.2, SS: 1.1, LF: 1.05, RF: 0.95, '3B': 0.7, C: 0.5, '1B': 0.5 },
    identityLine: 'Legs for the ninth → keep the bat on the rack',
    depthClass: true,
  },
  {
    family: 'Roster-Filler',
    role: 'hitter',
    template: {},
    positionAffinity: {
      C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, LF: 1, CF: 1, RF: 1,
    },
    identityLine: 'A warm body at the minimum → chosen on purpose, not by accident',
    depthClass: true,
  },
  {
    family: 'Junkballer',
    role: 'pitcher',
    template: { junk: 1, velocity: -0.7, accuracy: 0.1 },
    positionAffinity: { 'SP/RP': 1.25, RP: 1.2, SP: 1.15, CP: 0.9 },
    identityLine: 'Movement first → the radar gun yawns',
  },
  {
    family: 'Power-Stuff',
    role: 'pitcher',
    template: { velocity: 0.9, junk: 0.9, accuracy: -0.75 },
    positionAffinity: { CP: 1.4, RP: 1.35, 'SP/RP': 1.1, SP: 0.95 },
    identityLine: 'Nasty everything → knows not where it goes',
  },
  {
    family: 'Effectively-Wild',
    role: 'pitcher',
    template: { velocity: 1, accuracy: -0.9, junk: -0.1 },
    positionAffinity: { RP: 1.35, CP: 1.3, 'SP/RP': 1.05, SP: 0.85 },
    identityLine: 'Pure gas, scattered → the cheap flamethrower',
  },
  {
    family: 'Strike-Thrower',
    role: 'pitcher',
    template: { accuracy: 1, velocity: -0.5, junk: -0.25 },
    positionAffinity: { SP: 1.2, 'SP/RP': 1.2, RP: 1.05, CP: 0.8 },
    identityLine: 'Pounds the zone → modest stuff, cheap innings',
  },
  {
    family: 'Two-Pitch-Reliever',
    role: 'pitcher',
    template: { velocity: 0.75, junk: 0.35, accuracy: -0.2 },
    positionAffinity: { RP: 1.35, CP: 1.25, 'SP/RP': 0.8, SP: 0.5 },
    identityLine: 'Two looks, one inning → the bullpen specialist',
    maxArsenal: 2,
  },
  {
    family: 'Bullpen-Filler',
    role: 'pitcher',
    template: {},
    positionAffinity: { RP: 1, CP: 1, 'SP/RP': 1, SP: 1 },
    identityLine: 'A live arm at the minimum → chosen on purpose',
    depthClass: true,
  },
];

export type ExtendedShapeFamily = typeof EXTENDED_SHAPES[number]['family'];
export type PlayerShapeFamily = GeneratorArchetypeFamily | ExtendedShapeFamily;

export const ALL_SHAPES: readonly ArchetypeFamilyDefinition[] = [
  ...GENERATOR_FAMILIES,
  ...EXTENDED_SHAPES,
];

/**
 * Swept-and-empty lattice regions (design §2.1 auditability): tool combinations examined
 * and deliberately NOT given a class, with the reason. The coverage sim re-checks these —
 * if the pool grows real presence in one, it graduates to EXTENDED_SHAPES.
 */
export const SWEPT_EMPTY_REGIONS: readonly { tools: string; reason: string }[] = [
  { tools: 'CON+ARM', reason: 'no meaningful pool presence; ARM without POW/FLD context has no roster story' },
  { tools: 'SPD+ARM', reason: 'no meaningful pool presence; covered narratively by Range-Runner/Cannon-Corner edges' },
  { tools: 'POW+FLD', reason: 'thin presence; players here classify acceptably as Slugger or Defensive-Wizard edges' },
  { tools: 'VEL+ACC (pitcher)', reason: 'covered by Power-Ace (its template is velocity-led with accuracy negative; a true VEL+ACC profile classifies Power-Ace or Strike-Thrower by lean)' },
];

/**
 * PERSONALITY GROUPS — DERIVED FROM THE ENGINES (design §2.2; JK "never assume" correction
 * 2026-07-02). Membership mirrors, with evidence:
 * - STEADY = the relationshipFormation steady/mentor set (relationshipFormation.ts:317-325:
 *   compatibility 0.75 pairwise; the only mentorship-eligible three).
 * - FIRED_UP = Competitive: upside-tilted morale amplifier (masterMoraleMatrix.ts:205-211)
 *   + the biggest positive trait-image driver (traitAcquisition.ts IMAGE_DRIVER_SETS)
 *   + antagonist-set member (relationshipFormation.ts:312).
 * - VOLATILE = Egotistical: both-ways amplifier with 1.5 fan sensitivity
 *   (masterMoraleMatrix.ts:247-253), THE clash driver (relationshipFormation.ts:311-313),
 *   crowd-independent development (fanMoraleDampener.ts:25).
 * - FRAGILE = Timid + Droopy: worst morale asymmetry (masterMoraleMatrix.ts:219-225,240-246),
 *   feud-target bonus (relationshipFormation.ts:284), Composure-negative trait drivers
 *   (traitAcquisition.ts IMAGE_DRIVER_SETS Choker/RBI Zero/Butter Fingers/…).
 * The canonical personality set is the SEVEN (PERSONALITY_POOL
 * prospectScoutingDraftEngine.ts:298; PERSONALITY_MODIFIERS salaryCalculator.ts:350).
 * A static test pins this grouping against those semantics.
 */
export type PersonalityGroup = 'STEADY' | 'FIRED_UP' | 'VOLATILE' | 'FRAGILE';

export const PERSONALITY_GROUPS: Record<string, PersonalityGroup> = {
  Tough: 'STEADY',
  Jolly: 'STEADY',
  Relaxed: 'STEADY',
  Competitive: 'FIRED_UP',
  Egotistical: 'VOLATILE',
  Timid: 'FRAGILE',
  Droopy: 'FRAGILE',
};

export type PersonalityTilt = 'prefer-steady' | 'avoid-fragile' | 'any' | 'embrace-volatility';

/**
 * AGE BANDS — the captain-tilt five bands (franchiseInitializer.CAPTAIN_AGE_TILT_TIERS,
 * JK ruling 6 2026-07-02) reused as taxonomy tags. Kept as data here (a data module cannot
 * import utils); a static test pins the boundaries against the captain tiers so the two
 * can never drift apart silently.
 */
export type AgeBand = 'rookie' | 'rising' | 'prime' | 'veteran' | 'elder';

export const AGE_BANDS: readonly { maxAge: number; band: AgeBand }[] = [
  { maxAge: 22, band: 'rookie' },
  { maxAge: 26, band: 'rising' },
  { maxAge: 30, band: 'prime' },
  { maxAge: 34, band: 'veteran' },
  { maxAge: Number.POSITIVE_INFINITY, band: 'elder' },
];

/** Classifier + menu tuning (§16 Simulation-Gate adjustable). */
export const TAXONOMY_TUNING = {
  /** Deviation norm below which a profile is FLAT (level strata decide the class). */
  flatShapeNorm: 6,
  /** Mean tool rating at/above which a flat hitter profile reads Five-Tool. */
  fiveToolLevelMin: 72,
  /** Mean tool rating below which a profile sits in the DEPTH stratum (Filler/Bench classes). */
  depthLevelMax: 48,
  /** Minimum position affinity for a shape to appear on that position's menu. */
  menuAffinityMin: 0.75,
} as const;

/** The per-position dropdown menu: role-appropriate shapes at real affinity, sorted. */
export function menuForPosition(position: TaxonomyPosition): ArchetypeFamilyDefinition[] {
  const isPitcherPos = position === 'SP' || position === 'SP/RP' || position === 'RP' || position === 'CP';
  return ALL_SHAPES
    .filter((shape) => {
      if (shape.role === 'both') return true;
      if (isPitcherPos !== (shape.role === 'pitcher')) return false;
      const affinity = shape.positionAffinity[position];
      return affinity !== undefined && affinity >= TAXONOMY_TUNING.menuAffinityMin;
    })
    .sort((left, right) =>
      (right.positionAffinity[position] ?? 0) - (left.positionAffinity[position] ?? 0)
      || left.family.localeCompare(right.family),
    );
}
