/**
 * Trait Pools Configuration — SMB4-Authentic Traits
 * T1-11: Replaced made-up traits with real SMB4 traits from smb4_traits_reference.md
 *
 * Features:
 * - Traits organized by tier (S/A/B/C) based on game impact
 * - Positive and negative trait pools per SMB4 chemistry types
 * - Batter-specific and pitcher-specific traits
 */

export interface Trait {
  id: string;
  name: string;
  description: string;
  tier: 'S' | 'A' | 'B' | 'C';
  type: 'positive' | 'negative' | 'neutral';
  applicableTo: 'batter' | 'pitcher' | 'both';
}

// S-Tier Traits (Rare, highly impactful — the best traits in SMB4)
export const S_TIER_TRAITS: Trait[] = [
  {
    id: 'clutch',
    name: 'Clutch',
    description: 'Boost to all skills when pressure is high (2x when extreme)',
    tier: 'S',
    type: 'positive',
    applicableTo: 'both',
  },
  {
    id: 'k_collector',
    name: 'K Collector',
    description: 'Additional VEL/JNK with 2-strike count',
    tier: 'S',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'tough_out',
    name: 'Tough Out',
    description: 'Increased Contact with 2-strike count',
    tier: 'S',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'two_way',
    name: 'Two Way',
    description: 'Reduced fielding penalty at IF/OF/C',
    tier: 'S',
    type: 'positive',
    applicableTo: 'batter',
  },
];

// A-Tier Traits (Uncommon, strong impact)
export const A_TIER_TRAITS: Trait[] = [
  {
    id: 'cannon_arm',
    name: 'Cannon Arm',
    description: 'Increased throw speed when throwing with max power',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'durable',
    name: 'Durable',
    description: 'Reduced injury chance, slower Fitness decay',
    tier: 'A',
    type: 'positive',
    applicableTo: 'both',
  },
  {
    id: 'sprinter',
    name: 'Sprinter',
    description: 'Increased speed running out of batter\'s box',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'stealer',
    name: 'Stealer',
    description: 'Increased running speed when stealing',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'magic_hands',
    name: 'Magic Hands',
    description: 'Decreased chance of missed catch (dive/jump/slide)',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'dive_wizard',
    name: 'Dive Wizard',
    description: 'Faster recoveries from diving catches',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'rally_stopper',
    name: 'Rally Stopper',
    description: '+VEL/JNK/ACC when pitching with 2+ runners on base',
    tier: 'A',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'rbi_hero',
    name: 'RBI Hero',
    description: 'Bonus POW/CON with runner on 2B or 3B',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'first_pitch_slayer',
    name: 'First Pitch Slayer',
    description: 'Bonus POW/CON on 0-0 count',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'gets_ahead',
    name: 'Gets Ahead',
    description: 'Increased ACC on 0-0 count',
    tier: 'A',
    type: 'positive',
    applicableTo: 'pitcher',
  },
];

// B-Tier Traits (Common, moderate impact)
export const B_TIER_TRAITS: Trait[] = [
  {
    id: 'utility',
    name: 'Utility',
    description: 'Reduced fielding penalty at secondary position',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'composed',
    name: 'Composed',
    description: 'Increased ACC in 3-ball counts',
    tier: 'B',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Mojo changes at slower rate',
    tier: 'B',
    type: 'positive',
    applicableTo: 'both',
  },
  {
    id: 'rally_starter',
    name: 'Rally Starter',
    description: 'Contact bonus when losing with bases empty',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'ace_exterminator',
    name: 'Ace Exterminator',
    description: '+POW/+CON vs A- or better pitchers',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'bad_ball_hitter',
    name: 'Bad Ball Hitter',
    description: 'Reduced penalty for contact outside zone',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'mind_gamer',
    name: 'Mind Gamer',
    description: 'While batting, opposing pitcher suffers -ACC',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'metal_head',
    name: 'Metal Head',
    description: 'Chance to recover instantly from comebacker',
    tier: 'B',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'specialist',
    name: 'Specialist',
    description: 'Same-handed batters suffer -POW/-CON',
    tier: 'B',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'reverse_splits',
    name: 'Reverse Splits',
    description: 'Opposite-handed batters suffer -POW/-CON',
    tier: 'B',
    type: 'positive',
    applicableTo: 'pitcher',
  },
];

// C-Tier Traits (Common, small impact or situational)
export const C_TIER_TRAITS: Trait[] = [
  {
    id: 'pinch_perfect',
    name: 'Pinch Perfect',
    description: 'Improved stats when entering game as substitute',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'base_rounder',
    name: 'Base Rounder',
    description: 'Increased running speed while rounding bases',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'stimulated',
    name: 'Stimulated',
    description: 'Chance of Juiced Fitness for final 2.5 innings',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'pick_officer',
    name: 'Pick Officer',
    description: 'Opposing baserunners slower when stealing',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'sign_stealer',
    name: 'Sign Stealer',
    description: 'Chance of audio/visual cue for pitch type',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'distractor',
    name: 'Distractor',
    description: 'While on 1B/2B (next base open), pitcher -ACC',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'bunter',
    name: 'Bunter',
    description: 'Bunting down foul line is easier',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'big_hack',
    name: 'Big Hack',
    description: '+POW/-CON in 2-0, 3-0, 3-1 counts',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'little_hack',
    name: 'Little Hack',
    description: '+CON/-POW in 0-1, 0-2, 1-2 counts',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'fastball_hitter',
    name: 'Fastball Hitter',
    description: 'Improved POW/CON vs 4F/CF/2F',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'offspeed_hitter',
    name: 'Off-Speed Hitter',
    description: 'Improved POW/CON vs CB/SL/CH/FK/SB',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'low_pitch',
    name: 'Low Pitch',
    description: 'Improved POW/CON vs low pitches',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'high_pitch',
    name: 'High Pitch',
    description: 'Improved POW/CON vs high pitches',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'inside_pitch',
    name: 'Inside Pitch',
    description: 'Improved POW/CON vs inside pitches',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'outside_pitch',
    name: 'Outside Pitch',
    description: 'Improved POW/CON vs outside pitches',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'con_vs_lhp',
    name: 'CON vs LHP',
    description: 'Bonus contact vs left-handed pitchers',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'con_vs_rhp',
    name: 'CON vs RHP',
    description: 'Bonus contact vs right-handed pitchers',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'pow_vs_lhp',
    name: 'POW vs LHP',
    description: 'Bonus power vs left-handed pitchers',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'pow_vs_rhp',
    name: 'POW vs RHP',
    description: 'Bonus power vs right-handed pitchers',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'elite_4f',
    name: 'Elite 4F',
    description: 'Increased pitch speed on 4-seam fastball',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'elite_2f',
    name: 'Elite 2F',
    description: 'Increased speed/break on 2-seam fastball',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'elite_cf',
    name: 'Elite CF',
    description: 'Increased speed/break on cut fastball',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'elite_fk',
    name: 'Elite FK',
    description: 'Increased speed/break on forkball',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'elite_sl',
    name: 'Elite SL',
    description: 'Increased speed/break on slider',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'elite_cb',
    name: 'Elite CB',
    description: 'Increased break on curveball',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'elite_ch',
    name: 'Elite CH',
    description: 'Decreased speed/increased break on changeup',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'elite_sb',
    name: 'Elite SB',
    description: 'Decreased speed/increased break on screwball',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
];

// Negative Traits (Can be acquired through poor performance — real SMB4 traits)
export const NEGATIVE_TRAITS: Trait[] = [
  {
    id: 'choker',
    name: 'Choker',
    description: 'Subtracted skills when pressure is high (2x extreme)',
    tier: 'B',
    type: 'negative',
    applicableTo: 'both',
  },
  {
    id: 'meltdown',
    name: 'Meltdown',
    description: '-ACC after 4 consecutive batters reach (no outs)',
    tier: 'S',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'whiffer',
    name: 'Whiffer',
    description: 'Decreased Contact with 2-strike count',
    tier: 'A',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'injury_prone',
    name: 'Injury Prone',
    description: 'Increased injury chance, faster Fitness decay',
    tier: 'B',
    type: 'negative',
    applicableTo: 'both',
  },
  {
    id: 'volatile',
    name: 'Volatile',
    description: 'Mojo changes at faster rate',
    tier: 'B',
    type: 'negative',
    applicableTo: 'both',
  },
  {
    id: 'k_neglecter',
    name: 'K Neglecter',
    description: 'Decreased VEL/JNK with 2-strike count',
    tier: 'A',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'slow_poke',
    name: 'Slow Poke',
    description: 'Decreased speed running out of batter\'s box',
    tier: 'B',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'first_pitch_prayer',
    name: 'First Pitch Prayer',
    description: 'Decreased POW/CON on 0-0 count',
    tier: 'B',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'noodle_arm',
    name: 'Noodle Arm',
    description: 'Decreased throw speed when not max power',
    tier: 'B',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'bad_jumps',
    name: 'Bad Jumps',
    description: 'Decreased running speed when stealing',
    tier: 'C',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'easy_jumps',
    name: 'Easy Jumps',
    description: 'Baserunners gain speed when stealing vs pitcher',
    tier: 'C',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'wild_thrower',
    name: 'Wild Thrower',
    description: 'Increased chance of errant throw',
    tier: 'B',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'easy_target',
    name: 'Easy Target',
    description: 'While batting, opposing pitcher gains +ACC',
    tier: 'C',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'base_jogger',
    name: 'Base Jogger',
    description: 'Decreased running speed while rounding bases',
    tier: 'C',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'bb_prone',
    name: 'BB Prone',
    description: 'Decreased ACC in 3-ball counts',
    tier: 'B',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'butter_fingers',
    name: 'Butter Fingers',
    description: 'Increased missed catch chance (dive/jump/slide)',
    tier: 'B',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'surrounded',
    name: 'Surrounded',
    description: '-VEL/JNK/ACC when pitching with 2+ runners on',
    tier: 'B',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'wild_thing',
    name: 'Wild Thing',
    description: 'Increased error on held power pitches',
    tier: 'B',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'rbi_zero',
    name: 'RBI Zero',
    description: 'Subtracted POW/CON with runner on 2B or 3B',
    tier: 'B',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'falls_behind',
    name: 'Falls Behind',
    description: 'Decreased ACC on 0-0 count',
    tier: 'B',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'crossed_up',
    name: 'Crossed Up',
    description: 'Increased chance catcher drops pitch',
    tier: 'C',
    type: 'negative',
    applicableTo: 'pitcher',
  },
];

// Utility functions
export const getAllTraits = (): Trait[] => [
  ...S_TIER_TRAITS,
  ...A_TIER_TRAITS,
  ...B_TIER_TRAITS,
  ...C_TIER_TRAITS,
  ...NEGATIVE_TRAITS,
];

export const getTraitsByTier = (tier: 'S' | 'A' | 'B' | 'C'): Trait[] => {
  switch (tier) {
    case 'S':
      return S_TIER_TRAITS;
    case 'A':
      return A_TIER_TRAITS;
    case 'B':
      return B_TIER_TRAITS;
    case 'C':
      return C_TIER_TRAITS;
    default:
      return [];
  }
};

export const getPositiveTraits = (): Trait[] =>
  getAllTraits().filter((t) => t.type === 'positive');

export const getNegativeTraits = (): Trait[] =>
  getAllTraits().filter((t) => t.type === 'negative');

export const getTraitsForPlayer = (
  isPitcher: boolean,
  excludeNegative: boolean = true
): Trait[] => {
  const all = excludeNegative ? getPositiveTraits() : getAllTraits();
  return all.filter(
    (t) => t.applicableTo === 'both' || t.applicableTo === (isPitcher ? 'pitcher' : 'batter')
  );
};

/**
 * Get weighted random trait pool for lottery
 * S-tier: 5% chance
 * A-tier: 15% chance
 * B-tier: 35% chance
 * C-tier: 45% chance
 */
export const getWeightedTraitPool = (
  isPitcher: boolean,
  poolSize: number = 12
): Trait[] => {
  const applicable = getTraitsForPlayer(isPitcher, true);

  const sTier = applicable.filter((t) => t.tier === 'S');
  const aTier = applicable.filter((t) => t.tier === 'A');
  const bTier = applicable.filter((t) => t.tier === 'B');
  const cTier = applicable.filter((t) => t.tier === 'C');

  const pool: Trait[] = [];
  const targetCounts = {
    S: Math.max(1, Math.round(poolSize * 0.05)),
    A: Math.round(poolSize * 0.15),
    B: Math.round(poolSize * 0.35),
    C: Math.round(poolSize * 0.45),
  };

  // Randomly select from each tier
  const selectRandom = (arr: Trait[], count: number): Trait[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  };

  pool.push(...selectRandom(sTier, targetCounts.S));
  pool.push(...selectRandom(aTier, targetCounts.A));
  pool.push(...selectRandom(bTier, targetCounts.B));
  pool.push(...selectRandom(cTier, targetCounts.C));

  // Fill remaining slots if needed
  while (pool.length < poolSize && applicable.length > pool.length) {
    const remaining = applicable.filter((t) => !pool.includes(t));
    if (remaining.length === 0) break;
    pool.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }

  return pool.sort(() => Math.random() - 0.5);
};
