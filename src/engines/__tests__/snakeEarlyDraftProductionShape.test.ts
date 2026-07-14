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

import { LUXURY_CAP_TABLES, TIER_CAPS } from '../../data/tierParams';
import { auctionMarginalTaxWithCaps, normalizeAuctionLuxuryCapsForLeagueSize } from '../auctionLuxuryTax';
import { buildSnakeOrder } from '../leagueConstruction';
import {
  playSnakeRationalRoomProgressively,
  snakeScarcityWitnessAuthTag,
  type SnakeRationalRoomResult,
  type SnakeRationalSeat,
} from '../snakeRationalRoom';
import {
  advanceTrustedSnakeSeatingCertificate,
  createTrustedSnakeSeatingCertificate,
  proveSimultaneousSnakeSeating,
  type SnakeSeatingPlayer,
} from '../snakeSeatingProof';
import { buildDefaultDesignSlots } from '../rosterDesignFeasibility';
import { toRosterSlotPlayer } from '../rosterNeed';
import { buildDeskRoomPlayer } from '../../src_figma/app/components/snake/desk/deskRoomModel';
import {
  buildSnakeAssistantBoardRequest,
  buildSnakeAssistantLivePlayer,
  runSnakeAssistantBoardRequest,
} from '../../src_figma/app/components/snake/desk/snakeDeskIntelligenceModel';
import { validSnakeAssistantBoardWorkerResponse } from '../../src_figma/app/components/snake/desk/useSnakeAssistantBoard';
import {
  validSnakeRationalRiskWorkerResponse,
  validSnakeRationalRiskWorkerResponseShape,
  type SnakeRationalRiskWorkerResponse,
} from '../../src_figma/app/components/snake/desk/useSnakeRationalRisks';
import { toConstructionPlayer } from '../../src_figma/hooks/useLeagueBuilderData';
import { computePlayerIv } from '../../utils/leagueBuilderPoolBuilder';
import {
  __resetLeagueBuilderDatabaseForTests,
  getAllPlayers,
  seedFromSMB4Database,
  type Player,
} from '../../utils/leagueBuilderStorage';
import { snakePlayerSourceId, snakePlayerVersionGroupId } from '../../utils/snakePlayerIdentity';

const DB_NAME = 'kbl-league-builder';
const TEAM_IDS = Array.from({ length: 20 }, (_, index) => `early-club-${index.toString().padStart(2, '0')}`);
const BALANCED = {
  Power: 1,
  Contact: 1,
  Speed: 1,
  Defense: 1,
  Rotation: 1,
  Bullpen: 1,
} as const;

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function seatingPlayer(player: Player): SnakeSeatingPlayer {
  return {
    playerId: player.id,
    sourceId: snakePlayerSourceId(player),
    versionGroupId: snakePlayerVersionGroupId(player),
    price: computePlayerIv(player),
    shape: toRosterSlotPlayer({
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition ?? null,
      traits: [player.trait1, player.trait2],
    }),
    construction: toConstructionPlayer(player),
  };
}

let stockPlayers: Player[] = [];
let seatingPlayers: SnakeSeatingPlayer[] = [];
let rationalPlayers: NonNullable<ReturnType<typeof buildDeskRoomPlayer>>[] = [];
let assistantPlayers: ReturnType<typeof buildSnakeAssistantLivePlayer>[] = [];

beforeAll(async () => {
  await deleteDatabase();
  __resetLeagueBuilderDatabaseForTests();
  const seeded = await seedFromSMB4Database(true);
  expect(seeded.players).toBeGreaterThanOrEqual(500);
  stockPlayers = await getAllPlayers();
  seatingPlayers = stockPlayers.map(seatingPlayer);
  rationalPlayers = stockPlayers.flatMap((player, index) => {
    const built = buildDeskRoomPlayer({ player, price: seatingPlayers[index].price, seating: seatingPlayers[index] });
    return built ? [built] : [];
  });
  assistantPlayers = rationalPlayers.map((player) => buildSnakeAssistantLivePlayer({
    player: player.stored,
    frozenIv: player.price,
    seating: player,
    archetypeWeights: player.archetypeWeights,
  }));
});

afterAll(async () => {
  __resetLeagueBuilderDatabaseForTests();
  await deleteDatabase();
});

describe('production-shape early snake intelligence', () => {
  test('advances one early production certificate directly and constructively', () => {
    const input = {
      clubs: TEAM_IDS.map((teamId) => ({
        teamId,
        roster: [],
        settledRosterPrices: [],
        committedSpent: 0,
        budgetRemaining: TIER_CAPS.juiced.tierCap,
        committedConstruction: [],
      })),
      pool: seatingPlayers,
      baseCaps: LUXURY_CAP_TABLES.juiced,
      realTeamCount: TEAM_IDS.length,
    };
    const root = proveSimultaneousSnakeSeating(input);
    const trusted = createTrustedSnakeSeatingCertificate(input, root);
    expect(trusted).not.toBeNull();
    if (!trusted) return;
    const selected = rationalPlayers[0];
    const caps = normalizeAuctionLuxuryCapsForLeagueSize([...LUXURY_CAP_TABLES.juiced], TEAM_IDS.length);
    const allInCost = selected.price + auctionMarginalTaxWithCaps([], selected.construction, undefined, caps);
    const startedAt = performance.now();
    const child = advanceTrustedSnakeSeatingCertificate({
      certificate: trusted,
      teamId: TEAM_IDS[0],
      playerId: selected.playerId,
      allInCost,
    });
    console.info('EARLY_SNAKE_ADVANCE', JSON.stringify({ elapsedMs: Math.round(performance.now() - startedAt), ready: Boolean(child) }));
    expect(child).not.toBeNull();
  }, 20_000);

  test('returns a useful solvent Asst GM board from the real 506-card source before pick one', () => {
    expect(assistantPlayers).toHaveLength(stockPlayers.length);
    expect(assistantPlayers.length).toBeGreaterThanOrEqual(500);
    const request = buildSnakeAssistantBoardRequest({
      identity: {
        sessionId: 'early-session',
        sessionRevision: 1,
        teamId: TEAM_IDS[0],
        seatId: TEAM_IDS[0],
        deviceId: 'reference-main',
        privateEpoch: 1,
        boardRevision: 1,
      },
      frozenPoolIdentity: 'stock-smb4-506',
      engineInput: {
        activePool: assistantPlayers,
        completedPicks: [],
        versionSelections: {},
        selectedPinPlayerId: null,
        archetype: { name: 'Balanced', rawShift: {} },
        ownBandPriorities: BALANCED,
        gmRankOverrides: { global: assistantPlayers.map((player) => player.playerId) },
        tier: 'juiced',
        budget: TIER_CAPS.juiced.tierCap,
        baseCaps: LUXURY_CAP_TABLES.juiced,
        realTeamCount: TEAM_IDS.length,
      },
      savedDesignSlots: buildDefaultDesignSlots(),
    });

    const startedAt = performance.now();
    const result = runSnakeAssistantBoardRequest(request);
    const elapsedMs = performance.now() - startedAt;
    console.info('EARLY_SNAKE_ASSISTANT', JSON.stringify({
      elapsedMs: Math.round(elapsedMs),
      status: result.status,
      rosterCount: result.status === 'ready' ? result.board.ledger.rosterCount : 0,
      moneyLeft: result.status === 'ready' ? Math.round(result.board.ledger.moneyLeft) : null,
    }));
    expect(result.status).toBe('ready');
    expect(validSnakeAssistantBoardWorkerResponse(
      structuredClone({ key: request.key, result }),
      request,
    )).toBe(true);
    expect(elapsedMs).toBeLessThanOrEqual(2_000);

    const twoClubRequest = buildSnakeAssistantBoardRequest({
      identity: {
        sessionId: 'early-two-club-session',
        sessionRevision: 1,
        teamId: TEAM_IDS[0],
        seatId: TEAM_IDS[0],
        deviceId: 'reference-main',
        privateEpoch: 1,
        boardRevision: 1,
      },
      frozenPoolIdentity: 'stock-smb4-506-two-club',
      engineInput: {
        ...request.input,
        realTeamCount: 2,
      },
      savedDesignSlots: request.input.slots,
    });
    const twoClubResult = runSnakeAssistantBoardRequest(twoClubRequest);
    expect(twoClubResult.status).toBe('ready');
    expect(validSnakeAssistantBoardWorkerResponse(
      structuredClone({ key: twoClubRequest.key, result: twoClubResult }),
      twoClubRequest,
    )).toBe(true);
  }, 20_000);

  test('returns selected and visible decision reads across the real full first-turn interval', () => {
    const pickOrder = buildSnakeOrder(TEAM_IDS, 22);
    const selectedIds = rationalPlayers.slice(0, 22).map((player) => player.playerId);
    const seats: SnakeRationalSeat[] = TEAM_IDS.map((teamId) => ({
      teamId,
      roster: [],
      settledRosterPrices: [],
      committedSpent: 0,
      budget: TIER_CAPS.juiced.tierCap,
      lockedArchetype: BALANCED,
    }));
    const rationalRequest = {
      key: 'stock-smb4-506-progressive',
      input: {
        currentPickIndex: 0,
        pickOrder,
        askingTeamId: TEAM_IDS[0],
        askedPlayerIds: selectedIds,
        players: rationalPlayers,
        seats,
        baseCaps: LUXURY_CAP_TABLES.juiced,
        realTeamCount: TEAM_IDS.length,
      },
    };
    const witnessSecret = 'c'.repeat(64);
    const startedAt = performance.now();
    let decision: SnakeRationalRoomResult | null = null;
    let decisionResponse: SnakeRationalRiskWorkerResponse | null = null;
    let decisionElapsedMs: number | null = null;
    const result = playSnakeRationalRoomProgressively({
      ...rationalRequest.input,
      includeScarcity: true,
    }, (nextDecision) => {
      decision = nextDecision;
      decisionElapsedMs = performance.now() - startedAt;
      decisionResponse = {
        key: rationalRequest.key,
        phase: 'decision',
        status: 'ready',
        risks: nextDecision.risks,
        scarcity: null,
        scarcityWitness: null,
        scenarios: nextDecision.scenarios,
        nextPick: nextDecision.nextPick,
      };
    }, { requestKey: rationalRequest.key, witnessSecret });
    const fullElapsedMs = performance.now() - startedAt;
    console.info('EARLY_SNAKE_RATIONAL', JSON.stringify({
      decisionElapsedMs: decisionElapsedMs === null ? null : Math.round(decisionElapsedMs),
      fullElapsedMs: Math.round(fullElapsedMs),
      status: result.status,
      reason: result.unavailableReason,
      scenarios: result.scenarios.length,
      risks: result.risks.length,
      scarcity: result.scarcity.length,
    }));
    expect(result.status).toBe('ready');
    expect(decision).not.toBeNull();
    expect(result.risks).toHaveLength(selectedIds.length);
    expect(result.scenarios).toBe(decision?.scenarios);
    expect(result.risks).toBe(decision?.risks);
    expect(result.scarcity.length).toBeGreaterThan(0);
    const clonedDecisionResponse = structuredClone(decisionResponse);
    const decisionValidationStartedAt = performance.now();
    const decisionValid = validSnakeRationalRiskWorkerResponse(
      clonedDecisionResponse,
      rationalRequest,
      witnessSecret,
    );
    const decisionValidationElapsedMs = performance.now() - decisionValidationStartedAt;
    const completeResponse = {
      key: rationalRequest.key,
      phase: 'complete',
      status: result.status,
      risks: result.risks,
      scarcity: result.scarcity,
      scarcityWitness: result.scarcityWitness,
      scenarios: result.scenarios,
      nextPick: result.nextPick,
    };
    const verifierCloneStartedAt = performance.now();
    const clonedCompleteResponse = structuredClone(completeResponse);
    const verifierCloneElapsedMs = performance.now() - verifierCloneStartedAt;
    const shapeValidationStartedAt = performance.now();
    const shapeValid = validSnakeRationalRiskWorkerResponseShape(
      clonedCompleteResponse,
      rationalRequest,
    );
    const shapeValidationElapsedMs = performance.now() - shapeValidationStartedAt;
    const completionValidationStartedAt = performance.now();
    const completionValid = validSnakeRationalRiskWorkerResponse(
      clonedCompleteResponse,
      rationalRequest,
      witnessSecret,
    );
    const completionValidationElapsedMs = performance.now() - completionValidationStartedAt;
    const witnessPayload = result.scarcityWitness!;
    const authStartedAt = performance.now();
    snakeScarcityWitnessAuthTag({
      schemaVersion: witnessPayload.schemaVersion,
      requestKey: witnessPayload.requestKey,
      decision: witnessPayload.decision,
      rootProof: witnessPayload.rootProof,
      cards: witnessPayload.cards,
      rowIdentities: witnessPayload.rowIdentities,
      roles: witnessPayload.roles,
    }, witnessSecret);
    const authElapsedMs = performance.now() - authStartedAt;
    console.info('EARLY_SNAKE_UI_VALIDATION', JSON.stringify({
      decisionMs: Math.round(decisionValidationElapsedMs),
      semanticVerifierMs: Math.round(completionValidationElapsedMs),
      mainShapeMs: Math.round(shapeValidationElapsedMs),
      verifierCloneMs: Math.round(verifierCloneElapsedMs),
      authMs: Math.round(authElapsedMs),
      payloadBytes: new TextEncoder().encode(JSON.stringify(clonedCompleteResponse)).byteLength,
    }));
    expect(decisionValid).toBe(true);
    expect(shapeValid).toBe(true);
    expect(completionValid).toBe(true);
    expect(decisionElapsedMs).not.toBeNull();
    expect(decisionElapsedMs!).toBeLessThanOrEqual(2_500);
    const allNumbersFinite = (value: unknown): boolean => {
      if (typeof value === 'number') return Number.isFinite(value);
      if (Array.isArray(value)) return value.every(allNumbersFinite);
      if (value && typeof value === 'object') return Object.values(value).every(allNumbersFinite);
      return true;
    };
    expect(allNumbersFinite(result.scarcity)).toBe(true);
  }, 90_000);
});
