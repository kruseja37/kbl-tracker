/**
 * Narrative Engine Integration
 *
 * MAJ-04: Wire narrative engine to Figma UI layer.
 * Re-exports narrative engine functions and provides Figma-specific helpers.
 */

// Re-export core types and functions from legacy engine
export {
  // Types
  type ReporterPersonality,
  type BeatReporter,
  type NarrativeContext,
  type NarrativeEventType,
  type GeneratedNarrative,
  type ReporterReputation,

  // Reporter generation
  generateBeatReporter,
  getReporterName,
  updateReporterReputation,
  advanceReporterSeason,

  // Personality system
  getEffectivePersonality,

  // Narrative generation
  generateNarrative,
  generateGameNarratives,

  // Morale calculation
  calculateStoryMoraleImpact,

  // Reliability
  determineStoryAccuracy,
  determineConfidenceLevel,
} from '../../../engines/narrativeEngine';

// ============================================
// FIGMA-SPECIFIC HELPERS
// ============================================

import type { NarrativeContext, GeneratedNarrative, BeatReporter } from '../../../engines/narrativeEngine';
import { generateNarrative, generateBeatReporter } from '../../../engines/narrativeEngine';

/**
 * Generate a game recap narrative from game end state.
 * Simplified interface for GameTracker integration.
 */
export function generateGameRecap(params: {
  teamName: string;
  opponentName: string;
  teamScore: number;
  opponentScore: number;
  isWalkOff?: boolean;
  isNoHitter?: boolean;
  isShutout?: boolean;
  keyPlayers?: Array<{ name: string; performance: string }>;
  reporter?: BeatReporter;
}): GeneratedNarrative {
  const won = params.teamScore > params.opponentScore;

  const context: NarrativeContext = {
    eventType: 'GAME_RECAP',
    teamName: params.teamName,
    gameResult: {
      won,
      score: { team: params.teamScore, opponent: params.opponentScore },
      opponentName: params.opponentName,
      isWalkOff: params.isWalkOff,
      isNoHitter: params.isNoHitter,
      isShutout: params.isShutout,
      keyPlayers: params.keyPlayers,
    },
  };

  // Use provided reporter or generate a temporary one
  const reporter = params.reporter || generateBeatReporter(params.teamName, { season: 1, game: 0 });

  return generateNarrative(context, reporter);
}
