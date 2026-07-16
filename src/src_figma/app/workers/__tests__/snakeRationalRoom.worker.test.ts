import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../../../data/rosterConstruction';
import {
  snakeScarcityWitnessAuthTag,
  type PlaySnakeRationalRoomInput,
  type SnakeRationalPlayer,
  type SnakeScarcityWitnessPayload,
} from '../../../../engines/snakeRationalRoom';
import {
  validSnakeRationalRiskWorkerResponse,
  type SnakeRationalRiskWorkerRequest,
  type SnakeRationalRiskWorkerResponse,
} from '../../components/snake/desk/useSnakeRationalRisks';
import { runSnakeRationalRiskWorkerRequest } from '../snakeRationalRoom.worker';
import { runSnakeScarcityVerifierWorkerRequest } from '../snakeScarcityVerifier.worker';

const BALANCED = { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 } as const;

function construction(id: string, shape: RosterSlotPlayer) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50 },
    ...(shape.isPitcher ? { pit: { VEL: 50, JNK: 50, ACC: 50 } } : {}),
  };
}

function legalTwentyOne(prefix: string) {
  const shapes: RosterSlotPlayer[] = [
    { isPitcher: false, position: 'C' },
    { isPitcher: false, position: '1B' },
    { isPitcher: false, position: '2B' },
    { isPitcher: false, position: '3B' },
    { isPitcher: false, position: 'SS' },
    { isPitcher: false, position: 'LF', secondaryPosition: 'C' },
    { isPitcher: false, position: 'CF' },
    { isPitcher: false, position: 'RF' },
    ...Array.from({ length: 5 }, () => ({ isPitcher: false, position: 'CF' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, () => ({ isPitcher: true, position: 'SP', role: 'SP' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, (_, index) => ({
      isPitcher: true,
      position: index === 0 ? 'CP' : 'RP',
      role: index === 0 ? 'CP' : 'RP',
    } as RosterSlotPlayer)),
  ];
  return shapes.map((shape, index) => ({
    playerId: `${prefix}-${index}`,
    sourceId: `stock:${prefix}-${index}`,
    price: 1,
    shape,
    construction: construction(`${prefix}-${index}`, shape),
  }));
}

function candidate(
  id: string,
  worth: number,
  price = 10,
  position: 'CF' | 'SS' = 'CF',
): SnakeRationalPlayer {
  const shape = { isPitcher: false, position } as const;
  return {
    playerId: id,
    sourceId: `stock:${id}`,
    price,
    worth,
    shape,
    construction: construction(id, shape),
  };
}

function request(): SnakeRationalRiskWorkerRequest {
  const players = [
    candidate('target', 100),
    candidate('alternative', 90),
    candidate('filler-a', 70, 10, 'SS'),
    candidate('filler-b', 60, 10, 'SS'),
    candidate('finish-infeasible', 90, 975),
  ];
  const input: PlaySnakeRationalRoomInput = {
    currentPickIndex: 0,
    pickOrder: [
      { pick: 1, teamId: 'asker' },
      { pick: 2, teamId: 'rival' },
      { pick: 3, teamId: 'asker' },
    ],
    askingTeamId: 'asker',
    askedPlayerIds: ['target'],
    players,
    seats: ['asker', 'rival'].map((teamId) => {
      const roster = legalTwentyOne(teamId).filter((_, index) => index !== 12);
      return {
        teamId,
        roster,
        settledRosterPrices: roster.map((player) => ({ playerId: player.playerId, settledPrice: player.price })),
        committedSpent: roster.length,
        budget: 1_000,
        lockedArchetype: BALANCED,
      };
    }),
    baseCaps: [],
    realTeamCount: 2,
  };
  return { key: 'worker-semantic-proof', input, witnessSecret: 'd'.repeat(64) };
}

function resign(response: SnakeRationalRiskWorkerResponse, secret: string): void {
  if (!response.scarcityWitness) throw new Error('Expected witness');
  const payload: SnakeScarcityWitnessPayload = {
    schemaVersion: response.scarcityWitness.schemaVersion,
    requestKey: response.scarcityWitness.requestKey,
    decision: response.scarcityWitness.decision,
    rootProof: response.scarcityWitness.rootProof,
    cards: response.scarcityWitness.cards,
    rowIdentities: response.scarcityWitness.rowIdentities,
    roles: response.scarcityWitness.roles,
  };
  response.scarcityWitness.authTag = snakeScarcityWitnessAuthTag(payload, secret);
}

describe('snake rational-room installed worker protocol', () => {
  test('posts one exact decision and one authenticated semantically reproducible completion', () => {
    const workerRequest = request();
    const messages: SnakeRationalRiskWorkerResponse[] = [];
    runSnakeRationalRiskWorkerRequest(workerRequest, (message) => messages.push(structuredClone(message)));

    expect(messages.map((message) => message.phase)).toEqual(['decision', 'complete']);
    expect(validSnakeRationalRiskWorkerResponse(
      messages[0], workerRequest, workerRequest.witnessSecret,
    )).toBe(true);
    expect(validSnakeRationalRiskWorkerResponse(
      messages[1], workerRequest, workerRequest.witnessSecret,
    )).toBe(true);
    expect(messages[1].scarcityWitness).not.toBeNull();
    const verifiesInstalled = (completion: SnakeRationalRiskWorkerResponse) => (
      runSnakeScarcityVerifierWorkerRequest({
        verifierEpoch: 1,
        request: workerRequest,
        completion,
        witnessSecret: workerRequest.witnessSecret,
      }).valid
    );
    expect(verifiesInstalled(messages[1])).toBe(true);
    const cfCards = messages[1].scarcityWitness!.cards;
    expect(cfCards.map((card) => [card.playerId, card.finish.kind])).toEqual([
      ['target', 'VIABLE'],
      ['alternative', 'VIABLE'],
      ['finish-infeasible', 'NONVIABLE'],
    ]);

    const emptyRows = structuredClone(messages[1]);
    emptyRows.scarcity = [];
    expect(validSnakeRationalRiskWorkerResponse(
      emptyRows, workerRequest, workerRequest.witnessSecret,
    )).toBe(false);

    const inventedAggregate = structuredClone(messages[1]);
    inventedAggregate.scarcity![0].viablePeopleLeft += 7;
    expect(validSnakeRationalRiskWorkerResponse(
      inventedAggregate, workerRequest, workerRequest.witnessSecret,
    )).toBe(false);

    const missingEligibleCard = structuredClone(messages[1]);
    missingEligibleCard.scarcityWitness!.cards.pop();
    resign(missingEligibleCard, workerRequest.witnessSecret);
    expect(validSnakeRationalRiskWorkerResponse(
      missingEligibleCard, workerRequest, workerRequest.witnessSecret,
    )).toBe(false);

    const omittedViable = structuredClone(messages[1]);
    const omittedCards = omittedViable.scarcityWitness!.cards;
    const omittedAlternative = omittedCards.find((card) => card.playerId === 'alternative')!;
    const knownShortfall = omittedCards.find((card) => card.playerId === 'finish-infeasible')!;
    omittedAlternative.trueCost = null;
    omittedAlternative.contextualWorth = null;
    omittedAlternative.finish = structuredClone(knownShortfall.finish);
    omittedViable.scarcity![0] = {
      ...omittedViable.scarcity![0],
      viablePeopleLeft: 1,
      lowestViableTrueCost: 10,
      highestViableTrueCost: 10,
      replacementPlayerId: null,
      replacementContextualWorth: null,
      contextualWorthDrop: null,
      replacementState: 'NO_REPLACEMENT',
    };
    resign(omittedViable, workerRequest.witnessSecret);
    expect(validSnakeRationalRiskWorkerResponse(
      omittedViable, workerRequest, workerRequest.witnessSecret,
    )).toBe(false);
    expect(verifiesInstalled(omittedViable)).toBe(false);

    const inventedViable = structuredClone(messages[1]);
    const inventedCards = inventedViable.scarcityWitness!.cards;
    const invented = inventedCards.find((card) => card.playerId === 'finish-infeasible')!;
    const viableAlternative = inventedCards.find((card) => card.playerId === 'alternative')!;
    invented.trueCost = 975;
    invented.contextualWorth = viableAlternative.contextualWorth;
    invented.finish = structuredClone(viableAlternative.finish);
    inventedViable.scarcity![0] = {
      ...inventedViable.scarcity![0],
      viablePeopleLeft: 3,
      highestViableTrueCost: 975,
    };
    resign(inventedViable, workerRequest.witnessSecret);
    expect(validSnakeRationalRiskWorkerResponse(
      inventedViable, workerRequest, workerRequest.witnessSecret,
    )).toBe(false);
    expect(verifiesInstalled(inventedViable)).toBe(false);
  });
});
