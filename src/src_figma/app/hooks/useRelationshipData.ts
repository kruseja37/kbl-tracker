/**
 * useRelationshipData Hook
 * Per Ralph Framework S-F001, S-F002, S-F003
 *
 * React hook for managing player relationships and team chemistry.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  // Types
  RelationshipType,
  type Relationship,
  type TradeWarning,
  type TeamChemistrySummary,
  type RelationshipDisplayInfo,

  // Functions
  canCreateRelationship,
  createRelationship,
  getPlayerRelationships,
  calculateMoraleEffect,
  getMoraleBreakdown,
  generateTradeWarnings,
  endRelationship,
  getRelationshipDisplayInfo,
  calculateTeamChemistry,
  getChemistryRatingColor,
  getRelationshipsByCategory,
} from '../engines/relationshipIntegration';

// ============================================
// HOOK TYPES
// ============================================

export interface UseRelationshipDataReturn {
  // State
  relationships: Relationship[];
  teamChemistry: TeamChemistrySummary | null;

  // Player-specific
  getPlayerMoraleEffect: (playerId: string) => number;
  getPlayerRelationships: (playerId: string) => Relationship[];
  getPlayerMoraleBreakdown: (playerId: string) => { relationship: Relationship; effect: number }[];

  // Relationship management
  addRelationship: (
    player1Id: string,
    player2Id: string,
    type: typeof RelationshipType[keyof typeof RelationshipType]
  ) => { success: boolean; error?: string };
  removeRelationship: (relationshipId: string) => void;
  checkCanCreate: (
    player1Id: string,
    player2Id: string,
    type: typeof RelationshipType[keyof typeof RelationshipType]
  ) => { canCreate: boolean; reason?: string };

  // Trade evaluation
  getTradeWarnings: (
    tradedPlayerId: string,
    getPlayerName?: (id: string) => string
  ) => TradeWarning[];

  // Display helpers
  getRelationshipInfo: (type: typeof RelationshipType[keyof typeof RelationshipType]) => RelationshipDisplayInfo;
  getChemistryColor: () => string;
  getRelationshipCategories: () => ReturnType<typeof getRelationshipsByCategory>;

  // State management
  setTeamRoster: (playerIds: string[]) => void;
  loadRelationships: (relationships: Relationship[]) => void;
  clearRelationships: () => void;
}

// ============================================
// HOOK
// ============================================

export function useRelationshipData(): UseRelationshipDataReturn {
  // State
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [teamPlayerIds, setTeamPlayerIds] = useState<string[]>([]);

  // Team chemistry calculation
  const teamChemistry = useMemo(() => {
    if (teamPlayerIds.length === 0) return null;
    return calculateTeamChemistry(relationships, teamPlayerIds);
  }, [relationships, teamPlayerIds]);

  // Get player morale effect
  const getPlayerMoraleEffectFn = useCallback((playerId: string): number => {
    return calculateMoraleEffect(relationships, playerId);
  }, [relationships]);

  // Get player relationships
  const getPlayerRelationshipsFn = useCallback((playerId: string): Relationship[] => {
    return getPlayerRelationships(relationships, playerId, true);
  }, [relationships]);

  // Get player morale breakdown
  const getPlayerMoraleBreakdown = useCallback((playerId: string): { relationship: Relationship; effect: number }[] => {
    return getMoraleBreakdown(relationships, playerId);
  }, [relationships]);

  // Add relationship
  const addRelationship = useCallback((
    player1Id: string,
    player2Id: string,
    type: typeof RelationshipType[keyof typeof RelationshipType]
  ): { success: boolean; error?: string } => {
    const check = canCreateRelationship(relationships, player1Id, player2Id, type);
    if (!check.canCreate) {
      return { success: false, error: check.reason };
    }

    const newRelationship = createRelationship(player1Id, player2Id, type);
    setRelationships(prev => [...prev, newRelationship]);
    return { success: true };
  }, [relationships]);

  // Remove relationship
  const removeRelationship = useCallback((relationshipId: string): void => {
    setRelationships(prev =>
      prev.map(r =>
        r.relationshipId === relationshipId ? endRelationship(r) : r
      )
    );
  }, []);

  // Check if can create relationship
  const checkCanCreate = useCallback((
    player1Id: string,
    player2Id: string,
    type: typeof RelationshipType[keyof typeof RelationshipType]
  ): { canCreate: boolean; reason?: string } => {
    return canCreateRelationship(relationships, player1Id, player2Id, type);
  }, [relationships]);

  // Get trade warnings
  const getTradeWarningsFn = useCallback((
    tradedPlayerId: string,
    getPlayerName?: (id: string) => string
  ): TradeWarning[] => {
    return generateTradeWarnings(relationships, tradedPlayerId, getPlayerName);
  }, [relationships]);

  // Get relationship info
  const getRelationshipInfo = useCallback((
    type: typeof RelationshipType[keyof typeof RelationshipType]
  ): RelationshipDisplayInfo => {
    return getRelationshipDisplayInfo(type);
  }, []);

  // Get chemistry color
  const getChemistryColor = useCallback((): string => {
    if (!teamChemistry) return '#6b7280';
    return getChemistryRatingColor(teamChemistry.chemistryRating);
  }, [teamChemistry]);

  // Get relationship categories
  const getRelationshipCategories = useCallback(() => {
    return getRelationshipsByCategory();
  }, []);

  // Set team roster
  const setTeamRoster = useCallback((playerIds: string[]): void => {
    setTeamPlayerIds(playerIds);
  }, []);

  // Load relationships
  const loadRelationships = useCallback((newRelationships: Relationship[]): void => {
    setRelationships(newRelationships);
  }, []);

  // Clear relationships
  const clearRelationships = useCallback((): void => {
    setRelationships([]);
  }, []);

  return {
    relationships,
    teamChemistry,
    getPlayerMoraleEffect: getPlayerMoraleEffectFn,
    getPlayerRelationships: getPlayerRelationshipsFn,
    getPlayerMoraleBreakdown,
    addRelationship,
    removeRelationship,
    checkCanCreate,
    getTradeWarnings: getTradeWarningsFn,
    getRelationshipInfo,
    getChemistryColor,
    getRelationshipCategories,
    setTeamRoster,
    loadRelationships,
    clearRelationships,
  };
}

export default useRelationshipData;
