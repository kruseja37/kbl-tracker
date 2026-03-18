/**
 * Edit History Tracker
 * Per LEAGUE_BUILDER_REFACTOR_SPEC.md §7
 *
 * Tracks per-field changes to player attributes with league context.
 * Does NOT track: initial creation, salary/grade auto-recalc, franchise aging.
 */

export interface EditHistoryEntry {
  date: string;                              // ISO timestamp
  field: string;                             // "power", "trait1", "hometown", etc.
  oldValue: unknown;
  newValue: unknown;
  context: 'base' | 'league-override';
  leagueId?: string;                         // present only if context = 'league-override'
}

/** Fields that are tracked for edit history */
const TRACKED_FIELDS: readonly string[] = [
  // Ratings
  'power', 'contact', 'speed', 'fielding', 'arm',
  'velocity', 'junk', 'accuracy',
  // Position
  'primaryPosition', 'secondaryPosition',
  // Traits & personality
  'trait1', 'trait2', 'personality', 'chemistry',
  // Arsenal
  'arsenal',
  // Identity
  'nickname', 'age', 'bats', 'throws', 'gender',
  // Hometown
  'hometown',
] as const;

/**
 * Deep equality check for comparing field values.
 * Handles primitives, arrays, and plain objects (hometown).
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(key => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

/**
 * Compare old and new player data, return EditHistoryEntry for each changed tracked field.
 *
 * @param oldPlayer - The player's current state before edits
 * @param newPlayer - The partial set of fields being changed
 * @param context - 'base' for global edits, 'league-override' for per-league overrides
 * @param leagueId - Required when context is 'league-override'
 */
export function trackFieldChanges(
  oldPlayer: Record<string, unknown>,
  newPlayer: Record<string, unknown>,
  context: 'base' | 'league-override',
  leagueId?: string,
): EditHistoryEntry[] {
  const now = new Date().toISOString();
  const entries: EditHistoryEntry[] = [];

  for (const field of TRACKED_FIELDS) {
    // Only check fields that are present in the new data
    if (!(field in newPlayer)) continue;

    const oldVal = oldPlayer[field];
    const newVal = newPlayer[field];

    if (!deepEqual(oldVal, newVal)) {
      const entry: EditHistoryEntry = {
        date: now,
        field,
        oldValue: oldVal,
        newValue: newVal,
        context,
      };
      if (context === 'league-override' && leagueId) {
        entry.leagueId = leagueId;
      }
      entries.push(entry);
    }
  }

  return entries;
}
