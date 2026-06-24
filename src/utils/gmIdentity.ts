import { SMB4_FIRST_NAMES, SMB4_LAST_NAMES } from '../data/smb4NameDatabase';
import type { GmProfile } from '../types/franchise';
import { getFranchiseConfig } from './franchiseManager';

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

function buildDefaultGmName(franchiseId: string): string {
  const firstName = pickBySeed(SMB4_FIRST_NAMES, `${franchiseId}:gm:first`);
  const lastName = pickBySeed(SMB4_LAST_NAMES, `${franchiseId}:gm:last`);
  return `${firstName} ${lastName}`;
}

export function buildGmProfile(input: {
  franchiseId: string;
  controlledTeamId?: string;
  gmName?: string;
}): GmProfile {
  const trimmedName = input.gmName?.trim();
  if (trimmedName) {
    return {
      gmId: `${input.franchiseId}-gm`,
      displayName: trimmedName,
      createdByUser: true,
      teamId: input.controlledTeamId,
    };
  }

  return {
    gmId: `${input.franchiseId}-gm`,
    displayName: buildDefaultGmName(input.franchiseId),
    createdByUser: false,
    teamId: input.controlledTeamId,
  };
}

export async function getGmProfile(franchiseId: string): Promise<GmProfile | null> {
  const config = await getFranchiseConfig(franchiseId);
  return config?.gm ?? null;
}
