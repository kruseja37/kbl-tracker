import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Star } from 'lucide-react';
import type { MojoLevel } from '../../../engines/mojoEngine';
import { MOJO_LEVELS, MOJO_STATES, getMojoColor } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { FITNESS_STATES } from '../../../engines/fitnessEngine';
import {
  getEliminationRosterSnapshot,
  getAllEliminationRosterSnapshots,
  getNormalizedEliminationLineup,
  getNormalizedEliminationRotation,
  updateEliminationRosterSnapshot,
  type EliminationRosterSnapshot,
} from '../../../utils/eliminationRosterStorage';
import type { Player, LineupSlot, Position } from '../../../utils/leagueBuilderStorage';
import { loadMojoFitnessSnapshots, saveMojoFitnessSnapshots } from '../../../utils/mojoFitnessStorage';
import type { PlayoffTeam } from '../../../utils/playoffStorage';
import type { ManagerProfile } from '../../../types/managerWpa';
import {
  resolveManagerForTeam,
  saveManagerProfile,
} from '../../../utils/managerIdentityStorage';

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
    updates: Partial<Pick<EliminationRosterSnapshot, 'lineup' | 'lineupWithoutDH' | 'startingRotation'>>
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
              lineupWithoutDH: updates.lineupWithoutDH
                ? sortLineup(updates.lineupWithoutDH)
                : current.lineupWithoutDH,
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
    await saveMojoFitnessSnapshots(eliminationId, [
      {
        playerId,
        mojoLevel: next.mojo,
        fitnessState: next.fitness,
      },
    ]);
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
