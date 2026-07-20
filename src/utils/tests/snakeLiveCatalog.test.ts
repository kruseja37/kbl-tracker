import { describe, expect, test } from 'vitest';
import type { RegisteredPool } from '../../engines/leagueConstruction';
import type { LeagueTemplate, Player, Team } from '../leagueBuilderStorage';
import {
  buildSnakeLiveFarmCatalog,
  buildSnakeLiveCatalog,
  readSnakeLiveFarmCatalog,
  readSnakeLiveCatalog,
  readSnakeLiveCatalogForPhase,
  snakeLiveCatalogForbiddenPath,
} from '../snakeLiveCatalog';

const league = {
  id: 'league-1',
  name: 'Eight Team Draft',
  createdDate: '2026-07-19',
  lastModified: '2026-07-19',
  teamIds: ['team-1', 'team-2'],
  conferences: [],
  divisions: [],
  defaultRulesPreset: 'standard',
  draftFormat: 'snake',
  tier: 'standard',
  salaryCap: 1_000_000,
  balanceMode: 'taxed',
} satisfies LeagueTemplate;

function team(id: string): Team {
  return {
    id,
    name: id === 'team-1' ? 'Beewolves' : 'Buzzards',
    abbreviation: id === 'team-1' ? 'BEE' : 'BUZ',
    location: 'Big Sky',
    nickname: id === 'team-1' ? 'Beewolves' : 'Buzzards',
    colors: { primary: '#006a8e', secondary: '#ffcf2f' },
    stadium: 'Founders Field',
    leagueIds: ['league-1'],
    capIdentity: { increase: ['Power'], decrease: ['Speed'] },
    mlbArchetypeKey: 'BASH_BROTHERS',
    farmArchetypeKey: id === 'team-1' ? 'web-gems' : 'bomba-squad',
    rosterDesign: { slots: [], rankOverrides: { SP1: ['private-player'] } },
    boardRankOverrides: { global: ['private-player'] },
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: ['private-player'],
    createdDate: '2026-07-19',
    lastModified: '2026-07-19',
  };
}

function player(id: string): Player {
  return {
    id,
    sourceId: `source-${id}`,
    versionGroupId: `group-${id}`,
    versionLabel: 'Career',
    firstName: id === 'player-1' ? 'Jovita' : 'Punchie',
    lastName: id === 'player-1' ? 'Pulo' : 'Patterson',
    backstory: 'private lore',
    gender: 'F',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: id === 'player-1' ? 'SS' : 'SP',
    power: 70,
    contact: 71,
    speed: 72,
    fielding: 73,
    arm: 74,
    velocity: 75,
    junk: 76,
    accuracy: 77,
    arsenal: ['4F'],
    overallGrade: 'A-',
    trait1: 'Tough Out',
    personality: 'Competitive',
    chemistry: 'Competitive',
    hiddenPersonalityModifiers: { confidence: 10 } as Player['hiddenPersonalityModifiers'],
    morale: 50,
    mojo: 'Normal',
    fame: 50,
    salary: 50000,
    salaryFactors: { source: 'multifactor-current-season', baseSalary: 50000 },
    prospectProfile: { humanPickNumbers: [], cpuPickNumbers: [], humanValue: 0, cpuValue: 0, greedMargin: 0 },
    historicalLegend: { private: true } as unknown as Player['historicalLegend'],
    editHistory: [],
    createdDate: '2026-07-19',
    lastModified: '2026-07-19',
    isCustom: false,
  };
}

const pool: RegisteredPool = {
  leagueId: 'league-1',
  tier: 'standard',
  balanceMode: 'taxed',
  players: [
    { id: 'player-1', iv: 50000, salary: 50000 },
    { id: 'player-2', iv: 48000, salary: 48000 },
  ],
  tierCap: 1_000_000,
  luxuryCaps: [],
  pickValueChart: [{ pick: 1, value: 100 }],
  totalSlots: 44,
  poolSurplusWarning: false,
  locked: true,
  lockedAt: 1,
};

describe('Snake live public catalog', () => {
  test('keeps only the active league, active teams, active pool, and explicit public fields', () => {
    const catalog = buildSnakeLiveCatalog({
      league,
      teams: [team('other-team'), team('team-2'), team('team-1')],
      players: [player('other-player'), player('player-2'), player('player-1')],
      registeredPool: pool,
      activeTeamIds: ['team-1', 'team-2'],
      activePoolPlayerIds: ['player-1', 'player-2'],
    });

    expect(catalog.formatVersion).toBe('snake-live-catalog-v1');
    expect((catalog.teams as Array<{ id: string }>).map((row) => row.id)).toEqual(['team-1', 'team-2']);
    expect(catalog.teams).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'team-1', mlbArchetypeKey: 'BASH_BROTHERS', farmArchetypeKey: 'web-gems' }),
      expect.objectContaining({ id: 'team-2', mlbArchetypeKey: 'BASH_BROTHERS', farmArchetypeKey: 'bomba-squad' }),
    ]));
    expect((catalog.players as Array<{ id: string }>).map((row) => row.id)).toEqual(['player-1', 'player-2']);
    expect(snakeLiveCatalogForbiddenPath(catalog)).toBeNull();
    expect(readSnakeLiveCatalog(catalog)).not.toBeNull();
    const serialized = JSON.stringify(catalog);
    for (const secret of [
      'hiddenPersonalityModifiers', 'salaryFactors', 'prospectProfile', 'backstory',
      'historicalLegend', 'editHistory', 'rosterDesign', 'boardRankOverrides',
      'rankOverrides', 'lineupWithDH', 'lineupWithoutDH', 'startingRotation',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  test('fails when an active team or pool player is missing', () => {
    expect(() => buildSnakeLiveCatalog({ league, teams: [team('team-1')], players: [player('player-1'), player('player-2')], registeredPool: pool, activeTeamIds: ['team-1', 'team-2'], activePoolPlayerIds: ['player-1', 'player-2'] }))
      .toThrow('missing an active team');
    expect(() => buildSnakeLiveCatalog({ league, teams: [team('team-1'), team('team-2')], players: [player('player-1')], registeredPool: pool, activeTeamIds: ['team-1', 'team-2'], activePoolPlayerIds: ['player-1', 'player-2'] }))
      .toThrow('missing an active-pool player');
    expect(() => buildSnakeLiveCatalog({
      league,
      teams: [team('team-1'), team('team-2')],
      players: [player('player-1'), player('player-2')],
      registeredPool: { ...pool, players: pool.players.slice(0, 1) },
      activeTeamIds: ['team-1', 'team-2'],
      activePoolPlayerIds: ['player-1', 'player-2'],
    })).toThrow('does not match the requested active pool');
    expect(() => buildSnakeLiveCatalog({
      league,
      teams: [team('team-1'), team('team-2')],
      players: [player('player-1'), player('player-2')],
      registeredPool: pool,
      activeTeamIds: ['team-1', 'team-3'],
      activePoolPlayerIds: ['player-1', 'player-2'],
    })).toThrow('does not match the active draft teams');
    const missingFarmIdentity = { ...team('team-2'), farmArchetypeKey: undefined };
    expect(() => buildSnakeLiveCatalog({
      league,
      teams: [team('team-1'), missingFarmIdentity],
      players: [player('player-1'), player('player-2')],
      registeredPool: pool,
      activeTeamIds: ['team-1', 'team-2'],
      activePoolPlayerIds: ['player-1', 'player-2'],
    })).toThrow('without both draft identities');
  });

  test('rejects incomplete or private catalog payloads on read', () => {
    const catalog = buildSnakeLiveCatalog({
      league,
      teams: [team('team-1'), team('team-2')],
      players: [player('player-1'), player('player-2')],
      registeredPool: pool,
      activeTeamIds: ['team-1', 'team-2'],
      activePoolPlayerIds: ['player-1', 'player-2'],
    });
    expect(readSnakeLiveCatalog({ ...catalog, teams: [catalog.teams[0]] })).toBeNull();
    expect(readSnakeLiveCatalog({ ...catalog, players: [{ id: 'player-1', backstory: 'private' }] })).toBeNull();
    expect(readSnakeLiveCatalog({ ...catalog, teams: [{ id: 'team-1', designSlots: ['private'] }] })).toBeNull();
  });

  test('builds a FARM catalog with public identity only and no true prospect data', () => {
    const prospects = [
      {
        id: 'prospect-1', firstName: 'Mara', lastName: 'Diaz', primaryPosition: 'SS', secondaryPosition: '2B',
        trueGrade: 'A+', power: 99, prospectProfile: { private: true },
      },
      {
        id: 'prospect-2', firstName: 'Jo', lastName: 'Arm', primaryPosition: 'SP',
        trueGrade: 'B', velocity: 98,
      },
    ];
    const catalog = buildSnakeLiveFarmCatalog({
      league,
      teams: [team('team-2'), team('team-1')],
      prospects,
      activeTeamIds: ['team-1', 'team-2'],
      activeProspectIds: ['prospect-1', 'prospect-2'],
      existingFarmRostersByTeamId: {
        'team-1': [{ id: 'rookie-1', name: 'Existing Rookie', position: 'C' }],
        'team-2': [],
      },
      farmTarget: 10,
    });

    expect(catalog.formatVersion).toBe('snake-live-farm-catalog-v1');
    expect(readSnakeLiveFarmCatalog(catalog)).not.toBeNull();
    expect(readSnakeLiveCatalogForPhase(catalog, 'FARM')).not.toBeNull();
    expect(readSnakeLiveCatalogForPhase(catalog, 'MLB')).toBeNull();
    expect(catalog.prospects).toEqual([
      { id: 'prospect-1', firstName: 'Mara', lastName: 'Diaz', primaryPosition: 'SS', secondaryPosition: '2B' },
      { id: 'prospect-2', firstName: 'Jo', lastName: 'Arm', primaryPosition: 'SP' },
    ]);
    const serialized = JSON.stringify(catalog);
    expect(serialized).not.toMatch(/"(?:trueGrade|prospectProfile|power|velocity)":/i);
    expect(readSnakeLiveFarmCatalog({
      ...catalog,
      prospects: [{ ...(catalog.prospects as Array<Record<string, unknown>>)[0], trueGrade: 'A+' }],
    })).toBeNull();
    expect(readSnakeLiveFarmCatalog({ ...catalog, trueGrade: 'A+' })).toBeNull();
    expect(readSnakeLiveFarmCatalog({
      ...catalog,
      league: { ...(catalog.league as Record<string, unknown>), salary: 123_000 },
    })).toBeNull();
    expect(readSnakeLiveFarmCatalog({
      ...catalog,
      teams: [{ ...(catalog.teams as Array<Record<string, unknown>>)[0], iv: 99 }, catalog.teams[1]],
    })).toBeNull();
    const firstTeam = (catalog.teams as Array<Record<string, unknown>>)[0];
    expect(readSnakeLiveFarmCatalog({
      ...catalog,
      teams: [{
        ...firstTeam,
        colors: { ...(firstTeam.colors as Record<string, unknown>), hiddenRatings: true },
      }, catalog.teams[1]],
    })).toBeNull();
  });

  test('freezes one public FARM catalog for eight clubs without copying true prospect data', () => {
    const teamIds = Array.from({ length: 8 }, (_, index) => `farm-team-${index + 1}`);
    const eightTeamLeague: LeagueTemplate = { ...league, id: 'farm-eight', name: 'Eight Club Farm Draft', teamIds };
    const teams = teamIds.map((id, index): Team => ({
      ...team(id),
      id,
      name: `Farm Club ${index + 1}`,
      abbreviation: `F${index + 1}`,
      leagueIds: [eightTeamLeague.id],
      farmArchetypeKey: index % 2 === 0 ? 'web-gems' : 'bomba-squad',
    }));
    const prospects = Array.from({ length: 96 }, (_, index) => ({
      id: `farm-prospect-${index + 1}`,
      firstName: 'Prospect',
      lastName: String(index + 1),
      primaryPosition: index % 4 === 0 ? 'SP' : index % 4 === 1 ? 'SS' : index % 4 === 2 ? 'C' : 'CF',
      trueGrade: 'A+',
      power: 99,
      prospectProfile: { private: true },
    }));
    const catalog = buildSnakeLiveFarmCatalog({
      league: eightTeamLeague,
      teams,
      prospects,
      activeTeamIds: teamIds,
      activeProspectIds: prospects.map((prospect) => prospect.id),
      existingFarmRostersByTeamId: Object.fromEntries(teamIds.map((id) => [id, []])),
      farmTarget: 10,
    });
    const read = readSnakeLiveFarmCatalog(catalog);

    expect(read?.teams).toHaveLength(8);
    expect(read?.prospects).toHaveLength(96);
    expect(Object.keys(read?.existingFarmRostersByTeamId ?? {})).toEqual(teamIds);
    expect(JSON.stringify(catalog)).not.toMatch(/"(?:trueGrade|prospectProfile|power)":/i);
  });
});
