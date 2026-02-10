/**
 * Nickname Engine (GAP-B10-002)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
 *
 * 16 auto-nickname triggers with user override support.
 */

// ============================================
// TYPES
// ============================================

export type NicknameId =
  | 'MR_OCTOBER' | 'MR_CLUTCH'
  | 'THE_ACE' | 'THE_MACHINE' | 'THE_NATURAL'
  | 'THE_WIZARD' | 'GOLDEN_ARM'
  | 'MR_500' | 'MR_3000'
  | 'THE_KID' | 'THE_VETERAN' | 'CAPTAIN'
  | 'THE_WHIFF_KING' | 'MR_GLASS'
  | 'IRON_MAN' | 'THE_CLOSER';

export interface NicknameRecord {
  nicknameId: NicknameId;
  displayName: string;
  earnedSeason: number;
  isCustom: boolean;
}

export interface NicknamePlayerContext {
  playerId: string;
  position: string;
  age: number;
  seasonsWithTeam: number;
  fame: number;
  // Career stats
  careerHR: number;
  careerHits: number;
  // Season stats
  seasonStrikeouts: number;
  consecutiveGamesWithHit: number;
  walkOffHits: number;
  playoffClutchMoments: number;
  injuredGames: number;
  seasons: number;
  war: number;
  // Awards
  mvpAwards: number;
  cyYoungAwards: number;
  allStarSelections: number;
  goldGloves: number;
  // Season-specific
  seasonWins?: number;
  assists?: number;
  saves?: number;
  isRookie: boolean;
  consecutiveGamesPlayed?: number;
}

// ============================================
// NICKNAME TRIGGERS (16)
// ============================================

interface NicknameTrigger {
  id: NicknameId;
  displayName: string;
  check: (ctx: NicknamePlayerContext) => boolean;
}

export const NICKNAME_TRIGGERS: NicknameTrigger[] = [
  // Clutch Performance
  {
    id: 'MR_OCTOBER',
    displayName: 'Mr. October',
    check: (p) => p.playoffClutchMoments >= 5,
  },
  {
    id: 'MR_CLUTCH',
    displayName: 'Mr. Clutch',
    check: (p) => p.walkOffHits >= 5,
  },
  // Dominance
  {
    id: 'THE_ACE',
    displayName: 'The Ace',
    check: (p) => p.cyYoungAwards >= 1 && (p.seasonWins ?? 0) >= 20,
  },
  {
    id: 'THE_MACHINE',
    displayName: 'The Machine',
    check: (p) => p.consecutiveGamesWithHit >= 30,
  },
  {
    id: 'THE_NATURAL',
    displayName: 'The Natural',
    check: (p) => p.isRookie && p.war >= 5.0,
  },
  // Position-based
  {
    id: 'THE_WIZARD',
    displayName: 'The Wizard',
    check: (p) => p.goldGloves >= 3 && ['SS', '2B'].includes(p.position),
  },
  {
    id: 'GOLDEN_ARM',
    displayName: 'Golden Arm',
    check: (p) => p.position === 'RF' && (p.assists ?? 0) >= 15,
  },
  // Milestones
  {
    id: 'MR_500',
    displayName: 'Mr. 500',
    check: (p) => p.careerHR >= 500,
  },
  {
    id: 'MR_3000',
    displayName: 'Mr. 3000',
    check: (p) => p.careerHits >= 3000,
  },
  // Age/Experience
  {
    id: 'THE_KID',
    displayName: 'The Kid',
    check: (p) => p.age <= 22 && p.allStarSelections >= 1,
  },
  {
    id: 'THE_VETERAN',
    displayName: 'The Veteran',
    check: (p) => p.age >= 38 && p.war >= 2.0,
  },
  {
    id: 'CAPTAIN',
    displayName: 'Captain',
    check: (p) => p.seasonsWithTeam >= 8 && p.fame >= 3,
  },
  // Negative/Dubious
  {
    id: 'THE_WHIFF_KING',
    displayName: 'The Whiff King',
    check: (p) => p.seasonStrikeouts >= 200,
  },
  {
    id: 'MR_GLASS',
    displayName: 'Mr. Glass',
    check: (p) => p.injuredGames >= 50 && p.seasons >= 3,
  },
  // Extra triggers
  {
    id: 'IRON_MAN',
    displayName: 'Iron Man',
    check: (p) => (p.consecutiveGamesPlayed ?? 0) >= 162,
  },
  {
    id: 'THE_CLOSER',
    displayName: 'The Closer',
    check: (p) => (p.saves ?? 0) >= 40,
  },
];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Check if a player qualifies for any auto-generated nickname.
 * Returns the highest-priority matching nickname, or null.
 */
export function checkForNickname(
  ctx: NicknamePlayerContext,
  currentSeason: number,
): NicknameRecord | null {
  for (const trigger of NICKNAME_TRIGGERS) {
    if (trigger.check(ctx)) {
      return {
        nicknameId: trigger.id,
        displayName: trigger.displayName,
        earnedSeason: currentSeason,
        isCustom: false,
      };
    }
  }
  return null;
}

/**
 * Check all triggers and return ALL matching nicknames (not just first).
 */
export function checkAllNicknames(
  ctx: NicknamePlayerContext,
  currentSeason: number,
): NicknameRecord[] {
  return NICKNAME_TRIGGERS
    .filter(trigger => trigger.check(ctx))
    .map(trigger => ({
      nicknameId: trigger.id,
      displayName: trigger.displayName,
      earnedSeason: currentSeason,
      isCustom: false,
    }));
}

/**
 * Create a custom (user-override) nickname record.
 */
export function createCustomNickname(
  nickname: string,
  season: number,
): NicknameRecord {
  return {
    nicknameId: 'MR_CLUTCH', // placeholder ID for custom
    displayName: nickname,
    earnedSeason: season,
    isCustom: true,
  };
}

/**
 * Format nickname for display. Custom nicknames show in quotes.
 */
export function formatNickname(record: NicknameRecord): string {
  if (record.isCustom) {
    return `"${record.displayName}"`;
  }
  return record.displayName;
}
