/**
 * Relationship Storage - IndexedDB
 * Per Ralph Framework GAP-041
 *
 * Provides persistent storage for player relationships.
 * Wires relationshipEngine to storage layer.
 */

import type { Relationship } from '../engines/relationshipEngine';
import {
  createRelationship,
  endRelationship as endRelationshipEngine,
  canCreateRelationship,
  type RelationshipType,
} from '../engines/relationshipEngine';

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-relationships';
const DB_VERSION = 1;

const STORES = {
  RELATIONSHIPS: 'relationships',
} as const;

let dbInstance: IDBDatabase | null = null;

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize the relationship database
 */
export async function initRelationshipDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[RelationshipStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.RELATIONSHIPS)) {
        const store = db.createObjectStore(STORES.RELATIONSHIPS, { keyPath: 'relationshipId' });
        store.createIndex('by_player1', 'player1Id', { unique: false });
        store.createIndex('by_player2', 'player2Id', { unique: false });
        store.createIndex('by_type', 'type', { unique: false });
        store.createIndex('by_active', 'isActive', { unique: false });
      }
    };
  });
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Save a relationship to storage
 */
export async function saveRelationship(relationship: Relationship): Promise<Relationship> {
  const db = await initRelationshipDB();

  // Convert Date objects to timestamps for storage
  const stored = {
    ...relationship,
    createdAt: relationship.createdAt instanceof Date
      ? relationship.createdAt.getTime()
      : relationship.createdAt,
    endedAt: relationship.endedAt instanceof Date
      ? relationship.endedAt.getTime()
      : relationship.endedAt,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.RELATIONSHIPS, 'readwrite');
    const store = transaction.objectStore(STORES.RELATIONSHIPS);
    const request = store.put(stored);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(relationship);
  });
}

/**
 * Get a relationship by ID
 */
export async function getRelationship(relationshipId: string): Promise<Relationship | null> {
  const db = await initRelationshipDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.RELATIONSHIPS, 'readonly');
    const store = transaction.objectStore(STORES.RELATIONSHIPS);
    const request = store.get(relationshipId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (request.result) {
        // Convert timestamps back to Date objects
        resolve({
          ...request.result,
          createdAt: new Date(request.result.createdAt),
          endedAt: request.result.endedAt ? new Date(request.result.endedAt) : undefined,
        });
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Get all relationships
 */
export async function getAllRelationships(): Promise<Relationship[]> {
  const db = await initRelationshipDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.RELATIONSHIPS, 'readonly');
    const store = transaction.objectStore(STORES.RELATIONSHIPS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = (request.result || []).map((r: Relationship & { createdAt: number; endedAt?: number }) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        endedAt: r.endedAt ? new Date(r.endedAt) : undefined,
      }));
      resolve(results);
    };
  });
}

/**
 * Get active relationships only
 */
export async function getActiveRelationships(): Promise<Relationship[]> {
  const all = await getAllRelationships();
  return all.filter((r) => r.isActive);
}

/**
 * Get relationships for a specific player
 */
export async function getPlayerRelationships(
  playerId: string,
  activeOnly: boolean = true
): Promise<Relationship[]> {
  const all = await getAllRelationships();
  return all.filter(
    (r) =>
      (r.player1Id === playerId || r.player2Id === playerId) &&
      (!activeOnly || r.isActive)
  );
}

/**
 * Add a new relationship (with validation)
 */
export async function addRelationship(
  player1Id: string,
  player2Id: string,
  type: RelationshipType
): Promise<{ success: boolean; relationship?: Relationship; error?: string }> {
  const existing = await getAllRelationships();
  const check = canCreateRelationship(existing, player1Id, player2Id, type);

  if (!check.canCreate) {
    return { success: false, error: check.reason };
  }

  const relationship = createRelationship(player1Id, player2Id, type);
  await saveRelationship(relationship);

  return { success: true, relationship };
}

/**
 * End a relationship
 */
export async function endRelationship(relationshipId: string): Promise<boolean> {
  const relationship = await getRelationship(relationshipId);
  if (!relationship) return false;

  const ended = endRelationshipEngine(relationship);
  await saveRelationship(ended);
  return true;
}

/**
 * Delete a relationship permanently
 */
export async function deleteRelationship(relationshipId: string): Promise<boolean> {
  const db = await initRelationshipDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.RELATIONSHIPS, 'readwrite');
    const store = transaction.objectStore(STORES.RELATIONSHIPS);
    const request = store.delete(relationshipId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

/**
 * Clear all relationships (for testing/reset)
 */
export async function clearAllRelationships(): Promise<void> {
  const db = await initRelationshipDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.RELATIONSHIPS, 'readwrite');
    const store = transaction.objectStore(STORES.RELATIONSHIPS);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get relationship count
 */
export async function getRelationshipCount(): Promise<number> {
  const db = await initRelationshipDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.RELATIONSHIPS, 'readonly');
    const store = transaction.objectStore(STORES.RELATIONSHIPS);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
