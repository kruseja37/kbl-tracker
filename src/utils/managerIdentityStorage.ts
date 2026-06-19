import { SMB4_FIRST_NAMES, SMB4_LAST_NAMES } from "../data/smb4NameDatabase";
import { US_CITIES } from "../data/usCities";
import type {
  ManagerAssignment,
  ManagerFiredReason,
  ManagerMode,
  ManagerProfile,
  ManagerStyleSnapshot,
  ManagerTenureEndReason,
  ManagerTenureRecord,
} from "../types/managerWpa";
import { getDefaultManagerIdForTeam } from "./managerWpaDerivation";
import { syncEngine } from "./syncEngine";

const DB_NAME = "kbl-manager-identity";
const DB_VERSION = 2;

const STORES = {
  PROFILES: "managerProfiles",
  ASSIGNMENTS: "managerAssignments",
} as const;

export const LEAGUE_BUILDER_MANAGER_INSTANCE_ID = "league-builder";

export interface ManagerTeamIdentity {
  id: string;
  name: string;
  managerId?: string;
  managerName?: string;
  location?: string;
}

export interface ManagerProfileInput {
  managerId?: string;
  displayName: string;
  gender?: string;
  age?: number;
  hometown?: string;
  createdByUser?: boolean;
  defaultManager?: boolean;
  managementStyle?: ManagerStyleSnapshot;
}

export interface ResolvedTeamManager {
  managerId: string;
  managerName: string;
  profile: ManagerProfile;
  assignment?: ManagerAssignment;
}

let dbInstance: IDBDatabase | null = null;

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickBySeed<T>(items: T[], seed: string): T {
  return items[hashStringToUint32(seed) % items.length];
}

function getDeterministicHometown(seed: string): { city: string; state: string } {
  const totalWeight = US_CITIES.reduce((sum, city) => sum + city.weight, 0);
  let roll = hashStringToUint32(seed) % totalWeight;
  for (const entry of US_CITIES) {
    roll -= entry.weight;
    if (roll < 0) {
      return { city: entry.city, state: entry.state };
    }
  }
  const last = US_CITIES[US_CITIES.length - 1];
  return { city: last.city, state: last.state };
}

function managerAssignmentKey(assignment: Pick<ManagerAssignment, "mode" | "instanceId" | "teamId">): [ManagerMode, string, string] {
  return [assignment.mode, assignment.instanceId, assignment.teamId];
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function initManagerIdentityDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.error("[managerIdentityStorage] Database upgrade blocked");
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.PROFILES)) {
        const profileStore = db.createObjectStore(STORES.PROFILES, {
          keyPath: "managerId",
        });
        profileStore.createIndex("displayName", "displayName", { unique: false });
        profileStore.createIndex("defaultManager", "defaultManager", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.ASSIGNMENTS)) {
        const assignmentStore = db.createObjectStore(STORES.ASSIGNMENTS, {
          keyPath: ["mode", "instanceId", "teamId"],
        });
        assignmentStore.createIndex("managerId", "managerId", { unique: false });
        assignmentStore.createIndex("teamId", "teamId", { unique: false });
        assignmentStore.createIndex("mode_instanceId", ["mode", "instanceId"], {
          unique: false,
        });
      }
    };
  });
}

export function resetManagerIdentityDatabaseForTests(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function createManagerProfileId(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);

  return `manager-${slug || "profile"}-${suffix}`;
}

export function normalizeManagerDisplayName(displayName: string): string {
  return displayName.trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatManagerHometown(
  hometown: { city: string; state: string } | string | undefined,
): string | undefined {
  if (!hometown) return undefined;
  if (typeof hometown === "string") return hometown.trim() || undefined;
  return hometown.city && hometown.state
    ? `${hometown.city}, ${hometown.state}`
    : undefined;
}

export function buildDefaultManagerProfile(team: ManagerTeamIdentity): ManagerProfile {
  const seed = `${team.id}:${team.name}`;
  const firstName = pickBySeed(SMB4_FIRST_NAMES, `${seed}:first`);
  const lastName = pickBySeed(SMB4_LAST_NAMES, `${seed}:last`);
  const hometown = getDeterministicHometown(`${seed}:hometown`);

  return {
    managerId: getDefaultManagerIdForTeam(team.id),
    displayName: `${firstName} ${lastName}`,
    gender: "Male",
    hometown: formatManagerHometown(hometown),
    createdByUser: false,
    defaultManager: true,
    managementStyle: {
      label: "Balanced",
    },
  };
}

export async function saveManagerProfile(
  input: ManagerProfile | ManagerProfileInput,
): Promise<ManagerProfile> {
  const db = await initManagerIdentityDatabase();
  const managerId =
    "managerId" in input && input.managerId
      ? input.managerId
      : createManagerProfileId(input.displayName);
  const existing = await getManagerProfile(managerId);
  const profile: ManagerProfile = {
    ...existing,
    ...input,
    managerId,
    displayName: input.displayName.trim(),
    createdByUser: input.createdByUser ?? existing?.createdByUser ?? true,
    defaultManager: input.defaultManager ?? existing?.defaultManager ?? false,
    managementStyle:
      input.managementStyle ?? existing?.managementStyle ?? undefined,
  };

  const tx = db.transaction(STORES.PROFILES, "readwrite");
  await requestToPromise(tx.objectStore(STORES.PROFILES).put(profile));
  await transactionToPromise(tx);
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORES.PROFILES, profile.managerId, profile);
  }
  return profile;
}

export async function saveUnassignedManagerProfile(
  input: Omit<ManagerProfileInput, "defaultManager">,
): Promise<ManagerProfile> {
  if (!input.managerId) {
    const existing = await findManagerProfileByDisplayName(input.displayName);
    if (existing) return existing;
  }

  return saveManagerProfile({
    ...input,
    createdByUser: input.createdByUser ?? true,
    defaultManager: false,
  });
}

export async function getManagerProfile(
  managerId: string,
): Promise<ManagerProfile | null> {
  const db = await initManagerIdentityDatabase();
  const tx = db.transaction(STORES.PROFILES, "readonly");
  const result = await requestToPromise(
    tx.objectStore(STORES.PROFILES).get(managerId),
  );
  await transactionToPromise(tx);
  return (result as ManagerProfile | undefined) ?? null;
}

export async function listManagerProfiles(): Promise<ManagerProfile[]> {
  const db = await initManagerIdentityDatabase();
  const tx = db.transaction(STORES.PROFILES, "readonly");
  const result = await requestToPromise(tx.objectStore(STORES.PROFILES).getAll());
  await transactionToPromise(tx);
  return ((result as ManagerProfile[] | undefined) ?? []).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

export async function findManagerProfileByDisplayName(
  displayName: string,
): Promise<ManagerProfile | null> {
  const normalizedName = normalizeManagerDisplayName(displayName);
  if (!normalizedName) return null;
  const profiles = await listManagerProfiles();
  return (
    profiles.find(
      (profile) => normalizeManagerDisplayName(profile.displayName) === normalizedName,
    ) ?? null
  );
}

export async function ensureDefaultManagerProfile(
  team: ManagerTeamIdentity,
): Promise<ManagerProfile> {
  const defaultManagerId = getDefaultManagerIdForTeam(team.id);
  const existing = await getManagerProfile(defaultManagerId);
  if (existing) return existing;

  if (team.managerId === defaultManagerId && team.managerName?.trim()) {
    return saveManagerProfile({
      managerId: defaultManagerId,
      displayName: team.managerName.trim(),
      createdByUser: false,
      defaultManager: true,
      hometown: team.location?.trim() || undefined,
      managementStyle: { label: "Balanced" },
    });
  }

  return saveManagerProfile(buildDefaultManagerProfile(team));
}

export async function ensureDefaultManagerProfiles(
  teams: ManagerTeamIdentity[],
): Promise<ManagerProfile[]> {
  return Promise.all(teams.map((team) => ensureDefaultManagerProfile(team)));
}

export async function saveManagerAssignment(
  assignment: ManagerAssignment,
): Promise<ManagerAssignment> {
  const db = await initManagerIdentityDatabase();
  const tx = db.transaction(STORES.ASSIGNMENTS, "readwrite");
  const normalized: ManagerAssignment = {
    ...assignment,
    startDate: assignment.startDate ?? new Date().toISOString(),
  };

  await requestToPromise(tx.objectStore(STORES.ASSIGNMENTS).put(normalized));
  await transactionToPromise(tx);
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORES.ASSIGNMENTS, managerAssignmentKey(normalized), normalized);
  }
  return normalized;
}

export async function getManagerAssignment(params: {
  teamId: string;
  mode: ManagerMode;
  instanceId: string;
}): Promise<ManagerAssignment | null> {
  const db = await initManagerIdentityDatabase();
  const tx = db.transaction(STORES.ASSIGNMENTS, "readonly");
  const result = await requestToPromise(
    tx.objectStore(STORES.ASSIGNMENTS).get([
      params.mode,
      params.instanceId,
      params.teamId,
    ]),
  );
  await transactionToPromise(tx);
  return (result as ManagerAssignment | undefined) ?? null;
}

export async function setManagerFired(params: {
  teamId: string;
  mode: ManagerMode;
  instanceId: string;
  endDate: string;
  reason: ManagerFiredReason;
}): Promise<ManagerAssignment | null> {
  const assignment = await getManagerAssignment({
    teamId: params.teamId,
    mode: params.mode,
    instanceId: params.instanceId,
  });
  if (!assignment) return null;
  if (assignment.fired) return assignment;
  return saveManagerAssignment({
    ...assignment,
    fired: true,
    endDate: params.endDate,
    firedReason: params.reason,
  });
}

/**
 * Map an L11 firing reason to the Almanac tenure end-reason (L11-Q9).
 * Manual + auto-backstop both read as 'fired'; the L14 rebrand cascade reads
 * as 'relocated'. ('resigned' has no L11 emitter yet.)
 */
export function managerFiredReasonToTenureEndReason(
  reason: ManagerFiredReason,
): ManagerTenureEndReason {
  return reason === "rebrand" ? "relocated" : "fired";
}

/**
 * Durably append a tenure-end record to the fired manager's profile so the
 * Manager Almanac can surface hire/fire dates + an end-reason even after the
 * successor overwrites the team-keyed assignment row (the L11-3 OPEN). Lives
 * on the profile (unique managerId, never overwritten), per the L11-Q9 ruling:
 * ride the existing identity store, no new store, no DB-version bump.
 *
 * Idempotent on (teamId, mode, instanceId, endDate): replaying the same firing
 * does not duplicate the record (matching `setManagerFired` idempotency).
 * Returns null if the manager profile does not exist.
 */
export async function recordManagerTenureEnd(params: {
  managerId: string;
  teamId: string;
  mode: ManagerMode;
  instanceId: string;
  hireDate?: string;
  endDate: string;
  reason: ManagerFiredReason;
}): Promise<ManagerProfile | null> {
  const existing = await getManagerProfile(params.managerId);
  if (!existing) return null;

  const endReason = managerFiredReasonToTenureEndReason(params.reason);
  const record: ManagerTenureRecord = {
    teamId: params.teamId,
    mode: params.mode,
    instanceId: params.instanceId,
    hireDate: params.hireDate,
    endDate: params.endDate,
    endReason,
  };

  const priorRecords = existing.tenureRecords ?? [];
  const alreadyRecorded = priorRecords.some(
    (entry) =>
      entry.teamId === record.teamId &&
      entry.mode === record.mode &&
      entry.instanceId === record.instanceId &&
      entry.endDate === record.endDate,
  );
  if (alreadyRecorded) return existing;

  return saveManagerProfile({
    ...existing,
    tenureRecords: [...priorRecords, record],
  });
}

export async function listManagerAssignments(filter: {
  mode?: ManagerMode;
  instanceId?: string;
  teamId?: string;
} = {}): Promise<ManagerAssignment[]> {
  const db = await initManagerIdentityDatabase();
  const tx = db.transaction(STORES.ASSIGNMENTS, "readonly");
  const store = tx.objectStore(STORES.ASSIGNMENTS);
  const result =
    filter.mode && filter.instanceId
      ? await requestToPromise(
          store.index("mode_instanceId").getAll([filter.mode, filter.instanceId]),
        )
      : await requestToPromise(store.getAll());
  await transactionToPromise(tx);

  return ((result as ManagerAssignment[] | undefined) ?? []).filter((assignment) => {
    if (filter.mode !== undefined && assignment.mode !== filter.mode) {
      return false;
    }
    if (filter.instanceId !== undefined && assignment.instanceId !== filter.instanceId) {
      return false;
    }
    if (filter.teamId !== undefined && assignment.teamId !== filter.teamId) {
      return false;
    }
    return !assignment.fired && !assignment.endDate;
  });
}

export async function deleteManagerAssignmentsForInstance(params: {
  mode: ManagerMode;
  instanceId: string;
}): Promise<void> {
  const assignments = await listManagerAssignments({
    mode: params.mode,
    instanceId: params.instanceId,
  });
  if (assignments.length === 0) return;

  const db = await initManagerIdentityDatabase();
  const tx = db.transaction(STORES.ASSIGNMENTS, "readwrite");
  const store = tx.objectStore(STORES.ASSIGNMENTS);

  for (const assignment of assignments) {
    store.delete([assignment.mode, assignment.instanceId, assignment.teamId]);
    if (!syncEngine.isSuppressed()) {
      syncEngine.remove(DB_NAME, STORES.ASSIGNMENTS, managerAssignmentKey(assignment));
    }
  }

  await transactionToPromise(tx);
}

export async function resolveManagerForTeam(params: {
  team: ManagerTeamIdentity;
  mode: ManagerMode;
  instanceId: string;
  fallbackMode?: ManagerMode;
  fallbackInstanceId?: string;
  persistAssignment?: boolean;
}): Promise<ResolvedTeamManager> {
  const directAssignment = await getManagerAssignment({
    teamId: params.team.id,
    mode: params.mode,
    instanceId: params.instanceId,
  });
  const activeDirectAssignment =
    directAssignment && !directAssignment.fired && !directAssignment.endDate
      ? directAssignment
      : null;
  const fallbackAssignment =
    !activeDirectAssignment && params.fallbackMode && params.fallbackInstanceId
      ? await getManagerAssignment({
          teamId: params.team.id,
          mode: params.fallbackMode,
          instanceId: params.fallbackInstanceId,
        })
      : null;
  const activeFallbackAssignment =
    fallbackAssignment && !fallbackAssignment.fired && !fallbackAssignment.endDate
      ? fallbackAssignment
      : null;
  const managerId =
    activeDirectAssignment?.managerId ??
    activeFallbackAssignment?.managerId ??
    params.team.managerId ??
    getDefaultManagerIdForTeam(params.team.id);

  let profile = await getManagerProfile(managerId);
  if (!profile && params.team.managerId === managerId && params.team.managerName) {
    profile = await saveManagerProfile({
      managerId,
      displayName: params.team.managerName,
      createdByUser: true,
      defaultManager: managerId === getDefaultManagerIdForTeam(params.team.id),
    });
  }
  if (!profile && managerId === getDefaultManagerIdForTeam(params.team.id)) {
    profile = await ensureDefaultManagerProfile(params.team);
  }
  if (!profile) {
    profile = await saveManagerProfile({
      managerId,
      displayName: params.team.managerName || `${params.team.name} Manager`,
      createdByUser: false,
      defaultManager: false,
    });
  }

  const assignment =
    activeDirectAssignment ??
    (params.persistAssignment
      ? await saveManagerAssignment({
          managerId: profile.managerId,
          teamId: params.team.id,
          mode: params.mode,
          instanceId: params.instanceId,
        })
      : undefined);

  return {
    managerId: profile.managerId,
    managerName: profile.displayName,
    profile,
    assignment,
  };
}

export async function seedManagerAssignmentsForTeams(params: {
  teams: ManagerTeamIdentity[];
  mode: ManagerMode;
  instanceId: string;
  fallbackMode?: ManagerMode;
  fallbackInstanceId?: string;
}): Promise<ManagerAssignment[]> {
  const assignments: ManagerAssignment[] = [];

  for (const team of params.teams) {
    const resolved = await resolveManagerForTeam({
      team,
      mode: params.mode,
      instanceId: params.instanceId,
      fallbackMode: params.fallbackMode,
      fallbackInstanceId: params.fallbackInstanceId,
      persistAssignment: true,
    });
    const assignment =
      resolved.assignment ??
      (await saveManagerAssignment({
        managerId: resolved.managerId,
        teamId: team.id,
        mode: params.mode,
        instanceId: params.instanceId,
      }));
    assignments.push(assignment);
  }

  return assignments;
}
