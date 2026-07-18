import 'fake-indexeddb/auto';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
    batchMutations: <T>(work: () => T) => work(),
  },
}));

import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import { LUXURY_CAP_TABLES, TIER_CAPS } from '../../data/tierParams';
import {
  archetypeToCapIdentity,
  constructionArchetypeFitMultiplier,
  resolveClubBandPriorities,
} from '../archetypeIdentity';
import { toRosterSlotPlayer } from '../rosterNeed';
import { rankArchetypeDraftability } from '../draftabilityRanker';
import { registerPool } from '../leagueConstruction';
import { createPoolIdentitySupportReceipt, extractPoolFromDemand } from '../poolFromDemand';
import { SNAKE_POOL_COMPETITION_PRESETS, snakePoolSizeGuide } from '../snakePoolAssembly';
import {
  createSnakeIdentitySupportCertificate,
  proveSimultaneousSnakeSeating,
  validateConstructiveSnakeSeatingProof,
} from '../snakeSeatingProof';
import { snakeLuxuryCaps } from '../snakeLuxuryTax';
import { buildDeskRoomPlayer, fitWord } from '../../src_figma/app/components/snake/desk/deskRoomModel';
import { demandUniverseFromPlayers } from '../../src_figma/app/engines/leaguePlayerAdapter';
import { toConstructionPlayer } from '../../src_figma/hooks/useLeagueBuilderData';
import { computePlayerIv } from '../../utils/leagueBuilderPoolBuilder';
import { buildSnakeSetupProofInput } from '../../src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.helpers';
import {
  __resetLeagueBuilderDatabaseForTests,
  getAllPlayers,
  seedFromSMB4Database,
  type Player,
  type Team,
} from '../../utils/leagueBuilderStorage';
import { snakePlayerSourceId, snakePlayerVersionGroupId } from '../../utils/snakePlayerIdentity';

const DB_NAME = 'kbl-league-builder';

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function buildPlayer(player: Player) {
  const price = computePlayerIv(player);
  const construction = toConstructionPlayer(player);
  const seating = {
    playerId: player.id,
    sourceId: snakePlayerSourceId(player),
    versionGroupId: snakePlayerVersionGroupId(player),
    price,
    shape: toRosterSlotPlayer({
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition ?? null,
      traits: [player.trait1, player.trait2],
    }),
    construction,
  };
  return buildDeskRoomPlayer({ player, price, seating });
}

function grade(multiplier: number | null): 'strong' | 'solid' | 'weak' {
  if (multiplier != null && multiplier >= 1.04) return 'strong';
  if (multiplier != null && multiplier <= 0.96) return 'weak';
  return 'solid';
}

let assignedPlayers: Player[] = [];

function buildProductionProofInput(input: {
  teamIds: readonly string[];
  archetypes: readonly (typeof HISTORICAL_ARCHETYPES)[number][];
  playerIds: readonly string[];
}) {
  const teams: Team[] = input.teamIds.map((teamId, index) => ({
    id: teamId,
    name: `Fit Club ${index + 1}`,
    abbreviation: `FC${index + 1}`,
    location: 'Calibration',
    nickname: `Club ${index + 1}`,
    colors: { primary: '#000000', secondary: '#ffffff' },
    stadium: 'Calibration Park',
    leagueIds: ['sml'],
    mlbArchetypeKey: input.archetypes[index].id,
    createdDate: '2026-07-17',
    lastModified: '2026-07-17',
  }));
  const playerIdSet = new Set(input.playerIds);
  const pool = registerPool({
    leagueId: 'sml',
    tier: 'standard',
    balanceMode: 'taxed',
    totalSlots: input.teamIds.length * 22,
    teamCount: input.teamIds.length,
    salaryCap: TIER_CAPS.standard.tierCap,
    players: assignedPlayers
      .filter((player) => playerIdSet.has(player.id))
      .map((player) => ({ id: player.id, iv: computePlayerIv(player), salary: player.salary ?? 0 })),
  });
  return buildSnakeSetupProofInput({ teams, players: assignedPlayers, pool });
}

beforeAll(async () => {
  await deleteDatabase();
  __resetLeagueBuilderDatabaseForTests();
  await seedFromSMB4Database(true);
  assignedPlayers = (await getAllPlayers()).filter((player) =>
    player.leagueAssignments?.some((assignment) => assignment.leagueId === 'sml'),
  );
});

afterAll(async () => {
  __resetLeagueBuilderDatabaseForTests();
  await deleteDatabase();
});

describe('stock SMB4 Snake FIT and pool calibration', () => {
  test('keeps displayed FIT identity-only for all 24 archetypes on the exact 440 assigned-player source', () => {
    expect(assignedPlayers).toHaveLength(440);
    const players = assignedPlayers.flatMap((player) => buildPlayer(player) ?? []);
    expect(players).toHaveLength(440);

    for (const archetype of HISTORICAL_ARCHETYPES) {
      const capIdentity = archetypeToCapIdentity(archetype);
      const priorities = resolveClubBandPriorities({ mlbArchetypeKey: archetype.id })!;
      const raw = { strong: 0, solid: 0, weak: 0 };
      const rawGrades = new Map<string, keyof typeof raw>();
      for (const player of players) {
        const fit = grade(constructionArchetypeFitMultiplier(capIdentity, player.construction));
        raw[fit] += 1;
        rawGrades.set(player.playerId, fit);
      }

      for (const tier of ['juiced', 'standard', 'nerfed'] as const) {
        const displayed = { strong: 0, solid: 0, weak: 0 };
        for (const player of players) {
          const shown = fitWord({
            player,
            priorities,
            capIdentity,
            baseCaps: LUXURY_CAP_TABLES[tier],
            need: null,
            openSlots: 22,
          });
          const fit = shown.startsWith('STRONG') ? 'strong' : shown.startsWith('WEAK') ? 'weak' : 'solid';
          displayed[fit] += 1;
          expect(fit).toBe(rawGrades.get(player.playerId));
        }
        expect(displayed).toEqual(raw);
        expect(displayed.strong).toBeGreaterThanOrEqual(10);
        expect(displayed.weak).toBeLessThan(players.length / 2);
      }
    }
  });

  test('builds exact Competitive and Loose pools around one simultaneous eight-club certificate', () => {
    const archetypeIds = [
      'bash-brothers', 'launch-and-leather', 'flamethrowers', 'hdh-royals',
      'murderers-row', 'whiteyball', 'nasty-boys', 'the-oriole-way',
    ];
    const selectedArchetypes = archetypeIds.map((archetypeId) =>
      HISTORICAL_ARCHETYPES.find((entry) => entry.id === archetypeId)!,
    );
    const teamIds = selectedArchetypes.map((_, index) => `fit-club-${index}`);
    const demandUniverse = demandUniverseFromPlayers(assignedPlayers);
    const guide = snakePoolSizeGuide(teamIds.length);
    const prove = (playerIds: readonly string[]) => {
      const input = buildProductionProofInput({
        teamIds,
        archetypes: selectedArchetypes,
        playerIds,
      });
      expect(input.clubs.every((club) => club.identityArchetype)).toBe(true);
      return { input, proof: proveSimultaneousSnakeSeating(input) };
    };
    const full = prove(demandUniverse.map((player) => player.id));
    const fullProof = full.proof;
    expect(fullProof.feasible).toBe(true);
    expect(validateConstructiveSnakeSeatingProof(full.input, fullProof)).toBe(true);
    const supportCertificate = createSnakeIdentitySupportCertificate(full.input, fullProof);
    expect(supportCertificate).not.toBeNull();
    const supportIds = [...new Set(fullProof.assignments.flatMap((assignment) => assignment.playerIds))];
    expect(supportIds).toHaveLength(teamIds.length * 22);
    const supportReceipt = createPoolIdentitySupportReceipt({
      universe: demandUniverse,
      selectedArchetypes,
      tier: 'standard',
      teams: teamIds.length,
      budgetPerTeam: TIER_CAPS.standard.tierCap,
      playerIds: supportIds,
      authorityFingerprint: supportCertificate!.sourceFingerprint,
    });

    for (const preset of ['competitive', 'loose'] as const) {
        const definition = SNAKE_POOL_COMPETITION_PRESETS[preset];
        const result = extractPoolFromDemand(
          demandUniverse,
          [],
          selectedArchetypes,
          'standard',
          {
            teams: teamIds.length,
            shills: 0,
            budgetPerTeam: TIER_CAPS.standard.tierCap,
            poolBalancePreset: 'balanced',
            poolQualityCenter: 68,
            poolSizeMultiplier: definition.multiplier,
            poolSourceMode: 'full-pool',
            identitySupportIds: supportIds,
            identitySupportReceipt: supportReceipt,
            preserveSelectedIdentityClaims: false,
          },
        );
        const shapedPlayers = result.players;
        const finalVerdicts = rankArchetypeDraftability(
          shapedPlayers,
          selectedArchetypes,
          'standard',
          {
            realTeamCount: teamIds.length,
            budgetOverride: TIER_CAPS.standard.tierCap,
            taxCaps: snakeLuxuryCaps([...LUXURY_CAP_TABLES.standard]),
            embodimentReference: demandUniverse,
          },
        );
        const proof = prove(shapedPlayers.map((player) => player.id)).proof;
        expect(shapedPlayers).toHaveLength(guide.targets[preset]);
        expect(supportIds.every((playerId) => shapedPlayers.some((player) => player.id === playerId))).toBe(true);
        expect(result.sizing?.effectiveTarget).toBe(guide.targets[preset]);
        expect(result.sizing?.injectedIds.length).toBeGreaterThan(0);
        expect(result.sizing?.injectedIds.every((playerId) => shapedPlayers.some((player) => player.id === playerId))).toBe(true);
        expect(result.numericShape?.g1AdditionCount).toBe(0);
        expect(finalVerdicts.some((verdict) => verdict.band === 'LOCKED')).toBe(false);
        expect(proof.feasible).toBe(true);
    }
    expect(demandUniverse).toHaveLength(440);
  }, 300_000);

  test('certifies the exact 440-player two-club Murderers Row and Whiteyball browser input', () => {
    expect(assignedPlayers).toHaveLength(440);
    const archetypes = ['murderers-row', 'whiteyball'].map((archetypeId) =>
      HISTORICAL_ARCHETYPES.find((entry) => entry.id === archetypeId)!,
    );
    const input = buildProductionProofInput({
      teamIds: ['browser-murderers-row', 'browser-whiteyball'],
      archetypes,
      playerIds: assignedPlayers.map((player) => player.id),
    });
    expect(input.clubs.every((club) => club.identityArchetype)).toBe(true);

    const proof = proveSimultaneousSnakeSeating(input);

    expect(proof.feasible).toBe(true);
    expect(proof.assignments).toHaveLength(2);
    expect(new Set(proof.assignments.flatMap((assignment) => assignment.playerIds))).toHaveLength(44);
    expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);
  }, 120_000);

  test('certifies four simultaneous clubs for every chosen archetype on exact Full Sources', () => {
    expect(assignedPlayers).toHaveLength(440);
    for (const archetype of HISTORICAL_ARCHETYPES) {
      const input = buildProductionProofInput({
        teamIds: Array.from({ length: 4 }, (_, index) => `${archetype.id}-${index}`),
        archetypes: Array.from({ length: 4 }, () => archetype),
        playerIds: assignedPlayers.map((player) => player.id),
      });
      expect(input.clubs.every((club) => club.identityArchetype)).toBe(true);

      const proof = proveSimultaneousSnakeSeating(input);

      expect(proof.feasible, archetype.id).toBe(true);
      expect(new Set(proof.assignments.flatMap((assignment) => assignment.playerIds)), archetype.id)
        .toHaveLength(88);
    }
  }, 300_000);
});
