/**
 * Custom Player Storage
 *
 * Persists user-created players to localStorage.
 * All players go to "My Team" roster (no team selection needed).
 */

import type { Position, BatterHand } from '../types/game';

const STORAGE_KEY = 'kbl-custom-players';

export type ThrowHand = 'L' | 'R';

export interface CustomPlayer {
  id: string;
  name: string;
  teamId: string; // Always 'my-team' for roster players
  position: Position;
  secondaryPosition?: Position;
  bats: BatterHand;
  throws: ThrowHand;
  isPitcher: boolean;
  age: number;
  overall?: string; // Letter grade: S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D
  batterRatings: {
    power: number;
    contact: number;
    speed: number;
    fielding: number;
    arm: number;
  };
  pitcherRatings?: {
    velocity: number;
    junk: number;
    accuracy: number;
  };
  // Salary (auto-calculated)
  salary: number;
  // Source tracking (if imported from database)
  sourcePlayerId?: string; // Original player ID from database
  originalTeamId?: string; // Team they came from in the database
  createdAt: number;
}

/**
 * Get all custom players
 */
export function getAllCustomPlayers(): CustomPlayer[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as CustomPlayer[];
  } catch (err) {
    console.warn('[customPlayerStorage] Failed to load players:', err);
    return [];
  }
}

/**
 * Get a specific custom player by ID
 */
export function getCustomPlayer(playerId: string): CustomPlayer | null {
  const players = getAllCustomPlayers();
  return players.find(p => p.id === playerId) ?? null;
}

/**
 * Save a new custom player
 */
export function saveCustomPlayer(player: CustomPlayer): void {
  try {
    const players = getAllCustomPlayers();
    const existingIndex = players.findIndex(p => p.id === player.id);

    if (existingIndex >= 0) {
      players[existingIndex] = player;
    } else {
      players.push(player);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch (err) {
    console.warn('[customPlayerStorage] Failed to save player:', err);
  }
}

/**
 * Delete a custom player
 */
export function deleteCustomPlayer(playerId: string): void {
  try {
    const players = getAllCustomPlayers().filter(p => p.id !== playerId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch (err) {
    console.warn('[customPlayerStorage] Failed to delete player:', err);
  }
}

/**
 * Generate a unique player ID
 */
export function generatePlayerId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate player data
 * Note: teamId is no longer required - all players go to "My Team"
 */
export function validatePlayer(player: Partial<CustomPlayer>): { valid: boolean; error?: string } {
  if (!player.name?.trim()) {
    return { valid: false, error: 'Player name is required' };
  }
  if (!player.position) {
    return { valid: false, error: 'Position is required' };
  }
  if (player.age !== undefined && (player.age < 18 || player.age > 50)) {
    return { valid: false, error: 'Age must be between 18 and 50' };
  }
  return { valid: true };
}
