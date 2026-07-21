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
import { isLegalRoster, LEGAL_ROSTER } from '../../data/rosterConstruction';
import {
  buildSnakeOrder,
  luxuryTax,
  registerPool,
  shiftLuxuryCaps,
} from '../leagueConstruction';
import {
  advanceTrustedSnakeSeatingCertificate,
  createSnakeIdentitySupportCertificate,
  createTrustedSnakeSeatingCertificate,
  proveSimultaneousSnakeSeating,
  validateConstructiveSnakeSeatingProof,
} from '../snakeSeatingProof';
import { deriveVersionGroupId } from '../snakeVersioning';
import { snakeLuxuryCaps } from '../snakeLuxuryTax';
import {
  createPoolIdentitySupportReceipt,
  deriveHardPositionSupplyFloorTargets,
  extractPoolFromDemand,
  matchesPositionSupplyFloor,
} from '../poolFromDemand';
import { SNAKE_POOL_COMPETITION_PRESETS, snakePoolSizeGuide } from '../snakePoolAssembly';
import { demandUniverseFromPlayers } from '../../src_figma/app/engines/leaguePlayerAdapter';
import {
  buildInitialSnakeSeatBoards,
  buildSnakeSetupProofInput,
} from '../../src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.helpers';

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
let cachedFourRoom: typeof cachedRoom = null;

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

const fourClubIdentityIds = [
  'murderers-row',
  'the-oriole-way',
  'go-go-small-ball',
  'wheels-and-cannons',
] as const;

function browserSelectedSourcePlayers(): Player[] {
  // Exact source union from the failing production page: SMB4 plus Historical Legends, no MLB.
  return sourcePlayers.filter((player) => player.sourceDatabase !== 'MLB');
}

function historicalLegendsSourcePlayers(): Player[] {
  // Exact union shown when Career, Draft, and Peak Legend libraries are the only checked sources.
  return sourcePlayers.filter((player) => player.sourceDatabase === 'HISTORICAL_LEGENDS');
}

function registerProductionPool(input: {
  leagueId: string;
  teams: readonly Team[];
  players: readonly Player[];
}) {
  return registerPool({
    leagueId: input.leagueId,
    tier: 'standard',
    balanceMode: 'taxed',
    totalSlots: input.teams.length * LEGAL_ROSTER.size,
    teamCount: input.teams.length,
    salaryCap: TIER_CAPS.standard.tierCap,
    players: input.players.map((player) => ({
      id: player.id,
      iv: computePlayerIv(player),
      salary: player.salary ?? 0,
    })),
  });
}

function buildIdentitySupportedLegendsPool(
  identityIds: readonly string[],
  leagueId: string,
) {
  const teams = buildTeams(identityIds, leagueId);
  const players = historicalLegendsSourcePlayers();
  const selectedArchetypes = identityIds.map((archetypeId) => (
    HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === archetypeId)!
  ));
  const fullSourcePool = registerProductionPool({ leagueId: `${leagueId}-full`, teams, players });
  const demandUniverse = demandUniverseFromPlayers(players);
  const bootstrapResult = extractPoolFromDemand(
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
      poolSizeMultiplier: SNAKE_POOL_COMPETITION_PRESETS.loose.multiplier,
      poolSourceMode: 'full-pool',
      preserveSelectedIdentityClaims: false,
      deferIdentityToFinalProof: true,
    },
  );
  const bootstrapPool = registerProductionPool({
    leagueId: `${leagueId}-bootstrap`,
    teams,
    players: players.filter((player) => (
      bootstrapResult.players.some((candidate) => candidate.id === player.id)
    )),
  });
  const bootstrapInput = buildSnakeSetupProofInput({
    teams,
    players,
    pool: bootstrapPool,
  });
  let certificatePool = bootstrapPool;
  let certificateInput = bootstrapInput;
  let certificateProof = proveSimultaneousSnakeSeating(bootstrapInput);
  if (!certificateProof.feasible && teams.length <= 4) {
    certificatePool = fullSourcePool;
    certificateInput = buildSnakeSetupProofInput({ teams, players, pool: fullSourcePool });
    certificateProof = proveSimultaneousSnakeSeating(certificateInput);
  }
  if (!certificateProof.feasible) {
    throw new Error(`Neither Loose nor Full Legends certified ${leagueId}: ${certificateProof.message}`);
  }
  const supportCertificate = createSnakeIdentitySupportCertificate(certificateInput, certificateProof);
  if (!supportCertificate) throw new Error(`Validated Legends source did not mint support for ${leagueId}.`);
  const supportIds = [...new Set(certificateProof.assignments.flatMap((assignment) => assignment.playerIds))];
  const supportReceipt = createPoolIdentitySupportReceipt({
    universe: demandUniverse,
    selectedArchetypes,
    tier: 'standard',
    teams: teams.length,
    budgetPerTeam: TIER_CAPS.standard.tierCap,
    playerIds: supportIds,
    authorityFingerprint: `${supportCertificate.sourceFingerprint}:${supportCertificate.assignmentFingerprint}`,
  });
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
      poolSizeMultiplier: SNAKE_POOL_COMPETITION_PRESETS.loose.multiplier,
      poolSourceMode: 'full-pool',
      identitySupportIds: supportIds,
      identitySupportReceipt: supportReceipt,
      preserveSelectedIdentityClaims: false,
    },
  );
  const pool = registerProductionPool({
    leagueId,
    teams,
    players: players.filter((player) => result.players.some((candidate) => candidate.id === player.id)),
  });
  const input = buildSnakeSetupProofInput({
    teams,
    players,
    pool,
    identityReferencePool: certificatePool,
    identitySupportCertificate: supportCertificate,
  });
  return {
    teams,
    result,
    input,
    proof: proveSimultaneousSnakeSeating(input),
    supportIds,
  };
}

function buildFourClubFullSourceRoom() {
  if (cachedFourRoom) return cachedFourRoom;
  const leagueId = 'four-club-large-source-room';
  const teams = buildTeams(fourClubIdentityIds, leagueId);
  const players = browserSelectedSourcePlayers();
  const pool = registerProductionPool({ leagueId, teams, players });
  const input = buildSnakeSetupProofInput({ teams, players, pool });
  cachedFourRoom = { teams, players, pool, input, proof: proveSimultaneousSnakeSeating(input) };
  return cachedFourRoom;
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
}, 60_000);

afterAll(async () => {
  cachedRoom = null;
  cachedFourRoom = null;
  await clearAllLeagueBuilderData();
  __resetLeagueBuilderDatabaseForTests();
}, 60_000);

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
    const { teams, pool: fullSourcePool, input: fullSourceInput, proof } = buildLargeSourceRoom();
    expect(proof.feasible).toBe(true);
    const supportCertificate = createSnakeIdentitySupportCertificate(fullSourceInput, proof);
    expect(supportCertificate).not.toBeNull();
    const supportIds = [...new Set(proof.assignments.flatMap((assignment) => assignment.playerIds))];
    expect(supportIds).toHaveLength(176);
    const demandUniverse = demandUniverseFromPlayers(sourcePlayers);
    const guide = snakePoolSizeGuide(teams.length);
    const selectedArchetypes = archetypeIds.map((archetypeId) => (
      HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === archetypeId)!
    ));
    const supportReceipt = createPoolIdentitySupportReceipt({
      universe: demandUniverse,
      selectedArchetypes,
      tier: 'standard',
      teams: teams.length,
      budgetPerTeam: TIER_CAPS.standard.tierCap,
      playerIds: supportIds,
      authorityFingerprint: supportCertificate!.sourceFingerprint,
    });

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
          identitySupportReceipt: supportReceipt,
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
        identitySupportCertificate: supportCertificate!,
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

      expect(
        proof.feasible,
        `${roomIdentityIds.join(', ')}: ${JSON.stringify({ message: proof.message, shortfall: proof.shortfall })}`,
      ).toBe(true);
      expect(proof.assignments).toHaveLength(8);
      expect(new Set(proof.assignments.flatMap((assignment) => assignment.playerIds))).toHaveLength(176);
      expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);
    }
  }, 300_000);
});

describe('four-club Snake setup on combined production sources', () => {
  test('certifies and materializes Full Sources with the exact 800-card browser source and identities', () => {
    const { teams, players, pool, input, proof } = buildFourClubFullSourceRoom();

    expect(players).toHaveLength(1_341);
    expect(new Set(players.map(snakePlayerVersionGroupId))).toHaveLength(851);
    expect(proof.feasible, proof.message).toBe(true);
    expect(proof.assignments).toHaveLength(4);
    const assignedIds = proof.assignments.flatMap((assignment) => assignment.playerIds);
    expect(assignedIds).toHaveLength(88);
    expect(new Set(assignedIds.map((playerId) => (
      snakePlayerVersionGroupId(players.find((player) => player.id === playerId)!)
    )))).toHaveLength(88);
    expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);

    const boards = buildInitialSnakeSeatBoards({ teams, players, pool, certificate: proof });
    expect(Object.keys(boards)).toHaveLength(4);
    for (const team of teams) {
      expect(Object.values(boards[team.id].slots)).toHaveLength(LEGAL_ROSTER.size);
    }
  }, 300_000);

  test('certifies the four-club Loose named preset against the same Full Sources identity truth', () => {
    const { teams, players, pool: fullSourcePool, input: fullSourceInput, proof } = buildFourClubFullSourceRoom();
    const supportCertificate = createSnakeIdentitySupportCertificate(fullSourceInput, proof);
    expect(supportCertificate).not.toBeNull();
    const supportIds = [...new Set(proof.assignments.flatMap((assignment) => assignment.playerIds))];
    const selectedArchetypes = fourClubIdentityIds.map((archetypeId) => (
      HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === archetypeId)!
    ));
    const demandUniverse = demandUniverseFromPlayers(players);
    const supportReceipt = createPoolIdentitySupportReceipt({
      universe: demandUniverse,
      selectedArchetypes,
      tier: 'standard',
      teams: teams.length,
      budgetPerTeam: TIER_CAPS.standard.tierCap,
      playerIds: supportIds,
      authorityFingerprint: supportCertificate!.sourceFingerprint,
    });
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
        poolSizeMultiplier: SNAKE_POOL_COMPETITION_PRESETS.loose.multiplier,
        poolSourceMode: 'full-pool',
        identitySupportIds: supportIds,
        identitySupportReceipt: supportReceipt,
        preserveSelectedIdentityClaims: false,
      },
    );
    const loosePool = registerPool({
      leagueId: 'four-club-loose-room',
      tier: 'standard',
      balanceMode: 'taxed',
      totalSlots: teams.length * LEGAL_ROSTER.size,
      teamCount: teams.length,
      salaryCap: TIER_CAPS.standard.tierCap,
      players: result.players.map((player) => ({ id: player.id, iv: player.iv, salary: player.salary })),
    });
    const input = buildSnakeSetupProofInput({
      teams,
      players,
      pool: loosePool,
      identityReferencePool: fullSourcePool,
      identitySupportCertificate: supportCertificate!,
    });
    const looseProof = proveSimultaneousSnakeSeating(input);

    expect(result.players, JSON.stringify(result.sizing?.messages ?? [])).toHaveLength(snakePoolSizeGuide(teams.length).targets.loose);
    expect(result.players).toHaveLength(132);
    expect(supportIds.every((playerId) => result.players.some((player) => player.id === playerId))).toBe(true);
    expect(looseProof.feasible, looseProof.message).toBe(true);
    expect(validateConstructiveSnakeSeatingProof(input, looseProof)).toBe(true);
  }, 300_000);

  test('counts duplicate cards for one person as one unit of legal draft capacity', () => {
    const selectedSourcePlayers = browserSelectedSourcePlayers();
    const cardsByPerson = new Map<string, Player[]>();
    for (const player of selectedSourcePlayers) {
      const groupId = snakePlayerVersionGroupId(player);
      cardsByPerson.set(groupId, [...(cardsByPerson.get(groupId) ?? []), player]);
    }
    const chosenGroups = [...cardsByPerson.entries()].filter(([, cards]) => cards.length > 1).slice(0, 30);
    const versionedCards = chosenGroups.flatMap(([, cards]) => cards);
    const teams = buildTeams(fourClubIdentityIds, 'duplicate-capacity-room').map((team) => ({
      ...team,
      mlbArchetypeKey: undefined,
      capIdentity: undefined,
    }));
    const pool = registerProductionPool({ leagueId: 'duplicate-capacity-room', teams, players: versionedCards });
    const proof = proveSimultaneousSnakeSeating(buildSnakeSetupProofInput({ teams, players: versionedCards, pool }));

    expect(chosenGroups).toHaveLength(30);
    expect(versionedCards.length).toBeGreaterThan(30);
    expect(proof.feasible).toBe(false);
    expect(proof.shortfall).toMatchObject({
      reason: 'body-count',
      available: 30,
      needed: 102,
    });
  });

  test.each(['C', 'SP', 'RP', 'CP'] as const)(
    'still blocks genuinely insufficient %s supply',
    (position) => {
      const full = buildFourClubFullSourceRoom();
      const target = deriveHardPositionSupplyFloorTargets(full.teams.length)
        .find((candidate) => candidate.position === position)!;
      const protectedCloserPeople = position === 'RP'
        ? new Set(full.input.pool
            .filter((player) => matchesPositionSupplyFloor(
              player.shape,
              deriveHardPositionSupplyFloorTargets(full.teams.length)
                .find((candidate) => candidate.position === 'CP')!,
            ))
            .map(deriveVersionGroupId)
            .filter((groupId, index, all) => all.indexOf(groupId) === index)
            .slice(0, full.teams.length))
        : new Set<string>();
      const removedPeople = new Set(full.input.pool
        .filter((player) => (
          matchesPositionSupplyFloor(player.shape, target)
          && !protectedCloserPeople.has(deriveVersionGroupId(player))
        ))
        .map(deriveVersionGroupId));
      const remainingPlayers = full.players.filter((player) => (
        !removedPeople.has(snakePlayerVersionGroupId(player))
      ));
      const teams = full.teams.map((team) => ({ ...team, mlbArchetypeKey: undefined, capIdentity: undefined }));
      const pool = registerProductionPool({ leagueId: `short-${position}`, teams, players: remainingPlayers });
      const proof = proveSimultaneousSnakeSeating(buildSnakeSetupProofInput({ teams, players: remainingPlayers, pool }));

      expect(removedPeople.size).toBeGreaterThan(0);
      expect(proof.feasible).toBe(false);
      expect(proof.shortfall).toMatchObject({
        reason: 'position-floor',
        position,
        available: position === 'RP' ? full.teams.length : 0,
      });
    },
    30_000,
  );

  test('names a genuine SWING composition shortage after every hard position floor passes', () => {
    const full = buildFourClubFullSourceRoom();
    const representativeByPerson = new Map<string, (typeof full.input.pool)[number]>();
    for (const player of full.input.pool) {
      const groupId = deriveVersionGroupId(player);
      if (!representativeByPerson.has(groupId)) {
        representativeByPerson.set(groupId, player);
      }
    }
    const representatives = [...representativeByPerson.values()];
    const chosen = new Set<string>();
    const addForTarget = (target: ReturnType<typeof deriveHardPositionSupplyFloorTargets>[number]) => {
      const matching = () => [...chosen].filter((groupId) => {
        const player = representativeByPerson.get(groupId);
        return player ? matchesPositionSupplyFloor(player.shape, target) : false;
      }).length;
      for (const player of representatives) {
        if (matching() >= target.needed) break;
        if (matchesPositionSupplyFloor(player.shape, target)) chosen.add(deriveVersionGroupId(player));
      }
      expect(matching(), target.position).toBeGreaterThanOrEqual(target.needed);
    };
    const targets = deriveHardPositionSupplyFloorTargets(full.teams.length);
    for (const target of targets.filter((candidate) => (
      candidate.kind === 'field-position' || candidate.kind === 'catcher-depth'
    ))) addForTarget(target);
    for (const player of representatives.filter((candidate) => !candidate.shape.isPitcher)) {
      if ([...chosen].filter((groupId) => !representativeByPerson.get(groupId)!.shape.isPitcher).length >= 48) break;
      chosen.add(deriveVersionGroupId(player));
    }
    for (const target of targets.filter((candidate) => (
      candidate.kind === 'starter' || candidate.kind === 'reliever' || candidate.kind === 'closer'
    ))) addForTarget(target);
    for (const player of representatives.filter((candidate) => candidate.shape.isPitcher)) {
      if ([...chosen].filter((groupId) => representativeByPerson.get(groupId)!.shape.isPitcher).length >= 54) break;
      chosen.add(deriveVersionGroupId(player));
    }
    const chosenCardIds = new Set([...chosen].map((groupId) => representativeByPerson.get(groupId)!.playerId));
    const selectedPlayers = full.players.filter((player) => chosenCardIds.has(player.id));
    const teams = full.teams.map((team) => ({ ...team, mlbArchetypeKey: undefined, capIdentity: undefined }));
    const pool = registerProductionPool({ leagueId: 'short-swing', teams, players: selectedPlayers });
    const proof = proveSimultaneousSnakeSeating(buildSnakeSetupProofInput({ teams, players: selectedPlayers, pool }));

    expect(selectedPlayers).toHaveLength(102);
    expect(proof.feasible).toBe(false);
    expect(proof.shortfall).toMatchObject({
      reason: 'joint-assignment',
      position: 'SWING',
      label: 'BENCH / SWING HITTERS',
      available: 48,
      needed: 52,
      detail: 'roster-composition',
    });
  });

  test('blocks a true selected-source identity shortage and names the affected club', () => {
    const players = browserSelectedSourcePlayers().map((player) => ({
      ...player,
      power: 50,
      contact: 50,
      speed: 50,
      fielding: 50,
      arm: 50,
      velocity: 50,
      junk: 50,
      accuracy: 50,
    }));
    const teams = buildTeams(fourClubIdentityIds, 'identity-short-room');
    const pool = registerProductionPool({ leagueId: 'identity-short-room', teams, players });
    const proof = proveSimultaneousSnakeSeating(buildSnakeSetupProofInput({ teams, players, pool }));

    expect(proof.feasible).toBe(false);
    expect(proof.shortfall).toMatchObject({
      reason: 'identity-proof-unknown',
      teamId: teams[0].id,
      identityName: "Murderers' Row",
      detail: 'identity-embodiment',
    });
  }, 300_000);
});

describe('four-club Snake setup on Historical Legends sources only', () => {
  test('shapes and certifies a normal Loose pool without requiring the 835-card shelf to certify first', () => {
    const leagueId = 'four-club-legends-only-room';
    const teams = buildTeams(fourClubIdentityIds, leagueId);
    const players = historicalLegendsSourcePlayers();

    expect(players).toHaveLength(835);
    expect(new Set(players.map(snakePlayerVersionGroupId))).toHaveLength(345);
    const selectedArchetypes = fourClubIdentityIds.map((archetypeId) => (
      HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === archetypeId)!
    ));
    const demandUniverse = demandUniverseFromPlayers(players);
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
        poolSizeMultiplier: SNAKE_POOL_COMPETITION_PRESETS.loose.multiplier,
        poolSourceMode: 'full-pool',
        preserveSelectedIdentityClaims: false,
        deferIdentityToFinalProof: true,
      },
    );
    const loosePool = registerPool({
      leagueId: `${leagueId}-loose`,
      tier: 'standard',
      balanceMode: 'taxed',
      totalSlots: teams.length * LEGAL_ROSTER.size,
      teamCount: teams.length,
      salaryCap: TIER_CAPS.standard.tierCap,
      players: result.players.map((player) => ({ id: player.id, iv: player.iv, salary: player.salary })),
    });
    const looseInput = buildSnakeSetupProofInput({ teams, players, pool: loosePool });
    const looseProof = proveSimultaneousSnakeSeating(looseInput);

    expect(result.players).toHaveLength(132);
    expect(new Set(result.players.map((player) => player.versionGroupId))).toHaveLength(132);
    expect(result.numericShape).toMatchObject({
      poolSize: 132,
      requiredRosterDemand: 88,
      targetSize: 132,
    });
    expect(result.numericShape!.middleMassShare).toBeGreaterThanOrEqual(Math.floor(0.70 * 132) / 132 - 1e-9);
    expect(
      result.numericShape!.highTailShare,
      JSON.stringify({ messages: result.sizing?.messages ?? [], swaps: result.numericShape?.g1Swaps ?? [] }),
    ).toBeLessThanOrEqual(Math.ceil(0.15 * 132) / 132 + 1e-9);
    expect(result.numericShape!.superstarTailShare).toBeLessThanOrEqual(Math.ceil(0.04 * 132) / 132 + 1e-9);
    expect(result.numericShape!.lowTailShare).toBeLessThanOrEqual(Math.ceil(0.18 * 132) / 132 + 1e-9);
    expect(result.numericShape!.curveViolations ?? []).toEqual([]);
    expect(looseProof.feasible, looseProof.message).toBe(true);
    expect(validateConstructiveSnakeSeatingProof(looseInput, looseProof)).toBe(true);
  }, 300_000);
});

describe('two-club Snake setup on Historical Legends sources only', () => {
  test('keeps ordinary and swing relief depth proportional to roster demand', () => {
    const leagueId = 'two-club-legends-bullpen-room';
    const identityIds = ['nasty-boys', 'flamethrowers'] as const;
    const { result, input, proof, supportIds } = buildIdentitySupportedLegendsPool(identityIds, leagueId);
    const counts = Object.fromEntries(['SP', 'SP/RP', 'RP', 'CP'].map((position) => [
      position,
      result.players.filter((player) => player.position === position).length,
    ]));
    const supportCounts = Object.fromEntries(['SP', 'SP/RP', 'RP', 'CP'].map((position) => [
      position,
      input.pool.filter((player) => supportIds.includes(player.playerId) && player.shape.role === position).length,
    ]));

    expect(result.players).toHaveLength(66);
    expect(supportIds).toHaveLength(identityIds.length * LEGAL_ROSTER.size);
    expect(supportIds.every((id) => result.players.some((player) => player.id === id))).toBe(true);
    const roleEvidence = JSON.stringify({ counts, supportCounts, messages: result.poolShape?.messages ?? [] });
    expect(counts.RP, roleEvidence).toBeGreaterThanOrEqual(6);
    expect(counts['SP/RP'], roleEvidence).toBeGreaterThanOrEqual(2);
    expect(counts.RP + counts['SP/RP'], roleEvidence).toBeGreaterThanOrEqual(8);
    expect(counts.CP, roleEvidence).toBeGreaterThanOrEqual(3);
    if (counts.CP > 4) {
      expect(result.numericShape?.messages.join(' '), roleEvidence)
        .toMatch(/Remove \d+ CP.*to balance rosters\./);
    }
    expect(proof.feasible, JSON.stringify({ proof, counts, sizing: result.sizing?.messages ?? [] })).toBe(true);
    expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);
  }, 300_000);
});

describe('eight-club Snake setup on Historical Legends sources only', () => {
  test('shapes and certifies 264 distinct people from the same 835-card shelf', () => {
    const leagueId = 'eight-club-legends-only-room';
    const { teams, result, input, proof, supportIds } = buildIdentitySupportedLegendsPool(archetypeIds, leagueId);
    const sizingEvidence = JSON.stringify(result.sizing?.messages ?? []);
    expect(result.players, sizingEvidence).toHaveLength(snakePoolSizeGuide(teams.length).targets.loose);
    expect(result.players, sizingEvidence).toHaveLength(264);
    expect(new Set(result.players.map((player) => player.versionGroupId))).toHaveLength(264);
    expect(result.numericShape?.targetSize).toBe(264);
    expect(result.numericShape!.middleMassShare).toBeGreaterThanOrEqual(Math.floor(0.70 * 264) / 264 - 1e-9);
    expect(
      result.numericShape!.highTailShare,
      JSON.stringify({ messages: result.sizing?.messages ?? [], swaps: result.numericShape?.g1Swaps ?? [] }),
    ).toBeLessThanOrEqual(Math.ceil(0.15 * 264) / 264 + 1e-9);
    expect(result.numericShape!.superstarTailShare).toBeLessThanOrEqual(Math.ceil(0.04 * 264) / 264 + 1e-9);
    expect(result.numericShape!.lowTailShare).toBeLessThanOrEqual(Math.ceil(0.18 * 264) / 264 + 1e-9);
    expect(result.numericShape?.curveViolations ?? []).toEqual([]);
    expect(supportIds).toHaveLength(teams.length * LEGAL_ROSTER.size);
    expect(supportIds.every((id) => result.players.some((player) => player.id === id))).toBe(true);
    expect(proof.feasible, proof.message).toBe(true);
    expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);
  }, 300_000);

  test.each([0, 1, 2])('certifies selectable identities in normal eight-club Legends pool room %i', (roomIndex) => {
    const allIdentityIds = HISTORICAL_ARCHETYPES.map((archetype) => archetype.id);

    expect(allIdentityIds).toHaveLength(24);
    const roomIdentityIds = allIdentityIds.slice(roomIndex * 8, (roomIndex + 1) * 8);
    const leagueId = `eight-club-legends-identity-room-${roomIndex + 1}`;
    const { teams, result, input, proof, supportIds } = buildIdentitySupportedLegendsPool(
      roomIdentityIds,
      leagueId,
    );
    expect(result.players, `room ${roomIndex + 1} count: ${JSON.stringify(result.sizing?.messages ?? [])}`).toHaveLength(264);
    expect(new Set(result.players.map((player) => player.versionGroupId)), `room ${roomIndex + 1} people`)
      .toHaveLength(264);
    expect(
      result.numericShape?.curveViolations ?? [],
      `room ${roomIndex + 1} curve: ${JSON.stringify({ highTailShare: result.numericShape?.highTailShare, messages: result.sizing?.messages ?? [], swaps: result.numericShape?.g1Swaps ?? [] })}`,
    ).toEqual([]);
    expect(supportIds, `room ${roomIndex + 1} support count`).toHaveLength(teams.length * LEGAL_ROSTER.size);
    expect(
      supportIds.every((id) => result.players.some((player) => player.id === id)),
      `room ${roomIndex + 1} support retention`,
    ).toBe(true);
    expect(
      proof.feasible,
      `${roomIdentityIds.join(', ')}: ${JSON.stringify({ message: proof.message, shortfall: proof.shortfall })}`,
    ).toBe(true);
    expect(validateConstructiveSnakeSeatingProof(input, proof), `room ${roomIndex + 1} validation`).toBe(true);
  }, 300_000);
});
