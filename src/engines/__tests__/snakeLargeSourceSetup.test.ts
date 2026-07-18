import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
    batchMutations: <T>(work: () => T) => work(),
  },
}));

import {
  EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
  type HistoricalLegendsAppPayload,
} from '../../data/historicalLegendsAppData';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import { TIER_CAPS } from '../../data/tierParams';
import { importHistoricalLegendsPayload } from '../../utils/historicalLegendsImport';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  getAllPlayers,
  seedFromMLBDatabase,
  seedFromSMB4Database,
  type Player,
  type Team,
} from '../../utils/leagueBuilderStorage';
import { computePlayerIv } from '../../utils/leagueBuilderPoolBuilder';
import { snakePlayerVersionGroupId } from '../../utils/snakePlayerIdentity';
import { isLegalRoster } from '../../data/rosterConstruction';
import {
  buildSnakeOrder,
  luxuryTax,
  registerPool,
  shiftLuxuryCaps,
} from '../leagueConstruction';
import {
  advanceTrustedSnakeSeatingCertificate,
  createTrustedSnakeSeatingCertificate,
  proveSimultaneousSnakeSeating,
  validateConstructiveSnakeSeatingProof,
} from '../snakeSeatingProof';
import { snakeLuxuryCaps } from '../snakeLuxuryTax';
import { extractPoolFromDemand } from '../poolFromDemand';
import { SNAKE_POOL_COMPETITION_PRESETS, snakePoolSizeGuide } from '../snakePoolAssembly';
import { demandUniverseFromPlayers } from '../../src_figma/app/engines/leaguePlayerAdapter';
import { buildSnakeSetupProofInput } from '../../src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.helpers';

const legendsPayload = JSON.parse(
  readFileSync(resolve('public/data/historical-legends-app-data.json'), 'utf8'),
) as HistoricalLegendsAppPayload;

const archetypeIds = [
  'bash-brothers',
  'launch-and-leather',
  'flamethrowers',
  'hdh-royals',
  'murderers-row',
  'whiteyball',
  'nasty-boys',
  'the-oriole-way',
] as const;

let sourcePlayers: Player[] = [];
let cachedRoom: {
  teams: Team[];
  pool: ReturnType<typeof registerPool>;
  input: ReturnType<typeof buildSnakeSetupProofInput>;
  proof: ReturnType<typeof proveSimultaneousSnakeSeating>;
} | null = null;

function buildTeams(
  ids: readonly string[] = archetypeIds,
  leagueId = 'large-source-room',
): Team[] {
  return ids.map((archetypeId, index) => {
    expect(HISTORICAL_ARCHETYPES.some((archetype) => archetype.id === archetypeId)).toBe(true);
    return {
      id: `${leagueId}-club-${index + 1}`,
      name: `Large Source Club ${index + 1}`,
      abbreviation: `LS${index + 1}`,
      location: 'Regression',
      nickname: `Club ${index + 1}`,
      colors: { primary: '#0f5132', secondary: '#f4cf48' },
      stadium: 'Regression Park',
      leagueIds: [leagueId],
      mlbArchetypeKey: archetypeId,
      createdDate: '2026-07-18',
      lastModified: '2026-07-18',
    };
  });
}

function buildLargeSourceRoom() {
  if (cachedRoom) return cachedRoom;
  const teams = buildTeams();
  const pool = registerPool({
    leagueId: 'large-source-room',
    tier: 'standard',
    balanceMode: 'taxed',
    totalSlots: teams.length * 22,
    teamCount: teams.length,
    salaryCap: TIER_CAPS.standard.tierCap,
    players: sourcePlayers.map((player) => ({
      id: player.id,
      iv: computePlayerIv(player),
      salary: player.salary ?? 0,
    })),
  });
  const input = buildSnakeSetupProofInput({ teams, players: sourcePlayers, pool });
  cachedRoom = { teams, pool, input, proof: proveSimultaneousSnakeSeating(input) };
  return cachedRoom;
}

beforeAll(async () => {
  await clearAllLeagueBuilderData();
  await seedFromSMB4Database(false);
  await seedFromMLBDatabase(false);
  await importHistoricalLegendsPayload(
    legendsPayload,
    EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
  );
  sourcePlayers = await getAllPlayers();
});

afterAll(async () => {
  cachedRoom = null;
  await clearAllLeagueBuilderData();
  __resetLeagueBuilderDatabaseForTests();
});

describe('eight-club Snake setup on combined production sources', () => {
  test('certifies Full Sources without mistaking cards or bounded search for player scarcity', () => {
    const { teams, input, proof } = buildLargeSourceRoom();
    const uniquePeople = new Set(sourcePlayers.map(snakePlayerVersionGroupId));

    expect(sourcePlayers.length).toBeGreaterThan(1_900);
    expect(uniquePeople.size).toBeGreaterThan(teams.length * 22);

    expect(input.clubs).toHaveLength(8);
    expect(input.clubs.every((club) => club.identityArchetype)).toBe(true);

    expect(proof.shortfall).toBeNull();
    expect(proof.feasible).toBe(true);
    expect(proof.assignments).toHaveLength(8);
    const assignedIds = proof.assignments.flatMap((assignment) => assignment.playerIds);
    expect(new Set(assignedIds)).toHaveLength(176);
    expect(new Set(assignedIds.map((playerId) => {
      const player = sourcePlayers.find((candidate) => candidate.id === playerId);
      expect(player).toBeDefined();
      return snakePlayerVersionGroupId(player!);
    }))).toHaveLength(176);
    expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);

    let certificate = createTrustedSnakeSeatingCertificate(input, proof);
    expect(certificate).not.toBeNull();
    for (const pick of buildSnakeOrder(teams.map((team) => team.id), 22)) {
      expect(certificate).not.toBeNull();
      if (!certificate) break;
      const club = certificate.input.clubs.find((candidate) => candidate.teamId === pick.teamId)!;
      const assignment = certificate.proof.assignments.find((candidate) => candidate.teamId === pick.teamId)!;
      const playerId = assignment.playerIds[0];
      expect(playerId).toBeTruthy();
      const player = certificate.input.pool.find((candidate) => candidate.playerId === playerId)!;
      const caps = club.capIdentity
        ? shiftLuxuryCaps(snakeLuxuryCaps([...certificate.input.baseCaps]), club.capIdentity)
        : snakeLuxuryCaps([...certificate.input.baseCaps]);
      const committed = club.committedConstruction ?? club.roster.map((candidate) => candidate.construction);
      const currentTax = luxuryTax(committed, caps, 'taxed').charged;
      const nextTax = luxuryTax([...committed, player.construction], caps, 'taxed').charged;
      certificate = advanceTrustedSnakeSeatingCertificate({
        certificate,
        teamId: pick.teamId,
        playerId,
        allInCost: player.price + nextTax - currentTax,
      });
    }

    expect(certificate).not.toBeNull();
    expect(certificate?.input.clubs.every((club) => (
      club.roster.length === 22
      && isLegalRoster(club.roster.map((player) => player.shape))
      && club.budgetRemaining >= -1e-6
    ))).toBe(true);
    expect(certificate?.proof.assignments.every((assignment) => assignment.playerIds.length === 0)).toBe(true);
  }, 300_000);

  test('builds every named eight-club preset from the same large source certificate', () => {
    const { teams, pool: fullSourcePool, proof } = buildLargeSourceRoom();
    expect(proof.feasible).toBe(true);
    const supportIds = [...new Set(proof.assignments.flatMap((assignment) => assignment.playerIds))];
    expect(supportIds).toHaveLength(176);
    const demandUniverse = demandUniverseFromPlayers(sourcePlayers);
    const guide = snakePoolSizeGuide(teams.length);
    const selectedArchetypes = archetypeIds.map((archetypeId) => (
      HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === archetypeId)!
    ));

    for (const preset of ['tight', 'competitive', 'loose'] as const) {
      const definition = SNAKE_POOL_COMPETITION_PRESETS[preset];
      const result = extractPoolFromDemand(
        demandUniverse,
        [],
        selectedArchetypes,
        'standard',
        {
          teams: teams.length,
          shills: 0,
          budgetPerTeam: TIER_CAPS.standard.tierCap,
          poolBalancePreset: 'balanced',
          poolQualityCenter: 68,
          poolSizeMultiplier: definition.multiplier,
          poolSourceMode: 'full-pool',
          identitySupportIds: supportIds,
          preserveSelectedIdentityClaims: false,
        },
      );
      const pool = registerPool({
        leagueId: `large-source-${preset}`,
        tier: 'standard',
        balanceMode: 'taxed',
        totalSlots: teams.length * 22,
        teamCount: teams.length,
        salaryCap: TIER_CAPS.standard.tierCap,
        players: result.players.map((player) => ({
          id: player.id,
          iv: player.iv,
          salary: player.salary,
        })),
      });
      const input = buildSnakeSetupProofInput({
        teams,
        players: sourcePlayers,
        pool,
        identityReferencePool: fullSourcePool,
        identitySupportAssignments: proof.assignments,
      });
      const shapedProof = proveSimultaneousSnakeSeating(input);

      expect(result.players, `${preset} exact named count`).toHaveLength(guide.targets[preset]);
      expect(supportIds.every((playerId) => result.players.some((player) => player.id === playerId)), `${preset} support`)
        .toBe(true);
      expect(shapedProof.feasible, `${preset} proof: ${shapedProof.message}`).toBe(true);
      expect(validateConstructiveSnakeSeatingProof(input, shapedProof), `${preset} independent validation`).toBe(true);
    }
  }, 300_000);

  test('certifies every other selectable identity in production-size eight-club rooms', () => {
    const alreadyCovered = new Set<string>(archetypeIds);
    const remainingIdentityIds = HISTORICAL_ARCHETYPES
      .map((archetype) => archetype.id)
      .filter((archetypeId) => !alreadyCovered.has(archetypeId));
    expect(HISTORICAL_ARCHETYPES).toHaveLength(24);
    expect(remainingIdentityIds).toHaveLength(16);

    for (let roomIndex = 0; roomIndex < remainingIdentityIds.length / 8; roomIndex += 1) {
      const roomIdentityIds = remainingIdentityIds.slice(roomIndex * 8, (roomIndex + 1) * 8);
      const leagueId = `large-source-identity-room-${roomIndex + 1}`;
      const teams = buildTeams(roomIdentityIds, leagueId);
      const pool = registerPool({
        leagueId,
        tier: 'standard',
        balanceMode: 'taxed',
        totalSlots: teams.length * 22,
        teamCount: teams.length,
        salaryCap: TIER_CAPS.standard.tierCap,
        players: sourcePlayers.map((player) => ({
          id: player.id,
          iv: computePlayerIv(player),
          salary: player.salary ?? 0,
        })),
      });
      const input = buildSnakeSetupProofInput({ teams, players: sourcePlayers, pool });
      const proof = proveSimultaneousSnakeSeating(input);

      expect(proof.feasible, `${roomIdentityIds.join(', ')}: ${proof.message}`).toBe(true);
      expect(proof.assignments).toHaveLength(8);
      expect(new Set(proof.assignments.flatMap((assignment) => assignment.playerIds))).toHaveLength(176);
      expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);
    }
  }, 300_000);
});
