import {
  saveFranchisePlayer,
  type Player,
} from './franchisePlayerStorage';

export type FranchiseDesignationType =
  | 'TEAM_MVP'
  | 'ACE'
  | 'FAN_FAVORITE'
  | 'ALBATROSS';

export type FranchiseDesignationStatus = 'projected' | 'locked';

export const FRANCHISE_DESIGNATION_CALCULATION_VERSION = 'franchise-designations-v1-stable-inputs';
export const FRANCHISE_ALBATROSS_TRADE_VALUE_MULTIPLIER = 0.85;

export interface FranchiseDesignationPlayerInput {
  playerId: string;
  playerName: string;
  teamId: string;
  position: string;
  salary?: number;
  trueValue?: number;
  gamesPlayed?: number;
  totalWAR?: number;
  pWAR?: number;
}

export interface FranchiseDesignationContext {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  gamesPerTeam: number;
  leagueMinSalary?: number;
  seasonProgress: number;
  calculatedAt?: string;
}

export interface FranchisePlayerDesignationRecord {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  playerName: string;
  type: FranchiseDesignationType;
  status: FranchiseDesignationStatus;
  sourceInputs: Record<string, number | string | null>;
  calculationVersion: string;
  calculatedAt: string;
  lockedAt?: string;
}

type PlayerWithDesignations = Player & {
  franchiseDesignations?: FranchisePlayerDesignationRecord[];
};

const PITCHING_POSITIONS = new Set(['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY']);

function finite(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function statusFor(progress: number): FranchiseDesignationStatus {
  return progress >= 1 ? 'locked' : 'projected';
}

function minGamesForValueDesignation(gamesPerTeam: number): number {
  return Math.max(3, Math.ceil(gamesPerTeam * 0.10));
}

function makeRecord(
  player: FranchiseDesignationPlayerInput,
  context: FranchiseDesignationContext,
  type: FranchiseDesignationType,
  sourceInputs: FranchisePlayerDesignationRecord['sourceInputs'],
): FranchisePlayerDesignationRecord {
  const status = statusFor(context.seasonProgress);
  const calculatedAt = context.calculatedAt ?? new Date().toISOString();

  return {
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    seasonNumber: context.seasonNumber,
    teamId: player.teamId,
    playerId: player.playerId,
    playerName: player.playerName,
    type,
    status,
    sourceInputs,
    calculationVersion: FRANCHISE_DESIGNATION_CALCULATION_VERSION,
    calculatedAt,
    lockedAt: status === 'locked' ? calculatedAt : undefined,
  };
}

function byTeam(players: FranchiseDesignationPlayerInput[]): Map<string, FranchiseDesignationPlayerInput[]> {
  const grouped = new Map<string, FranchiseDesignationPlayerInput[]>();
  for (const player of players) {
    const current = grouped.get(player.teamId) ?? [];
    current.push(player);
    grouped.set(player.teamId, current);
  }
  return grouped;
}

function selectHighest(
  players: FranchiseDesignationPlayerInput[],
  value: (player: FranchiseDesignationPlayerInput) => number | undefined,
): FranchiseDesignationPlayerInput | null {
  return [...players]
    .filter((player) => value(player) != null)
    .sort((left, right) => {
      const diff = (value(right) ?? 0) - (value(left) ?? 0);
      return diff || left.playerId.localeCompare(right.playerId);
    })[0] ?? null;
}

export function calculateFranchiseDesignations(
  players: FranchiseDesignationPlayerInput[],
  context: FranchiseDesignationContext,
): FranchisePlayerDesignationRecord[] {
  const records: FranchisePlayerDesignationRecord[] = [];
  const minValueGames = minGamesForValueDesignation(context.gamesPerTeam);
  const minAlbatrossSalary = (context.leagueMinSalary ?? 0.5) * 2;

  for (const teamPlayers of byTeam(players).values()) {
    const mvp = selectHighest(teamPlayers, (player) => finite(player.totalWAR));
    if (mvp && (finite(mvp.totalWAR) ?? 0) > 0) {
      records.push(makeRecord(mvp, context, 'TEAM_MVP', {
        totalWAR: finite(mvp.totalWAR) ?? null,
      }));
    }

    const ace = selectHighest(
      teamPlayers.filter((player) => PITCHING_POSITIONS.has(player.position)),
      (player) => finite(player.pWAR),
    );
    if (ace && (finite(ace.pWAR) ?? 0) >= 0.5) {
      records.push(makeRecord(ace, context, 'ACE', {
        pWAR: finite(ace.pWAR) ?? null,
      }));
    }

    const valueQualified = teamPlayers
      .map((player) => {
        const salary = finite(player.salary);
        const trueValue = finite(player.trueValue);
        if (salary == null || trueValue == null || (player.gamesPlayed ?? 0) < minValueGames) {
          return null;
        }
        return {
          player,
          salary,
          trueValue,
          valueDelta: trueValue - salary,
          valuePct: salary > 0 ? (trueValue - salary) / salary : 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const fanFavorite = [...valueQualified]
      .filter((row) => row.valueDelta > 0)
      .sort((left, right) => right.valueDelta - left.valueDelta || left.player.playerId.localeCompare(right.player.playerId))[0];
    if (fanFavorite) {
      records.push(makeRecord(fanFavorite.player, context, 'FAN_FAVORITE', {
        salary: fanFavorite.salary,
        trueValue: fanFavorite.trueValue,
        valueDelta: fanFavorite.valueDelta,
        gamesPlayed: fanFavorite.player.gamesPlayed ?? null,
      }));
    }

    const albatross = [...valueQualified]
      .filter((row) => row.salary >= minAlbatrossSalary && row.valuePct <= -0.25)
      .sort((left, right) => left.valueDelta - right.valueDelta || left.player.playerId.localeCompare(right.player.playerId))[0];
    if (albatross) {
      records.push(makeRecord(albatross.player, context, 'ALBATROSS', {
        salary: albatross.salary,
        trueValue: albatross.trueValue,
        valueDelta: albatross.valueDelta,
        gamesPlayed: albatross.player.gamesPlayed ?? null,
        tradeValueMultiplier: FRANCHISE_ALBATROSS_TRADE_VALUE_MULTIPLIER,
      }));
    }
  }

  return records;
}

export function applyFranchiseDesignationsToPlayers(
  players: Player[],
  designations: FranchisePlayerDesignationRecord[],
): Player[] {
  const designationsByPlayer = new Map<string, FranchisePlayerDesignationRecord[]>();
  for (const designation of designations) {
    const rows = designationsByPlayer.get(designation.playerId) ?? [];
    rows.push(designation);
    designationsByPlayer.set(designation.playerId, rows);
  }

  return players.map((player) => {
    const current = (player as PlayerWithDesignations).franchiseDesignations ?? [];
    const replacementKeys = new Set(
      designations
        .filter((designation) => designation.playerId === player.id)
        .map((designation) => `${designation.seasonId}:${designation.type}`),
    );
    const retained = current.filter(
      (designation) => !replacementKeys.has(`${designation.seasonId}:${designation.type}`),
    );
    const next = designationsByPlayer.get(player.id) ?? [];
    return {
      ...player,
      franchiseDesignations: [...retained, ...next],
    } as Player;
  });
}

export function updateFranchiseDesignationTeamForTrade(
  player: Player,
  fromTeamId: string,
  toTeamId: string,
): Player {
  const designations = (player as PlayerWithDesignations).franchiseDesignations;
  if (!designations?.length) return player;

  return {
    ...player,
    franchiseDesignations: designations.map((designation) =>
      designation.teamId === fromTeamId
        ? {
            ...designation,
            teamId: toTeamId,
            sourceInputs: {
              ...designation.sourceInputs,
              previousTeamId: fromTeamId,
            },
          }
        : designation,
    ),
  } as Player;
}

export async function persistFranchiseDesignationsForPlayers(
  franchiseId: string,
  players: Player[],
  designations: FranchisePlayerDesignationRecord[],
): Promise<Player[]> {
  const updatedPlayers = applyFranchiseDesignationsToPlayers(players, designations);
  const designationPlayerIds = new Set(designations.map((designation) => designation.playerId));
  const saved: Player[] = [];

  for (const player of updatedPlayers) {
    if (!designationPlayerIds.has(player.id)) continue;
    saved.push(await saveFranchisePlayer(franchiseId, player));
  }

  return saved;
}
