/**
 * Editorial reporter-facing types.
 *
 * Guardrail: FameTier is distinct from the legacy 6-tier FameLevel in
 * src/types/game.ts, which remains Franchise-only and out of scope here.
 */

export type FameTier = 1 | 2 | 3 | 4 | 5;

export const FAME_TIER_LABEL: Record<FameTier, string> = {
  1: 'Unknown',
  2: 'Prospect',
  3: 'Veteran',
  4: 'Captain',
  5: 'Superstar',
};

export type PlayerArchetype =
  | 'GRIZZLED_VET'
  | 'HOT_ROOKIE'
  | 'JOURNEYMAN'
  | 'ACE'
  | 'SLUGGER'
  | 'SPEEDSTER'
  | 'GLOVE_WIZARD'
  | 'CLUBHOUSE_LEADER'
  | 'HEAD_CASE'
  | 'QUIET_PRO'
  | 'SHOWBOAT'
  | 'UTILITY_GUY';

export type EraFlavor = 'GOLDEN_AGE' | 'CLASSIC_TV' | 'MODERN_LOCAL';

export type ReporterPersonality =
  | 'OPTIMIST'
  | 'PESSIMIST'
  | 'BALANCED'
  | 'DRAMATIC'
  | 'ANALYTICAL'
  | 'HOMER'
  | 'CONTRARIAN'
  | 'INSIDER'
  | 'OLD_SCHOOL'
  | 'HOT_TAKE';

export type VoiceStyle =
  | 'THE_POET'
  | 'THE_REACTOR'
  | 'THE_HOLY_COW'
  | 'THE_PROFESSOR'
  | 'THE_HYPE_MAN'
  | 'THE_STORYTELLER'
  | 'THE_GRINDER'
  | 'THE_CALLER'
  | 'THE_GENTLEMAN';

export type ReporterAvatarEra = 'fedora' | 'headset' | 'cap';

export type ReporterGameMode = 'exhibition' | 'elimination' | 'franchise';

export type ReporterMomentum = 'HOT' | 'COLD' | 'NEUTRAL';

export interface BeatReporter {
  id: string;
  teamId: string;
  leagueId?: string;
  name: string;
  personality: ReporterPersonality;
  voiceStyle: VoiceStyle;
  eraFlavor: EraFlavor;
  avatarEra: ReporterAvatarEra;
  avatarColors: {
    primary: string;
    secondary: string;
  };
  currentMood: ReporterPersonality;
  moodMomentum: number;
  createdAt: number;
  updatedAt: number;
  changed_at: number;
  deleted?: boolean;
}

export interface GameStory {
  id: string;
  gameId: string;
  reporterId: string;
  teamId: string;
  leagueId?: string;
  gameMode: ReporterGameMode;
  headline: string;
  body: string;
  playersMentioned: string[];
  gameDate: string;
  opponentTeamId?: string;
  createdAt: number;
  changed_at: number;
  deleted?: boolean;
}

export interface NarrativeContext {
  id: string;
  teamId: string;
  leagueId?: string;
  gameMode: ReporterGameMode;
  activeStorylines: string[];
  recentMomentum: ReporterMomentum;
  currentMood: ReporterPersonality;
  rivalryIntensity: number;
  teamDnaFacts: string[];
  gameNarrativeSoFar: string;
  matchupHistory: string;
  lastGameSummary?: string;
  updatedAt: number;
  changed_at: number;
  deleted?: boolean;
}

export interface RivalryScore {
  id: string;
  teamId: string;
  leagueId?: string;
  rivalTeamId: string;
  intensity: number;
  origin?: string;
  createdAt: number;
  lastUpdated: number;
  changed_at: number;
  deleted?: boolean;
}

export interface CommentaryFeedEntryRecord {
  id: string;
  gameId: string;
  leagueId?: string;
  reporterId: string;
  commentaryText: string;
  halfInningLabel: string;
  timestamp: number;
  createdAt: number;
  changed_at: number;
  deleted?: boolean;
}
