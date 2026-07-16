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
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import { archetypeToCapIdentity, resolveClubBandPriorities } from '../archetypeIdentity';
import { auctionMarginalTaxWithCaps } from '../auctionLuxuryTax';
import { historicalToSimArchetype, rankArchetypeDraftability } from '../draftabilityRanker';
import { buildSnakeOrder } from '../leagueConstruction';
import { extractPoolFromDemand } from '../poolFromDemand';
import { SNAKE_POOL_COMPETITION_PRESETS, snakePoolSizeGuide } from '../snakePoolAssembly';
import { evaluateSnakePlan } from '../snakeEconomics';
import { snakeLuxuryCaps } from '../snakeLuxuryTax';
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
import { demandUniverseFromPlayers } from '../../src_figma/app/engines/leaguePlayerAdapter';
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
    const caps = snakeLuxuryCaps([...LUXURY_CAP_TABLES.juiced]);
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

  test('uses the same roster-local snake caps for an exact tax-bearing production-shape cost', () => {
    const hitters = rationalPlayers
      .filter((player) => !player.construction.isPitcher)
      .toSorted((left, right) => {
        const total = (player: typeof left) => Object.values(player.construction.bat)
          .reduce((sum, rating) => sum + rating, 0);
        return total(right) - total(left);
      });
    const selected = hitters[0];
    const existing = hitters.slice(1, 22).map((player) => player.construction);
    const caps = snakeLuxuryCaps([...LUXURY_CAP_TABLES.juiced]);
    const marginalTax = auctionMarginalTaxWithCaps(existing, selected.construction, undefined, caps);
    const exactCost = selected.price + marginalTax;
    expect(marginalTax).toBeGreaterThan(0);
    expect(exactCost).toBe(selected.price + marginalTax);
  });

  test('gates every eight-team pool mode with an honest archetype and tax-aware finish proof', () => {
    const archetypeIds = [
      'bash-brothers', 'launch-and-leather', 'flamethrowers', 'hdh-royals',
      'murderers-row', 'whiteyball', 'nasty-boys', 'the-oriole-way',
    ];
    const selectedArchetypes = archetypeIds.map((archetypeId) =>
      HISTORICAL_ARCHETYPES.find((entry) => entry.id === archetypeId)!,
    );
    const roomTeamIds = TEAM_IDS.slice(0, selectedArchetypes.length);
    const demandUniverse = demandUniverseFromPlayers(stockPlayers);
    const guide = snakePoolSizeGuide(roomTeamIds.length);

    for (const tier of ['standard', 'nerfed'] as const) {
      for (const preset of ['tight', 'competitive', 'loose', 'full-sources'] as const) {
        const definition = preset === 'full-sources' ? null : SNAKE_POOL_COMPETITION_PRESETS[preset];
        const result = definition ? extractPoolFromDemand(
          demandUniverse,
          [],
          selectedArchetypes,
          tier,
          {
            teams: roomTeamIds.length,
            shills: 0,
            budgetPerTeam: TIER_CAPS[tier].tierCap,
            poolBalancePreset: 'balanced',
            poolQualityCenter: 68,
            poolSizeMultiplier: definition.multiplier,
            poolSourceMode: 'full-pool',
          },
        ) : null;
        const shapedPlayers = result?.players ?? demandUniverse;
        const poolIds = new Set(shapedPlayers.map((player) => player.id));
      const finalVerdicts = rankArchetypeDraftability(
        shapedPlayers,
        selectedArchetypes,
        tier,
        {
          realTeamCount: roomTeamIds.length,
          budgetOverride: TIER_CAPS[tier].tierCap,
          taxCaps: snakeLuxuryCaps([...LUXURY_CAP_TABLES[tier]]),
          embodimentReference: demandUniverse,
        },
      );
      const proof = proveSimultaneousSnakeSeating({
        clubs: roomTeamIds.map((teamId, index) => ({
          teamId,
          roster: [],
          budgetRemaining: TIER_CAPS[tier].tierCap,
          capIdentity: archetypeToCapIdentity(selectedArchetypes[index]),
        })),
        pool: seatingPlayers.filter((player) => poolIds.has(player.playerId)),
        baseCaps: LUXURY_CAP_TABLES[tier],
        realTeamCount: roomTeamIds.length,
      });

      console.info('SNAKE_POOL_PRESET', JSON.stringify({
        tier,
        preset,
        target: preset === 'full-sources' ? demandUniverse.length : guide.targets[preset],
        actual: shapedPlayers.length,
        verdicts: finalVerdicts.map((verdict) => ({
          archetypeId: verdict.archetypeId,
          band: verdict.band,
          embodimentZ: Number(verdict.embodimentZ.toFixed(3)),
        })),
        g1: result?.g1?.holds ?? true,
        taxAwareFinish: proof.feasible,
      }));
      if (result && preset !== 'full-sources') {
        expect.soft(result.sizing?.effectiveTarget, `${tier} ${preset} target`).toBe(guide.targets[preset]);
        // Hard pins / the legal-seating repair may add the minimum cards needed above the guide target.
        expect.soft(result.size, `${tier} ${preset} minimum size`).toBeGreaterThanOrEqual(guide.targets[preset]);
        expect.soft(result.size, `${tier} ${preset} bounded repair`).toBeLessThanOrEqual(guide.targets[preset] + 2);
      } else {
        expect.soft(shapedPlayers.length, `${tier} full-source size`).toBe(demandUniverse.length);
      }
      // Count presets are competition guides, not false readiness guarantees. The authoritative
      // final-pool verdicts are still computed under Snake's roster-local tax law and can expose a
      // source/archetype mismatch for the UI to block rather than hiding it behind a count.
      expect.soft(finalVerdicts, `${preset} archetype verdicts`).toHaveLength(selectedArchetypes.length);
      expect.soft(finalVerdicts.every((verdict) => Number.isFinite(verdict.embodimentZ)), `${preset} finite embodiment`).toBe(true);
      const hasLockedArchetype = finalVerdicts.some((verdict) => verdict.band === 'LOCKED');
      expect.soft(result?.g1?.holds ?? true, `${tier} ${preset} legal seating`).toBe(true);
      if (preset === 'tight') {
        // Tight is a competition target, not a readiness promise. Its authoritative identity/tax
        // gates must agree and block an undersupplied room instead of manufacturing a false green.
        expect.soft(proof.feasible, `${tier} tight proof agrees with archetype gate`).toBe(!hasLockedArchetype);
      } else {
        expect.soft(hasLockedArchetype, `${tier} ${preset} keeps every selected stock archetype open`).toBe(false);
        expect.soft(proof.feasible, `${tier} ${preset} tax-aware finish`).toBe(true);
      }
      expect.soft(proof.assignments, `${tier} ${preset} assignments`).toHaveLength(proof.feasible ? roomTeamIds.length : 0);
      expect.soft(
        proof.assignments.every((assignment) => assignment.playerIds.length === 22),
        `${tier} ${preset} roster sizes`,
      ).toBe(true);
      }
    }
  }, 180_000);

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

  test('runs the same Assistant GM system for eight private archetype seats with distinct board and tax truth', () => {
    const archetypeIds = [
      'murderers-row', 'whiteyball', 'junkball-surgeons', 'flamethrowers',
      'nasty-boys', 'hdh-royals', 'the-opener', 'the-oriole-way',
    ];
    const results = archetypeIds.map((archetypeId, index) => {
      const archetype = HISTORICAL_ARCHETYPES.find((entry) => entry.id === archetypeId)!;
      const capIdentity = archetypeToCapIdentity(archetype);
      const request = buildSnakeAssistantBoardRequest({
        identity: {
          sessionId: 'eight-seat-parity', sessionRevision: 1,
          teamId: TEAM_IDS[index], seatId: TEAM_IDS[index], deviceId: `device-${index}`,
          privateEpoch: 1, boardRevision: 1,
        },
        frozenPoolIdentity: 'stock-smb4-506-eight-seat',
        engineInput: {
          activePool: assistantPlayers,
          completedPicks: [],
          versionSelections: {},
          selectedPinPlayerId: null,
          archetype: historicalToSimArchetype(archetype),
          ownBandPriorities: resolveClubBandPriorities({ mlbArchetypeKey: archetype.id })!,
          gmRankOverrides: { global: assistantPlayers.map((player) => player.playerId) },
          tier: 'juiced',
          budget: TIER_CAPS.juiced.tierCap,
          baseCaps: LUXURY_CAP_TABLES.juiced,
          realTeamCount: 8,
          capIdentity,
        },
        savedDesignSlots: buildDefaultDesignSlots(),
      });
      return { request, result: runSnakeAssistantBoardRequest(request) };
    });

    expect(results.every(({ result }) => result.status === 'ready')).toBe(true);
    const ready = results.flatMap(({ result }) => result.status === 'ready' ? [result.board] : []);
    expect(ready).toHaveLength(8);
    expect(new Set(ready.map((board) => board.playerIds.join(','))).size).toBeGreaterThan(1);
    const seatingById = new Map(seatingPlayers.map((player) => [player.playerId, player]));
    const taxHeavyPlayers = ready[0].playerIds.map((playerId) => {
      const player = seatingById.get(playerId)!;
      return {
        ...player,
        construction: {
          ...player.construction,
          bat: { POW: 99, CON: 99, SPD: 99, FLD: 99, ARM: 99 },
          ...(player.construction.isPitcher ? { pit: { VEL: 99, JNK: 99, ACC: 99 } } : {}),
        },
      };
    });
    const deliberateTaxes = archetypeIds.map((archetypeId) => {
      const archetype = HISTORICAL_ARCHETYPES.find((entry) => entry.id === archetypeId)!;
      return evaluateSnakePlan({
        boardPlayerIds: taxHeavyPlayers.map((player) => player.playerId),
        players: taxHeavyPlayers,
        budget: Number.MAX_SAFE_INTEGER,
        baseCaps: LUXURY_CAP_TABLES.juiced,
        realTeamCount: 8,
        capIdentity: archetypeToCapIdentity(archetype),
      }).planTax;
    });
    expect(deliberateTaxes.some((tax) => tax > 0)).toBe(true);
    expect(new Set(deliberateTaxes.map((tax) => Math.round(tax))).size).toBeGreaterThan(1);
    results.forEach(({ request, result }, index) => {
      expect(result.status === 'ready' ? result.board.teamId : null).toBe(TEAM_IDS[index]);
      expect(validSnakeAssistantBoardWorkerResponse(structuredClone({ key: request.key, result }), request)).toBe(true);
    });
  }, 30_000);

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
