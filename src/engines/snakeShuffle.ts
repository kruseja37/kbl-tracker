function hash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(value: string): number {
  return hash32(value) / 0xffffffff;
}

/** Stable seeded order used by the production snake setup room. */
export function seededSnakeShuffle(teamIds: readonly string[], seed: string): string[] {
  return [...teamIds]
    .map((teamId) => ({ teamId, key: seededUnit(`${seed}:shuffle:${teamId}`) }))
    .sort((left, right) => left.key - right.key || left.teamId.localeCompare(right.teamId))
    .map((entry) => entry.teamId);
}
