/**
 * traitPricing.ts — Trait rating-equivalents + pitch/arsenal/aux pricing (DATA ONLY, generated).
 *
 * Source workbook: spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx
 *   - 'Traits' sheet rows 3-77: 75 traits (deltas cols C-J, flat fee col K, multipliers cols L-S,
 *     polarity col U). Values are Chemistry Level 2 baseline (LeagueSettings 'Restrict to Level 2
 *     Chemistry' = True); potency scaling 0.5/1.0/2.0 applied downstream (spec §3.5).
 *   - 'Traits' sheet HANDED / PITCHES / 2nd POSITION / Arm Angle blocks (rows 78-106): aux pricing.
 *   - 'LeagueSettings' A47:B59: bullpen arsenal tax table.
 * Extracted: 2026-06-10 by scripts/extract-iv-data.py — DO NOT EDIT BY HAND; rerun the script.
 * Spec: spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.5 (marginal pricing incl. multiplier terms), §3.6 (table + blanks)
 *
 * Blank source cells: delta blanks -> 0, multiplier blanks -> 1 (both no-ops in §3.5 pricing).
 * The §3.6 '·' cells were all verified EMPTY in the workbook, but several of those traits carry
 * their pricing in the MULTIPLIER columns the §3.6 table omits (e.g. Elite 4F VEL x1.9,
 * Rally Stopper VEL x1.15, Reverse Splits x1.45/1.4/1.4, Specialist x1.3/1.4/1.3).
 */

export type PricedAttr = 'POW' | 'CON' | 'SPD' | 'FLD' | 'ARM' | 'VEL' | 'JNK' | 'ACC';

export type ChemistryType = 'Competitive' | 'Crafty' | 'Disciplined' | 'Scholarly' | 'Spirited';

export interface TraitPricingEntry {
  name: string;                              // workbook label minus ' (+)'/' (-)' suffix
  chemistry: ChemistryType;
  polarity: 'positive' | 'negative';
  deltas: Record<PricedAttr, number>;        // rating-equivalents (L2 baseline)
  multipliers: Record<PricedAttr, number>;   // attrCost x mult - attrCost terms (1 = no-op)
  flatFee: number;                           // flat $ added
}

export const TRAIT_PRICING: TraitPricingEntry[] = [
  {
    name: 'Ace Exterminator', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 10, CON: 3, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Bad Ball Hitter', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 15, CON: 12, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Bad Jumps', chemistry: 'Crafty', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: -7, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Base Jogger', chemistry: 'Disciplined', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: -5, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Base Rounder', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 2.5, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'BB Prone', chemistry: 'Disciplined', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: -3 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Big Hack', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 11, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Bunter', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 2, SPD: 2, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Butter Fingers', chemistry: 'Disciplined', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: -15, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Cannon Arm', chemistry: 'Competitive', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 45, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Choker', chemistry: 'Spirited', polarity: 'negative',
    deltas: { POW: -2, CON: -2, SPD: -2, FLD: -2, ARM: -2, VEL: -2, JNK: -2, ACC: -2 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Clutch', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 2.5, CON: 2.5, SPD: 2.5, FLD: 1, ARM: 1, VEL: 5, JNK: 4, ACC: 4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Composed', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'CON vs LHP', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 0, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'CON vs RHP', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 0, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Consistent', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 0.4, CON: 0.4, SPD: 0.4, FLD: 0.4, ARM: 0.4, VEL: 0.4, JNK: 0.4, ACC: 0.4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Crossed Up', chemistry: 'Scholarly', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: -2.5, JNK: -2.5, ACC: -4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Distractor', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 3.5, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Dive Wizard', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 7, ARM: 5, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Durable', chemistry: 'Competitive', polarity: 'positive',
    deltas: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Easy Jumps', chemistry: 'Crafty', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: -2, JNK: -2, ACC: -2 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Easy Target', chemistry: 'Crafty', polarity: 'negative',
    deltas: { POW: -2, CON: -3, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Elite 2F', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.18, JNK: 1.45, ACC: 1.1 },
    flatFee: 500,
  },
  {
    name: 'Elite 4F', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.9, JNK: 1, ACC: 1.1 },
    flatFee: 22000,
  },
  {
    name: 'Elite CB', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.1, JNK: 1.48, ACC: 1.1 },
    flatFee: 500,
  },
  {
    name: 'Elite CF', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.18, JNK: 1.45, ACC: 1.1 },
    flatFee: 500,
  },
  {
    name: 'Elite CH', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.25, JNK: 1.05, ACC: 1.1 },
    flatFee: 3000,
  },
  {
    name: 'Elite FK', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.1, JNK: 1.1, ACC: 1.1 },
    flatFee: 500,
  },
  {
    name: 'Elite SB', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.05, JNK: 1.6, ACC: 1.1 },
    flatFee: 500,
  },
  {
    name: 'Elite SL', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.05, JNK: 1.4, ACC: 1.1 },
    flatFee: 500,
  },
  {
    name: 'Falls Behind', chemistry: 'Scholarly', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: -7 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Fastball Hitter', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 3, CON: 7, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'First Pitch Prayer', chemistry: 'Competitive', polarity: 'negative',
    deltas: { POW: -2, CON: -4, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'First Pitch Slayer', chemistry: 'Competitive', polarity: 'positive',
    deltas: { POW: 2, CON: 4, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Gets Ahead', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'High Pitch', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 5, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Injury Prone', chemistry: 'Competitive', polarity: 'negative',
    deltas: { POW: -1, CON: -1, SPD: -1, FLD: -1, ARM: -1, VEL: -0.9, JNK: -1, ACC: -1 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Inside Pitch', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 5, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'K Collector', chemistry: 'Competitive', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 9, JNK: 9, ACC: 4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 2000,
  },
  {
    name: 'K Neglector', chemistry: 'Competitive', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: -5, JNK: -4, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Little Hack', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 3, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Low Pitch', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 5, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Magic Hands', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 5, ARM: 7, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Meltdown', chemistry: 'Spirited', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: -2 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Metal Head', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0.03, JNK: 0.03, ACC: 0.03 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Mind Gamer', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 2, CON: 3, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Noodle Arm', chemistry: 'Competitive', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: -25, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Off-Speed Hitter', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 3, CON: 7, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Outside Pitch', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 5, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Pick Officer', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 1.5, JNK: 1.5, ACC: 1.5 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Pinch Perfect', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 6, CON: 6, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'POW vs LHP', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 6, CON: 1, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'POW vs RHP', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 6, CON: 1, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Rally Starter', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 0, CON: 10, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Rally Stopper', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 5, JNK: 3, ACC: 3 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.15, JNK: 1, ACC: 1 },
    flatFee: 2000,
  },
  {
    name: 'RBI Hero', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 7, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'RBI Zero', chemistry: 'Spirited', polarity: 'negative',
    deltas: { POW: -10, CON: -6, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Reverse Splits', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.45, JNK: 1.4, ACC: 1.4 },
    flatFee: 8000,
  },
  {
    name: 'Sign Stealer', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 15, CON: 12, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Slow Poke', chemistry: 'Competitive', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: -5, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Specialist', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.3, JNK: 1.4, ACC: 1.3 },
    flatFee: 4000,
  },
  {
    name: 'Sprinter', chemistry: 'Competitive', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 5, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Stealer', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 7, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Stimulated', chemistry: 'Crafty', polarity: 'positive',
    deltas: { POW: 2, CON: 2, SPD: 2, FLD: 2, ARM: 2, VEL: 4, JNK: 4, ACC: 4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Surrounded', chemistry: 'Spirited', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: -4, JNK: -4, ACC: -4 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Tough Out', chemistry: 'Competitive', polarity: 'positive',
    deltas: { POW: 0, CON: 10, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Two Way (C)', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 15, CON: 15, SPD: 15, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Two Way (IF)', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 15, CON: 15, SPD: 15, FLD: 10, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Two Way (OF)', chemistry: 'Spirited', polarity: 'positive',
    deltas: { POW: 15, CON: 15, SPD: 20, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Utility', chemistry: 'Scholarly', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 6, ARM: 6, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Volatile', chemistry: 'Disciplined', polarity: 'positive',
    deltas: { POW: 1.2, CON: 1.2, SPD: 1.2, FLD: 1.2, ARM: 1.2, VEL: 1.2, JNK: 1.2, ACC: 1.2 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Whiffer', chemistry: 'Competitive', polarity: 'negative',
    deltas: { POW: 0, CON: -15, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Wild Thing', chemistry: 'Spirited', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: -10 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Wild Thrower', chemistry: 'Crafty', polarity: 'negative',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: -30, VEL: 0, JNK: 0, ACC: 0 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 0,
  },
  {
    name: 'Workhorse', chemistry: 'Competitive', polarity: 'positive',
    deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 14, JNK: 14, ACC: 14 },
    multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 },
    flatFee: 2000,
  },
];

export type PitchType = '4F' | '2F' | 'CF' | 'SL' | 'CB' | 'SB' | 'CH' | 'FK';

export interface PitchCost {
  flatFee: number;
  multipliers: Record<PricedAttr, number>;   // pitch deltas are all 0 in source; value is flat+mult
}

// 'Traits' sheet PITCHES block (rows 81-88)
export const PITCH_COSTS: Record<PitchType, PitchCost> = {
  '4F': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.13, JNK: 1, ACC: 1.035 } },
  '2F': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.04, JNK: 1.1, ACC: 1.035 } },
  'CF': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.04, JNK: 1.1, ACC: 1.035 } },
  'SL': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1.1, ACC: 1.035 } },
  'CB': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1.25, ACC: 1.035 } },
  'SB': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1.4, ACC: 1.035 } },
  'CH': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.06, JNK: 1, ACC: 1.035 } },
  'FK': { flatFee: 500, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1.05, ACC: 1.035 } },
};

// LeagueSettings!A47:B59 — total pitch count across the bullpen -> $ adjustment
export const ARSENAL_TAX_TABLE: Record<number, number> = {
  8: -12000, 9: -10000, 10: -7000, 11: -4000, 12: -2000, 13: -1000, 14: 0, 15: 2000, 16: 5000, 17: 8000, 18: 13000, 19: 18000, 20: 24000,
};

export interface AuxPricingRow {
  deltas: Record<PricedAttr, number>;
  multipliers: Record<PricedAttr, number>;
  flatFee: number;
}

// 'Traits' sheet HANDED ('S' row), 2nd POSITION and Arm Angle blocks
export const AUX_PRICING: {
  switchHitter: AuxPricingRow;
  secondaryPositions: Record<string, AuxPricingRow>;
  armAngle: Record<'High' | 'Mid' | 'Low' | 'Sub', AuxPricingRow>;
} = {
  switchHitter: { deltas: { POW: 5, CON: 5, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
  secondaryPositions: {
    'C': { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 1, ARM: 2, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    '1B': { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 1, ARM: 0, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    '2B': { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 1.5, ARM: 1, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    'SS': { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 1.5, ARM: 1.5, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    '3B': { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 1, ARM: 1.5, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    'LF': { deltas: { POW: 0, CON: 0, SPD: 1, FLD: 1, ARM: 1, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    'CF': { deltas: { POW: 0, CON: 0, SPD: 1, FLD: 1, ARM: 1, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    'RF': { deltas: { POW: 0, CON: 0, SPD: 1, FLD: 1, ARM: 1, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    'IF': { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 15, ARM: 10, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    'OF': { deltas: { POW: 0, CON: 0, SPD: 10, FLD: 5, ARM: 10, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    'IF/OF': { deltas: { POW: 0, CON: 0, SPD: 10, FLD: 20, ARM: 20, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    '1B/OF': { deltas: { POW: 0, CON: 0, SPD: 10, FLD: 7, ARM: 10, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
  },
  armAngle: {
    High: { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    Mid: { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    Low: { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1, JNK: 1, ACC: 1 }, flatFee: 0 },
    Sub: { deltas: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0, VEL: 0, JNK: 0, ACC: 0 }, multipliers: { POW: 1, CON: 1, SPD: 1, FLD: 1, ARM: 1, VEL: 1.075, JNK: 1.2, ACC: 1 }, flatFee: 4000 },
  },
};
