import type {
  LeagueBuilderMlbDraftSession,
  SnakeDraftManifest,
  SnakeDraftManifestPick,
} from './leagueBuilderStorage';

export type SnakeDraftPhase = 'MLB' | 'FARM';

export interface BuildSnakeDraftManifestInput {
  session: LeagueBuilderMlbDraftSession;
  expectedPhase: SnakeDraftPhase;
  poolPlayerIds: readonly string[];
  /** MLB RegisteredPool IV by player. FARM salaries come only from the frozen slot table. */
  salaryByPlayerId?: ReadonlyMap<string, number>;
  frozenAt: string;
}

export interface SnakeDraftTruth {
  phase: SnakeDraftPhase;
  pickOrder: SnakeDraftManifest['pickOrder'];
  completedPicks: SnakeDraftManifestPick[];
  versionState: SnakeDraftManifest['versionState'];
  lockedClubs: SnakeDraftManifest['lockedClubs'];
  manifest: SnakeDraftManifest | null;
}

function phaseFor(session: LeagueBuilderMlbDraftSession): SnakeDraftPhase {
  return session.draftPhase ?? 'MLB';
}

function finiteMoney(value: number | undefined, label: string): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative.`);
  return value;
}

function finiteSignedMoney(value: number | undefined, label: string): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function canonicalPoolIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

/** FNV-1a is an identity checksum, not a security boundary. Full membership is persisted beside it. */
export function snakePoolIdentity(ids: readonly string[]): string {
  const source = canonicalPoolIds(ids).join('\u001f');
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `snake-pool-v1:${hash.toString(16).padStart(8, '0')}:${canonicalPoolIds(ids).length}`;
}

function cloneVersionState(session: LeagueBuilderMlbDraftSession): SnakeDraftManifest['versionState'] {
  if (!session.versionState) return null;
  return {
    draftedPlayerIdByGroupId: { ...session.versionState.draftedPlayerIdByGroupId },
    retiredPlayerIdsByGroupId: Object.fromEntries(
      Object.entries(session.versionState.retiredPlayerIdsByGroupId).map(([groupId, playerIds]) => [groupId, [...playerIds]]),
    ),
  };
}

function lockedClubs(session: LeagueBuilderMlbDraftSession): SnakeDraftManifest['lockedClubs'] {
  const setupByTeamId = new Map((session.snakeSetup?.clubs ?? []).map((club) => [club.teamId, club]));
  return [...new Set(session.pickOrder.map((slot) => slot.teamId))].map((teamId) => {
    const club = setupByTeamId.get(teamId);
    return {
      teamId,
      gmName: club?.gmName ?? null,
      hotseat: club?.hotseat ?? false,
      archetypeId: club?.archetypeId ?? null,
    };
  });
}

export function buildSnakeDraftManifest(input: BuildSnakeDraftManifestInput): SnakeDraftManifest {
  const { session } = input;
  const phase = phaseFor(session);
  if (phase !== input.expectedPhase) {
    throw new Error(`Snake draft phase ${phase} does not match expected phase ${input.expectedPhase}.`);
  }
  if (session.currentPickIndex !== session.pickOrder.length || session.completedPicks.length !== session.pickOrder.length) {
    throw new Error('Cannot freeze a snake draft manifest before every pick is complete.');
  }
  if (!Number.isFinite(Date.parse(input.frozenAt))) throw new Error('Snake draft frozenAt must be a valid timestamp.');

  const poolPlayerIds = canonicalPoolIds(input.poolPlayerIds);
  if (poolPlayerIds.length === 0) throw new Error('Snake draft manifest requires a non-empty source pool.');
  const mlbIvByPlayerId = phase === 'MLB'
    ? Object.fromEntries(poolPlayerIds.map((playerId) => {
        const iv = input.salaryByPlayerId?.get(playerId);
        if (!Number.isFinite(iv) || iv! < 0) {
          throw new Error(`Active MLB snake pool player "${playerId}" is missing a finite non-negative IV.`);
        }
        return [playerId, iv!];
      }))
    : null;
  const poolSet = new Set(poolPlayerIds);
  const orderByPick = new Map(session.pickOrder.map((slot) => [slot.pick, slot]));
  const seenPlayerIds = new Set<string>();
  const completedPicks = [...session.completedPicks]
    .sort((left, right) => left.pick - right.pick)
    .map((pick): SnakeDraftManifestPick => {
      const order = orderByPick.get(pick.pick);
      if (!order || order.round !== pick.round) throw new Error(`Snake draft completed pick ${pick.pick} does not match the frozen pick order.`);
      if (order.teamId !== pick.teamId) throw new Error(`Snake draft completed pick ${pick.pick} has the wrong team.`);
      if (seenPlayerIds.has(pick.playerId)) throw new Error(`Snake draft player "${pick.playerId}" appears in more than one completed pick.`);
      seenPlayerIds.add(pick.playerId);
      if (!poolSet.has(pick.playerId)) throw new Error(`Snake draft player "${pick.playerId}" is missing from the frozen source pool.`);

      const settledSalary = finiteMoney(pick.settledSalary, `Snake draft pick ${pick.pick} settled salary`);
      const marginalTax = finiteSignedMoney(pick.marginalTax, `Snake draft pick ${pick.pick} marginal tax`);
      let launchSalary: number;
      let salarySource: SnakeDraftManifestPick['salarySource'];
      if (phase === 'FARM') {
        const slotSalary = session.farmSlotSalaries?.[pick.pick - 1];
        if (!Number.isFinite(slotSalary) || slotSalary! < 0) {
          throw new Error(`Farm snake pick ${pick.pick} has no finite frozen slot salary.`);
        }
        if (settledSalary !== null && settledSalary !== slotSalary) {
          throw new Error(`Farm snake pick ${pick.pick} does not match its frozen absolute slot salary.`);
        }
        launchSalary = slotSalary!;
        salarySource = 'farm-slot';
      } else if (settledSalary !== null) {
        launchSalary = settledSalary;
        salarySource = 'pick';
      } else {
        const poolSalary = input.salaryByPlayerId?.get(pick.playerId);
        if (!Number.isFinite(poolSalary) || poolSalary! < 0) {
          throw new Error(`Legacy MLB snake pick ${pick.pick} has no finite launch salary in the locked source pool.`);
        }
        launchSalary = poolSalary!;
        salarySource = 'pool-legacy';
      }

      return {
        round: pick.round,
        pick: pick.pick,
        teamId: pick.teamId,
        playerId: pick.playerId,
        settledSalary,
        marginalTax,
        launchSalary,
        salarySource,
      };
    });

  return validateSnakeDraftManifest({
    formatVersion: 'snake-draft-manifest-v1',
    phase,
    leagueId: session.leagueId,
    seasonNumber: session.seasonNumber,
    frozenAt: input.frozenAt,
    source: { sessionId: session.id, revision: session.revision ?? 0 },
    versions: { workflow: session.workflowVersion, engine: session.engineMethodVersion },
    seed: session.seed,
    tier: session.tier,
    balanceMode: session.balanceMode,
    rounds: session.rounds,
    lockedClubs: lockedClubs(session),
    pickOrder: session.pickOrder.map((slot) => ({ ...slot })),
    completedPicks,
    versionState: cloneVersionState(session),
    pool: { identity: snakePoolIdentity(poolPlayerIds), playerIds: poolPlayerIds, mlbIvByPlayerId },
  }, { expectedPhase: input.expectedPhase });
}

export function validateSnakeDraftManifest(
  manifest: SnakeDraftManifest,
  options?: { expectedPhase?: SnakeDraftPhase },
): SnakeDraftManifest {
  if (manifest.formatVersion !== 'snake-draft-manifest-v1') throw new Error('Unsupported snake draft manifest version.');
  if (manifest.phase !== 'MLB' && manifest.phase !== 'FARM') throw new Error('Snake draft manifest phase is invalid.');
  if (options?.expectedPhase && manifest.phase !== options.expectedPhase) throw new Error('Snake draft manifest phase mismatch.');
  if (!manifest.leagueId?.trim() || !manifest.source.sessionId?.trim() || !Number.isFinite(Date.parse(manifest.frozenAt))) {
    throw new Error('Snake draft manifest provenance is incomplete.');
  }
  if (!Number.isInteger(manifest.seasonNumber) || manifest.seasonNumber < 1 || !Number.isInteger(manifest.rounds) || manifest.rounds < 1) {
    throw new Error('Snake draft manifest season and rounds must be positive integers.');
  }
  if (!Number.isInteger(manifest.source.revision) || manifest.source.revision < 0) throw new Error('Snake draft manifest source revision is invalid.');
  if (!manifest.versions.workflow?.trim() || !manifest.versions.engine?.trim() || !manifest.seed?.trim()) throw new Error('Snake draft manifest versions and seed are required.');
  const poolIds = canonicalPoolIds(manifest.pool.playerIds);
  if (poolIds.length === 0 || poolIds.length !== manifest.pool.playerIds.length || poolIds.some((id) => !id.trim())) throw new Error('Snake draft manifest pool membership is invalid.');
  if (snakePoolIdentity(poolIds) !== manifest.pool.identity) throw new Error('Snake draft manifest pool identity does not match its membership.');
  if (manifest.phase === 'MLB') {
    const ivEntries = Object.entries(manifest.pool.mlbIvByPlayerId ?? {});
    if (
      ivEntries.length !== poolIds.length
      || ivEntries.some(([playerId, iv]) => !poolIds.includes(playerId) || !Number.isFinite(iv) || iv < 0)
    ) {
      throw new Error('MLB snake draft manifest must freeze a finite non-negative IV for every active-pool player.');
    }
  } else if (manifest.pool.mlbIvByPlayerId !== null) {
    throw new Error('FARM snake draft manifest cannot persist MLB pool prices.');
  }
  if (manifest.completedPicks.length !== manifest.pickOrder.length) throw new Error('Snake draft manifest is incomplete.');

  const poolSet = new Set(poolIds);
  const orderByPick = new Map<number, SnakeDraftManifest['pickOrder'][number]>();
  const orderTeamIds = new Set<string>();
  for (const slot of manifest.pickOrder) {
    if (!slot.teamId?.trim() || !Number.isInteger(slot.round) || slot.round < 1 || !Number.isInteger(slot.pick) || slot.pick < 1 || orderByPick.has(slot.pick)) throw new Error('Snake draft manifest pick order is invalid.');
    orderByPick.set(slot.pick, slot);
    orderTeamIds.add(slot.teamId);
  }
  for (let expectedPick = 1; expectedPick <= manifest.pickOrder.length; expectedPick += 1) {
    if (!orderByPick.has(expectedPick)) throw new Error('Snake draft manifest pick order must cover contiguous absolute picks.');
  }
  const clubTeamIds = new Set<string>();
  for (const club of manifest.lockedClubs) {
    if (!club.teamId || clubTeamIds.has(club.teamId) || !orderTeamIds.has(club.teamId)) throw new Error('Snake draft manifest locked clubs are invalid.');
    clubTeamIds.add(club.teamId);
  }
  if (clubTeamIds.size !== orderTeamIds.size) throw new Error('Snake draft manifest must lock exactly one club for every drafting team.');
  const seenPlayerIds = new Set<string>();
  const seenPickNumbers = new Set<number>();
  for (const pick of manifest.completedPicks) {
    if (!pick.playerId?.trim() || !pick.teamId?.trim() || !Number.isInteger(pick.round) || pick.round < 1) throw new Error('Snake draft manifest completed pick identity is invalid.');
    const slot = orderByPick.get(pick.pick);
    if (!slot || slot.round !== pick.round || seenPickNumbers.has(pick.pick)) throw new Error(`Snake draft manifest pick ${pick.pick} does not match its order.`);
    seenPickNumbers.add(pick.pick);
    if (slot.teamId !== pick.teamId) throw new Error(`Snake draft manifest pick ${pick.pick} has the wrong team.`);
    if (seenPlayerIds.has(pick.playerId)) throw new Error(`Snake draft player "${pick.playerId}" appears in more than one completed pick.`);
    seenPlayerIds.add(pick.playerId);
    if (!poolSet.has(pick.playerId)) throw new Error(`Snake draft player "${pick.playerId}" is missing from its frozen pool.`);
    if (pick.settledSalary !== null && (!Number.isFinite(pick.settledSalary) || pick.settledSalary < 0)) throw new Error(`Snake draft pick ${pick.pick} settled salary must be finite.`);
    if (pick.marginalTax !== null && !Number.isFinite(pick.marginalTax)) throw new Error(`Snake draft pick ${pick.pick} marginal tax must be finite.`);
    if (!Number.isFinite(pick.launchSalary) || pick.launchSalary < 0) throw new Error(`Snake draft pick ${pick.pick} launch salary must be finite.`);
    if (manifest.phase === 'FARM') {
      if (pick.salarySource !== 'farm-slot') throw new Error(`Farm snake pick ${pick.pick} has an invalid salary source.`);
      if (pick.settledSalary !== null && pick.settledSalary !== pick.launchSalary) throw new Error(`Farm snake pick ${pick.pick} does not match its frozen slot salary.`);
    } else if (pick.launchSalary !== manifest.pool.mlbIvByPlayerId![pick.playerId]) {
      throw new Error(`MLB snake pick ${pick.pick} launch salary does not match its frozen pool IV.`);
    } else if (pick.settledSalary === null) {
      if (pick.salarySource !== 'pool-legacy') throw new Error(`MLB snake pick ${pick.pick} has an invalid legacy salary source.`);
    } else if (pick.salarySource !== 'pick' || pick.launchSalary !== pick.settledSalary) {
      throw new Error(`MLB snake pick ${pick.pick} has an invalid salary source.`);
    }
  }
  if (seenPickNumbers.size !== orderByPick.size) throw new Error('Snake draft manifest is missing completed pick coverage.');
  return manifest;
}

export function freezeSnakeDraftSession(input: BuildSnakeDraftManifestInput): LeagueBuilderMlbDraftSession {
  if (input.session.draftManifest) {
    const manifest = validateSnakeDraftManifest(input.session.draftManifest, { expectedPhase: input.expectedPhase });
    assertManifestBelongsToSession(manifest, input.session);
    return input.session;
  }
  return { ...input.session, draftManifest: buildSnakeDraftManifest(input) };
}

function assertManifestBelongsToSession(
  manifest: SnakeDraftManifest,
  session: LeagueBuilderMlbDraftSession,
): void {
  if (
    manifest.source.sessionId !== session.id
    || manifest.leagueId !== session.leagueId
    || manifest.seasonNumber !== session.seasonNumber
  ) {
    throw new Error('The snake draft manifest does not belong to this session.');
  }
}

export function readSnakeDraftTruth(
  session: LeagueBuilderMlbDraftSession,
  expectedPhase: SnakeDraftPhase = phaseFor(session),
): SnakeDraftTruth {
  if (session.draftManifest) {
    const manifest = validateSnakeDraftManifest(session.draftManifest, { expectedPhase });
    assertManifestBelongsToSession(manifest, session);
    return {
      phase: manifest.phase,
      pickOrder: manifest.pickOrder.map((slot) => ({ ...slot })),
      completedPicks: manifest.completedPicks.map((pick) => ({ ...pick })),
      versionState: manifest.versionState,
      lockedClubs: manifest.lockedClubs,
      manifest,
    };
  }
  if (phaseFor(session) !== expectedPhase) throw new Error('Snake draft session phase mismatch.');
  return {
    phase: expectedPhase,
    pickOrder: session.pickOrder.map((slot) => ({ ...slot })),
    completedPicks: session.completedPicks.map((pick) => ({
      ...pick,
      settledSalary: pick.settledSalary ?? null,
      marginalTax: pick.marginalTax ?? null,
      launchSalary: pick.settledSalary ?? Number.NaN,
      salarySource: expectedPhase === 'FARM' ? 'farm-slot' : 'pick',
    })),
    versionState: cloneVersionState(session),
    lockedClubs: lockedClubs(session),
    manifest: null,
  };
}

/** Fail-closed invariant for every storage writer that can touch a snake session. */
export function preservePersistedSnakeDraftManifest(
  current: LeagueBuilderMlbDraftSession | null | undefined,
  incoming: LeagueBuilderMlbDraftSession,
): SnakeDraftManifest | undefined {
  const persisted = current?.draftManifest;
  if (persisted) {
    readSnakeDraftTruth(current!, persisted.phase);
    if (!incoming.draftManifest) {
      throw new Error('A persisted snake draft manifest cannot be removed by a stale session write.');
    }
    readSnakeDraftTruth(incoming, persisted.phase);
    if (JSON.stringify(incoming.draftManifest) !== JSON.stringify(persisted)) {
      throw new Error('A persisted snake draft manifest cannot be replaced.');
    }
    return persisted;
  }
  if (incoming.draftManifest) readSnakeDraftTruth(incoming, incoming.draftManifest.phase);
  return incoming.draftManifest;
}
