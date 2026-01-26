/**
 * Narrative Morale Integration Hook
 * Per Ralph Framework GAP-046
 *
 * Wires narrativeEngine stories to fanMoraleEngine.
 * When a beat reporter publishes a story, fan morale is affected.
 */

import { useState, useCallback } from 'react';
import type { FanMorale, MoraleEvent, MoraleUpdate, GameDate } from '../engines/fanMoraleEngine';
import {
  initializeFanMorale,
  processMoraleEvent,
  getFanState,
  getRiskLevel,
} from '../engines/fanMoraleEngine';
import type { GeneratedNarrative, BeatReporter, NarrativeContext } from '../engines/narrativeEngine';
import { generateNarrative, calculateStoryMoraleImpact, getEffectivePersonality } from '../engines/narrativeEngine';

// ============================================
// TYPES
// ============================================

export interface NarrativeMoraleState {
  fanMorale: FanMorale;
  recentStories: StoryWithMoraleImpact[];
}

export interface StoryWithMoraleImpact {
  story: GeneratedNarrative;
  moraleChange: number;
  previousMorale: number;
  newMorale: number;
  publishedAt: GameDate;
}

export interface UseNarrativeMoraleReturn {
  // State
  fanMorale: FanMorale;
  recentStories: StoryWithMoraleImpact[];

  // Actions
  publishStory: (
    context: NarrativeContext,
    reporter: BeatReporter,
    gameDate: GameDate
  ) => StoryWithMoraleImpact;

  applyStoryMorale: (
    story: GeneratedNarrative,
    gameDate: GameDate
  ) => MoraleUpdate;

  resetMorale: (initialValue?: number) => void;
}

// ============================================
// HOOK
// ============================================

export function useNarrativeMorale(initialMorale: number = 50): UseNarrativeMoraleReturn {
  const [fanMorale, setFanMorale] = useState<FanMorale>(() =>
    initializeFanMorale(initialMorale)
  );
  const [recentStories, setRecentStories] = useState<StoryWithMoraleImpact[]>([]);

  /**
   * Generate a story and apply its morale impact
   */
  const publishStory = useCallback(
    (
      context: NarrativeContext,
      reporter: BeatReporter,
      gameDate: GameDate
    ): StoryWithMoraleImpact => {
      // Generate the story
      const story = generateNarrative(context, reporter);

      // Create morale event from story
      const moraleEvent: MoraleEvent = {
        id: `story_${Date.now()}`,
        type: 'EXPECTED_WINS_UPDATE', // Using this as a generic story type
        timestamp: gameDate,
        baseImpact: story.moraleImpact,
        modifiers: [],
        finalImpact: story.moraleImpact,
        previousMorale: fanMorale.current,
        newMorale: fanMorale.current + story.moraleImpact,
        narrative: `${story.reporter.name}: "${story.headline}"`,
        relatedEntities: {},
      };

      // Process the morale impact
      const { updatedMorale, update } = processMoraleEvent(fanMorale, moraleEvent);

      // Create story record
      const storyWithImpact: StoryWithMoraleImpact = {
        story,
        moraleChange: update.change,
        previousMorale: update.previousMorale,
        newMorale: update.newMorale,
        publishedAt: gameDate,
      };

      // Update state
      setFanMorale(updatedMorale);
      setRecentStories((prev) => [...prev.slice(-19), storyWithImpact]); // Keep last 20

      return storyWithImpact;
    },
    [fanMorale]
  );

  /**
   * Apply morale impact from an already-generated story
   */
  const applyStoryMorale = useCallback(
    (story: GeneratedNarrative, gameDate: GameDate): MoraleUpdate => {
      const moraleEvent: MoraleEvent = {
        id: `story_${Date.now()}`,
        type: 'EXPECTED_WINS_UPDATE',
        timestamp: gameDate,
        baseImpact: story.moraleImpact,
        modifiers: [],
        finalImpact: story.moraleImpact,
        previousMorale: fanMorale.current,
        newMorale: fanMorale.current + story.moraleImpact,
        narrative: `${story.reporter.name}: "${story.headline}"`,
        relatedEntities: {},
      };

      const { updatedMorale, update } = processMoraleEvent(fanMorale, moraleEvent);
      setFanMorale(updatedMorale);

      return update;
    },
    [fanMorale]
  );

  /**
   * Reset morale to initial state
   */
  const resetMorale = useCallback((initialValue: number = 50) => {
    setFanMorale(initializeFanMorale(initialValue));
    setRecentStories([]);
  }, []);

  return {
    fanMorale,
    recentStories,
    publishStory,
    applyStoryMorale,
    resetMorale,
  };
}

export default useNarrativeMorale;
