import 'fake-indexeddb/auto';
import { afterEach, describe, expect, test } from 'vitest';
import {
  FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
  FRANCHISE_MANUAL_SMOKE_SOURCE,
  prepareFranchiseManualSmokeFixture,
} from '../franchiseManualSmokeFixture';
import {
  FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE,
  getFranchiseManualSmokeSetupRoute,
  isFranchiseManualSmokeFixtureEnabled,
} from '../franchiseManualSmokeFixtureGate';
import {
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
} from '../leagueBuilderStorage';
import { validatePreparedLeagueBuilderFarmScoutingState } from '../leagueBuilderFarmScoutingHandoff';

async function deleteDb(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

afterEach(async () => {
  await deleteDb('kbl-league-builder');
});

describe('franchise manual smoke fixture', () => {
  test('gates setup to dev or test environments', () => {
    expect(isFranchiseManualSmokeFixtureEnabled({ dev: true, mode: 'production' })).toBe(true);
    expect(isFranchiseManualSmokeFixtureEnabled({ dev: false, mode: 'test' })).toBe(true);
    expect(isFranchiseManualSmokeFixtureEnabled({ dev: false, mode: 'production' })).toBe(false);
    expect(getFranchiseManualSmokeSetupRoute({ dev: true, mode: 'production' })).toBe(FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE);
    expect(getFranchiseManualSmokeSetupRoute({ dev: false, mode: 'test' })).toBe(FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE);
    expect(getFranchiseManualSmokeSetupRoute({ dev: false, mode: 'production' })).toBeNull();
  });

  test('disabled setup returns inert blocker report', async () => {
    const report = await prepareFranchiseManualSmokeFixture({
      environment: { dev: false, mode: 'production' },
    });

    expect(report.enabled).toBe(false);
    expect(report.prepared).toBe(false);
    expect(report.blockers.join(' ')).toMatch(/dev\/test preview/i);
    expect(report.createdMlbPlayers).toBe(0);
    expect(report.createdFarmPlayers).toBe(0);
  });

  test('creates valid hidden-safe FARM and scout handoff state in the smoke namespace', async () => {
    const report = await prepareFranchiseManualSmokeFixture({
      environment: { dev: false, mode: 'test' },
    });

    expect(report.enabled).toBe(true);
    expect(report.prepared).toBe(true);
    expect(report.leagueId).toBe(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID);
    expect(report.teamCount).toBe(6);
    expect(report.createdMlbPlayers).toBe(132);
    expect(report.createdFarmPlayers).toBe(60);
    expect(report.hiredScouts).toBe(6);
    expect(report.blockers).toEqual([]);
    expect(report.teamSummaries).toHaveLength(6);
    expect(report.teamSummaries.every((team) =>
      team.mlbPlayers === 22 &&
      team.farmPlayers === 10 &&
      team.hiredScouts === 1 &&
      team.payroll > 0,
    )).toBe(true);

    const handoff = await validatePreparedLeagueBuilderFarmScoutingState(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID);
    expect(handoff.prepared).toBe(true);
    expect(handoff.blockers).toEqual([]);
    expect(handoff.teams).toHaveLength(6);
    expect(handoff.teams.every((team) =>
      team.MLB === 22 &&
      team.FARM === 10 &&
      team.hiddenFarm === 10 &&
      team.visibleSafeMetadata === 10 &&
      team.scouts === 1,
    )).toBe(true);

    const players = await getAllPlayers();
    const farmPlayers = players.filter((player) =>
      player.leagueAssignments?.some((assignment) =>
        assignment.leagueId === FRANCHISE_MANUAL_SMOKE_LEAGUE_ID &&
        assignment.rosterStatus === 'FARM',
      ),
    );
    expect(farmPlayers).toHaveLength(60);
    expect(farmPlayers.every((player) => player.ratingRevealState === 'hidden')).toBe(true);
    expect(farmPlayers.every((player) => {
      const profile = (player as typeof player & {
        prospectProfile?: { scoutedGrade?: unknown; scoutConfidence?: unknown; scoutReportsVisible?: unknown[] };
      }).prospectProfile;
      return Boolean(profile?.scoutedGrade && profile.scoutConfidence && profile.scoutReportsVisible?.length);
    })).toBe(true);
  });

  test('repeat setup resets only named smoke records and preserves unrelated League Builder data', async () => {
    await saveLeagueTemplate({
      id: 'unrelated-league',
      name: 'Unrelated League',
      teamIds: ['unrelated-team'],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'default',
    });
    await saveTeam({
      id: 'unrelated-team',
      name: 'Unrelated Team',
      abbreviation: 'UT',
      location: 'Elsewhere',
      nickname: 'Unrelated',
      colors: { primary: '#111111', secondary: '#eeeeee' },
      stadium: 'Apple Field',
      leagueIds: ['unrelated-league'],
    });
    await savePlayer({
      id: 'unrelated-player',
      firstName: 'Una',
      lastName: 'Related',
      gender: 'F',
      age: 30,
      bats: 'R',
      throws: 'R',
      primaryPosition: 'SS',
      secondaryPosition: 'IF',
      power: 60,
      contact: 60,
      speed: 60,
      fielding: 60,
      arm: 60,
      velocity: 0,
      junk: 0,
      accuracy: 0,
      arsenal: [],
      overallGrade: 'B',
      personality: 'Competitive',
      chemistry: 'Competitive',
      morale: 50,
      mojo: 'Normal',
      fame: 0,
      salary: 1_000_000,
      leagueAssignments: [{ leagueId: 'unrelated-league', teamId: 'unrelated-team', rosterStatus: 'MLB' }],
      isCustom: true,
    });

    await prepareFranchiseManualSmokeFixture({ environment: { dev: false, mode: 'test' } });
    await prepareFranchiseManualSmokeFixture({ environment: { dev: false, mode: 'test' } });

    expect(await getLeagueTemplate('unrelated-league')).not.toBeNull();
    expect((await getAllTeams()).some((team) => team.id === 'unrelated-team')).toBe(true);
    expect((await getAllPlayers()).some((player) => player.id === 'unrelated-player')).toBe(true);
    expect((await getAllPlayers()).filter((player) => player.sourceDatabase === FRANCHISE_MANUAL_SMOKE_SOURCE)).toHaveLength(132);
  });
});
