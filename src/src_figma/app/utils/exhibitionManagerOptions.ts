import type { ManagerProfile } from "../../../types/managerWpa";
import { normalizeManagerDisplayName } from "../../../utils/managerIdentityStorage";

export function findExistingManagerProfileByDisplayName(
  profiles: ManagerProfile[],
  displayName: string,
): ManagerProfile | undefined {
  const normalizedName = normalizeManagerDisplayName(displayName);
  if (!normalizedName) return undefined;
  return profiles.find(
    (profile) => normalizeManagerDisplayName(profile.displayName) === normalizedName,
  );
}

function countValues(values: string[]): Map<string, number> {
  return values.reduce((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function formatManagerIdLabel(managerId: string): string {
  return managerId
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function formatCompactManagerIdLabel(managerId: string): string {
  let idParts = managerId.split(/[-_]+/).filter(Boolean);

  if (idParts.length > 1 && idParts[0].toLowerCase() === "manager") {
    idParts = idParts.slice(1);
  }

  if (idParts.length > 1 && idParts[idParts.length - 1].toLowerCase() === "manager") {
    idParts = idParts.slice(0, -1);
  }

  return formatManagerIdLabel(idParts.join(" "));
}

export function buildManagerOptionLabels(
  profiles: ManagerProfile[],
): Map<string, string> {
  const groups = profiles.reduce((grouped, profile) => {
    const key = normalizeManagerDisplayName(profile.displayName);
    if (!key) return grouped;

    const current = grouped.get(key) ?? [];
    current.push(profile);
    grouped.set(key, current);
    return grouped;
  }, new Map<string, ManagerProfile[]>());

  const labels = new Map<string, string>();

  groups.forEach((group) => {
    if (group.length <= 1) {
      const manager = group[0];
      labels.set(manager.managerId, manager.displayName.toUpperCase());
      return;
    }

    const compactSuffixes = group.map((manager) =>
      formatCompactManagerIdLabel(manager.managerId),
    );
    const compactSuffixCounts = countValues(compactSuffixes);
    const rawLabels = group.map((manager, index) => {
      const compactSuffix = compactSuffixes[index];
      const suffix = compactSuffix && compactSuffixCounts.get(compactSuffix) === 1
        ? compactSuffix
        : formatManagerIdLabel(manager.managerId);

      return `${manager.displayName.toUpperCase()} (${suffix || manager.managerId})`;
    });
    const rawLabelCounts = countValues(rawLabels);
    const seenLabels = new Map<string, number>();

    group.forEach((manager, index) => {
      const rawLabel = rawLabels[index];
      if ((rawLabelCounts.get(rawLabel) ?? 0) <= 1) {
        labels.set(manager.managerId, rawLabel);
        return;
      }

      const nextSeenCount = (seenLabels.get(rawLabel) ?? 0) + 1;
      seenLabels.set(rawLabel, nextSeenCount);
      labels.set(manager.managerId, `${rawLabel} #${nextSeenCount}`);
    });
  });

  return labels;
}

export function formatManagerOptionLabel(
  manager: ManagerProfile,
  optionLabels: Map<string, string>,
): string {
  return optionLabels.get(manager.managerId) ?? manager.displayName.toUpperCase();
}
