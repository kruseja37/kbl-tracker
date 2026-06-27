/**
 * traitInteractionMatrix.ts — TraitInteractionMatrix (DATA ONLY, hand-authored judgment artifact).
 *
 * Machine-evaluable activation predicate, target, effect vector, and per-tier scaling for all
 * 75 traits in src/data/traitPricing.ts (committed 8ce3b04).
 *
 * Sources (precedence order, per T2 prompt contract):
 *   1. spec-docs/reference/BillyYank_Super_Mega_Baseball_Guide_3rd_Edition.docx — predicate
 *      semantics + guide-explicit per-tier values ("Guide §Traits/<CHEMISTRY>" cites the trait's
 *      entry under that chemistry heading in the guide's Traits section; "Guide §Team Analysis
 *      (<team>)" cites the team-by-team section)
 *   2. src/data/traitPricing.ts — trait names (exact), polarity, chemistry, workbook L2
 *      rating-equivalents (used as deltas where the guide publishes no in-game numbers)
 *   3. spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §4.3 — schema intent + known predicates
 *   4. spec §3.5 potency rule — default 0.5x/1.0x/3.0x of L2 unless guide-explicit
 *      (L3/L1 corrected 2.0→3.0 to the workbook, JK 2026-06-22 — see POTENCY_SCALE in rosterEngineConstants.ts)
 * Authored: 2026-06-10 (T2). Consumed by the Effective Ratings evaluator (T6) — no engine here.
 *
 * ============================== POTENCY RULING (READ FIRST) ==============================
 * The guide's three-value lines are in chemistry-level order L1/L2/L3 (guide §Traits intro:
 * "the trait's effect at level 1/level2/level 3"). Cross-checked arithmetic proves:
 *   - POSITIVE traits ASCEND with chemistry level (x1/x2/x4):
 *       Rally Stopper: Blinder 34/69/57 -> "chucking 54/89/77" at Tier 3 (+20, §Team/Beewolves)
 *       Mind Gamer: "Tier 3 Mind Gamer ... -30 accuracy" (§Team/Crocodons)
 *       Pinch Perfect: Batts 62/64 -> "enters with 74/76" at Tier 2 (+12, §Team/Sawteeth)
 *       POW vs RHP: Torrens "25 power ... often bats with 45" at Tier 3 (+20, §Team/Beewolves)
 *   - NEGATIVE traits INVERT — the malus SHRINKS as chemistry level rises (x4/x2/x1):
 *       Whiffer: DeMarco 37 CON, "unless you have maxed out Competitive, and even then he's
 *       still sitting at 25 contact" -> L3 = -12 (mildest), matching printed -50/-25/-12.
 *       Injury Prone: "forcing you to stack Competitive" to suppress it (§Traits/COMPETITIVE).
 *   potency: 'standard'          = L1 0.5x / L2 1.0x / L3 3.0x of `deltas` (positives, spec §3.5; workbook-corrected)
 *   potency: 'standardInverted'  = L1 3.0x / L2 1.0x / L3 0.5x of `deltas` (negatives whose guide
 *                                  line gives only x4/x2/x1 multipliers) — ADDED to the contract
 *                                  union; using 'standard' for these would silently flip the sign
 *                                  of the chemistry incentive.
 *   potency: 'guideExplicit'     = use `perTier` (ratingDelta) or the per-tier numbers quoted in
 *                                  `notes`/`description` verbatim from the guide.
 *
 * ================================== AMBIGUITIES (for JK) ==================================
 * A1  GLOBAL negative-potency ruling above. The guide author sometimes says "Level N" meaning
 *     the EFFECT tier rather than the chemistry level (e.g. First Pitch Prayer "unless it's
 *     Level 3", BB Prone "if it isn't maxed out", Slow Poke "if its Level 1"). Resolved against
 *     the Whiffer arithmetic, which is the only numeric anchor. Confirm.
 *     >>> JK-CONFIRMED 2026-06-10: inversion is correct — high chemistry dampens flaws
 *     >>> (negatives 2.0x/1.0x/0.5x at L1/L2/L3). 'standardInverted' is canonical.
 * A2  Gets Ahead printed "+50/+25/+12" — positives must ascend; resolved to +12/+25/+50 by
 *     mirror symmetry with Composed (identical wording, printed +12/+25/+50).
 * A3  Falls Behind printed "-12/-25/-50" — resolved to L1 -50 / L2 -25 / L3 -12 by mirror
 *     symmetry with BB Prone (printed -50/-25/-12) and the A1 ruling.
 * A4  Crossed Up printed "+1.5%/+3%/+6%" — resolved to L1 +6% / L2 +3% / L3 +1.5% per the
 *     negative pattern (Wild Thrower +10/+5/+2.5%, Butter Fingers +50/+25/+12%).
 * A5  Base Rounder printed "Major (x4)/Minor (x2)/Small (x1)" — positive trait; resolved to
 *     ascending x1/x2/x4 (mirror: Base Jogger is the negative twin with the same printed line).
 * A6  Pinch Perfect has NO dedicated entry in the guide's Traits section. L2 = +12 POW/+12 CON
 *     derived from §Team Analysis (Sawteeth): Batts 62/64 -> "enters with 74/76 power contact"
 *     at Tier 2. L1/L3 via standard scaling (not guide-printed).
 * A7  Workhorse has NO dedicated entry in the guide's Traits section. staminaModifier derived:
 *     SP base ~70 pitches (guide §Players/Pitchers) and "Tier 3 Competitive ... would allow
 *     Brick to throw 130 pitches in a game" (§Team/Crocodons) -> L3 +60, so L2 +30, L1 +15.
 * A8  Pick Officer / Easy Jumps: the victim-runner SPD magnitude is unpublished. Set to -/+7
 *     SPD at L2, mirroring the Stealer/Bad Jumps workbook rating-equivalents. CALIBRATE.
 * A9  Durable / Injury Prone: guide gives direction + x1/x2/x4 only; decay factors 0.75/1.25
 *     are PLACEHOLDERS for the §12 registry. CALIBRATE in playtest.
 * A10 Where the guide gives no in-game numbers (Bad Ball Hitter, Bunter, Cannon Arm, Noodle
 *     Arm, Dive Wizard, Sprinter, Slow Poke, Stealer, Bad Jumps, Base Rounder, Base Jogger,
 *     Fastball/Off-Speed Hitter, Low/High/Inside/Outside Pitch), `deltas` are the workbook L2
 *     rating-equivalents from traitPricing.ts — pricing abstractions standing in for unpublished
 *     in-game magnitudes.
 * A11 Little Hack: spec §4.3 groups it with the "2-strike family"; the guide says 0-1, 0-2 AND
 *     1-2 counts. Guide wins (precedence #1) — encoded as countIn [0-1, 0-2, 1-2].
 * A12 Rally Stopper / Surrounded: spec §4.3 says "runners on"; guide says "at least two runners
 *     on base". Guide wins — encoded as runnersOn with min: 2.
 * A13 Guide in-game values differ from workbook L2 pricing equivalents on several traits (Ace
 *     Exterminator 20/5 vs 10/3; Clutch flat +5 vs 2.5/2.5/2.5/1/1/5/4/4; K Collector 15/15 vs
 *     9/9/4+fee; Tough Out +25 vs +10; Mind Gamer -15 ACC vs POW/CON pricing). INTENTIONAL:
 *     this matrix carries in-game effect values (spec §4.3 "guide-explicit values where
 *     published"); traitPricing.ts carries salary-pricing equivalents. Two different surfaces.
 * A14 Clutch/Choker extreme-pressure doubling is documented in `notes` (one entry per trait to
 *     keep 1:1 coverage with traitPricing); T6 must implement: at pressure='extreme', double the
 *     active deltas for these two traits. Chosen over a second entry to preserve the 75-entry
 *     1:1 integrity check.
 * A15 Chance-based traits (Butter Fingers, Magic Hands, Wild Thrower, Crossed Up, Sign Stealer,
 *     Stimulated, Metal Head, Wild Thing) are expectedValueNote entries with the guide's
 *     percentages verbatim — not fake rating deltas.
 * A16 Spelling: pricing/workbook "K Neglector" vs guide "K Neglecter". Entry uses the pricing
 *     spelling (name-match contract with traitPricing.ts).
 *
 * T6 NOTE — predicate kinds added beyond spec §4.1 GameContext (count/pressure/runnersOn/risp/
 * vsHand/opponentTier/substitutionAB/inning): stealAttempt, roundingBase, runningOutOfBox,
 * buntAttempt, pitchType, pitchLocation, countIn, teamLosing, basesEmpty,
 * consecutiveBaserunnersAllowed, comebackerToPitcher, playingPosition, onBasePath.nextBaseOpen.
 * GameContext will need these fields (basesEmpty/teamLosing derivable from existing game state).
 */

import type { PricedAttr } from './traitPricing';

export type Attr = PricedAttr;

export type PredicateCondition =
  | { kind: 'always' }
  | { kind: 'count'; balls?: number; strikes?: number }          // exact-count traits (0-0)
  | { kind: 'countIn'; counts: Array<{ balls: number; strikes: number }> } // ADDED: multi-count sets (Big/Little Hack 2-0/3-0/3-1, three-ball counts) — OR within the set; a single `count` cannot express this
  | { kind: 'twoStrikes' }
  | { kind: 'firstPitch' }                                       // unused (0-0 encoded via `count` for uniformity); kept per contract schema
  | { kind: 'pressure'; level: 'high' | 'extreme' }              // level = minimum pressure to activate
  | { kind: 'runnersOn'; min?: number }                          // EXTENDED: optional min runner count (guide: Rally Stopper/Surrounded fire at "at least two runners on base")
  | { kind: 'risp' }
  | { kind: 'vsHand'; hand: 'L' | 'R' | 'same' | 'opposite' }    // L/R = opposing pitcher's hand (batter splits); same/opposite = batter's hand relative to the pitcher (Specialist/Reverse Splits, entries target the opponent batter)
  | { kind: 'opponentTier'; minGrade: string }                   // e.g. Ace Exterminator 'A-'
  | { kind: 'substitutionAB' }
  | { kind: 'inningRange'; from?: number; final?: boolean; lastNInnings?: number }
  | { kind: 'onBasePath'; nextBaseOpen?: boolean }               // EXTENDED: Distractor requires the next base open ("While on 1B or 2B, and the next base is open")
  | { kind: 'fieldingChance' }
  | { kind: 'stealAttempt' }                                     // ADDED: steal-attempt-specific (Stealer/Bad Jumps/Pick Officer/Easy Jumps); narrower than onBasePath
  | { kind: 'roundingBase' }                                     // ADDED: Base Rounder/Base Jogger ("while rounding a base")
  | { kind: 'runningOutOfBox' }                                  // ADDED: Sprinter/Slow Poke ("while running out of the batter's box"); spec §4.3 "run-out-of-box SPD"
  | { kind: 'buntAttempt' }                                      // ADDED: Bunter fires only when bunting
  | { kind: 'pitchType'; family: 'fastball' | 'offspeed' }       // ADDED: Fastball Hitter (4F/CF/2F) vs Off-Speed Hitter (CB/SL/CH/FK/SB)
  | { kind: 'pitchLocation'; zone: 'low' | 'high' | 'inside' | 'outside' | 'outOfZone' } // ADDED: edge-of-zone hitter traits; 'outOfZone' = Bad Ball Hitter (corners/outside the zone)
  | { kind: 'teamLosing' }                                       // ADDED: Rally Starter ("when losing")
  | { kind: 'basesEmpty' }                                       // ADDED: Rally Starter ("with the bases empty"); NOT expressible as AND of listed kinds
  | { kind: 'consecutiveBaserunnersAllowed'; count: number; scope: 'remainderOfInning' } // ADDED: Meltdown ("after four consecutive batters reach base with no outs recorded")
  | { kind: 'comebackerToPitcher' }                              // ADDED: Metal Head event predicate
  | { kind: 'playingPosition'; scope: 'catcher' | 'infield' | 'outfield' | 'secondaryPosition' }; // ADDED: Two Way (C)/(IF)/(OF) + Utility positional predicates (feeds §4.5 DefensivePlacementRisk)

export interface TraitMatrixEntry {
  name: string;                       // EXACT match to traitPricing.ts
  target: 'self' | 'opponent';
  effect:
    | { kind: 'ratingDelta'; deltas: Partial<Record<Attr, number>>;  // L2 values
        perTier?: { l1: Partial<Record<Attr, number>>; l3: Partial<Record<Attr, number>> } } // only when guide-explicit
    | { kind: 'mojoTransitionRate'; factor: number }               // Volatile/Consistent (L2 factor; per-tier in notes)
    | { kind: 'fitnessDecayRate'; factor: number }                 // Durable/Injury Prone (L2 factor; per-tier in notes)
    | { kind: 'staminaModifier'; pitches: number }                 // Workhorse (L2 pitches)
    | { kind: 'expectedValueNote'; description: string }           // chance-based traits — model as EV, document
    | { kind: 'fieldingPenaltyReduction'; reductionPct: number }   // ADDED: Two Way/Utility — % of the off-position fielding penalty removed at L2 (per-tier in notes); not a rating delta, not random
    | { kind: 'pitchQualityModifier'; pitch: '4F' | '2F' | 'CF' | 'SL' | 'CB' | 'SB' | 'CH' | 'FK'; aspects: Array<'speed' | 'break'> }; // ADDED: Elite-pitch family — improves the named pitch (magnitude unpublished; salary side priced via multipliers in traitPricing.ts)
  predicates: PredicateCondition[];   // AND-combined; [{kind:'always'}] for unconditional
  potency: 'standard' | 'standardInverted' | 'guideExplicit';     // see POTENCY RULING header ('standardInverted' ADDED)
  citation: string;                   // REQUIRED — guide heading + <15-word fragment
  notes?: string;                     // interpretation rationale where non-obvious
}

export const TRAIT_INTERACTION_MATRIX: TraitMatrixEntry[] = [
  {
    name: 'Ace Exterminator',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 20, CON: 5 },
      perTier: { l1: { POW: 10, CON: 3 }, l3: { POW: 40, CON: 10 } } },
    predicates: [{ kind: 'opponentTier', minGrade: 'A-' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SCHOLARLY: 'Additional power and contact when batting against an A- pitcher or better.'",
    notes: "Persists vs fatigue: 'Ace Exterminator's powerup continues even as the pitcher tires' — tier check uses the pitcher's ROSTER grade, not fatigue-adjusted current form. Workbook L2 pricing (10/3) equals guide L1; matrix carries guide in-game values (A13).",
  },
  {
    name: 'Bad Ball Hitter',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 15, CON: 12 } },
    predicates: [{ kind: 'pitchLocation', zone: 'outOfZone' }],
    potency: 'standard',
    citation: "Guide §Traits/CRAFTY: 'Reduced batted ball speed penalty when making contact with pitches on the corners'",
    notes: 'True effect is a reduced bad-ball contact penalty (x1/x2/x4); deltas are workbook L2 rating-equivalents (A10). Guide-noted synergy with First Pitch Slayer (waste-pitch counter).',
  },
  {
    name: 'Bad Jumps',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { SPD: -7 } },
    predicates: [{ kind: 'stealAttempt' }],
    potency: 'standardInverted',
    citation: "Guide §Traits/CRAFTY: 'Decreased running speed while attempting to steal a base'",
    notes: 'Guide line "Major effect (x4) / Minor effect (x2) / Small effect (x1)" — inverted negative scaling (A1). Delta is workbook L2 rating-equivalent (A10).',
  },
  {
    name: 'Base Jogger',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { SPD: -5 } },
    predicates: [{ kind: 'roundingBase' }],
    potency: 'standardInverted',
    citation: "Guide §Traits/DISCIPLINED: 'Decreased running speed while rounding a base'",
    notes: "Inverted scaling confirmed by commentary: Bigs is hampered 'unless he's on a team with minimal Discipline' (L1 = worst). Delta is workbook L2 rating-equivalent (A10).",
  },
  {
    name: 'Base Rounder',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { SPD: 2.5 } },
    predicates: [{ kind: 'roundingBase' }],
    potency: 'standard',
    citation: "Guide §Traits/DISCIPLINED: 'Increased running speed while rounding a base'",
    notes: 'Guide prints "Major (x4)/Minor (x2)/Small (x1)" — misordered for a positive trait; resolved ascending (A5). Delta is workbook L2 rating-equivalent (A10).',
  },
  {
    name: 'BB Prone',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { ACC: -25 },
      perTier: { l1: { ACC: -50 }, l3: { ACC: -12 } } },
    predicates: [{ kind: 'countIn', counts: [{ balls: 3, strikes: 0 }, { balls: 3, strikes: 1 }, { balls: 3, strikes: 2 }] }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/DISCIPLINED: 'Decreased accuracy in three ball counts.'",
    notes: 'Pitcher trait. "Three ball counts" = 3-0, 3-1, 3-2.',
  },
  {
    name: 'Big Hack',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 20, CON: -10 },
      perTier: { l1: { POW: 10, CON: -20 }, l3: { POW: 40, CON: -5 } } },
    predicates: [{ kind: 'countIn', counts: [{ balls: 2, strikes: 0 }, { balls: 3, strikes: 0 }, { balls: 3, strikes: 1 }] }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SCHOLARLY: 'Additional power and lowered contact when in 2-0, 3-0, and 3-1 counts.'",
    notes: "Mixed-sign trait: POW bonus grows AND CON malus shrinks with level — 'kind of a detriment at level one, but are fantastic if maxed out'.",
  },
  {
    name: 'Bunter',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { CON: 2, SPD: 2 } },
    predicates: [{ kind: 'buntAttempt' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Bunting balls down the foul line is easier.'",
    notes: 'In-game effect is bunt-placement quality (x1/x2/x4); deltas are workbook L2 rating-equivalents (A10). Spec §4.3 notes synergy with Sprinter ("can help maximize the Bunter trait").',
  },
  {
    name: 'Butter Fingers',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Missed-catch chance on diving/jumping/sliding attempts: +50% (L1) / +25% (L2) / +12% (L3). EV: scale errorLikelihood in DefensivePlacementRisk (§4.5).' },
    predicates: [{ kind: 'fieldingChance' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/DISCIPLINED: 'Increased chance of missed catch while diving, jumping, sliding'",
    notes: 'Per-tier values are guide-explicit but live in the EV description (+50/+25/+12% missed-catch by tier) — perTier field is ratingDelta-only by schema. T2-AUDIT S2 remediation.',
  },
  {
    name: 'Cannon Arm',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { ARM: 45 } },
    predicates: [{ kind: 'fieldingChance' }],
    potency: 'standard',
    citation: "Guide §Traits/COMPETITIVE: 'Increased throw speed when throwing with maximum power from the throwing minigame.'",
    notes: 'Applies only to MAX-power throws (CPU "maximizing throwing power to activate the trait when possible"). Delta is the workbook L2 rating-equivalent — the largest single-attribute trait in the pricing table (A10).',
  },
  {
    name: 'Choker',
    target: 'self',
    effect: { kind: 'ratingDelta',
      deltas: { POW: -5, CON: -5, SPD: -5, FLD: -5, ARM: -5, VEL: -5, JNK: -5, ACC: -5 },
      perTier: { l1: { POW: -10, CON: -10, SPD: -10, FLD: -10, ARM: -10, VEL: -10, JNK: -10, ACC: -10 },
                 l3: { POW: -3, CON: -3, SPD: -3, FLD: -3, ARM: -3, VEL: -3, JNK: -3, ACC: -3 } } },
    predicates: [{ kind: 'pressure', level: 'high' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Subtraction from all skills when Pressure is high.'",
    notes: "EXTREME DOUBLING (A14): 'The effect is doubled when pressure is extreme.' T6 must double the active deltas at pressure='extreme'. One entry kept for 1:1 coverage.",
  },
  {
    name: 'Clutch',
    target: 'self',
    effect: { kind: 'ratingDelta',
      deltas: { POW: 5, CON: 5, SPD: 5, FLD: 5, ARM: 5, VEL: 5, JNK: 5, ACC: 5 },
      perTier: { l1: { POW: 3, CON: 3, SPD: 3, FLD: 3, ARM: 3, VEL: 3, JNK: 3, ACC: 3 },
                 l3: { POW: 10, CON: 10, SPD: 10, FLD: 10, ARM: 10, VEL: 10, JNK: 10, ACC: 10 } } },
    predicates: [{ kind: 'pressure', level: 'high' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Boost to all skills when Pressure is high.'",
    notes: "EXTREME DOUBLING (A14): 'The effect is doubled when pressure is extreme.' T6 doubles active deltas at extreme. Guide flat +5 differs from workbook pricing vector (A13).",
  },
  {
    name: 'Composed',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { ACC: 25 },
      perTier: { l1: { ACC: 12 }, l3: { ACC: 50 } } },
    predicates: [{ kind: 'countIn', counts: [{ balls: 3, strikes: 0 }, { balls: 3, strikes: 1 }, { balls: 3, strikes: 2 }] }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/DISCIPLINED: 'Increased accuracy in three ball counts.'",
    notes: 'Pitcher trait; positive mirror of BB Prone.',
  },
  {
    name: 'CON vs LHP',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { CON: 10 },
      perTier: { l1: { CON: 5 }, l3: { CON: 20 } } },
    predicates: [{ kind: 'vsHand', hand: 'L' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Bonus contact when facing a left/right handed pitcher'",
    notes: 'Explicit-hand split (NOT same/opposite): fires only when the opposing pitcher throws left-handed.',
  },
  {
    name: 'CON vs RHP',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { CON: 10 },
      perTier: { l1: { CON: 5 }, l3: { CON: 20 } } },
    predicates: [{ kind: 'vsHand', hand: 'R' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Bonus contact when facing a left/right handed pitcher'",
    notes: 'Explicit-hand split: fires only vs right-handed pitchers ("righties are far more common so ... CON vs RHP is preferable").',
  },
  {
    name: 'Consistent',
    target: 'self',
    effect: { kind: 'mojoTransitionRate', factor: 0.75 },
    predicates: [{ kind: 'always' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/DISCIPLINED: 'Mojo changes at a slower rate from play to play and game to game.'",
    notes: 'Guide-explicit rates: 12.5%/25%/50% slower -> factors L1 0.875 / L2 0.75 / L3 0.5. Slows transitions BOTH ways (spec §4.2).',
  },
  {
    name: 'Crossed Up',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Catcher drop/failed-catch chance per pitch: +6% (L1) / +3% (L2) / +1.5% (L3) — order resolved per A4. EV: passed-ball/extra-base risk on every pitch thrown.' },
    predicates: [{ kind: 'always' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SCHOLARLY: 'Increased possibility of the catcher dropping or failing to catch any given pitch.'",
    notes: "Pitcher trait; penalizes the battery, 'impacts every pitch a pitcher throws'. Printed ascending order resolved to descending (A4).",
  },
  {
    name: 'Distractor',
    target: 'opponent',
    effect: { kind: 'ratingDelta', deltas: { ACC: -20 },
      perTier: { l1: { ACC: -10 }, l3: { ACC: -40 } } },
    predicates: [{ kind: 'onBasePath', nextBaseOpen: true }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'While on 1B or 2B, and the next base is open'",
    notes: 'Debuffs the OPPOSING PITCHER while the owner stands on 1B/2B with the next base open. L3 "wiping away almost half of a pitcher’s possible Accuracy".',
  },
  {
    name: 'Dive Wizard',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { FLD: 7, ARM: 5 } },
    predicates: [{ kind: 'fieldingChance' }],
    potency: 'standard',
    citation: "Guide §Traits/SPIRITED: 'Faster recoveries from diving catches.'",
    notes: 'In-game effect is recovery time after dives (x1/x2/x4 ascending, "Small effect/Minor effect/Major effect"); deltas are workbook L2 rating-equivalents (A10). Most valuable 3B/2B/SS per guide.',
  },
  {
    name: 'Durable',
    target: 'self',
    effect: { kind: 'fitnessDecayRate', factor: 0.75 },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/COMPETITIVE: 'Reduced chance of injury during play and slower Fitness decay from being overplayed.'",
    notes: 'Factor 0.75 is a PLACEHOLDER (A9) — guide gives direction + x1/x2/x4 only. Scaling: stronger reduction at higher level (positive trait, standard). Most useful on catchers (fastest decay, §4.4).',
  },
  {
    name: 'Easy Jumps',
    target: 'opponent',
    effect: { kind: 'ratingDelta', deltas: { SPD: 7 } },
    predicates: [{ kind: 'stealAttempt' }],
    potency: 'standardInverted',
    citation: "Guide §Traits/CRAFTY: 'opposing baserunners gain increased running speed when attempting to steal a base.'",
    notes: 'Pitcher liability: BUFFS opposing stealers. Magnitude unpublished; +7 SPD mirrors Stealer (A8). Inverted scaling: worst at L1 ("(x4)/(x2)/(x1)").',
  },
  {
    name: 'Easy Target',
    target: 'opponent',
    effect: { kind: 'ratingDelta', deltas: { ACC: 15 },
      perTier: { l1: { ACC: 30 }, l3: { ACC: 8 } } },
    predicates: [{ kind: 'always' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'While batting, the opposing pitcher gains bonus Accuracy.'",
    notes: 'Batter liability: BUFFS the opposing pitcher (+ACC) for every pitch of the owner’s plate appearances. Negative trait — malus (to owner) shrinks with level per A1.',
  },
  {
    name: 'Elite 2F',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: '2F', aspects: ['speed', 'break'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Increased pitch speed and break when pitching a 2-seam fastball/cut fastball/forkball/slider'",
    notes: 'Magnitude unpublished (x1/x2/x4); salary impact priced via VEL/JNK/ACC multipliers in traitPricing.ts (A10).',
  },
  {
    name: 'Elite 4F',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: '4F', aspects: ['speed'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Increased pitch speed when pitching a 4-seam fastball'",
    notes: "Speed only (no break). Guide: 'stack a couple traits (K Man, Elite 4F) on a guy with 90ish velo and you can hit 110 MPH'.",
  },
  {
    name: 'Elite CB',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: 'CB', aspects: ['break'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Increased break when pitching a curveball'",
    notes: 'Break only (no speed change).',
  },
  {
    name: 'Elite CF',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: 'CF', aspects: ['speed', 'break'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Increased pitch speed and break when pitching a 2-seam fastball/cut fastball/forkball/slider'",
  },
  {
    name: 'Elite CH',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: 'CH', aspects: ['speed', 'break'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Decreased pitch speed and increased break when pitching a changeup/screwball'",
    notes: 'DECREASED speed + increased break (bigger gap off the fastball — the deception is the value).',
  },
  {
    name: 'Elite FK',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: 'FK', aspects: ['speed', 'break'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Increased pitch speed and break when pitching a 2-seam fastball/cut fastball/forkball/slider'",
  },
  {
    name: 'Elite SB',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: 'SB', aspects: ['speed', 'break'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Decreased pitch speed and increased break when pitching a changeup/screwball'",
    notes: 'Decreased speed + increased break (screwball, same family as CH).',
  },
  {
    name: 'Elite SL',
    target: 'self',
    effect: { kind: 'pitchQualityModifier', pitch: 'SL', aspects: ['speed', 'break'] },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Traits/SCHOLARLY: 'Increased pitch speed and break when pitching a 2-seam fastball/cut fastball/forkball/slider'",
  },
  {
    name: 'Falls Behind',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { ACC: -25 },
      perTier: { l1: { ACC: -50 }, l3: { ACC: -12 } } },
    predicates: [{ kind: 'count', balls: 0, strikes: 0 }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SCHOLARLY: 'Decreased accuracy on 0-0 count.'",
    notes: 'Pitcher trait. Printed "-12/-25/-50" resolved to L1 -50 / L3 -12 by BB Prone mirror + A1 ruling (A3).',
  },
  {
    name: 'Fastball Hitter',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 3, CON: 7 } },
    predicates: [{ kind: 'pitchType', family: 'fastball' }],
    potency: 'standard',
    citation: "Guide §Traits/DISCIPLINED: 'Swing power and contact improves when swinging at 4F, CF, 2F'",
    notes: 'Fastball family = 4F/CF/2F. Deltas are workbook L2 rating-equivalents (A10).',
  },
  {
    name: 'First Pitch Prayer',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: -10, CON: -15 },
      perTier: { l1: { POW: -20, CON: -30 }, l3: { POW: -5, CON: -8 } } },
    predicates: [{ kind: 'count', balls: 0, strikes: 0 }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/COMPETITIVE: 'Decreased Power and Contact on a 0-0 count'",
    notes: 'Commentary "unless it’s Level 3" reads as effect-tier shorthand, not chemistry level — see A1.',
  },
  {
    name: 'First Pitch Slayer',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 10, CON: 15 },
      perTier: { l1: { POW: 5, CON: 8 }, l3: { POW: 20, CON: 30 } } },
    predicates: [{ kind: 'count', balls: 0, strikes: 0 }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/COMPETITIVE: 'Bonus Power and Contact on a 0-0 count.'",
    notes: 'Matches spec §4.3 example (+5/+8 -> +10/+15 -> +20/+30). Synergy with Bad Ball Hitter per guide.',
  },
  {
    name: 'Gets Ahead',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { ACC: 25 },
      perTier: { l1: { ACC: 12 }, l3: { ACC: 50 } } },
    predicates: [{ kind: 'count', balls: 0, strikes: 0 }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SCHOLARLY: 'Increased accuracy on 0-0 count.'",
    notes: 'Pitcher trait. Printed "+50/+25/+12" resolved ascending by Composed mirror (A2).',
  },
  {
    name: 'High Pitch',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 5, CON: 5 } },
    predicates: [{ kind: 'pitchLocation', zone: 'high' }],
    potency: 'standard',
    citation: "Guide §Traits/DISCIPLINED: 'Swing power and contact improves when swinging at pitches near the low/high/inside/outside edge'",
    notes: 'Deltas are workbook L2 rating-equivalents (A10).',
  },
  {
    name: 'Injury Prone',
    target: 'self',
    effect: { kind: 'fitnessDecayRate', factor: 1.25 },
    predicates: [{ kind: 'always' }],
    potency: 'standardInverted',
    citation: "Guide §Traits/COMPETITIVE: 'Increased chance of injury during play and faster Fitness decay from being overplayed.'",
    notes: "Factor 1.25 is a PLACEHOLDER (A9). Inverted: stacking the chemistry suppresses it ('forcing you to stack Competitive players'). Guide line '(x4)/(x2)/(x1)'.",
  },
  {
    name: 'Inside Pitch',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 5, CON: 5 } },
    predicates: [{ kind: 'pitchLocation', zone: 'inside' }],
    potency: 'standard',
    citation: "Guide §Traits/DISCIPLINED: 'Swing power and contact improves when swinging at pitches near the low/high/inside/outside edge'",
    notes: 'Deltas are workbook L2 rating-equivalents (A10).',
  },
  {
    name: 'K Collector',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { VEL: 15, JNK: 15 },
      perTier: { l1: { VEL: 8, JNK: 8 }, l3: { VEL: 30, JNK: 30 } } },
    predicates: [{ kind: 'twoStrikes' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/COMPETITIVE: 'Additional Velocity and Junk when pitching with a 2-strike count.'",
    notes: 'Matches spec §4.3 example (+8/+15/+30 VEL&JNK). Computable standoff vs Tough Out at 0-2 per spec.',
  },
  {
    name: 'K Neglector',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { VEL: -15, JNK: -15 },
      perTier: { l1: { VEL: -30, JNK: -30 }, l3: { VEL: -8, JNK: -8 } } },
    predicates: [{ kind: 'twoStrikes' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/COMPETITIVE: 'Decreased Velocity and Junk when pitching with a 2-strike count.'",
    notes: 'Guide spells it "K Neglecter"; name follows traitPricing.ts spelling (A16).',
  },
  {
    name: 'Little Hack',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { CON: 20, POW: -10 },
      perTier: { l1: { CON: 10, POW: -20 }, l3: { CON: 40, POW: -5 } } },
    predicates: [{ kind: 'countIn', counts: [{ balls: 0, strikes: 1 }, { balls: 0, strikes: 2 }, { balls: 1, strikes: 2 }] }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SCHOLARLY: 'Additional contact and lowered power when in 0-1, 0-2, and 1-2 counts.'",
    notes: 'Guide counts (0-1/0-2/1-2) override spec §4.3’s "2-strike family" grouping — 0-1 is not a 2-strike count (A11). Mixed-sign like Big Hack.',
  },
  {
    name: 'Low Pitch',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 5, CON: 5 } },
    predicates: [{ kind: 'pitchLocation', zone: 'low' }],
    potency: 'standard',
    citation: "Guide §Traits/DISCIPLINED: 'Swing power and contact improves when swinging at pitches near the low/high/inside/outside edge'",
    notes: 'Deltas are workbook L2 rating-equivalents (A10).',
  },
  {
    name: 'Magic Hands',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Missed-catch chance on diving/jumping/sliding attempts: -12% (L1) / -25% (L2) / -50% (L3). EV: scale errorLikelihood down / spectacularLikelihood up in DefensivePlacementRisk (§4.5).' },
    predicates: [{ kind: 'fieldingChance' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/DISCIPLINED: 'Decreased chance of missed catch while diving, jumping, sliding'",
    notes: 'Most valuable SS/2B/3B/CF per guide.',
  },
  {
    name: 'Meltdown',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { ACC: -50 },
      perTier: { l1: { ACC: -100 }, l3: { ACC: -25 } } },
    predicates: [{ kind: 'consecutiveBaserunnersAllowed', count: 4, scope: 'remainderOfInning' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Negative accuracy for the remainder of the inning after four consecutive batters reach base'",
    notes: 'Trigger requires four CONSECUTIVE batters reaching base with NO outs recorded; effect persists for the remainder of that inning.',
  },
  {
    name: 'Metal Head',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Chance of instantly recovering from a comebacker to the head with no fitness penalty: 25% (L1) / 50% (L2) / Always (L3). EV: avoided injury/removal cost; guide: too random to build around.' },
    predicates: [{ kind: 'comebackerToPitcher' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/DISCIPLINED: 'Possibility of instantly recovering from a comebacker to the head with no fitness penalty.'",
    notes: 'Per-tier values are guide-explicit in the EV description (25%/50%/Always recovery by tier) — perTier field is ratingDelta-only by schema. T2-AUDIT S2 remediation.',
  },
  {
    name: 'Mind Gamer',
    target: 'opponent',
    effect: { kind: 'ratingDelta', deltas: { ACC: -15 },
      perTier: { l1: { ACC: -8 }, l3: { ACC: -30 } } },
    predicates: [{ kind: 'always' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'While batting, the opposing pitcher suffers negative accuracy.'",
    notes: 'Spec §4.3 hard case: target=OPPONENT pitcher, -ACC, active for every pitch of the owner’s plate appearances. Tier 3 cross-check: "-30 accuracy" (§Team/Crocodons).',
  },
  {
    name: 'Noodle Arm',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { ARM: -25 } },
    predicates: [{ kind: 'fieldingChance' }],
    potency: 'standardInverted',
    citation: "Guide §Traits/COMPETITIVE: 'Decreased throw speed when throwing with less than maximum power'",
    notes: 'Mirror of Cannon Arm but fires on NON-max-power throws (invites overthrow/error risk). Delta is workbook L2 rating-equivalent (A10); guide line "(x4)/(x2)/(x1)" inverted.',
  },
  {
    name: 'Off-Speed Hitter',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 3, CON: 7 } },
    predicates: [{ kind: 'pitchType', family: 'offspeed' }],
    potency: 'standard',
    citation: "Guide §Traits/DISCIPLINED: 'Swing power and contact improves when swinging at CB, SL, CH, FK, SB'",
    notes: 'Off-speed family = CB/SL/CH/FK/SB. Deltas are workbook L2 rating-equivalents (A10).',
  },
  {
    name: 'Outside Pitch',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 5, CON: 5 } },
    predicates: [{ kind: 'pitchLocation', zone: 'outside' }],
    potency: 'standard',
    citation: "Guide §Traits/DISCIPLINED: 'Swing power and contact improves when swinging at pitches near the low/high/inside/outside edge'",
    notes: 'Deltas are workbook L2 rating-equivalents (A10).',
  },
  {
    name: 'Pick Officer',
    target: 'opponent',
    effect: { kind: 'ratingDelta', deltas: { SPD: -7 } },
    predicates: [{ kind: 'stealAttempt' }],
    potency: 'standard',
    citation: "Guide §Traits/CRAFTY: 'opposing baserunners suffer decreased running speed when attempting to steal a base.'",
    notes: 'Debuffs OPPOSING stealers while owner pitches. Magnitude unpublished; -7 SPD mirrors Stealer (A8). L3 "almost impossible for anyone to run".',
  },
  {
    name: 'Pinch Perfect',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 12, CON: 12 } },
    predicates: [{ kind: 'substitutionAB' }],
    potency: 'standard',
    citation: "Guide §Team Analysis (Sawteeth): 'Tier 2 pinch perfect ... enters with 74/76 power contact'",
    notes: 'No dedicated guide Traits entry (A6). L2 = +12/+12 derived: Batts 62/64 -> 74/76 at Tier 2. Spec §4.3 hard case: substitution AB predicate (fires on the AB after entering as a sub).',
  },
  {
    name: 'POW vs LHP',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 10 },
      perTier: { l1: { POW: 5 }, l3: { POW: 20 } } },
    predicates: [{ kind: 'vsHand', hand: 'L' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Bonus power when facing a left/right handed pitcher'",
    notes: 'Explicit-hand split: fires only vs left-handed pitchers.',
  },
  {
    name: 'POW vs RHP',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 10 },
      perTier: { l1: { POW: 5 }, l3: { POW: 20 } } },
    predicates: [{ kind: 'vsHand', hand: 'R' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Bonus power when facing a left/right handed pitcher'",
    notes: 'Explicit-hand split. Tier 3 cross-check: Torrens "25 power ... often bats with 45" (§Team/Beewolves).',
  },
  {
    name: 'Rally Starter',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { CON: 25 },
      perTier: { l1: { CON: 12 }, l3: { CON: 50 } } },
    predicates: [{ kind: 'teamLosing' }, { kind: 'basesEmpty' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Contact bonus when losing and batting with the bases empty.'",
    notes: 'Both conditions AND-required (losing + bases empty).',
  },
  {
    name: 'Rally Stopper',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { VEL: 10, JNK: 10, ACC: 10 },
      perTier: { l1: { VEL: 5, JNK: 5, ACC: 5 }, l3: { VEL: 20, JNK: 20, ACC: 20 } } },
    predicates: [{ kind: 'runnersOn', min: 2 }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Additional Velocity/Junk/Accuracy when pitching with at least two runners on base.'",
    notes: 'Spec §4.3 hard case: guide refines "runners on" to AT LEAST TWO runners (A12). Tier 3 cross-check: Blinder 34/69/57 -> "chucking 54/89/77" (§Team/Beewolves).',
  },
  {
    name: 'RBI Hero',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: 15, CON: 10 },
      perTier: { l1: { POW: 8, CON: 5 }, l3: { POW: 30, CON: 20 } } },
    predicates: [{ kind: 'risp' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Bonus power and contact when batting with a runner on second or third base.'",
    notes: 'RISP = runner on 2B or 3B.',
  },
  {
    name: 'RBI Zero',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { POW: -15, CON: -10 },
      perTier: { l1: { POW: -30, CON: -20 }, l3: { POW: -8, CON: -5 } } },
    predicates: [{ kind: 'risp' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Subtracted power and contact when batting with a runner on second or third base.'",
    notes: 'Cross-check: Tater 81/81 "can be a 73/76 hitter" with minimized (L3) RBI Zero -> -8/-5 (§Traits/SPIRITED highlight).',
  },
  {
    name: 'Reverse Splits',
    target: 'opponent',
    effect: { kind: 'ratingDelta', deltas: { POW: -10, CON: -15 },
      perTier: { l1: { POW: -5, CON: -8 }, l3: { POW: -20, CON: -30 } } },
    predicates: [{ kind: 'vsHand', hand: 'opposite' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'While pitching, opposite-handed opposing batters suffer decreased contact and power.'",
    notes: 'Pitcher trait debuffing OPPOSITE-handed batters. Switch hitters always bat opposite -> "always victims to Reverse Splits" — the only counter to switch hitters in the game.',
  },
  {
    name: 'Sign Stealer',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Chance per pitch of an audio/visual cue revealing fastball vs off-speed: 5% (L1) / 10% (L2) / 20% (L3). EV: small anticipation edge; guide rates it marginal ("not a trait worth seeking out on its own").' },
    predicates: [{ kind: 'always' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'audio and visual cue of whether a fastball or off-speed pitch is coming'",
    notes: 'Per-tier values are guide-explicit in the EV description (5%/10%/20% cue chance by tier) — perTier field is ratingDelta-only by schema. T2-AUDIT S2 remediation.',
  },
  {
    name: 'Slow Poke',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { SPD: -5 } },
    predicates: [{ kind: 'runningOutOfBox' }],
    potency: 'standardInverted',
    citation: "Guide §Traits/COMPETITIVE: 'Decreased running speed while running out of the batter’s box.'",
    notes: 'Mirror of Sprinter. Delta is workbook L2 rating-equivalent (A10); guide line "(x4)/(x2)/(x1)" inverted.',
  },
  {
    name: 'Specialist',
    target: 'opponent',
    effect: { kind: 'ratingDelta', deltas: { POW: -10, CON: -15 },
      perTier: { l1: { POW: -5, CON: -8 }, l3: { POW: -20, CON: -30 } } },
    predicates: [{ kind: 'vsHand', hand: 'same' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'While pitching, same-handed opposing batters suffer decreased contact and power.'",
    notes: 'Spec §4.3 hard case — direction confirmed: trait sits ON THE PITCHER and debuffs SAME-handed opposing batters. Switch hitters always bat opposite -> "switch hitters will always avoid Specialist".',
  },
  {
    name: 'Sprinter',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { SPD: 5 } },
    predicates: [{ kind: 'runningOutOfBox' }],
    potency: 'standard',
    citation: "Guide §Traits/COMPETITIVE: 'Increased running speed while running out of the batter’s box'",
    notes: 'Spec §4.3 "run-out-of-box SPD". Synergy with Bunter ("can help maximize the Bunter trait"). Delta is workbook L2 rating-equivalent (A10).',
  },
  {
    name: 'Stealer',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { SPD: 7 } },
    predicates: [{ kind: 'stealAttempt' }],
    potency: 'standard',
    citation: "Guide §Traits/CRAFTY: 'Increased running speed while attempting to steal a base.'",
    notes: 'Delta is workbook L2 rating-equivalent (A10).',
  },
  {
    name: 'Stimulated',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Chance Fitness becomes Juiced for the final 2.5 innings: 5% (L1) / 10% (L2) / 20% (L3). Model as EV: chance x Juiced stat boost over ~28% of the game; guide: "too inconsistent to plan around".' },
    predicates: [{ kind: 'inningRange', lastNInnings: 2.5 }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'Chance of Fitness becoming Juiced for the final 2 and a half innings.'",
    notes: 'Spec §4.3 hard case: random late-game fitness juice -> EV model with inningRange predicate.',
  },
  {
    name: 'Surrounded',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { VEL: -10, JNK: -10, ACC: -10 },
      perTier: { l1: { VEL: -20, JNK: -20, ACC: -20 }, l3: { VEL: -5, JNK: -5, ACC: -5 } } },
    predicates: [{ kind: 'runnersOn', min: 2 }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Negative Velocity, Junk, and Accuracy when pitching with at least two runners on base.'",
    notes: 'Negative mirror of Rally Stopper; same >=2 runners trigger (A12).',
  },
  {
    name: 'Tough Out',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { CON: 25 },
      perTier: { l1: { CON: 12 }, l3: { CON: 50 } } },
    predicates: [{ kind: 'twoStrikes' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/COMPETITIVE: 'Increased Contact when batting with a 2-strike count'",
    notes: '"Remains active for the rest of the at bat once the count reaches two strikes" — twoStrikes is reach-based, persists through fouls. Computable standoff vs K Collector (spec §4.3).',
  },
  {
    name: 'Two Way (C)',
    target: 'self',
    effect: { kind: 'fieldingPenaltyReduction', reductionPct: 75 },
    predicates: [{ kind: 'playingPosition', scope: 'catcher' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Reduced fielding penalty when playing Infield OR Outfield OR Catcher.'",
    notes: 'Per-tier (guide): reduce penalty 50% (L1) / 75% (L2) / no penalty (L3=100%). Pitcher playing catcher. Hitting value of two-way players is intrinsic (priced via POW/CON/SPD deltas in traitPricing).',
  },
  {
    name: 'Two Way (IF)',
    target: 'self',
    effect: { kind: 'fieldingPenaltyReduction', reductionPct: 75 },
    predicates: [{ kind: 'playingPosition', scope: 'infield' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Reduced fielding penalty when playing Infield OR Outfield OR Catcher.'",
    notes: 'Per-tier (guide): 50%/75%/100% penalty reduction. Pitcher playing infield (e.g. Fenomeno, "viable throughout the infield").',
  },
  {
    name: 'Two Way (OF)',
    target: 'self',
    effect: { kind: 'fieldingPenaltyReduction', reductionPct: 75 },
    predicates: [{ kind: 'playingPosition', scope: 'outfield' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SPIRITED: 'Reduced fielding penalty when playing Infield OR Outfield OR Catcher.'",
    notes: 'Per-tier (guide): 50%/75%/100% penalty reduction. Pitcher playing outfield.',
  },
  {
    name: 'Utility',
    target: 'self',
    effect: { kind: 'fieldingPenaltyReduction', reductionPct: 50 },
    predicates: [{ kind: 'playingPosition', scope: 'secondaryPosition' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/SCHOLARLY: 'Reduced fielding penalty when playing at a secondary position.'",
    notes: 'Per-tier (guide): -25% (L1) / -50% (L2) / no penalty (L3=100%). Secondary-position penalty only — does NOT help at tertiary/other positions (guide §Players: severe penalty there). Feeds §4.5 positional value vector.',
  },
  {
    name: 'Volatile',
    target: 'self',
    effect: { kind: 'mojoTransitionRate', factor: 1.25 },
    predicates: [{ kind: 'always' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/DISCIPLINED: 'Mojo changes at a faster rate from play to play and game to game'",
    notes: 'Guide-explicit rates: 12.5%/25%/50% faster -> factors L1 1.125 / L2 1.25 / L3 1.5. Faster BOTH ways (spec §4.2) — high-ceiling/low-floor.',
  },
  {
    name: 'Whiffer',
    target: 'self',
    effect: { kind: 'ratingDelta', deltas: { CON: -25 },
      perTier: { l1: { CON: -50 }, l3: { CON: -12 } } },
    predicates: [{ kind: 'twoStrikes' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/COMPETITIVE: 'Decreased Contact when batting with a 2-strike count'",
    notes: 'THE numeric anchor for the A1 negative-potency ruling: DeMarco 37 CON "still sitting at 25 contact" at maxed Competitive -> L3 = -12.',
  },
  {
    name: 'Wild Thing',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Power pitches held too long suffer increased location error, scaling x4 (L1) / x2 (L2) / x1 (L3). In shared-screen versus play: 10% chance power pitches have increased location error. Magnitude unpublished.' },
    predicates: [{ kind: 'always' }],
    potency: 'standardInverted',
    citation: "Guide §Traits/SPIRITED: 'Increased error in pitch location when holding down a power pitch for too long.'",
    notes: 'Conditional on the USER’s power-pitch usage (controllable input, not GameContext) — hence always + EV. Severity depends on play style per guide.',
  },
  {
    name: 'Wild Thrower',
    target: 'self',
    effect: { kind: 'expectedValueNote', description: 'Errant-throw chance on fielding throws: +10% (L1) / +5% (L2) / +2.5% (L3). EV: scale errorLikelihood in DefensivePlacementRisk (§4.5); errors also drag mojo (spec §4.2).' },
    predicates: [{ kind: 'fieldingChance' }],
    potency: 'guideExplicit',
    citation: "Guide §Traits/CRAFTY: 'Increased chance of an errant throw'",
    notes: 'Per-tier values are guide-explicit in the EV description (+10/+5/+2.5% errant-throw by tier; note INVERTED severity: worst at L1) — perTier field is ratingDelta-only by schema. T2-AUDIT S2 remediation.',
  },
  {
    name: 'Workhorse',
    target: 'self',
    effect: { kind: 'staminaModifier', pitches: 30 },
    predicates: [{ kind: 'always' }],
    potency: 'standard',
    citation: "Guide §Team Analysis (Crocodons): 'would allow Brick to throw 130 pitches in a game'",
    notes: 'No dedicated guide Traits entry (A7). Derived: SP base ~70 pitches + L3 bonus = 130 -> L3 +60, L2 +30, L1 +15 (standard x1/x2/x4). Also "makes him tire slower" (§Traits/DISCIPLINED highlight, Brick); slower-tiring compounds with high mojo (spec §4.2/§4.4).',
  },
];
