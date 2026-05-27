import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Star } from 'lucide-react';
import type { MojoLevel } from '../../../engines/mojoEngine';
import { MOJO_LEVELS, MOJO_STATES, getMojoColor } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { FITNESS_STATES } from '../../../engines/fitnessEngine';
import {
  ensureEliminationRosterSnapshots,
  getEliminationRosterSnapshot,
  getAllEliminationRosterSnapshots,
  isEliminationPitcher,
  getNormalizedEliminationLineup,
  getNormalizedEliminationRotation,
  updateEliminationRosterSnapshot,
  type EliminationRosterSnapshot,
} from '../../../utils/eliminationRosterStorage';
import type { Player, LineupSlot, Position } from '../../../utils/leagueBuilderStorage';
import { loadMojoFitnessSnapshots, saveMojoFitnessSnapshots } from '../../../utils/mojoFitnessStorage';
import type { PlayoffTeam } from '../../../utils/playoffStorage';
import type {
  ManagerProfile,
  OpposingPitcherHand,
  OptimalLineupSnapshot,
} from '../../../types/managerWpa';
import {
  buildLineupSnapshotFromSlots,
  buildOptimalLineupSnapshot,
  confirmEngineOptimalLineupSnapshot,
  isOfficialOptimalLineupSnapshot,
  markOptimalLineupSnapshotsStaleForChange,
  OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
  optimalLineupField,
  optimalLineupFieldsForDh,
  summarizeLineupSnapshotComparison,
  type LineupSnapshotComparison,
  type OptimalLineupCandidate,
  type OptimalLineupSnapshotField,
} from '../../../utils/optimalLineup';
import {
  resolveManagerForTeam,
  saveManagerProfile,
} from '../../../utils/managerIdentityStorage';
import {
  getInstanceTeamImpactSummaries,
  type PlayerImpactSummary,
  type RoleWpaBreakdown,
  type TeamImpactSummary,
} from '../../../utils/teamImpact';
import { formatWpaPoints } from '../../../utils/wpaDisplay';
import { OptimalLineupComparisonPanel } from './OptimalLineupComparisonPanel';

interface EliminationTeamHubProps {
  eliminationId: string;
  teams: PlayoffTeam[];
  useDH: boolean;
}

function PlayerConditionModal({
  player,
  mojo,
  fitness,
  onClose,
  onMojoChange,
  onFitnessChange,
}: {
  player: Player | null;
  mojo: MojoLevel;
  fitness: FitnessState;
  onClose: () => void;
  onMojoChange: (value: MojoLevel) => void;
  onFitnessChange: (value: FitnessState) => void;
}) {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-lg border-[6px] border-[#E8E8D8] bg-[#5A8352] p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-[4px] border-[#E8E8D8] bg-[#4A6844] p-4">
          <div className="text-xs text-[#E8E8D8]/60">PLAYER CARD</div>
          <div className="mt-2 text-sm text-[#E8E8D8]">{getPlayerName(player)}</div>
          <div className="mt-2 text-[10px] text-[#E8E8D8]/70">
            {formatPosition(player)} • {player.overallGrade} • {player.bats}/{player.throws}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="border-[4px] border-[#E8E8D8] bg-[#4A6844] p-4">
            <div className="text-[10px] text-[#E8E8D8]/70 mb-3">MOJO</div>
            <div className="text-sm font-bold mb-3" style={{ color: getMojoColor(mojo) }}>
              {MOJO_STATES[mojo].emoji} {MOJO_STATES[mojo].displayName}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MOJO_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => onMojoChange(level)}
                  className={`border-2 px-2 py-2 text-[9px] font-bold ${level === mojo ? 'border-[#C4A853] bg-[#C4A853]/20' : 'border-[#E8E8D8]/50 hover:border-[#E8E8D8]'}`}
                  style={{ color: getMojoColor(level) }}
                >
                  {MOJO_STATES[level].emoji} {MOJO_STATES[level].displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="border-[4px] border-[#E8E8D8] bg-[#4A6844] p-4">
            <div className="text-[10px] text-[#E8E8D8]/70 mb-3">FITNESS</div>
            <div className="text-sm font-bold mb-3" style={{ color: FITNESS_STATES[fitness].color }}>
              {FITNESS_STATES[fitness].emoji} {FITNESS_STATES[fitness].displayName}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FITNESS_STATES) as FitnessState[]).map((state) => (
                <button
                  key={state}
                  onClick={() => onFitnessChange(state)}
                  className={`border-2 px-2 py-2 text-[9px] font-bold ${state === fitness ? 'border-[#C4A853] bg-[#C4A853]/20' : 'border-[#E8E8D8]/50 hover:border-[#E8E8D8]'}`}
                  style={{ color: FITNESS_STATES[state].color }}
                >
                  {FITNESS_STATES[state].emoji} {FITNESS_STATES[state].displayName}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full border-[4px] border-[#E8E8D8] bg-[#E8E8D8] px-4 py-2 text-sm font-bold text-[#4A6844] hover:bg-white"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}

const FIELD_POSITIONS_WITH_DH: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];
const FIELD_POSITIONS_NO_DH: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'P'];

function getPlayerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function sortLineup(lineup: LineupSlot[]): LineupSlot[] {
  return [...lineup].sort((a, b) => a.battingOrder - b.battingOrder);
}

function formatPosition(player: Player): string {
  return player.secondaryPosition
    ? `${player.primaryPosition}/${player.secondaryPosition}`
    : player.primaryPosition;
}

function toOptimalCandidate(player: Player): OptimalLineupCandidate {
  return {
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    bats: player.bats,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    mojo: player.mojo,
    fitness: undefined,
    trait1: player.trait1,
    trait2: player.trait2,
  };
}

function lineupSlotsFromOptimalSnapshot(snapshot: OptimalLineupSnapshot): LineupSlot[] {
  return snapshot.slots.map((slot) => ({
    battingOrder: slot.battingOrderSlot,
    playerId: slot.playerId,
    fieldingPosition: slot.defensivePosition as Position,
  }));
}

function getFreshOptimalLineupFields(
  updates: Partial<EliminationRosterSnapshot>,
): OptimalLineupSnapshotField[] {
  return OPTIMAL_LINEUP_SNAPSHOT_FIELDS.filter((field) => field in updates);
}

export function staleFieldsForEliminationUpdate(
  updates: Partial<EliminationRosterSnapshot>,
): OptimalLineupSnapshotField[] {
  const fields = new Set<OptimalLineupSnapshotField>();

  if ('lineup' in updates) {
    for (const field of optimalLineupFieldsForDh(true)) fields.add(field);
  }

  if ('lineupWithoutDH' in updates || 'startingRotation' in updates) {
    for (const field of optimalLineupFieldsForDh(false)) fields.add(field);
  }

  return Array.from(fields);
}

const IMPACT_ROLE_KEYS: Array<Exclude<keyof RoleWpaBreakdown, 'total'>> = [
  'batting',
  'pitching',
  'fielding',
  'baserunning',
  'catching',
];

function formatWpa(value: number): string {
  return formatWpaPoints(value);
}

function formatPoints(value: number): string {
  return `${value} ${value === 1 ? 'pt' : 'pts'}`;
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

function formatRank(rank: number, teamCount: number): string {
  if (rank <= 0 || teamCount <= 0) return 'Unranked';
  return `${ordinal(rank)} of ${teamCount}`;
}

function formatRoleLabel(role: Exclude<keyof RoleWpaBreakdown, 'total'>): string {
  if (role === 'baserunning') return 'Baserunning';
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

function formatRoleShare(value: number, roles: RoleWpaBreakdown): string {
  const positiveTotal = IMPACT_ROLE_KEYS.reduce(
    (sum, role) => sum + Math.max(0, roles[role]),
    0,
  );
  if (positiveTotal <= 0 || value <= 0) return 'No positive share';
  return `${Math.round((value / positiveTotal) * 100)}% of positive role value`;
}

function hasPlayerWpaDetail(summary: TeamImpactSummary): boolean {
  return (
    summary.dataQuality.fullKblWpaGames > 0 ||
    summary.dataQuality.legacyAtBatWpaGames > 0
  );
}

function hasFullPlayerWpaDetail(summary: TeamImpactSummary): boolean {
  return summary.dataQuality.fullKblWpaGames > 0;
}

function renderPlayContext(label: string, play: PlayerImpactSummary['biggestPositivePlay']) {
  if (!play) return null;
  return (
    <div className="text-[7px] text-[#E8E8D8]/70">
      <span className="text-[#C4A853]">{label} {formatWpa(play.value)}</span>
      {' '}• {play.label}
      {play.inningLabel ? ` • ${play.inningLabel}` : ''}
    </div>
  );
}

function TeamImpactPanel({
  summary,
  selectedTeamName,
  isLoading,
  error,
}: {
  summary: TeamImpactSummary | null;
  selectedTeamName: string;
  isLoading: boolean;
  error: string | null;
}) {
  const hasAnyWpa = summary ? hasPlayerWpaDetail(summary) : false;
  const hasFullWpa = summary ? hasFullPlayerWpaDetail(summary) : false;
  const leaders = summary?.playerLeaders.slice(0, 5) ?? [];

  return (
    <div
      className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4"
      data-testid="team-impact-panel"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs">TEAM IMPACT</div>
          <div className="mt-1 text-[8px] text-[#E8E8D8]/60">
            {selectedTeamName || 'Selected team'} • elimination run
          </div>
        </div>
        {summary && (
          <div className="text-right text-[8px] text-[#E8E8D8]/70">
            {summary.games} completed {summary.games === 1 ? 'game' : 'games'}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="border-4 border-[#6B9462] bg-[#4A6844] p-5 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#E8E8D8] mx-auto mb-2" />
          <div className="text-[8px] text-[#E8E8D8]/70">LOADING TEAM IMPACT...</div>
        </div>
      ) : error ? (
        <div className="border-4 border-[#6B9462] bg-[#4A6844] p-4 text-[8px] text-[#FFD6D6]">
          Team impact could not load. {error}
        </div>
      ) : !summary ? (
        <div className="border-4 border-[#6B9462] bg-[#4A6844] p-4 text-[8px] text-[#E8E8D8]/70">
          No completed games yet for this team. Impact will appear after archived games have usable WPA or POG data.
        </div>
      ) : (
        <div className="space-y-3">
          {summary.dataQuality.warnings.length > 0 && (
            <div className="border-4 border-[#C4A853] bg-[#4A6844] p-3 text-[8px] text-[#F6E7A6]">
              <div className="mb-1 text-[#C4A853]">DATA QUALITY</div>
              <div className="space-y-1">
                {summary.dataQuality.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-3">
            <div className="border-4 border-[#6B9462] bg-[#4A6844] p-3">
              <div className="text-[8px] text-[#E8E8D8]/60 mb-1">
                {hasAnyWpa ? (hasFullWpa ? 'TEAM WPA' : 'LIMITED WPA') : 'TEAM WPA'}
              </div>
              {hasAnyWpa ? (
                <>
                  <div className="text-2xl text-[#E8E8D8]">{formatWpa(summary.playerWpa.total)}</div>
                  <div className="mt-1 text-[8px] text-[#E8E8D8]/70">
                    {formatRank(summary.benchmarks.totalPlayerWpaRank, summary.benchmarks.teamCount)}
                    {' '}• bracket avg {formatWpa(summary.benchmarks.instanceAverageTotalPlayerWpa)}
                    {' '}• {formatWpa(summary.benchmarks.perGameTotalPlayerWpa)} per game
                  </div>
                  <div className="mt-2 text-[8px] text-[#C4A853]">
                    {summary.benchmarks.identityLabel}
                  </div>
                </>
              ) : (
                <div className="text-[8px] text-[#E8E8D8]/70">
                  Player WPA detail is unavailable for this team.
                </div>
              )}
            </div>

            <div className="border-4 border-[#6B9462] bg-[#4A6844] p-3">
              <div className="text-[8px] text-[#E8E8D8]/60 mb-1">MANAGER VALUE</div>
              <div className="text-xl text-[#E8E8D8]">{formatWpa(summary.managerWpa.managerValue)}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[7px] text-[#E8E8D8]/70">
                <div>Tactical {formatWpa(summary.managerWpa.tacticalManagerWpa)}</div>
                <div>Deploy {formatWpa(summary.managerWpa.deploymentWpa)}</div>
                <div>Lineup {formatWpa(summary.managerWpa.lineupDeltaWpa)}</div>
              </div>
            </div>
          </div>

          {hasFullWpa ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {IMPACT_ROLE_KEYS.map((role) => (
                <div key={role} className="border-4 border-[#6B9462] bg-[#4A6844] p-2">
                  <div className="text-[7px] text-[#E8E8D8]/60">{formatRoleLabel(role)} WPA</div>
                  <div className="text-sm text-[#E8E8D8]">{formatWpa(summary.playerWpa[role])}</div>
                  <div className="text-[7px] text-[#E8E8D8]/60">
                    {formatRoleShare(summary.playerWpa[role], summary.playerWpa)}
                  </div>
                </div>
              ))}
            </div>
          ) : summary.dataQuality.legacyAtBatWpaGames > 0 ? (
            <div className="border-4 border-[#6B9462] bg-[#4A6844] p-3 text-[8px] text-[#E8E8D8]/70">
              Legacy batting WPA {formatWpa(summary.playerWpa.batting)} is available, but full role buckets and role awards are limited.
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr,1.1fr] gap-3">
            <div className="border-4 border-[#6B9462] bg-[#4A6844] p-3">
              <div className="text-[8px] text-[#E8E8D8]/60 mb-1">POG POINTS</div>
              <div className="text-2xl text-[#E8E8D8]">{formatPoints(summary.pog.points)}</div>
              <div className="mt-1 text-[8px] text-[#E8E8D8]/70">
                {formatRank(summary.pog.rank, summary.pog.teamCount)}
                {' '}• Overall POG {summary.pog.overallWins}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[7px] text-[#E8E8D8]/70">
                <div>Best Hitter {summary.pog.bestHitter}</div>
                <div>Best Pitcher {summary.pog.bestPitcher}</div>
                <div>Best Baserunner {summary.pog.bestBaserunner}</div>
                <div>Best Fielder {summary.pog.bestFielder}</div>
                <div>Best Manager {summary.pog.bestManagerWins}</div>
              </div>
              {summary.pog.mostDecoratedPlayer && (
                <div className="mt-2 text-[8px] text-[#C4A853]">
                  Most decorated: {summary.pog.mostDecoratedPlayer.playerName}, {formatPoints(summary.pog.mostDecoratedPlayer.points)}
                </div>
              )}
            </div>

            <div className="border-4 border-[#6B9462] bg-[#4A6844] p-3">
              <div className="text-[8px] text-[#E8E8D8]/60 mb-2">PLAYER IMPACT LEADERS</div>
              {leaders.length === 0 ? (
                <div className="text-[8px] text-[#E8E8D8]/70">
                  No player impact leaders available for this team yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {leaders.map((leader) => (
                    <div
                      key={leader.playerId}
                      data-testid={`team-impact-player-${leader.playerId}`}
                      className="border-2 border-[#6B9462] bg-[#5A8352] p-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[8px] text-[#E8E8D8]">{leader.playerName}</div>
                        <div className="text-[8px] text-[#C4A853]">{formatPoints(leader.pogPoints)}</div>
                      </div>
                      {hasAnyWpa && (
                        <div className="mt-1 text-[7px] text-[#E8E8D8]/70">
                          Total {formatWpa(leader.wpa.total)}
                          {' '}• Bat {formatWpa(leader.wpa.batting)}
                          {' '}• Pit {formatWpa(leader.wpa.pitching)}
                          {' '}• Field {formatWpa(leader.wpa.fielding + leader.wpa.catching)}
                          {' '}• Run {formatWpa(leader.wpa.baserunning)}
                          {' '}• {formatWpa(leader.perGameWpa)} per game
                        </div>
                      )}
                      {renderPlayContext('Best play', leader.biggestPositivePlay)}
                      {renderPlayContext('Costliest', leader.biggestNegativePlay)}
                      {typeof leader.highLeverageWpa === 'number' && (
                        <div className="text-[7px] text-[#E8E8D8]/70">
                          High leverage WPA {formatWpa(leader.highLeverageWpa)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EliminationTeamHub({ eliminationId, teams, useDH }: EliminationTeamHubProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.teamId ?? '');
  const [snapshot, setSnapshot] = useState<EliminationRosterSnapshot | null>(null);
  const [availableSnapshotIds, setAvailableSnapshotIds] = useState<string[]>([]);
  const [mojoFitnessByPlayerId, setMojoFitnessByPlayerId] = useState<Record<string, { mojo: MojoLevel; fitness: FitnessState }>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
  const [managerForm, setManagerForm] = useState({
    displayName: '',
    hometown: '',
    styleLabel: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagerSaving, setIsManagerSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamImpactSummaries, setTeamImpactSummaries] = useState<TeamImpactSummary[] | null>(null);
  const [isImpactLoading, setIsImpactLoading] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [lineupComparison, setLineupComparison] = useState<{
    hand: OpposingPitcherHand;
    comparison: LineupSnapshotComparison;
    sourceConfidence?: string;
    generatedFallback: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshotIndex() {
      try {
        const teamIds = teams.map((team) => team.teamId);
        await ensureEliminationRosterSnapshots(eliminationId, teamIds);
        const snapshots = await getAllEliminationRosterSnapshots(eliminationId);
        if (cancelled) return;

        const snapshotIds = snapshots.map((item) => item.teamId);
        setAvailableSnapshotIds(snapshotIds);

        setSelectedTeamId((current) => {
          if (current && teamIds.includes(current)) return current;
          return teamIds[0] ?? snapshotIds[0] ?? '';
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load roster snapshots.');
        }
      }
    }

    void loadSnapshotIndex();
    return () => {
      cancelled = true;
    };
  }, [eliminationId, teams]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeamImpact() {
      try {
        setIsImpactLoading(true);
        setImpactError(null);
        const summaries = await getInstanceTeamImpactSummaries('elimination', eliminationId);
        if (!cancelled) {
          setTeamImpactSummaries(summaries);
        }
      } catch (err) {
        if (!cancelled) {
          setTeamImpactSummaries([]);
          setImpactError(err instanceof Error ? err.message : 'Failed to load Team Impact.');
        }
      } finally {
        if (!cancelled) setIsImpactLoading(false);
      }
    }

    void loadTeamImpact();
    return () => {
      cancelled = true;
    };
  }, [eliminationId]);

  useEffect(() => {
    if (!selectedTeamId) return;

    let cancelled = false;

    async function loadSnapshot() {
      try {
        setIsLoading(true);
        setError(null);
        let loadedSnapshot = await getEliminationRosterSnapshot(eliminationId, selectedTeamId);

        if (!loadedSnapshot) {
          await ensureEliminationRosterSnapshots(eliminationId, [selectedTeamId]);
          loadedSnapshot = await getEliminationRosterSnapshot(eliminationId, selectedTeamId);
        }

        if (!loadedSnapshot) {
          throw new Error(`Roster snapshot missing for team: ${selectedTeamId}`);
        }

        if (!cancelled) {
          setAvailableSnapshotIds((current) =>
            current.includes(selectedTeamId) ? current : [...current, selectedTeamId],
          );
          setSnapshot({
            ...loadedSnapshot,
            lineup: sortLineup(loadedSnapshot.lineup),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSnapshot(null);
          setError(err instanceof Error ? err.message : 'Failed to load team snapshot.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [eliminationId, selectedTeamId]);

  useEffect(() => {
    let cancelled = false;

    async function loadConditions() {
      try {
        const snapshots = await loadMojoFitnessSnapshots(eliminationId);
        if (cancelled) return;
        setMojoFitnessByPlayerId(
          Object.fromEntries(
            snapshots.map((entry) => [
              entry.playerId,
              { mojo: entry.mojoLevel, fitness: entry.fitnessState },
            ]),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          console.error('[EliminationTeamHub] Failed to load mojo/fitness snapshots:', err);
        }
      }
    }

    void loadConditions();
    return () => {
      cancelled = true;
    };
  }, [eliminationId]);

  const positionPlayers = useMemo(
    () =>
      (snapshot?.players ?? [])
        .filter((player) => !isEliminationPitcher(player))
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [snapshot]
  );

  const pitchers = useMemo(
    () =>
      (snapshot?.players ?? [])
        .filter((player) => isEliminationPitcher(player))
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [snapshot]
  );

  const lineup = useMemo(
    () => (snapshot ? sortLineup(getNormalizedEliminationLineup(snapshot, useDH)) : []),
    [snapshot, useDH]
  );
  const editablePositions = useMemo(
    () => (useDH ? FIELD_POSITIONS_WITH_DH : FIELD_POSITIONS_NO_DH),
    [useDH],
  );
  const lineupPlayerIds = useMemo(() => new Set(lineup.map((slot) => slot.playerId)), [lineup]);
  const selectedPlayoffTeam = useMemo(
    () => teams.find((team) => team.teamId === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );
  const selectedTeamImpact = useMemo(
    () => teamImpactSummaries?.find((summary) => summary.teamId === selectedTeamId) ?? null,
    [selectedTeamId, teamImpactSummaries],
  );
  const selectedTeamName = selectedTeamImpact?.teamName ?? selectedPlayoffTeam?.teamName ?? snapshot?.teamName ?? '';

  useEffect(() => {
    setLineupComparison(null);
  }, [selectedTeamId, useDH]);

  useEffect(() => {
    if (!selectedPlayoffTeam) {
      setManagerProfile(null);
      setManagerForm({ displayName: '', hometown: '', styleLabel: '' });
      return;
    }

    let cancelled = false;
    resolveManagerForTeam({
      team: {
        id: selectedPlayoffTeam.teamId,
        name: selectedPlayoffTeam.teamName,
      },
      mode: 'elimination',
      instanceId: eliminationId,
      persistAssignment: true,
    })
      .then((resolved) => {
        if (cancelled) return;
        setManagerProfile(resolved.profile);
        setManagerForm({
          displayName: resolved.profile.displayName,
          hometown: resolved.profile.hometown || '',
          styleLabel: resolved.profile.managementStyle?.label || '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[EliminationTeamHub] Failed to load manager profile:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eliminationId, selectedPlayoffTeam]);

  const benchPlayers = useMemo(
    () =>
      positionPlayers.filter((player) => !lineupPlayerIds.has(player.id)),
    [lineupPlayerIds, positionPlayers]
  );

  const rotationPlayers = useMemo(() => {
    const playerMap = new Map((snapshot?.players ?? []).map((player) => [player.id, player]));
    return (snapshot ? getNormalizedEliminationRotation(snapshot) : [])
      .map((playerId) => playerMap.get(playerId))
      .filter((player): player is Player => Boolean(player));
  }, [snapshot]);

  async function persistUpdates(
    teamId: string,
    updates: Partial<Pick<
      EliminationRosterSnapshot,
      | 'lineup'
      | 'lineupWithoutDH'
      | 'startingRotation'
      | 'optimalLineupVsRHPWithDH'
      | 'optimalLineupVsLHPWithDH'
      | 'optimalLineupVsRHPWithoutDH'
      | 'optimalLineupVsLHPWithoutDH'
    >>
  ) {
    setLineupComparison(null);
    setIsSaving(true);
    setError(null);
    try {
      const nextSnapshot =
        snapshot && snapshot.teamId === teamId
          ? markOptimalLineupSnapshotsStaleForChange(
              { ...snapshot, ...updates },
              staleFieldsForEliminationUpdate(updates),
              getFreshOptimalLineupFields(updates),
            )
          : null;
      const persistedUpdates = nextSnapshot
        ? {
            ...updates,
            ...Object.fromEntries(
              OPTIMAL_LINEUP_SNAPSHOT_FIELDS
                .filter((field) => !(field in updates) && nextSnapshot[field] !== snapshot?.[field])
                .map((field) => [field, nextSnapshot[field]]),
            ),
          }
        : updates;

      await updateEliminationRosterSnapshot(eliminationId, teamId, persistedUpdates);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              ...persistedUpdates,
              lineup: persistedUpdates.lineup ? sortLineup(persistedUpdates.lineup) : current.lineup,
              lineupWithoutDH: persistedUpdates.lineupWithoutDH
                ? sortLineup(persistedUpdates.lineupWithoutDH)
                : current.lineupWithoutDH,
              startingRotation: persistedUpdates.startingRotation ?? current.startingRotation,
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save roster changes.');
    } finally {
      setIsSaving(false);
    }
  }

  const buildOptimalSnapshot = (hand: OpposingPitcherHand) => {
    if (!snapshot) return null;
    const candidates = snapshot.players.map((player) => {
      const condition = mojoFitnessByPlayerId[player.id];
      return {
        ...toOptimalCandidate(player),
        mojo: condition?.mojo ?? player.mojo,
        fitness: condition?.fitness,
      };
    });
    return buildOptimalLineupSnapshot({
      teamId: snapshot.teamId,
      mode: "elimination",
      instanceId: eliminationId,
      opposingPitcherHand: hand,
      candidates,
      dhEnabled: useDH,
      generatedAt: Date.now(),
      generatedFrom: "team_hub",
      sourceConfidence: "engine_calculated",
      rosterVersionId: String(snapshot.snapshotAt),
    });
  };

  const buildCurrentAsOptimalSnapshot = (hand: OpposingPitcherHand) => {
    if (!snapshot) return null;
    const playerMap = new Map(snapshot.players.map((player) => [player.id, player]));
    return buildLineupSnapshotFromSlots({
      teamId: snapshot.teamId,
      mode: "elimination",
      instanceId: eliminationId,
      opposingPitcherHand: hand,
      candidates: snapshot.players.map((player) => {
        const condition = mojoFitnessByPlayerId[player.id];
        return {
          ...toOptimalCandidate(player),
          mojo: condition?.mojo ?? player.mojo,
          fitness: condition?.fitness,
        };
      }),
      dhEnabled: useDH,
      generatedAt: Date.now(),
      generatedFrom: "user_registered_smb4_optimal",
      sourceConfidence: "user_registered",
      rosterVersionId: String(snapshot.snapshotAt),
      slots: lineup.map((slot) => {
        const player = playerMap.get(slot.playerId);
        return {
          playerId: slot.playerId,
          playerName: player ? `${player.firstName} ${player.lastName}` : slot.playerId,
          battingOrderSlot: slot.battingOrder,
          defensivePosition: slot.fieldingPosition,
        };
      }),
    });
  };

  const buildCurrentLineupSnapshot = (hand: OpposingPitcherHand) => {
    if (!snapshot) return null;
    const playerMap = new Map(snapshot.players.map((player) => [player.id, player]));
    return buildLineupSnapshotFromSlots({
      teamId: snapshot.teamId,
      mode: "elimination",
      instanceId: eliminationId,
      opposingPitcherHand: hand,
      candidates: snapshot.players.map((player) => {
        const condition = mojoFitnessByPlayerId[player.id];
        return {
          ...toOptimalCandidate(player),
          mojo: condition?.mojo ?? player.mojo,
          fitness: condition?.fitness,
        };
      }),
      dhEnabled: useDH,
      generatedAt: Date.now(),
      generatedFrom: "game_lock",
      sourceConfidence: "engine_calculated",
      rosterVersionId: String(snapshot.snapshotAt),
      slots: lineup.map((slot) => {
        const player = playerMap.get(slot.playerId);
        return {
          playerId: slot.playerId,
          playerName: player ? `${player.firstName} ${player.lastName}` : slot.playerId,
          battingOrderSlot: slot.battingOrder,
          defensivePosition: slot.fieldingPosition,
        };
      }),
    });
  };

  async function handleRecalculateOptimal(hand: OpposingPitcherHand) {
    if (!snapshot) return;
    const nextSnapshot = buildOptimalSnapshot(hand);
    if (!nextSnapshot) return;
    await persistUpdates(snapshot.teamId, {
      [optimalLineupField(hand, useDH)]: confirmEngineOptimalLineupSnapshot(nextSnapshot),
    });
  }

  async function handleApplyOptimal(hand: OpposingPitcherHand) {
    if (!snapshot) return;
    const field = optimalLineupField(hand, useDH);
    const storedSnapshot = snapshot[field];
    const nextSnapshot = storedSnapshot?.sourceConfidence === "stale_roster"
      ? buildOptimalSnapshot(hand)
      : storedSnapshot ?? buildOptimalSnapshot(hand);
    if (!nextSnapshot) return;
    const officialSnapshot = isOfficialOptimalLineupSnapshot(nextSnapshot)
      ? nextSnapshot
      : confirmEngineOptimalLineupSnapshot(nextSnapshot);
    const nextLineup = lineupSlotsFromOptimalSnapshot(officialSnapshot);
    const normalizedLineup = getNormalizedEliminationLineup(
      {
        ...snapshot,
        [useDH ? 'lineup' : 'lineupWithoutDH']: nextLineup,
      },
      useDH,
    );
    await persistUpdates(snapshot.teamId, {
      [field]: officialSnapshot,
      [useDH ? 'lineup' : 'lineupWithoutDH']: normalizedLineup,
    });
  }

  async function handleSetCurrentAsOptimal(hand: OpposingPitcherHand) {
    if (!snapshot) return;
    const nextSnapshot = buildCurrentAsOptimalSnapshot(hand);
    if (!nextSnapshot) return;
    await persistUpdates(snapshot.teamId, {
      [optimalLineupField(hand, useDH)]: nextSnapshot,
    });
  }

  function handleCompareOptimal(hand: OpposingPitcherHand) {
    if (!snapshot) return;
    const field = optimalLineupField(hand, useDH);
    const optimal = snapshot[field] ?? buildOptimalSnapshot(hand);
    const chosen = buildCurrentLineupSnapshot(hand);
    if (!optimal || !chosen) return;
    setLineupComparison({
      hand,
      comparison: summarizeLineupSnapshotComparison({ chosen, optimal }),
      sourceConfidence: optimal.sourceConfidence,
      generatedFallback: !snapshot[field],
    });
  }

  async function handleMoveLineup(index: number, direction: 'up' | 'down') {
    if (!snapshot) return;

    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= lineup.length) return;

    const reordered = [...lineup];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const nextLineup = reordered.map((slot, order) => ({ ...slot, battingOrder: order + 1 }));

    await persistUpdates(snapshot.teamId, useDH ? { lineup: nextLineup } : { lineupWithoutDH: nextLineup });
  }

  async function handlePositionChange(index: number, fieldingPosition: Position) {
    if (!snapshot) return;

    const nextLineup = lineup.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, fieldingPosition } : slot
    );

    await persistUpdates(snapshot.teamId, useDH ? { lineup: nextLineup } : { lineupWithoutDH: nextLineup });
  }

  async function handleLineupPlayerChange(index: number, playerId: string) {
    if (!snapshot) return;

    const currentLineup = [...lineup];
    const previousIndex = currentLineup.findIndex((slot) => slot.playerId === playerId);
    const nextLineup = currentLineup.map((slot) => ({ ...slot }));

    if (previousIndex >= 0) {
      [nextLineup[index].playerId, nextLineup[previousIndex].playerId] = [
        nextLineup[previousIndex].playerId,
        nextLineup[index].playerId,
      ];
    } else {
      nextLineup[index] = { ...nextLineup[index], playerId };
    }

    await persistUpdates(snapshot.teamId, useDH ? { lineup: nextLineup } : { lineupWithoutDH: nextLineup });
  }

  async function handlePromoteStarter(playerId: string) {
    if (!snapshot) return;

    const normalizedRotation = getNormalizedEliminationRotation(snapshot);
    const nextRotation = [
      playerId,
      ...normalizedRotation.filter((currentId) => currentId !== playerId),
    ];

    await persistUpdates(snapshot.teamId, { startingRotation: nextRotation });
  }

  async function handleConditionChange(
    playerId: string,
    updates: Partial<{ mojo: MojoLevel; fitness: FitnessState }>,
  ) {
    const current = mojoFitnessByPlayerId[playerId] ?? { mojo: 0 as MojoLevel, fitness: 'FIT' as FitnessState };
    const next = {
      mojo: updates.mojo ?? current.mojo,
      fitness: updates.fitness ?? current.fitness,
    };
    setMojoFitnessByPlayerId((prev) => ({
      ...prev,
      [playerId]: next,
    }));
    setLineupComparison(null);
    await saveMojoFitnessSnapshots(eliminationId, [
      {
        playerId,
        mojoLevel: next.mojo,
        fitnessState: next.fitness,
      },
    ]);

    if (snapshot) {
      const staleSnapshot = markOptimalLineupSnapshotsStaleForChange(
        snapshot,
        OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
      );
      const staleUpdates = Object.fromEntries(
        OPTIMAL_LINEUP_SNAPSHOT_FIELDS
          .filter((field) => staleSnapshot[field] !== snapshot[field])
          .map((field) => [field, staleSnapshot[field]]),
      );
      await updateEliminationRosterSnapshot(eliminationId, snapshot.teamId, staleUpdates);
      setSnapshot((current) => (current ? { ...current, ...staleUpdates } : current));
    }
  }

  async function handleManagerSave() {
    if (!managerProfile || !managerForm.displayName.trim()) return;

    setIsManagerSaving(true);
    setError(null);
    try {
      const updated = await saveManagerProfile({
        ...managerProfile,
        displayName: managerForm.displayName.trim(),
        hometown: managerForm.hometown.trim() || undefined,
        createdByUser: true,
        managementStyle: managerForm.styleLabel.trim()
          ? {
              ...(managerProfile.managementStyle ?? {}),
              label: managerForm.styleLabel.trim(),
            }
          : managerProfile.managementStyle,
      });
      setManagerProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save manager.');
    } finally {
      setIsManagerSaving(false);
    }
  }

  function renderPlayerRow(player: Player) {
    const condition = mojoFitnessByPlayerId[player.id] ?? { mojo: 0 as MojoLevel, fitness: 'FIT' as FitnessState };
    return (
      <button
        key={player.id}
        onClick={() => setSelectedPlayer(player)}
        className="w-full bg-[#4A6844] border-4 border-[#6B9462] p-3 grid grid-cols-[1.8fr,0.9fr,0.8fr,0.8fr] gap-2 text-[8px] text-left hover:border-[#E8E8D8]"
      >
        <div className="text-[#E8E8D8]">{getPlayerName(player)}</div>
        <div className="text-[#E8E8D8]/80">{formatPosition(player)}</div>
        <div className="text-[#E8E8D8]/80">{MOJO_STATES[condition.mojo].emoji} {MOJO_STATES[condition.mojo].displayName}</div>
        <div className="text-[#E8E8D8]/80">{FITNESS_STATES[condition.fitness].emoji} {FITNESS_STATES[condition.fitness].displayName}</div>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
        <div className="text-[8px] text-[#E8E8D8]/70 mb-3">TEAM SELECTOR</div>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <button
              key={team.teamId}
              onClick={() => {
                setSelectedTeamId(team.teamId);
                setLineupComparison(null);
              }}
              className={`px-3 py-2 border-4 text-[8px] transition active:scale-95 ${
                selectedTeamId === team.teamId
                  ? 'bg-[#4A6844] border-[#E8E8D8] text-[#E8E8D8]'
                  : 'bg-[#6B9462] border-[#4A6844] text-[#E8E8D8]/70 hover:text-[#E8E8D8]'
              }`}
            >
              #{team.seed} {team.teamName}
              {availableSnapshotIds.includes(team.teamId) ? '' : ' (NO SNAPSHOT)'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4 text-xs text-[#FFD6D6]">
          {error}
        </div>
      )}

      <TeamImpactPanel
        summary={selectedTeamImpact}
        selectedTeamName={selectedTeamName}
        isLoading={isImpactLoading}
        error={impactError}
      />

      {isLoading ? (
        <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8E8D8] mx-auto mb-3" />
          <div className="text-[8px] text-[#E8E8D8]/70">LOADING SNAPSHOT...</div>
        </div>
      ) : !snapshot ? (
        <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center text-[8px] text-[#E8E8D8]/60">
          No roster snapshot found for this team.
        </div>
      ) : (
        <>
          {managerProfile && (
            <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs">MANAGER</div>
                  <div className="text-[8px] text-[#E8E8D8]/60 mt-1">
                    {managerProfile.gender || 'Unspecified'}{managerProfile.age ? ` • Age ${managerProfile.age}` : ''}
                  </div>
                </div>
                {isManagerSaving && <div className="text-[8px] text-[#E8E8D8]/60">SAVING...</div>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr,1fr,auto] gap-3">
                <input
                  value={managerForm.displayName}
                  onChange={(event) =>
                    setManagerForm((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                  className="bg-[#4A6844] border-4 border-[#6B9462] px-3 py-2 text-[8px] text-[#E8E8D8]"
                  aria-label="Manager name"
                />
                <input
                  value={managerForm.hometown}
                  onChange={(event) =>
                    setManagerForm((prev) => ({ ...prev, hometown: event.target.value }))
                  }
                  className="bg-[#4A6844] border-4 border-[#6B9462] px-3 py-2 text-[8px] text-[#E8E8D8]"
                  placeholder="Hometown"
                  aria-label="Manager hometown"
                />
                <input
                  value={managerForm.styleLabel}
                  onChange={(event) =>
                    setManagerForm((prev) => ({ ...prev, styleLabel: event.target.value }))
                  }
                  className="bg-[#4A6844] border-4 border-[#6B9462] px-3 py-2 text-[8px] text-[#E8E8D8]"
                  placeholder="Style"
                  aria-label="Manager style"
                />
                <button
                  onClick={() => void handleManagerSave()}
                  disabled={isManagerSaving || !managerForm.displayName.trim()}
                  className="border-4 border-[#E8E8D8] bg-[#4A6844] px-4 py-2 text-[8px] text-[#E8E8D8] disabled:opacity-40 hover:bg-[#6B9462]"
                >
                  SAVE
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
                <div className="text-xs mb-3">POSITION PLAYERS</div>
                <div className="space-y-2">{positionPlayers.map(renderPlayerRow)}</div>
              </div>

              <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
                <div className="text-xs mb-3">PITCHERS</div>
                <div className="space-y-2">{pitchers.map(renderPlayerRow)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs">LINEUP</div>
                  {isSaving && <div className="text-[8px] text-[#E8E8D8]/60">SAVING...</div>}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['R', 'L'] as OpposingPitcherHand[]).map((hand) => {
                    const field = optimalLineupField(hand, useDH);
                    const optimalSnapshot = snapshot[field];
                    return (
                      <div key={hand} className="bg-[#4A6844] border-4 border-[#6B9462] p-2">
                        <div className="flex justify-between gap-2 mb-2">
                          <span className="text-[8px] text-[#C4A853]">VS {hand}HP</span>
                          <span className="text-[7px] text-[#E8E8D8]/60">
                            {optimalSnapshot ? optimalSnapshot.sourceConfidence.replace(/_/g, ' ') : 'not set'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          <button
                            onClick={() => handleCompareOptimal(hand)}
                            className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853]"
                          >
                            COMPARE
                          </button>
                          <button
                            onClick={() => void handleApplyOptimal(hand)}
                            className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853]"
                          >
                            APPLY
                          </button>
                          <button
                            onClick={() => void handleRecalculateOptimal(hand)}
                            className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853]"
                          >
                            RECALC
                          </button>
                          <button
                            onClick={() => void handleSetCurrentAsOptimal(hand)}
                            className="border-2 border-[#E8E8D8]/30 bg-[#5A8352] px-1 py-1 text-[7px] hover:border-[#C4A853]"
                          >
                            SET
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {lineupComparison && (
                  <OptimalLineupComparisonPanel
                    hand={lineupComparison.hand}
                    comparison={lineupComparison.comparison}
                    sourceConfidence={lineupComparison.sourceConfidence}
                    generatedFallback={lineupComparison.generatedFallback}
                    onClose={() => setLineupComparison(null)}
                  />
                )}
                <div className="space-y-2">
                  {lineup.map((slot, index) => {
                    const player = snapshot.players.find((item) => item.id === slot.playerId);
                    const selectablePlayers =
                      slot.fieldingPosition === 'P'
                        ? [
                            ...(player ? [player] : []),
                            ...pitchers.filter((candidate) => candidate.id !== player?.id),
                          ]
                        : [
                            ...(player ? [player] : []),
                            ...benchPlayers,
                          ];
                    return (
                      <div
                        key={`${slot.playerId}-${slot.battingOrder}`}
                        className="bg-[#4A6844] border-4 border-[#6B9462] p-3 grid grid-cols-[0.4fr,1.7fr,0.9fr,0.6fr] gap-2 items-center"
                      >
                        <div className="text-xs">{slot.battingOrder}</div>
                        <div>
                          <select
                            value={slot.playerId}
                            onChange={(event) => void handleLineupPlayerChange(index, event.target.value)}
                            disabled={isSaving}
                            className="w-full bg-[#6B9462] border-2 border-[#E8E8D8] text-[#E8E8D8] text-[8px] px-2 py-1"
                          >
                            {selectablePlayers.map((optionPlayer) => (
                              <option key={optionPlayer.id} value={optionPlayer.id}>
                                {getPlayerName(optionPlayer)}
                              </option>
                            ))}
                          </select>
                          <div className="text-[8px] text-[#E8E8D8]/60">
                            {player ? `${player.overallGrade} • ${player.bats}/${player.throws}` : 'Unknown player'}
                          </div>
                        </div>
                        <select
                          value={slot.fieldingPosition}
                          onChange={(event) => void handlePositionChange(index, event.target.value as Position)}
                          className="bg-[#6B9462] border-2 border-[#E8E8D8] text-[#E8E8D8] text-[8px] px-2 py-1"
                        >
                          {editablePositions.map((position) => (
                            <option key={position} value={position}>
                              {position}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => void handleMoveLineup(index, 'up')}
                            disabled={index === 0 || isSaving}
                            className="p-2 border-2 border-[#E8E8D8] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#6B9462] active:scale-95"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => void handleMoveLineup(index, 'down')}
                            disabled={index === lineup.length - 1 || isSaving}
                            className="p-2 border-2 border-[#E8E8D8] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#6B9462] active:scale-95"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
                <div className="text-xs mb-3">BENCH</div>
                {benchPlayers.length === 0 ? (
                  <div className="text-[8px] text-[#E8E8D8]/60">No extra position players outside the current lineup.</div>
                ) : (
                  <>
                    <div className="text-[8px] text-[#E8E8D8]/60 mb-2">Select a bench player in any lineup slot above to swap them into the starting nine.</div>
                    <div className="space-y-2">{benchPlayers.map(renderPlayerRow)}</div>
                  </>
                )}
              </div>

              <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
                <div className="text-xs mb-3">STARTING ROTATION</div>
                <div className="space-y-2">
                  {rotationPlayers.map((player, index) => (
                    <button
                      key={player.id}
                      onClick={() => void handlePromoteStarter(player.id)}
                      disabled={isSaving}
                      className={`w-full text-left border-4 p-3 flex items-center justify-between transition active:scale-95 ${
                        index === 0
                          ? 'bg-[#4A6844] border-[#E8E8D8]'
                          : 'bg-[#6B9462] border-[#4A6844] hover:bg-[#4A6844]/80'
                      } disabled:opacity-60`}
                    >
                      <div>
                        <div className="text-[8px]">{getPlayerName(player)}</div>
                        <div className="text-[8px] text-[#E8E8D8]/60">
                          {player.primaryPosition} • {player.overallGrade} • {player.throws} THROW
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[8px]">
                        {index === 0 && (
                          <>
                            <Star className="w-4 h-4 text-[#FFD966]" />
                            NEXT STARTER
                          </>
                        )}
                        {index > 0 && 'MAKE NEXT'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <PlayerConditionModal
        player={selectedPlayer}
        mojo={(selectedPlayer && mojoFitnessByPlayerId[selectedPlayer.id]?.mojo) ?? 0}
        fitness={(selectedPlayer && mojoFitnessByPlayerId[selectedPlayer.id]?.fitness) ?? 'FIT'}
        onClose={() => setSelectedPlayer(null)}
        onMojoChange={(value) => {
          if (!selectedPlayer) return;
          void handleConditionChange(selectedPlayer.id, { mojo: value });
        }}
        onFitnessChange={(value) => {
          if (!selectedPlayer) return;
          void handleConditionChange(selectedPlayer.id, { fitness: value });
        }}
      />
    </div>
  );
}
