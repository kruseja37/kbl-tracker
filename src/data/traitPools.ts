/**
 * Trait Pools Configuration
 * Per Ralph Framework S-D013
 *
 * Features:
 * - Traits organized by tier (S/A/B/C)
 * - Positive and negative trait pools
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

// S-Tier Traits (Rare, highly impactful)
export const S_TIER_TRAITS: Trait[] = [
  {
    id: 'clutch_master',
    name: 'Clutch Master',
    description: '+20% contact/power in high leverage situations',
    tier: 'S',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'ace',
    name: 'Ace',
    description: '+15% velocity and accuracy vs top of lineup',
    tier: 'S',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'five_tool',
    name: 'Five Tool',
    description: '+5 to all batting attributes',
    tier: 'S',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Extra movement on breaking pitches',
    tier: 'S',
    type: 'positive',
    applicableTo: 'pitcher',
  },
];

// A-Tier Traits (Uncommon, strong impact)
export const A_TIER_TRAITS: Trait[] = [
  {
    id: 'power_surge',
    name: 'Power Surge',
    description: '+10 power vs RHP',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'contact_specialist',
    name: 'Contact Specialist',
    description: '+10 contact, -5 power',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'strikeout_artist',
    name: 'Strikeout Artist',
    description: '+15% K rate',
    tier: 'A',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'ground_ball_machine',
    name: 'Ground Ball Machine',
    description: '+20% ground ball rate',
    tier: 'A',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'speedster',
    name: 'Speedster',
    description: '+10 speed, +20% steal success',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'iron_man',
    name: 'Iron Man',
    description: 'Fitness decay reduced by 50%',
    tier: 'A',
    type: 'positive',
    applicableTo: 'both',
  },
  {
    id: 'wall_crawler',
    name: 'Wall Crawler',
    description: '+30% catch probability at wall',
    tier: 'A',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'fireman',
    name: 'Fireman',
    description: '+10% effectiveness with runners on base',
    tier: 'A',
    type: 'positive',
    applicableTo: 'pitcher',
  },
];

// B-Tier Traits (Common, moderate impact)
export const B_TIER_TRAITS: Trait[] = [
  {
    id: 'patient_hitter',
    name: 'Patient Hitter',
    description: '+5 contact on 3-ball counts',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'aggressive_swinger',
    name: 'Aggressive Swinger',
    description: '+5 power on first pitch',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'quick_recovery',
    name: 'Quick Recovery',
    description: 'Faster mojo recovery after bad games',
    tier: 'B',
    type: 'positive',
    applicableTo: 'both',
  },
  {
    id: 'control_pitcher',
    name: 'Control Pitcher',
    description: '+5 accuracy, -3 velocity',
    tier: 'B',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'late_game_specialist',
    name: 'Late Game Specialist',
    description: '+5% effectiveness after 6th inning',
    tier: 'B',
    type: 'positive',
    applicableTo: 'both',
  },
  {
    id: 'home_field_boost',
    name: 'Home Field Boost',
    description: '+5 all stats at home',
    tier: 'B',
    type: 'positive',
    applicableTo: 'both',
  },
  {
    id: 'cannon_arm',
    name: 'Cannon Arm',
    description: '+10 arm strength',
    tier: 'B',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'pitch_tunneling',
    name: 'Pitch Tunneling',
    description: 'Similar release point on all pitches',
    tier: 'B',
    type: 'positive',
    applicableTo: 'pitcher',
  },
];

// C-Tier Traits (Common, small impact or situational)
export const C_TIER_TRAITS: Trait[] = [
  {
    id: 'day_game_player',
    name: 'Day Game Player',
    description: '+3 contact in day games',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: '+3 contact in night games',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'rally_starter',
    name: 'Rally Starter',
    description: '+3 contact when down 3+ runs',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
  {
    id: 'innings_eater',
    name: 'Innings Eater',
    description: 'Stamina depletes 10% slower',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'setup_specialist',
    name: 'Setup Specialist',
    description: '+5% effectiveness in 7th-8th inning',
    tier: 'C',
    type: 'positive',
    applicableTo: 'pitcher',
  },
  {
    id: 'pinch_hit_pro',
    name: 'Pinch Hit Pro',
    description: '+5 contact when pinch hitting',
    tier: 'C',
    type: 'positive',
    applicableTo: 'batter',
  },
];

// Negative Traits (Can be acquired through poor performance)
export const NEGATIVE_TRAITS: Trait[] = [
  {
    id: 'choke_artist',
    name: 'Choke Artist',
    description: '-15% contact/power in high leverage',
    tier: 'C',
    type: 'negative',
    applicableTo: 'batter',
  },
  {
    id: 'wild_thing',
    name: 'Wild Thing',
    description: '-10 accuracy',
    tier: 'B',
    type: 'negative',
    applicableTo: 'pitcher',
  },
  {
    id: 'slow_starter',
    name: 'Slow Starter',
    description: '-5 all stats in first 3 innings',
    tier: 'C',
    type: 'negative',
    applicableTo: 'both',
  },
  {
    id: 'injury_prone',
    name: 'Injury Prone',
    description: '+50% fitness decay rate',
    tier: 'B',
    type: 'negative',
    applicableTo: 'both',
  },
  {
    id: 'head_case',
    name: 'Head Case',
    description: 'Mojo swings are more extreme',
    tier: 'B',
    type: 'negative',
    applicableTo: 'both',
  },
  {
    id: 'hr_or_bust',
    name: 'HR or Bust',
    description: '+5 power, -10 contact',
    tier: 'C',
    type: 'negative',
    applicableTo: 'batter',
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

export const getNegativeTraits = (): Trait[] => NEGATIVE_TRAITS;

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
