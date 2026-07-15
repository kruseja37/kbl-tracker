import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
  type HistoricalLegendsAppPayload,
} from '../../data/historicalLegendsAppData';
import {
  HISTORICAL_LEGENDS_CORE_PLAYER_COUNT,
  HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS,
  HISTORICAL_LEGENDS_LIBRARY_TEAM_COUNT,
  isHistoricalLegendsLibraryId,
} from '../../data/historicalLegendsLibraries';
import { importHistoricalLegendsPayload } from '../historicalLegendsImport';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  getAllLeagueTemplates,
  getAllPlayers,
  getAllTeams,
  getTeamRoster,
} from '../leagueBuilderStorage';

const payload = JSON.parse(
  readFileSync(resolve('public/data/historical-legends-app-data.json'), 'utf8'),
) as HistoricalLegendsAppPayload;

describe('Historical Legends source libraries', () => {
  beforeEach(async () => clearAllLeagueBuilderData());
  afterEach(() => __resetLeagueBuilderDatabaseForTests());

  test('provisions Draft, Career, and Peak as stable selectable source leagues', async () => {
    await importHistoricalLegendsPayload(payload, EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256);

    const [leagues, teams, players] = await Promise.all([
      getAllLeagueTemplates(),
      getAllTeams(),
      getAllPlayers(),
    ]);
    const libraryLeagues = leagues.filter((league) => isHistoricalLegendsLibraryId(league.id));
    const libraryTeams = teams.filter((team) => team.leagueIds.some(isHistoricalLegendsLibraryId));

    expect(libraryLeagues.map((league) => league.id).sort()).toEqual(
      HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS.map((library) => library.leagueId).sort(),
    );
    expect(libraryTeams).toHaveLength(HISTORICAL_LEGENDS_LIBRARY_TEAM_COUNT * 3);
    expect(players.every((player) => player.hiddenPersonalityModifiers)).toBe(true);
    const sourcePersonalityByCardId = new Map(payload.players.map((player) => [player.id, player.personality]));
    expect(players.every((player) => player.personality === sourcePersonalityByCardId.get(player.id))).toBe(true);

    const versionsByPerson = new Map<string, typeof players>();
    for (const player of players) {
      const identity = player.sourceId!;
      const versions = versionsByPerson.get(identity) ?? [];
      versions.push(player);
      versionsByPerson.set(identity, versions);
    }
    expect(versionsByPerson.size).toBe(payload.playerCount);
    for (const versions of versionsByPerson.values()) {
      expect(new Set(versions.map((version) => JSON.stringify(version.hiddenPersonalityModifiers))))
        .toHaveLength(1);
    }

    for (const library of HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS) {
      const league = libraryLeagues.find((candidate) => candidate.id === library.leagueId);
      expect(league?.name).toBe(library.name);
      expect(league?.teamIds).toHaveLength(HISTORICAL_LEGENDS_LIBRARY_TEAM_COUNT);

      const cards = players.filter((player) => player.historicalProfileType === library.profileType);
      const assignedCards = cards.filter((player) => player.leagueAssignments?.some(
        (assignment) => assignment.leagueId === library.leagueId,
      ));
      const rosteredCards = assignedCards.filter((player) => player.leagueAssignments?.some(
        (assignment) => assignment.leagueId === library.leagueId && assignment.rosterStatus === 'MLB',
      ));
      const laterAdditions = assignedCards.filter((player) => player.leagueAssignments?.some(
        (assignment) => assignment.leagueId === library.leagueId && assignment.rosterStatus === 'FREE_AGENT',
      ));

      expect(assignedCards).toHaveLength(cards.length);
      expect(rosteredCards).toHaveLength(HISTORICAL_LEGENDS_CORE_PLAYER_COUNT);
      expect(laterAdditions).toHaveLength(cards.length - HISTORICAL_LEGENDS_CORE_PLAYER_COUNT);
      expect(new Set(rosteredCards.map((player) => player.historicalLegend?.displayName)).size)
        .toBe(HISTORICAL_LEGENDS_CORE_PLAYER_COUNT);

      const rosteredIds = new Set<string>();
      for (const teamId of league?.teamIds ?? []) {
        const roster = await getTeamRoster(teamId);
        expect(roster?.mlbRoster).toHaveLength(22);
        for (const playerId of roster?.mlbRoster ?? []) rosteredIds.add(playerId);
      }
      expect(rosteredIds).toEqual(new Set(rosteredCards.map((player) => player.id)));
    }
  }, 15_000);

  test('refreshing the frozen payload is idempotent', async () => {
    await importHistoricalLegendsPayload(payload, EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256);
    const first = await Promise.all([
      getAllLeagueTemplates(),
      getAllTeams(),
      getAllPlayers(),
    ]);
    const firstRosters = await Promise.all(
      first[1]
        .filter((team) => team.leagueIds.some(isHistoricalLegendsLibraryId))
        .map((team) => getTeamRoster(team.id)),
    );
    await importHistoricalLegendsPayload(payload, EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256);

    const [leagues, teams, players] = await Promise.all([
      getAllLeagueTemplates(),
      getAllTeams(),
      getAllPlayers(),
    ]);
    expect(leagues.filter((league) => isHistoricalLegendsLibraryId(league.id))).toHaveLength(3);
    expect(teams.filter((team) => team.leagueIds.some(isHistoricalLegendsLibraryId))).toHaveLength(33);
    expect(players).toHaveLength(payload.profileCount);
    expect([leagues, teams, players]).toEqual(first);
    expect(await Promise.all(
      teams
        .filter((team) => team.leagueIds.some(isHistoricalLegendsLibraryId))
        .map((team) => getTeamRoster(team.id)),
    )).toEqual(firstRosters);
  }, 15_000);
});
