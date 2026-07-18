import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  advanceTrustedSnakeSeatingCertificate,
  classifySnakePickFinishSafety,
  countSnakeSupplyByPosition,
  createTrustedSnakeSeatingCertificate,
  proveSimultaneousSnakeSeating,
  proveSnakePickKeepsAllClubsSeated,
  validateConstructiveSnakeSeatingProof,
  validateSnakeSeatingProof,
  type SnakeSeatingPlayer,
} from '../snakeSeatingProof';

function construction(id: string, shape: RosterSlotPlayer) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: 20, CON: 20, SPD: 20, FLD: 20, ARM: 20 },
    ...(shape.isPitcher ? { pit: { VEL: 20, JNK: 20, ACC: 20 } } : {}),
  };
}

function card(playerId: string, shape: RosterSlotPlayer, sourceId = `stock:${playerId}`): SnakeSeatingPlayer {
  return { playerId, sourceId, price: 10, shape, construction: construction(playerId, shape) };
}

function oneClubPool(prefix: string, includeSs = true): SnakeSeatingPlayer[] {
  return [
    card(`${prefix}-C`, { isPitcher: false, position: 'C' }),
    card(`${prefix}-1B`, { isPitcher: false, position: '1B' }),
    card(`${prefix}-2B`, { isPitcher: false, position: '2B' }),
    card(`${prefix}-3B`, { isPitcher: false, position: '3B' }),
    ...(includeSs ? [card(`${prefix}-SS`, { isPitcher: false, position: 'SS' })] : []),
    card(`${prefix}-LF`, { isPitcher: false, position: 'LF', secondaryPosition: 'C' }),
    card(`${prefix}-CF`, { isPitcher: false, position: 'CF' }),
    card(`${prefix}-RF`, { isPitcher: false, position: 'RF' }),
    ...Array.from({ length: 6 }, (_, index) => card(`${prefix}-B${index}`, { isPitcher: false, position: 'CF' })),
    ...Array.from({ length: 4 }, (_, index) => card(`${prefix}-SP${index}`, { isPitcher: true, position: 'SP', role: 'SP' })),
    ...Array.from({ length: 3 }, (_, index) => card(`${prefix}-RP${index}`, { isPitcher: true, position: 'RP', role: 'RP' })),
    card(`${prefix}-CP`, { isPitcher: true, position: 'CP', role: 'CP' }),
  ];
}

function floorSlackExtras(prefix: string, includeSs = true): SnakeSeatingPlayer[] {
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
    .filter((position) => includeSs || position !== 'SS');
  return [
    ...positions.flatMap((position) => Array.from({ length: 2 }, (_, index) => card(
      `${prefix}-${position}-${index}`,
      { isPitcher: false, position },
    ))),
    ...Array.from({ length: 2 }, (_, index) => card(
      `${prefix}-SP-${index}`,
      { isPitcher: true, position: 'SP', role: 'SP' },
    )),
    ...Array.from({ length: 2 }, (_, index) => card(
      `${prefix}-CP-${index}`,
      { isPitcher: true, position: 'CP', role: 'CP' },
    )),
  ];
}

function partialRosterWithoutCAndSs(prefix: string): SnakeSeatingPlayer[] {
  return oneClubPool(prefix)
    .filter((player) => ![`${prefix}-C`, `${prefix}-SS`].includes(player.playerId))
    .map((player) => player.playerId === `${prefix}-LF`
      ? card(player.playerId, { isPitcher: false, position: 'LF' })
      : player);
}

const clubs = ['a', 'b'].map((teamId) => ({
  teamId,
  roster: [],
  committedConstruction: [],
  budgetRemaining: 1_000,
}));

describe('simultaneous snake seating proof', () => {
  test('classifies every visible late-draft choice instead of treating invalid picks as open', () => {
    const rosterA = oneClubPool('finish-a').filter((player) => player.playerId !== 'finish-a-CP');
    const rosterB = oneClubPool('finish-b').filter((player) => player.playerId !== 'finish-b-CP');
    const cpA = card('finish-a-CP', { isPitcher: true, position: 'CP', role: 'CP' });
    const cpB = card('finish-b-CP', { isPitcher: true, position: 'CP', role: 'CP' });
    const wrongShape = card('finish-wrong-CF', { isPitcher: false, position: 'CF' });
    const input = {
      clubs: [
        { teamId: 'a', roster: rosterA, budgetRemaining: 1_000 },
        { teamId: 'b', roster: rosterB, budgetRemaining: 1_000 },
      ],
      pool: [cpA, cpB, wrongShape],
      baseCaps: [],
      realTeamCount: 2,
    };
    const proof = proveSimultaneousSnakeSeating(input);
    expect(proof.feasible).toBe(true);

    const rows = classifySnakePickFinishSafety({
      current: input,
      proof,
      teamId: 'a',
      candidatePlayerIds: [wrongShape.playerId, cpB.playerId, cpA.playerId],
    });

    expect(rows).toEqual([
      expect.objectContaining({ playerId: wrongShape.playerId, status: 'BLOCKED' }),
      expect.objectContaining({ playerId: cpB.playerId, status: 'DRAFTABLE' }),
      expect.objectContaining({ playerId: cpA.playerId, status: 'DRAFTABLE' }),
    ]);
  });

  test('keeps the only legal CP version when the same person has a cheaper SP card', () => {
    const roster = oneClubPool('mixed-role-roster')
      .filter((player) => player.playerId !== 'mixed-role-roster-CP');
    const sourceId = 'lahman:lowede01';
    const starter = {
      ...card('mixed-role-cheap-SP', { isPitcher: true, position: 'SP', role: 'SP' }, sourceId),
      price: 1,
    };
    const closer = {
      ...card('mixed-role-legal-CP', { isPitcher: true, position: 'CP', role: 'CP' }, sourceId),
      price: 10,
    };
    const input = {
      clubs: [{ teamId: 'mixed-role', roster, budgetRemaining: 1_000 }],
      pool: [starter, closer],
      baseCaps: [],
      realTeamCount: 1,
    };
    const proof = proveSimultaneousSnakeSeating(input);
    expect(proof.feasible, proof.message).toBe(true);
    expect(proof.assignments[0].playerIds).toEqual([closer.playerId]);

    const rows = classifySnakePickFinishSafety({
      current: input,
      proof,
      teamId: 'mixed-role',
      candidatePlayerIds: [starter.playerId, closer.playerId],
    });
    expect(rows).toEqual([
      expect.objectContaining({ playerId: starter.playerId, status: 'BLOCKED' }),
      expect.objectContaining({ playerId: closer.playerId, status: 'DRAFTABLE' }),
    ]);
  });

  test('matches eight clubs to eight legal final-round versions without reusing a person', () => {
    const finalRoundPeople = Array.from({ length: 8 }, (_, index) => {
      const sourceId = `lahman:mixedfinal${index}`;
      return {
        starter: {
          ...card(`eight-cheap-SP-${index}`, { isPitcher: true, position: 'SP', role: 'SP' }, sourceId),
          price: 1,
        },
        closer: {
          ...card(`eight-legal-CP-${index}`, { isPitcher: true, position: 'CP', role: 'CP' }, sourceId),
          price: 10 + index,
        },
      };
    });
    const input = {
      clubs: Array.from({ length: 8 }, (_, index) => ({
        teamId: `eight-${index}`,
        roster: oneClubPool(`eight-roster-${index}`)
          .filter((player) => player.playerId !== `eight-roster-${index}-CP`),
        budgetRemaining: 1_000,
      })),
      pool: finalRoundPeople.flatMap(({ starter, closer }) => [starter, closer]),
      baseCaps: [],
      realTeamCount: 8,
    };

    const proof = proveSimultaneousSnakeSeating(input);

    expect(proof.feasible, proof.message).toBe(true);
    expect(validateConstructiveSnakeSeatingProof(input, proof)).toBe(true);
    expect(proof.assignments).toHaveLength(8);
    const selectedIds = proof.assignments.flatMap((assignment) => assignment.playerIds);
    expect(selectedIds).toHaveLength(8);
    expect(new Set(selectedIds)).toHaveLength(8);
    expect(selectedIds.every((playerId) => playerId.startsWith('eight-legal-CP-'))).toBe(true);
    const selectedPeople = selectedIds.map((playerId) => (
      input.pool.find((player) => player.playerId === playerId)!.sourceId
    ));
    expect(new Set(selectedPeople)).toHaveLength(8);
  });

  test('mints setup SUCCESS only for disjoint legal money-safe rosters that meet each chosen identity', () => {
    const powerIdentity = { name: 'Power', rawShift: { 'hitters/POW': 0.2 } };
    const identityPool = [
      ...oneClubPool('identity-a'),
      ...oneClubPool('identity-b'),
      ...floorSlackExtras('identity-slack'),
    ].map((player) => ({
      ...player,
      construction: {
        ...player.construction,
        bat: {
          ...player.construction.bat,
          POW: player.playerId.startsWith('identity-slack') || player.shape.isPitcher ? 5 : 95,
        },
      },
    }));
    const sibling = {
      ...identityPool[0],
      playerId: `${identityPool[0].playerId}-peak`,
      sourceId: identityPool[0].sourceId,
      construction: { ...identityPool[0].construction, id: `${identityPool[0].playerId}-peak` },
    };
    const poolWithSibling = [...identityPool, sibling];
    const input = {
      clubs: clubs.map((club) => ({ ...club, identityArchetype: powerIdentity })),
      pool: poolWithSibling,
      baseCaps: [],
      realTeamCount: 2,
      tier: 'standard' as const,
    };

    const result = proveSimultaneousSnakeSeating(input);

    expect(result.feasible).toBe(true);
    expect(result.message).toContain('FITS ITS CHOSEN IDENTITY');
    expect(validateConstructiveSnakeSeatingProof(input, result)).toBe(true);
    expect(validateSnakeSeatingProof(input, result)).toBe(true);
    const assignedGroups = result.assignments.flatMap((assignment) => assignment.playerIds)
      .map((playerId) => poolWithSibling.find((player) => player.playerId === playerId)!)
      .map((player) => player.sourceId);
    expect(new Set(assignedGroups)).toHaveLength(44);
  });

  test('reports bounded identity uncertainty separately from a proven legal impossibility', () => {
    const powerIdentity = { name: 'Power', rawShift: { 'hitters/POW': 0.2 } };
    const result = proveSimultaneousSnakeSeating({
      clubs: clubs.map((club) => ({ ...club, identityArchetype: powerIdentity })),
      pool: [...oneClubPool('same-a'), ...oneClubPool('same-b'), ...floorSlackExtras('same-slack')],
      baseCaps: [],
      realTeamCount: 2,
      tier: 'standard',
    });

    expect(result.feasible).toBe(false);
    expect(result.shortfall).toMatchObject({
      kind: 'identity-proof-unknown',
      reason: 'identity-proof-unknown',
      missing: 0,
    });
    expect(result.message).toContain('COULD NOT CERTIFY EVERY CHOSEN IDENTITY TOGETHER');
    expect(result.message).not.toMatch(/SHORT|MISSING|LACKS/);
  });

  test('shared-scarcity joint-fail: counting passes but both clubs need the same C-covering SS human', () => {
    const sharedFlex = card('shared-flex-SS', {
      isPitcher: false,
      position: 'SS',
      secondaryPosition: 'C',
    });
    const pool = [
      sharedFlex,
      card('plain-SS', { isPitcher: false, position: 'SS' }),
      card('C-a', { isPitcher: false, position: 'C' }),
      card('C-b', { isPitcher: false, position: 'C' }),
      card('two-way-C', { isPitcher: true, position: 'SP', role: 'SP', twoWayVariant: 'C' }),
    ];
    const partialClubs = ['a', 'b'].map((teamId) => ({
      teamId,
      roster: partialRosterWithoutCAndSs(teamId),
      budgetRemaining: 1_000,
    }));
    expect(proveSimultaneousSnakeSeating({ clubs: [partialClubs[0]], pool, baseCaps: [], realTeamCount: 1 }).feasible)
      .toBe(true);
    expect(proveSimultaneousSnakeSeating({ clubs: [partialClubs[1]], pool, baseCaps: [], realTeamCount: 1 }).feasible)
      .toBe(true);

    const joint = proveSimultaneousSnakeSeating({ clubs: partialClubs, pool, baseCaps: [], realTeamCount: 2 });
    expect(joint.feasible).toBe(false);
    expect(joint.shortfall).toMatchObject({
      position: 'CATCHER_DEPTH',
      reason: 'joint-assignment',
      affectedClubs: 2,
    });
    expect(joint.message).toContain('NOT ENOUGH CATCHER DEPTH FOR 2 CLUBS');
  });

  test('versions-count-as-one-human in seating and position supply', () => {
    const ruthA = card('ruth-a', { isPitcher: false, position: 'SS' }, 'lahman:ruthba01');
    const ruthB = card('ruth-b', { isPitcher: false, position: 'SS' }, 'lahman:ruthba01');
    const pool = [
      ...oneClubPool('a', false),
      ...oneClubPool('b', false),
      ...floorSlackExtras('slack-no-ss', false),
      ruthA,
      ruthB,
    ];
    expect(countSnakeSupplyByPosition(pool).SS).toBe(1);
    const result = proveSimultaneousSnakeSeating({ clubs, pool, baseCaps: [], realTeamCount: 2 });
    expect(result.feasible).toBe(false);
    expect(result.shortfall).toMatchObject({ position: 'SS', reason: 'position-floor' });
  });

  test('a successful proof returns disjoint, legal 22-player reservations', () => {
    const result = proveSimultaneousSnakeSeating({
      clubs,
      pool: [...oneClubPool('a'), ...oneClubPool('b'), ...floorSlackExtras('slack')],
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(result.message).toBe('EVERY CLUB CAN FINISH A LEGAL 22.');
    const picks = result.assignments.flatMap((assignment) => assignment.playerIds);
    expect(picks).toHaveLength(44);
    expect(new Set(picks)).toHaveLength(44);
    expect(result.assignments.every((assignment) => assignment.playerIds.length === 22)).toBe(true);
  });

  test('globally balances cheap and expensive cards instead of falsely stranding the last club', () => {
    const priced = (players: SnakeSeatingPlayer[], price: number) => players.map((player) => ({ ...player, price }));
    const result = proveSimultaneousSnakeSeating({
      clubs: ['a', 'b'].map((teamId) => ({ teamId, roster: [], budgetRemaining: 660 })),
      pool: [
        ...priced(oneClubPool('cheap'), 10),
        ...priced(oneClubPool('expensive'), 50),
        ...priced(floorSlackExtras('slack'), 100),
      ],
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(result.message).toBe('EVERY CLUB CAN FINISH A LEGAL 22.');
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments.every((assignment) => assignment.allInCost <= 660)).toBe(true);
  });

  test('keeps arbitrary legal picks available by globally rebalancing every partial roster', () => {
    const priced = (players: SnakeSeatingPlayer[], price: number) => players.map((player) => ({ ...player, price }));
    const cheap = priced(oneClubPool('cheap'), 10);
    const current = {
      clubs: ['a', 'b'].map((teamId) => ({ teamId, roster: [], budgetRemaining: 660 })),
      pool: [
        ...cheap,
        ...priced(oneClubPool('expensive'), 50),
        ...priced(floorSlackExtras('slack'), 100),
      ],
      baseCaps: [],
      realTeamCount: 2,
    };
    const picked = cheap.find((player) => player.playerId === 'cheap-C')!;
    const currentProof = proveSimultaneousSnakeSeating(current);
    expect(validateSnakeSeatingProof(current, currentProof)).toBe(true);
    const result = proveSnakePickKeepsAllClubsSeated({
      current,
      teamId: 'b',
      player: picked,
      allInCost: picked.price,
      currentProof,
    });

    expect(result.message).toBe('EVERY CLUB CAN FINISH A LEGAL 22.');
    expect(result.assignments.find((assignment) => assignment.teamId === 'b')?.playerIds).toHaveLength(21);
    expect(result.assignments.every((assignment) => assignment.allInCost <= (assignment.teamId === 'b' ? 650 : 660)))
      .toBe(true);
    expect(result.assignments.flatMap((assignment) => assignment.playerIds)).not.toContain(picked.playerId);
  });

  test('rejects a persisted certificate whose reserved player ledger was altered', () => {
    const input = {
      clubs,
      pool: [...oneClubPool('a'), ...oneClubPool('b'), ...floorSlackExtras('slack')],
      baseCaps: [],
      realTeamCount: 2,
    };
    const proof = proveSimultaneousSnakeSeating(input);
    const tampered = {
      ...proof,
      assignments: proof.assignments.map((assignment, index) => index === 0
        ? { ...assignment, playerIds: assignment.playerIds.slice(1) }
        : assignment),
    };
    expect(validateSnakeSeatingProof(input, proof)).toBe(true);
    expect(validateSnakeSeatingProof(input, tampered)).toBe(false);
  });

  test('validates one root certificate and advances immutable constructive children without re-trusting callers', () => {
    const input = {
      clubs,
      pool: [...oneClubPool('a'), ...oneClubPool('b'), ...floorSlackExtras('slack')],
      baseCaps: [],
      realTeamCount: 2,
    };
    const proof = proveSimultaneousSnakeSeating(input);
    const trusted = createTrustedSnakeSeatingCertificate(input, proof);
    expect(trusted).not.toBeNull();
    if (!trusted) return;

    const selectedId = trusted.proof.assignments.find((row) => row.teamId === 'a')!.playerIds[0];
    const selected = input.pool.find((player) => player.playerId === selectedId)!;
    const child = advanceTrustedSnakeSeatingCertificate({
      certificate: trusted,
      teamId: 'a',
      playerId: selected.playerId,
      allInCost: selected.price,
    });

    expect(child).not.toBeNull();
    if (!child) return;
    expect(validateSnakeSeatingProof(child.input, child.proof)).toBe(true);
    expect(child.input.clubs.find((club) => club.teamId === 'a')?.roster.map((player) => player.playerId))
      .toContain(selected.playerId);
    expect(child.proof.assignments.find((row) => row.teamId === 'a')?.playerIds).toHaveLength(21);
  });

  test('trusted advances ignore post-trust source mutation and reject forged or underpriced advances', () => {
    const input = {
      clubs: structuredClone(clubs),
      pool: [...oneClubPool('a'), ...oneClubPool('b'), ...floorSlackExtras('slack')],
      baseCaps: [],
      realTeamCount: 2,
    };
    const proof = proveSimultaneousSnakeSeating(input);
    const trusted = createTrustedSnakeSeatingCertificate(input, proof);
    expect(trusted).not.toBeNull();
    if (!trusted) return;
    const selectedId = trusted.proof.assignments.find((row) => row.teamId === 'a')!.playerIds[0];
    const selected = input.pool.find((player) => player.playerId === selectedId)!;

    selected.price = 999_999;
    proof.assignments[0].playerIds.splice(0, proof.assignments[0].playerIds.length);
    const child = advanceTrustedSnakeSeatingCertificate({
      certificate: trusted,
      teamId: 'a',
      playerId: selectedId,
      allInCost: 10,
    });
    expect(child).not.toBeNull();
    if (child) expect(validateSnakeSeatingProof(child.input, child.proof)).toBe(true);

    expect(advanceTrustedSnakeSeatingCertificate({
      certificate: { input: trusted.input, proof: trusted.proof },
      teamId: 'a',
      playerId: selectedId,
      allInCost: 10,
    })).toBeNull();
    expect(advanceTrustedSnakeSeatingCertificate({
      certificate: trusted,
      teamId: 'a',
      playerId: selectedId,
      allInCost: 9,
    })).toBeNull();
  });

  test('keeps a multi-pick trusted chain canonically valid when clubs take rival reservations', () => {
    const input = {
      clubs: structuredClone(clubs),
      pool: [...oneClubPool('a'), ...oneClubPool('b'), ...floorSlackExtras('slack')],
      baseCaps: [],
      realTeamCount: 2,
    };
    const root = proveSimultaneousSnakeSeating(input);
    let certificate = createTrustedSnakeSeatingCertificate(input, root);
    expect(certificate).not.toBeNull();
    if (!certificate) return;

    for (let pick = 0; pick < 6; pick += 1) {
      const draftingTeamId = pick % 2 === 0 ? 'a' : 'b';
      const rivalTeamId = draftingTeamId === 'a' ? 'b' : 'a';
      const rivalPlayerId = certificate.proof.assignments
        .find((assignment) => assignment.teamId === rivalTeamId)?.playerIds[0];
      expect(rivalPlayerId).toBeTruthy();
      if (!rivalPlayerId) return;
      const player = certificate.input.pool.find((entry) => entry.playerId === rivalPlayerId);
      expect(player).toBeTruthy();
      if (!player) return;
      certificate = advanceTrustedSnakeSeatingCertificate({
        certificate,
        teamId: draftingTeamId,
        playerId: player.playerId,
        allInCost: player.price,
      });
      expect(certificate).not.toBeNull();
      if (!certificate) return;
      expect(validateSnakeSeatingProof(certificate.input, certificate.proof)).toBe(true);
    }
  });

  test('a club already carrying nine pitchers reserves only hitters for its final 13 seats', () => {
    const fixedPitchers = [
      ...oneClubPool('fixed').filter((player) => player.shape.isPitcher),
      card('fixed-extra-rp', { isPitcher: true, position: 'RP', role: 'RP' }),
    ];
    const hitters = oneClubPool('hitters').filter((player) => !player.shape.isPitcher);
    const temptingArm = card('cheap-two-way-c', {
      isPitcher: true,
      position: 'RP',
      role: 'RP',
      twoWayVariant: 'C',
    });
    const result = proveSimultaneousSnakeSeating({
      clubs: [{ teamId: 'nine-arms', roster: fixedPitchers, budgetRemaining: 1_000 }],
      pool: [temptingArm, ...hitters],
      baseCaps: [],
      realTeamCount: 1,
    });
    const assigned = new Set(result.assignments[0]?.playerIds ?? []);
    expect(result.feasible).toBe(true);
    expect(assigned).toHaveLength(13);
    expect([temptingArm, ...hitters].filter((player) => assigned.has(player.playerId)).every((player) => !player.shape.isPitcher))
      .toBe(true);
  });

  test('repairs a globally legal setup against exact luxury tax using unused pool slack', () => {
    const withPower = (players: SnakeSeatingPlayer[], power: number) => players.map((player) => ({
      ...player,
      construction: {
        ...player.construction,
        bat: { ...player.construction.bat, POW: power },
      },
    }));
    const result = proveSimultaneousSnakeSeating({
      clubs: [{ teamId: 'taxed', roster: [], budgetRemaining: 500 }],
      pool: [
        ...withPower(oneClubPool('a-high-tax'), 100),
        ...withPower(floorSlackExtras('z-low-tax'), 0),
      ],
      baseCaps: [{
        group: 'hitters',
        stat: 'POW',
        topN: 8,
        cap: 0,
        penaltyCurve: 1,
        penaltyPer100: 100,
        minAdder: 0,
      }],
      realTeamCount: 20,
    });
    expect(result.message).toBe('EVERY CLUB CAN FINISH A LEGAL 22.');
    expect(result.assignments[0]).toMatchObject({ teamId: 'taxed', salaryCost: 220 });
    expect(result.assignments[0].allInCost).toBeLessThanOrEqual(500);
    expect(result.assignments[0].playerIds.some((playerId) => playerId.startsWith('z-low-tax'))).toBe(true);
  });

  test('credits a TAXSWING refund when a pure starter demotes a taxed swing arm', () => {
    const pricedArm = (playerId: string, price: number, role: 'SP' | 'SP/RP' | 'RP' | 'CP', velocity: number) => ({
      ...card(playerId, { isPitcher: true, position: role, role }),
      price,
      construction: {
        ...construction(playerId, { isPitcher: true, position: role, role }),
        pit: { VEL: velocity, JNK: 0, ACC: 0 },
      },
    });
    const current = pricedArm('taxed-swing', 0, 'SP/RP', 99);
    const future = [
      ...oneClubPool('refund').filter((player) => !player.shape.isPitcher).map((player) => ({ ...player, price: 0 })),
      ...Array.from({ length: 3 }, (_, index) => pricedArm(`refund-SP${index}`, 0, 'SP', 1)),
      ...Array.from({ length: 3 }, (_, index) => pricedArm(`refund-RP${index}`, 0, 'RP', 0)),
      pricedArm('refund-CP', 0, 'CP', 0),
      pricedArm('refund-fourth-SP', 6_000, 'SP', 1),
    ];
    const result = proveSimultaneousSnakeSeating({
      clubs: [{
        teamId: 'refund-club',
        roster: [current],
        committedConstruction: [current.construction],
        budgetRemaining: 99.9999995,
      }],
      pool: future,
      baseCaps: [{ group: 'rotation', stat: 'VEL', topN: 4, cap: 98, penaltyCurve: 1, penaltyPer100: 590_000, minAdder: 0 }],
      realTeamCount: 1,
    });

    expect(result.feasible, result.message).toBe(true);
    expect(result.assignments[0]).toMatchObject({ addedTax: -5_900, allInCost: 100 });
  });
});
