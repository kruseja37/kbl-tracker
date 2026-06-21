import {
  applyRebrandFameReset,
  buildRelocationMarker,
  selectRebrandDesignationRowsToClear,
  REBRAND_RESET_MORALE,
  type RebrandRelocationMarker,
} from '../engines/franchiseRebrandCascade';
import {
  resolveFranchiseStadiumChange,
} from '../engines/franchiseStadiumChangeResolver';
import type { FranchiseL10EventCandidate } from '../engines/franchiseL10EventEngine';
import { getDerivedParkFactorsIfAvailable } from '../engines/parkFactorDeriver';
import {
  getFranchiseDesignationRows,
  replaceFranchiseDesignationRowsForScope,
} from './franchiseDesignationStorage';
import {
  getFranchiseFameRecordRowsByScope,
  saveFranchiseFameRecordRows,
} from './franchiseFameRecordsStorage';
import { getFranchiseFarmRoster } from './franchiseFarmStorage';
import { computeTeamFanHopefuls } from './franchiseInitializer';
import { fireManager } from './franchiseManagerFiring';
import {
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  type FranchiseMoraleScope,
} from './franchiseMoraleState';
import {
  getAllFranchisePlayers,
  getFranchiseTeam,
  saveFranchiseTeam,
  type Player,
  type Team,
} from './franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
} from './leagueBuilderStorage';
import { LEAGUE_BUILDER_MANAGER_INSTANCE_ID } from './managerIdentityStorage';

export interface ExecuteRebrandCascadeInput {
  scope: FranchiseMoraleScope;
  teamId: string;
  newTeamName: string;
  newCity: string;
  seasonNumber: number;
  gameNumber: number;
  seed: string;
}

export interface ExecuteRebrandCascadeResult {
  status: 'applied' | 'already-applied' | 'failed';
  teamId: string;
  idempotencyKey: string;
  reason?: string;
  blockers?: string[];
  marker?: RebrandRelocationMarker;
  clearedDesignationCount?: number;
  fameResetCount?: number;
  fanHopefulPlayerId?: string | null;
  stadiumName?: string;
  moraleCurrentValue?: number | null;
}

interface RebrandCascadeWorkingState {
  input: ExecuteRebrandCascadeInput;
  team: Team;
  leagueId: string;
  timestamp: string;
}

function idempotencyKey(input: Pick<ExecuteRebrandCascadeInput, 'teamId' | 'seasonNumber' | 'gameNumber'>): string {
  return `rebrand:${input.teamId}:${input.seasonNumber}:${input.gameNumber}`;
}

function hasRelocationMarker(
  team: Pick<Team, 'teamHistory'>,
  seasonNumber: number,
  gameNumber: number,
): boolean {
  return (team.teamHistory ?? []).some(
    (marker) =>
      marker.relocatedAtSeason === seasonNumber &&
      marker.relocatedAtGame === gameNumber,
  );
}

function failed(
  input: ExecuteRebrandCascadeInput,
  reason: string,
  blockers: string[] = [reason],
): ExecuteRebrandCascadeResult {
  return {
    status: 'failed',
    teamId: input.teamId,
    idempotencyKey: idempotencyKey(input),
    reason,
    blockers,
  };
}

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildRebrandStadiumEvent(input: ExecuteRebrandCascadeInput): FranchiseL10EventCandidate {
  return {
    family: 'team',
    eventType: 'stadium_change',
    targetId: input.teamId,
    targetKind: 'team',
    valence: 'neutral',
    magnitude: 1,
    probability: 1,
    seed: hashStringToUint32(`${input.seed}:${idempotencyKey(input)}:stadium`),
  };
}

function rosterPlayerIdsForTeam(
  players: readonly Player[],
  leagueId: string,
  teamId: string,
): Set<string> {
  return new Set(
    players
      .filter((player) => {
        if (getPlayerTeamIdForLeague(player, leagueId) !== teamId) return false;
        return getPlayerRosterStatusForLeague(player, leagueId) !== 'FREE_AGENT';
      })
      .map((player) => player.id),
  );
}

function resolveLeagueId(team: Team): string | null {
  return team.leagueIds.find((leagueId) => leagueId.trim().length > 0) ?? null;
}

async function reseedTeamFanHopeful(
  state: RebrandCascadeWorkingState,
  players: readonly Player[],
): Promise<string | null> {
  const farmRoster = await getFranchiseFarmRoster(
    state.input.scope.franchiseId,
    state.input.scope.seasonId,
    state.input.teamId,
  );

  const assignment = computeTeamFanHopefuls(
    [{ ...state.team, fanHopefulPlayerId: null }],
    [...players],
    new Map([[state.input.teamId, farmRoster.map((record) => record.playerId)]]),
    state.input.scope.seasonId,
  )[0];

  return assignment?.fanHopefulPlayerId ?? null;
}

export async function clearCarriedDeadMoney(teamId: string): Promise<void> {
  void teamId;
  // STUB: economy track owns the real wipe (L14-Q6)
}

export async function executeRebrandCascade(
  input: ExecuteRebrandCascadeInput,
): Promise<ExecuteRebrandCascadeResult> {
  const key = idempotencyKey(input);

  try {
    const team = await getFranchiseTeam(input.scope.franchiseId, input.teamId);
    if (!team) {
      return failed(input, `Franchise team "${input.teamId}" was not found.`);
    }

    if (hasRelocationMarker(team, input.seasonNumber, input.gameNumber)) {
      return {
        status: 'already-applied',
        teamId: input.teamId,
        idempotencyKey: key,
        marker: team.teamHistory?.find(
          (marker) =>
            marker.relocatedAtSeason === input.seasonNumber &&
            marker.relocatedAtGame === input.gameNumber,
        ),
      };
    }

    const leagueId = resolveLeagueId(team);
    if (!leagueId) {
      return failed(input, `Franchise team "${input.teamId}" has no leagueId; manager firing and roster scoping cannot run.`);
    }

    const timestamp = new Date().toISOString();
    const state: RebrandCascadeWorkingState = { input, team, leagueId, timestamp };

    // These stores are separate IndexedDB databases, so true cross-DB ACID is
    // not possible. L14 atomicity means strict sequential awaits plus the
    // teamHistory relocation marker as the idempotency key for completed runs.
    await fireManager({
      ...input.scope,
      leagueId,
      teamId: input.teamId,
      mode: 'franchise',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      reason: 'rebrand',
      endDate: timestamp,
      skipUserConfirm: true,
      suppressFanReliefBump: true,
    });

    const designationRows = await getFranchiseDesignationRows(input.scope);
    const teamRowsToClear = selectRebrandDesignationRowsToClear(
      designationRows.filter((row) => row.teamId === input.teamId),
    );
    const clearSet = new Set(teamRowsToClear);
    const keptDesignationRows = designationRows.filter((row) => !clearSet.has(row));
    await replaceFranchiseDesignationRowsForScope(input.scope, keptDesignationRows);

    const players = await getAllFranchisePlayers(input.scope.franchiseId);
    const fanHopefulPlayerId = await reseedTeamFanHopeful(state, players);
    state.team = await saveFranchiseTeam(input.scope.franchiseId, {
      ...state.team,
      fanHopefulPlayerId,
    });

    const stadiumResolution = resolveFranchiseStadiumChange({
      event: buildRebrandStadiumEvent(input),
      teamName: state.team.name,
      currentStadiumName: state.team.stadium,
      seedBase: input.seed,
    });
    state.team = await saveFranchiseTeam(input.scope.franchiseId, {
      ...state.team,
      stadium: stadiumResolution.newStadium.name,
      stadiumId: stadiumResolution.snapshot.stadiumId,
      stadiumDimensions: stadiumResolution.newStadium,
      parkFactors: getDerivedParkFactorsIfAvailable(stadiumResolution.newStadium.name),
    });

    const rosterPlayerIds = rosterPlayerIdsForTeam(players, leagueId, input.teamId);
    const fameRows = await getFranchiseFameRecordRowsByScope(input.scope);
    const updatedFameRows = fameRows
      .filter((row) => rosterPlayerIds.has(row.playerId))
      .map((row) => applyRebrandFameReset(row));
    await saveFranchiseFameRecordRows(updatedFameRows);

    await clearCarriedDeadMoney(input.teamId);

    const moraleSnapshot = await getFranchiseMoraleSnapshot(input.scope, 'team-fan', input.teamId);
    if (!moraleSnapshot || !Number.isFinite(moraleSnapshot.currentValue)) {
      return failed(input, `No readable team-fan morale currentValue for team "${input.teamId}".`);
    }

    const moraleDelta = REBRAND_RESET_MORALE - moraleSnapshot.currentValue;
    let moraleCurrentValue = moraleSnapshot.currentValue;
    if (moraleDelta !== 0) {
      const moraleResult = await applyFranchiseMoraleEffect({
        ...input.scope,
        targetType: 'team-fan',
        teamId: input.teamId,
        delta: moraleDelta,
        reason: 'rebrand reset',
        sourceEventId: key,
        sourceKind: 'rebrand-reset',
        timestamp,
      });
      if (moraleResult.status === 'failed') {
        return failed(input, moraleResult.reason, moraleResult.blockers);
      }
      moraleCurrentValue = moraleResult.currentValue ?? REBRAND_RESET_MORALE;
    }

    const marker = buildRelocationMarker({
      formerTeamName: team.name,
      formerStadiumName: team.stadium,
      relocatedAtSeason: input.seasonNumber,
      relocatedAtGame: input.gameNumber,
    });

    await saveFranchiseTeam(input.scope.franchiseId, {
      ...state.team,
      name: input.newTeamName,
      location: input.newCity,
      teamHistory: [...(state.team.teamHistory ?? []), marker],
    });

    return {
      status: 'applied',
      teamId: input.teamId,
      idempotencyKey: key,
      marker,
      clearedDesignationCount: teamRowsToClear.length,
      fameResetCount: updatedFameRows.length,
      fanHopefulPlayerId,
      stadiumName: stadiumResolution.newStadium.name,
      moraleCurrentValue,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failed(input, message);
  }
}
