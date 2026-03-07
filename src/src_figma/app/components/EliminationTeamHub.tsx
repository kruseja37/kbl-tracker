import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Star } from 'lucide-react';
import {
  getEliminationRosterSnapshot,
  getAllEliminationRosterSnapshots,
  updateEliminationRosterSnapshot,
  type EliminationRosterSnapshot,
} from '../../../utils/eliminationRosterStorage';
import type { Player, LineupSlot, Position } from '../../../utils/leagueBuilderStorage';
import type { PlayoffTeam } from '../../../utils/playoffStorage';

interface EliminationTeamHubProps {
  eliminationId: string;
  teams: PlayoffTeam[];
}

const FIELD_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];
const PITCHER_POSITIONS: Position[] = ['SP', 'RP', 'CP', 'SP/RP'];

function getPlayerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function isPitcher(player: Player): boolean {
  return PITCHER_POSITIONS.includes(player.primaryPosition);
}

function sortLineup(lineup: LineupSlot[]): LineupSlot[] {
  return [...lineup].sort((a, b) => a.battingOrder - b.battingOrder);
}

function formatPosition(player: Player): string {
  return player.secondaryPosition
    ? `${player.primaryPosition}/${player.secondaryPosition}`
    : player.primaryPosition;
}

export function EliminationTeamHub({ eliminationId, teams }: EliminationTeamHubProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.teamId ?? '');
  const [snapshot, setSnapshot] = useState<EliminationRosterSnapshot | null>(null);
  const [availableSnapshotIds, setAvailableSnapshotIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshotIndex() {
      try {
        const snapshots = await getAllEliminationRosterSnapshots(eliminationId);
        if (cancelled) return;

        const snapshotIds = snapshots.map((item) => item.teamId);
        setAvailableSnapshotIds(snapshotIds);

        if (snapshotIds.length > 0 && !snapshotIds.includes(selectedTeamId)) {
          setSelectedTeamId(snapshotIds[0]);
        } else if (!selectedTeamId && teams[0]?.teamId) {
          setSelectedTeamId(teams[0].teamId);
        }
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
  }, [eliminationId, selectedTeamId, teams]);

  useEffect(() => {
    if (!selectedTeamId) return;

    let cancelled = false;

    async function loadSnapshot() {
      try {
        setIsLoading(true);
        setError(null);
        const loadedSnapshot = await getEliminationRosterSnapshot(eliminationId, selectedTeamId);

        if (!loadedSnapshot) {
          throw new Error(`Roster snapshot missing for team: ${selectedTeamId}`);
        }

        if (!cancelled) {
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

  const positionPlayers = useMemo(
    () =>
      (snapshot?.players ?? [])
        .filter((player) => !isPitcher(player))
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [snapshot]
  );

  const pitchers = useMemo(
    () =>
      (snapshot?.players ?? [])
        .filter((player) => isPitcher(player))
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [snapshot]
  );

  const lineup = useMemo(() => sortLineup(snapshot?.lineup ?? []), [snapshot]);
  const lineupPlayerIds = useMemo(() => new Set(lineup.map((slot) => slot.playerId)), [lineup]);

  const benchPlayers = useMemo(
    () =>
      positionPlayers.filter((player) => !lineupPlayerIds.has(player.id)),
    [lineupPlayerIds, positionPlayers]
  );

  const rotationPlayers = useMemo(() => {
    const playerMap = new Map((snapshot?.players ?? []).map((player) => [player.id, player]));
    return (snapshot?.startingRotation ?? [])
      .map((playerId) => playerMap.get(playerId))
      .filter((player): player is Player => Boolean(player));
  }, [snapshot]);

  async function persistUpdates(
    teamId: string,
    updates: Partial<Pick<EliminationRosterSnapshot, 'lineup' | 'startingRotation'>>
  ) {
    setIsSaving(true);
    setError(null);
    try {
      await updateEliminationRosterSnapshot(eliminationId, teamId, updates);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              ...updates,
              lineup: updates.lineup ? sortLineup(updates.lineup) : current.lineup,
              startingRotation: updates.startingRotation ?? current.startingRotation,
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save roster changes.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoveLineup(index: number, direction: 'up' | 'down') {
    if (!snapshot) return;

    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= lineup.length) return;

    const reordered = [...lineup];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const nextLineup = reordered.map((slot, order) => ({ ...slot, battingOrder: order + 1 }));

    await persistUpdates(snapshot.teamId, { lineup: nextLineup });
  }

  async function handlePositionChange(index: number, fieldingPosition: Position) {
    if (!snapshot) return;

    const nextLineup = lineup.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, fieldingPosition } : slot
    );

    await persistUpdates(snapshot.teamId, { lineup: nextLineup });
  }

  async function handlePromoteStarter(playerId: string) {
    if (!snapshot) return;

    const nextRotation = [
      playerId,
      ...snapshot.startingRotation.filter((currentId) => currentId !== playerId),
    ];

    await persistUpdates(snapshot.teamId, { startingRotation: nextRotation });
  }

  function renderPlayerRow(player: Player) {
    return (
      <div
        key={player.id}
        className="bg-[#4A6844] border-4 border-[#6B9462] p-3 grid grid-cols-[1.8fr,0.9fr,0.6fr,0.7fr] gap-2 text-[8px]"
      >
        <div className="text-[#E8E8D8]">{getPlayerName(player)}</div>
        <div className="text-[#E8E8D8]/80">{formatPosition(player)}</div>
        <div className="text-[#E8E8D8]/80">{player.overallGrade}</div>
        <div className="text-[#E8E8D8]/80">{player.bats}/{player.throws}</div>
      </div>
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
              onClick={() => setSelectedTeamId(team.teamId)}
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
                <div className="space-y-2">
                  {lineup.map((slot, index) => {
                    const player = snapshot.players.find((item) => item.id === slot.playerId);
                    return (
                      <div
                        key={`${slot.playerId}-${slot.battingOrder}`}
                        className="bg-[#4A6844] border-4 border-[#6B9462] p-3 grid grid-cols-[0.4fr,1.6fr,0.9fr,0.6fr] gap-2 items-center"
                      >
                        <div className="text-xs">{slot.battingOrder}</div>
                        <div>
                          <div className="text-[8px]">{player ? getPlayerName(player) : slot.playerId}</div>
                          <div className="text-[8px] text-[#E8E8D8]/60">
                            {player ? `${player.overallGrade} • ${player.bats}/${player.throws}` : 'Unknown player'}
                          </div>
                        </div>
                        <select
                          value={slot.fieldingPosition}
                          onChange={(event) => void handlePositionChange(index, event.target.value as Position)}
                          className="bg-[#6B9462] border-2 border-[#E8E8D8] text-[#E8E8D8] text-[8px] px-2 py-1"
                        >
                          {FIELD_POSITIONS.map((position) => (
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
                  <div className="space-y-2">{benchPlayers.map(renderPlayerRow)}</div>
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
    </div>
  );
}
