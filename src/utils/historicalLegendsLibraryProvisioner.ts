import {
  HISTORICAL_LEGENDS_CORE_PLAYER_COUNT,
  HISTORICAL_LEGENDS_LIBRARY_COHORTS,
  HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS,
  historicalLegendsLibraryTeamId,
  isHistoricalLegendsLibraryId,
} from '../data/historicalLegendsLibraries';
import { HISTORICAL_LEGENDS_SOURCE_DATABASE } from '../data/historicalLegendsAppData';
import {
  createEmptyTeamRoster,
  getAllLeagueTemplates,
  getAllPlayers,
  getAllTeams,
  getTeamRoster,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  saveTeamRoster,
  type LeagueTemplate,
  type Player,
  type Team,
} from './leagueBuilderStorage';

export interface HistoricalLegendsLibraryProvisionResult {
  leagues: number;
  teams: number;
  rosteredCards: number;
  laterAdditionCards: number;
}

function legendDisplayName(player: Player): string {
  return player.historicalLegend?.displayName?.trim()
    || `${player.firstName} ${player.lastName}`.trim();
}

function coreTeamByName(): Map<string, string> {
  const result = new Map<string, string>();
  for (const cohort of HISTORICAL_LEGENDS_LIBRARY_COHORTS) {
    for (const playerName of cohort.playerNames) result.set(playerName, cohort.slug);
  }
  return result;
}

function verifyCoreCards(players: readonly Player[]): void {
  for (const library of HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS) {
    const cardsByName = new Map<string, Player[]>();
    for (const player of players) {
      if (player.historicalProfileType !== library.profileType) continue;
      const name = legendDisplayName(player);
      cardsByName.set(name, [...(cardsByName.get(name) ?? []), player]);
    }
    for (const cohort of HISTORICAL_LEGENDS_LIBRARY_COHORTS) {
      for (const playerName of cohort.playerNames) {
        const matches = cardsByName.get(playerName) ?? [];
        if (matches.length !== 1) {
          throw new Error(
            `${library.name} must contain exactly one ${playerName} card; found ${matches.length}.`,
          );
        }
      }
    }
  }
}

/**
 * Installs three system-owned source libraries around the verified Legends
 * cards. Re-running reconciles only these stable library ids and leaves every
 * ordinary league/team/player assignment untouched.
 */
export async function provisionHistoricalLegendsLibraries(): Promise<HistoricalLegendsLibraryProvisionResult> {
  const [allPlayers, allLeagues, allTeams] = await Promise.all([
    getAllPlayers(),
    getAllLeagueTemplates(),
    getAllTeams(),
  ]);
  const players = allPlayers.filter((player) => (
    player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE
  ));
  const leagueById = new Map(allLeagues.map((league) => [league.id, league]));
  const teamById = new Map(allTeams.map((team) => [team.id, team]));
  verifyCoreCards(players);

  const coreTeams = coreTeamByName();
  let rosteredCards = 0;
  let laterAdditionCards = 0;

  for (const library of HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS) {
    const teamIds = HISTORICAL_LEGENDS_LIBRARY_COHORTS.map((cohort) => (
      historicalLegendsLibraryTeamId(library.leagueId, cohort.slug)
    ));
    const desiredLeague: Omit<LeagueTemplate, 'createdDate' | 'lastModified'> = {
      id: library.leagueId,
      name: library.name,
      description: 'System source library for Historical Legends draft-pool selection.',
      teamIds,
      conferences: [{
        id: `${library.leagueId}:conference`,
        name: 'Legends',
        abbreviation: 'LEG',
        divisionIds: [`${library.leagueId}:division`],
      }],
      divisions: [{
        id: `${library.leagueId}:division`,
        name: 'Library',
        conferenceId: `${library.leagueId}:conference`,
        teamIds,
      }],
      defaultRulesPreset: 'default',
      draftFormat: 'snake',
      sourceLibrary: { kind: 'historical-legends', profileType: library.profileType },
      color: library.color,
    };
    const currentLeague = leagueById.get(library.leagueId);
    const leagueFields = ['name', 'description', 'teamIds', 'conferences', 'divisions', 'defaultRulesPreset', 'draftFormat', 'sourceLibrary', 'color'] as const;
    if (!currentLeague || leagueFields.some((field) => JSON.stringify(currentLeague[field]) !== JSON.stringify(desiredLeague[field]))) {
      await saveLeagueTemplate(desiredLeague);
    }

    for (const cohort of HISTORICAL_LEGENDS_LIBRARY_COHORTS) {
      const teamId = historicalLegendsLibraryTeamId(library.leagueId, cohort.slug);
      const desiredTeam: Omit<Team, 'createdDate' | 'lastModified'> = {
        id: teamId,
        name: cohort.name,
        abbreviation: cohort.abbreviation,
        location: 'Legends Library',
        nickname: cohort.name,
        colors: { primary: cohort.primary, secondary: cohort.secondary, accent: library.color },
        stadium: 'Archive Grounds',
        controlledBy: 'ai',
        leagueIds: [library.leagueId],
        backstory: 'Historical Legends source cohort.',
      };
      const currentTeam = teamById.get(teamId);
      const teamFields = ['name', 'abbreviation', 'location', 'nickname', 'colors', 'stadium', 'controlledBy', 'leagueIds', 'backstory'] as const;
      if (!currentTeam || teamFields.some((field) => JSON.stringify(currentTeam[field]) !== JSON.stringify(desiredTeam[field]))) {
        await saveTeam(desiredTeam);
      }
    }
  }

  for (const player of players) {
    const library = HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS.find((candidate) => (
      candidate.profileType === player.historicalProfileType
    ));
    if (!library) {
      throw new Error(`Historical Legends card ${player.id} has no source library profile.`);
    }
    const cohortSlug = coreTeams.get(legendDisplayName(player));
    const assignment = cohortSlug
      ? {
          leagueId: library.leagueId,
          teamId: historicalLegendsLibraryTeamId(library.leagueId, cohortSlug),
          rosterStatus: 'MLB' as const,
        }
      : { leagueId: library.leagueId, teamId: '', rosterStatus: 'FREE_AGENT' as const };
    const leagueAssignments = [
      ...(player.leagueAssignments ?? []).filter((row) => !isHistoricalLegendsLibraryId(row.leagueId)),
      assignment,
    ];
    if (JSON.stringify(player.leagueAssignments ?? []) !== JSON.stringify(leagueAssignments)) {
      await savePlayer({ ...player, leagueAssignments });
    }
    if (cohortSlug) rosteredCards += 1;
    else laterAdditionCards += 1;
  }

  const persistedByProfileAndName = new Map<string, Player>();
  for (const player of await getAllPlayers()) {
    if (player.sourceDatabase !== HISTORICAL_LEGENDS_SOURCE_DATABASE || !player.historicalProfileType) continue;
    persistedByProfileAndName.set(`${player.historicalProfileType}:${legendDisplayName(player)}`, player);
  }
  for (const library of HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS) {
    for (const cohort of HISTORICAL_LEGENDS_LIBRARY_COHORTS) {
      const playerIds = cohort.playerNames.map((playerName) => {
        const player = persistedByProfileAndName.get(`${library.profileType}:${playerName}`);
        if (!player) throw new Error(`${library.name} is missing roster card ${playerName}.`);
        return player.id;
      });
      const desiredRoster = {
        ...createEmptyTeamRoster(historicalLegendsLibraryTeamId(library.leagueId, cohort.slug)),
        mlbRoster: playerIds,
      };
      const currentRoster = await getTeamRoster(desiredRoster.teamId);
      const { lastModified: _currentLastModified, ...currentRosterValue } = currentRoster ?? {};
      const { lastModified: _desiredLastModified, ...desiredRosterValue } = desiredRoster;
      void _currentLastModified;
      void _desiredLastModified;
      if (!currentRoster || JSON.stringify(currentRosterValue) !== JSON.stringify(desiredRosterValue)) {
        await saveTeamRoster(desiredRoster);
      }
    }
  }

  const expectedRostered = HISTORICAL_LEGENDS_CORE_PLAYER_COUNT * HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS.length;
  if (rosteredCards !== expectedRostered) {
    throw new Error(`Historical Legends libraries rostered ${rosteredCards} cards; expected ${expectedRostered}.`);
  }

  return {
    leagues: HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS.length,
    teams: HISTORICAL_LEGENDS_LIBRARY_COHORTS.length * HISTORICAL_LEGENDS_LIBRARY_DEFINITIONS.length,
    rosteredCards,
    laterAdditionCards,
  };
}
