import type { Conference, Division, LeagueTemplate } from './leagueBuilderStorage';

export interface ConferenceAssignmentDraft {
  id: string;
  name: string;
  abbreviation: string;
  teamIds: string[];
}

export interface ConferenceValidationResult {
  valid: boolean;
  message: string | null;
}

const DEFAULT_SINGLE_CONFERENCE_NAME = 'League Conference';
const DEFAULT_BALANCED_CONFERENCE_NAMES = ['Eastern', 'Western'];

function abbreviationFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.map((word) => word[0]).join('').slice(0, 4).toUpperCase();
  }
  return (words[0] ?? 'CONF').slice(0, 4).toUpperCase();
}

function uniqueConferenceId(base: string, existingIds: Set<string>): string {
  let suffix = existingIds.size + 1;
  let id = `${base}-${suffix}`;
  while (existingIds.has(id)) {
    suffix += 1;
    id = `${base}-${suffix}`;
  }
  existingIds.add(id);
  return id;
}

export function createConferenceDraft(
  name: string,
  existingIds: Iterable<string> = [],
  teamIds: string[] = [],
): ConferenceAssignmentDraft {
  const existing = new Set(existingIds);
  return {
    id: uniqueConferenceId('conf', existing),
    name,
    abbreviation: abbreviationFromName(name),
    teamIds: [...teamIds],
  };
}

export function createSingleConferenceDraft(teamIds: readonly string[]): ConferenceAssignmentDraft[] {
  return [createConferenceDraft(DEFAULT_SINGLE_CONFERENCE_NAME, [], [...teamIds])];
}

export function createBalancedConferenceDraft(teamIds: readonly string[]): ConferenceAssignmentDraft[] {
  const existingIds = new Set<string>();
  return DEFAULT_BALANCED_CONFERENCE_NAMES.map((name, index) => ({
    id: uniqueConferenceId('conf', existingIds),
    name,
    abbreviation: abbreviationFromName(name),
    teamIds: teamIds.filter((_, teamIndex) => teamIndex % DEFAULT_BALANCED_CONFERENCE_NAMES.length === index),
  }));
}

export function buildConferenceDraftFromLeague(league: Pick<LeagueTemplate, 'teamIds' | 'conferences' | 'divisions'>): ConferenceAssignmentDraft[] {
  if (!league.conferences?.length) return [];
  const validTeamIds = new Set(league.teamIds ?? []);
  return league.conferences.map((conference) => {
    const divisionTeamIds = (league.divisions ?? [])
      .filter((division) => division.conferenceId === conference.id)
      .flatMap((division) => division.teamIds ?? [])
      .filter((teamId, index, all) => validTeamIds.has(teamId) && all.indexOf(teamId) === index);

    return {
      id: conference.id,
      name: conference.name,
      abbreviation: conference.abbreviation || abbreviationFromName(conference.name),
      teamIds: divisionTeamIds,
    };
  });
}

export function syncConferenceDraftTeamIds(
  conferences: readonly ConferenceAssignmentDraft[],
  teamIds: readonly string[],
): ConferenceAssignmentDraft[] {
  const validTeamIds = new Set(teamIds);
  const assigned = new Set<string>();
  const next = conferences.map((conference) => {
    const nextTeamIds = conference.teamIds.filter((teamId) => {
      if (!validTeamIds.has(teamId) || assigned.has(teamId)) return false;
      assigned.add(teamId);
      return true;
    });
    return { ...conference, teamIds: nextTeamIds };
  });

  const firstConference = next[0];
  if (firstConference) {
    firstConference.teamIds = [
      ...firstConference.teamIds,
      ...teamIds.filter((teamId) => !assigned.has(teamId)),
    ];
  }

  return next;
}

export function assignTeamToConference(
  conferences: readonly ConferenceAssignmentDraft[],
  teamId: string,
  conferenceId: string,
): ConferenceAssignmentDraft[] {
  return conferences.map((conference) => ({
    ...conference,
    teamIds: conference.id === conferenceId
      ? Array.from(new Set([...conference.teamIds, teamId]))
      : conference.teamIds.filter((id) => id !== teamId),
  }));
}

export function validateConferenceDraft(
  teamIds: readonly string[],
  conferences: readonly ConferenceAssignmentDraft[],
): ConferenceValidationResult {
  if (conferences.length === 0) {
    return { valid: true, message: null };
  }

  if (conferences.some((conference) => !conference.name.trim())) {
    return { valid: false, message: 'Name every conference before saving.' };
  }

  const validTeamIds = new Set(teamIds);
  const assignedCounts = new Map<string, number>();
  for (const conference of conferences) {
    for (const teamId of conference.teamIds) {
      if (!validTeamIds.has(teamId)) {
        return { valid: false, message: 'A conference references a team outside this league.' };
      }
      assignedCounts.set(teamId, (assignedCounts.get(teamId) ?? 0) + 1);
    }
  }

  const orphanedTeamIds = teamIds.filter((teamId) => !assignedCounts.has(teamId));
  if (orphanedTeamIds.length > 0) {
    return { valid: false, message: 'Every selected team needs a conference before saving.' };
  }

  const duplicatedTeamIds = teamIds.filter((teamId) => (assignedCounts.get(teamId) ?? 0) > 1);
  if (duplicatedTeamIds.length > 0) {
    return { valid: false, message: 'A team can only belong to one conference.' };
  }

  return { valid: true, message: null };
}

export function buildConferenceStructure(
  conferences: readonly ConferenceAssignmentDraft[],
): { conferences: Conference[]; divisions: Division[] } {
  const persistedConferences: Conference[] = conferences.map((conference) => ({
    id: conference.id,
    name: conference.name.trim(),
    abbreviation: (conference.abbreviation || abbreviationFromName(conference.name)).trim().toUpperCase(),
    divisionIds: [`division-${conference.id}`],
  }));
  const divisions: Division[] = conferences.map((conference) => ({
    id: `division-${conference.id}`,
    name: conference.name.trim(),
    conferenceId: conference.id,
    teamIds: [...conference.teamIds],
  }));

  return { conferences: persistedConferences, divisions };
}

