import { useNavigate } from "react-router";
import { ArrowLeft, Folder, Users, ChevronRight, Save, RotateCcw } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  useLeagueBuilderData,
  type Team,
  type Player,
  type TeamRoster,
  type Position,
  type LineupSlot,
  type DepthChart,
} from "../../hooks/useLeagueBuilderData";

type TabType = "roster" | "lineup" | "rotation" | "depth";

const FIELDING_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];
const PITCHER_POSITIONS: Position[] = ['SP', 'RP', 'CP'];

export function LeagueBuilderRosters() {
  const navigate = useNavigate();
  const {
    teams,
    players,
    isLoading,
    error,
    getRoster,
    updateRoster,
  } = useLeagueBuilderData();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("roster");
  const [currentRoster, setCurrentRoster] = useState<TeamRoster | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get team roster summary for team list
  const teamSummaries = useMemo(() => {
    return teams.map((team) => {
      const roster = players.filter((p) => p.currentTeamId === team.id);
      const pitchers = roster.filter((p) =>
        ['SP', 'RP', 'CP', 'SP/RP'].includes(p.primaryPosition)
      ).length;
      const batters = roster.length - pitchers;
      return {
        ...team,
        playerCount: roster.length,
        pitchers,
        batters,
      };
    });
  }, [teams, players]);

  // Load roster when team is selected
  useEffect(() => {
    if (selectedTeamId) {
      loadRoster(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadRoster = async (teamId: string) => {
    const roster = await getRoster(teamId);
    if (roster) {
      setCurrentRoster(roster);
    } else {
      // Create empty roster
      setCurrentRoster(createEmptyRoster(teamId));
    }
    setHasChanges(false);
  };

  const createEmptyRoster = (teamId: string): TeamRoster => ({
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupVsRHP: [],
    lineupVsLHP: [],
    startingRotation: [],
    closingPitcher: '',
    setupPitchers: [],
    depthChart: {
      C: [],
      '1B': [],
      '2B': [],
      SS: [],
      '3B': [],
      LF: [],
      CF: [],
      RF: [],
      DH: [],
      SP: [],
      RP: [],
      CP: [],
    },
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: new Date().toISOString(),
  });

  const handleSave = async () => {
    if (!currentRoster) return;
    setSaving(true);
    try {
      await updateRoster({
        ...currentRoster,
        lastModified: new Date().toISOString(),
      });
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async () => {
    if (selectedTeamId) {
      await loadRoster(selectedTeamId);
    }
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const teamPlayers = useMemo(
    () => players.filter((p) => p.currentTeamId === selectedTeamId),
    [players, selectedTeamId]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-lg">Loading rosters...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/league-builder")}
              className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
            </button>
            <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
              <Folder className="w-6 h-6" style={{ color: "#0066FF" }} />
              <h1
                className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                ROSTERS
              </h1>
            </div>
          </div>
          {selectedTeamId && hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRevert}
                className="flex items-center gap-2 px-4 py-2 bg-[#556B55] hover:bg-[#667B66] border-4 border-[#E8E8D8]/50 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="font-bold">REVERT</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#DD0000] hover:bg-[#FF2222] border-4 border-[#E8E8D8] transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span className="font-bold">{saving ? "SAVING..." : "SAVE"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Team List - Left Column */}
          <div className="col-span-3">
            <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <h3
                className="font-bold mb-4 text-sm"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
              >
                TEAMS ({teamSummaries.length})
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {teamSummaries.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full bg-[#4A6844] border-4 p-3 text-left transition-all flex items-center gap-3 ${
                      selectedTeamId === team.id
                        ? "border-[#DD0000] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
                        : "border-[#E8E8D8]/30 hover:border-[#E8E8D8]/60"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 flex-shrink-0"
                      style={{
                        backgroundColor: team.colors.primary,
                        borderColor: team.colors.secondary,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-sm truncate"
                        style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
                      >
                        {team.name}
                      </div>
                      <div className="text-xs text-[#E8E8D8]/60">
                        {team.playerCount} players
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 ${
                        selectedTeamId === team.id
                          ? "text-[#DD0000]"
                          : "text-[#E8E8D8]/40"
                      }`}
                    />
                  </button>
                ))}
                {teamSummaries.length === 0 && (
                  <div className="text-center py-8 text-[#E8E8D8]/50">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No teams created yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Roster Editor - Right Column */}
          <div className="col-span-9">
            {selectedTeam && currentRoster ? (
              <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
                {/* Team Header */}
                <div className="bg-[#4A6844] border-b-4 border-[#E8E8D8]/30 px-6 py-4 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full border-3"
                    style={{
                      backgroundColor: selectedTeam.colors.primary,
                      borderColor: selectedTeam.colors.secondary,
                    }}
                  />
                  <div>
                    <h2
                      className="text-xl font-bold"
                      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      {selectedTeam.name}
                    </h2>
                    <p className="text-sm text-[#E8E8D8]/60">
                      {teamPlayers.length} players on roster
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b-4 border-[#4A6844]">
                  {(["roster", "lineup", "rotation", "depth"] as TabType[]).map(
                    (tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 px-4 font-bold text-sm transition ${
                          activeTab === tab
                            ? "bg-[#4A6844] text-[#E8E8D8]"
                            : "bg-[#556B55] text-[#E8E8D8]/60 hover:text-[#E8E8D8]/80"
                        }`}
                      >
                        {tab.toUpperCase()}
                      </button>
                    )
                  )}
                </div>

                <div className="p-6">
                  {activeTab === "roster" && (
                    <RosterTab
                      roster={currentRoster}
                      players={teamPlayers}
                      onUpdate={(update) => {
                        setCurrentRoster({ ...currentRoster, ...update });
                        setHasChanges(true);
                      }}
                    />
                  )}
                  {activeTab === "lineup" && (
                    <LineupTab
                      roster={currentRoster}
                      players={teamPlayers}
                      onUpdate={(update) => {
                        setCurrentRoster({ ...currentRoster, ...update });
                        setHasChanges(true);
                      }}
                    />
                  )}
                  {activeTab === "rotation" && (
                    <RotationTab
                      roster={currentRoster}
                      players={teamPlayers}
                      onUpdate={(update) => {
                        setCurrentRoster({ ...currentRoster, ...update });
                        setHasChanges(true);
                      }}
                    />
                  )}
                  {activeTab === "depth" && (
                    <DepthChartTab
                      roster={currentRoster}
                      players={teamPlayers}
                      onUpdate={(update) => {
                        setCurrentRoster({ ...currentRoster, ...update });
                        setHasChanges(true);
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
                <Folder
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  style={{ color: "#0066FF" }}
                />
                <p className="text-[#E8E8D8]/70">
                  Select a team to manage their roster
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ROSTER TAB - MLB/Farm split
// ============================================

interface RosterTabProps {
  roster: TeamRoster;
  players: Player[];
  onUpdate: (update: Partial<TeamRoster>) => void;
}

function RosterTab({ roster, players, onUpdate }: RosterTabProps) {
  const mlbPlayers = players.filter((p) => roster.mlbRoster.includes(p.id));
  const farmPlayers = players.filter((p) => roster.farmRoster.includes(p.id));
  const unassigned = players.filter(
    (p) => !roster.mlbRoster.includes(p.id) && !roster.farmRoster.includes(p.id)
  );

  const moveToMLB = (playerId: string) => {
    onUpdate({
      mlbRoster: [...roster.mlbRoster, playerId],
      farmRoster: roster.farmRoster.filter((id) => id !== playerId),
    });
  };

  const moveToFarm = (playerId: string) => {
    onUpdate({
      farmRoster: [...roster.farmRoster, playerId],
      mlbRoster: roster.mlbRoster.filter((id) => id !== playerId),
    });
  };

  const removeFromRoster = (playerId: string) => {
    onUpdate({
      mlbRoster: roster.mlbRoster.filter((id) => id !== playerId),
      farmRoster: roster.farmRoster.filter((id) => id !== playerId),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {/* MLB Roster */}
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            MLB ROSTER ({mlbPlayers.length})
          </h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {mlbPlayers.map((player) => (
              <PlayerRosterCard
                key={player.id}
                player={player}
                actions={[
                  { label: "→ AAA", onClick: () => moveToFarm(player.id) },
                  { label: "✕", onClick: () => removeFromRoster(player.id), danger: true },
                ]}
              />
            ))}
            {mlbPlayers.length === 0 && (
              <p className="text-center text-[#E8E8D8]/50 py-4 text-sm">
                No MLB players
              </p>
            )}
          </div>
        </div>

        {/* Farm Roster */}
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            AAA ROSTER ({farmPlayers.length})
          </h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {farmPlayers.map((player) => (
              <PlayerRosterCard
                key={player.id}
                player={player}
                actions={[
                  { label: "← MLB", onClick: () => moveToMLB(player.id) },
                  { label: "✕", onClick: () => removeFromRoster(player.id), danger: true },
                ]}
              />
            ))}
            {farmPlayers.length === 0 && (
              <p className="text-center text-[#E8E8D8]/50 py-4 text-sm">
                No AAA players
              </p>
            )}
          </div>
        </div>

        {/* Unassigned */}
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            UNASSIGNED ({unassigned.length})
          </h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {unassigned.map((player) => (
              <PlayerRosterCard
                key={player.id}
                player={player}
                actions={[
                  { label: "→ MLB", onClick: () => moveToMLB(player.id) },
                  { label: "→ AAA", onClick: () => moveToFarm(player.id) },
                ]}
              />
            ))}
            {unassigned.length === 0 && (
              <p className="text-center text-[#E8E8D8]/50 py-4 text-sm">
                All players assigned
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LINEUP TAB
// ============================================

interface LineupTabProps {
  roster: TeamRoster;
  players: Player[];
  onUpdate: (update: Partial<TeamRoster>) => void;
}

function LineupTab({ roster, players, onUpdate }: LineupTabProps) {
  const [vsHandedness, setVsHandedness] = useState<"RHP" | "LHP">("RHP");
  const currentLineup = vsHandedness === "RHP" ? roster.lineupVsRHP : roster.lineupVsLHP;

  const mlbPlayers = players.filter((p) => roster.mlbRoster.includes(p.id));
  const positionPlayers = mlbPlayers.filter(
    (p) => !PITCHER_POSITIONS.includes(p.primaryPosition)
  );

  const setLineup = (lineup: LineupSlot[]) => {
    if (vsHandedness === "RHP") {
      onUpdate({ lineupVsRHP: lineup });
    } else {
      onUpdate({ lineupVsLHP: lineup });
    }
  };

  const addToLineup = (playerId: string, position: Position) => {
    const nextOrder = currentLineup.length + 1;
    if (nextOrder > 9) return;

    setLineup([
      ...currentLineup,
      { battingOrder: nextOrder, playerId, fieldingPosition: position },
    ]);
  };

  const removeFromLineup = (battingOrder: number) => {
    const newLineup = currentLineup
      .filter((slot) => slot.battingOrder !== battingOrder)
      .map((slot, idx) => ({ ...slot, battingOrder: idx + 1 }));
    setLineup(newLineup);
  };

  const moveUp = (battingOrder: number) => {
    if (battingOrder <= 1) return;
    const newLineup = [...currentLineup];
    const idx = newLineup.findIndex((s) => s.battingOrder === battingOrder);
    const prevIdx = newLineup.findIndex((s) => s.battingOrder === battingOrder - 1);
    if (idx >= 0 && prevIdx >= 0) {
      newLineup[idx].battingOrder = battingOrder - 1;
      newLineup[prevIdx].battingOrder = battingOrder;
    }
    setLineup(newLineup.sort((a, b) => a.battingOrder - b.battingOrder));
  };

  const moveDown = (battingOrder: number) => {
    if (battingOrder >= currentLineup.length) return;
    const newLineup = [...currentLineup];
    const idx = newLineup.findIndex((s) => s.battingOrder === battingOrder);
    const nextIdx = newLineup.findIndex((s) => s.battingOrder === battingOrder + 1);
    if (idx >= 0 && nextIdx >= 0) {
      newLineup[idx].battingOrder = battingOrder + 1;
      newLineup[nextIdx].battingOrder = battingOrder;
    }
    setLineup(newLineup.sort((a, b) => a.battingOrder - b.battingOrder));
  };

  const usedPlayerIds = currentLineup.map((s) => s.playerId);
  const availablePlayers = positionPlayers.filter(
    (p) => !usedPlayerIds.includes(p.id)
  );

  return (
    <div className="space-y-4">
      {/* Handedness Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setVsHandedness("RHP")}
          className={`px-4 py-2 font-bold transition ${
            vsHandedness === "RHP"
              ? "bg-[#DD0000] border-4 border-[#E8E8D8]"
              : "bg-[#4A6844] border-4 border-[#E8E8D8]/30"
          }`}
        >
          vs RHP
        </button>
        <button
          onClick={() => setVsHandedness("LHP")}
          className={`px-4 py-2 font-bold transition ${
            vsHandedness === "LHP"
              ? "bg-[#DD0000] border-4 border-[#E8E8D8]"
              : "bg-[#4A6844] border-4 border-[#E8E8D8]/30"
          }`}
        >
          vs LHP
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Current Lineup */}
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            LINEUP vs {vsHandedness} ({currentLineup.length}/9)
          </h4>
          <div className="space-y-2">
            {currentLineup
              .sort((a, b) => a.battingOrder - b.battingOrder)
              .map((slot) => {
                const player = players.find((p) => p.id === slot.playerId);
                if (!player) return null;
                return (
                  <div
                    key={slot.battingOrder}
                    className="flex items-center gap-2 bg-[#556B55] border-2 border-[#E8E8D8]/20 p-2"
                  >
                    <span className="w-6 h-6 bg-[#DD0000] flex items-center justify-center font-bold text-sm">
                      {slot.battingOrder}
                    </span>
                    <span className="px-2 py-0.5 bg-[#4A6844] text-xs font-bold">
                      {slot.fieldingPosition}
                    </span>
                    <span className="flex-1 font-bold text-sm truncate">
                      {player.firstName} {player.lastName}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveUp(slot.battingOrder)}
                        className="p-1 bg-[#4A6844] hover:bg-[#5A8352] text-xs"
                        disabled={slot.battingOrder === 1}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDown(slot.battingOrder)}
                        className="p-1 bg-[#4A6844] hover:bg-[#5A8352] text-xs"
                        disabled={slot.battingOrder === currentLineup.length}
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => removeFromLineup(slot.battingOrder)}
                        className="p-1 bg-[#DD0000] hover:bg-[#FF2222] text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            {currentLineup.length === 0 && (
              <p className="text-center text-[#E8E8D8]/50 py-4 text-sm">
                Lineup is empty
              </p>
            )}
          </div>
        </div>

        {/* Available Players */}
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            AVAILABLE ({availablePlayers.length})
          </h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {availablePlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 bg-[#556B55] border-2 border-[#E8E8D8]/20 p-2"
              >
                <span className="px-2 py-0.5 bg-[#4A6844] text-xs font-bold">
                  {player.primaryPosition}
                </span>
                <span className="flex-1 font-bold text-sm truncate">
                  {player.firstName} {player.lastName}
                </span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addToLineup(player.id, e.target.value as Position);
                      e.target.value = "";
                    }
                  }}
                  className="bg-[#4A6844] border-2 border-[#E8E8D8]/30 px-2 py-1 text-xs"
                  defaultValue=""
                >
                  <option value="">Add at...</option>
                  {FIELDING_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ROTATION TAB
// ============================================

interface RotationTabProps {
  roster: TeamRoster;
  players: Player[];
  onUpdate: (update: Partial<TeamRoster>) => void;
}

function RotationTab({ roster, players, onUpdate }: RotationTabProps) {
  const mlbPlayers = players.filter((p) => roster.mlbRoster.includes(p.id));
  const pitchers = mlbPlayers.filter((p) =>
    PITCHER_POSITIONS.includes(p.primaryPosition) || p.primaryPosition === 'SP/RP'
  );

  const starters = roster.startingRotation
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const setupPitchers = roster.setupPitchers
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const closerPlayer = players.find((p) => p.id === roster.closingPitcher);

  const usedIds = [
    ...roster.startingRotation,
    ...roster.setupPitchers,
    roster.closingPitcher,
  ].filter(Boolean);
  const availablePitchers = pitchers.filter((p) => !usedIds.includes(p.id));

  const addStarter = (playerId: string) => {
    onUpdate({ startingRotation: [...roster.startingRotation, playerId] });
  };

  const removeStarter = (playerId: string) => {
    onUpdate({
      startingRotation: roster.startingRotation.filter((id) => id !== playerId),
    });
  };

  const setCloser = (playerId: string) => {
    onUpdate({ closingPitcher: playerId });
  };

  const addSetup = (playerId: string) => {
    onUpdate({ setupPitchers: [...roster.setupPitchers, playerId] });
  };

  const removeSetup = (playerId: string) => {
    onUpdate({
      setupPitchers: roster.setupPitchers.filter((id) => id !== playerId),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Starting Rotation */}
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            STARTING ROTATION ({starters.length})
          </h4>
          <div className="space-y-2">
            {starters.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center gap-2 bg-[#556B55] border-2 border-[#E8E8D8]/20 p-2"
              >
                <span className="w-6 h-6 bg-[#0066FF] flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </span>
                <span className="flex-1 font-bold text-sm truncate">
                  {player.firstName} {player.lastName}
                </span>
                <button
                  onClick={() => removeStarter(player.id)}
                  className="p-1 bg-[#DD0000] hover:bg-[#FF2222] text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bullpen */}
        <div className="space-y-4">
          {/* Closer */}
          <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
            <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
              CLOSER
            </h4>
            {closerPlayer ? (
              <div className="flex items-center gap-2 bg-[#556B55] border-2 border-[#DD0000] p-2">
                <span className="w-6 h-6 bg-[#DD0000] flex items-center justify-center font-bold text-sm">
                  CP
                </span>
                <span className="flex-1 font-bold text-sm">{closerPlayer.firstName} {closerPlayer.lastName}</span>
                <button
                  onClick={() => setCloser("")}
                  className="p-1 bg-[#DD0000] hover:bg-[#FF2222] text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <p className="text-center text-[#E8E8D8]/50 py-2 text-sm">
                No closer assigned
              </p>
            )}
          </div>

          {/* Setup */}
          <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
            <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
              SETUP ({setupPitchers.length})
            </h4>
            <div className="space-y-2">
              {setupPitchers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 bg-[#556B55] border-2 border-[#E8E8D8]/20 p-2"
                >
                  <span className="w-6 h-6 bg-[#FF6600] flex items-center justify-center font-bold text-sm">
                    SU
                  </span>
                  <span className="flex-1 font-bold text-sm truncate">
                    {player.firstName} {player.lastName}
                  </span>
                  <button
                    onClick={() => removeSetup(player.id)}
                    className="p-1 bg-[#DD0000] hover:bg-[#FF2222] text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Available Pitchers */}
      <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
        <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
          AVAILABLE PITCHERS ({availablePitchers.length})
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {availablePitchers.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 bg-[#556B55] border-2 border-[#E8E8D8]/20 p-2"
            >
              <span className="px-2 py-0.5 bg-[#4A6844] text-xs font-bold">
                {player.primaryPosition}
              </span>
              <span className="flex-1 font-bold text-sm truncate">{player.firstName} {player.lastName}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => addStarter(player.id)}
                  className="px-2 py-1 bg-[#0066FF] hover:bg-[#0088FF] text-xs font-bold"
                  title="Add to Rotation"
                >
                  SP
                </button>
                <button
                  onClick={() => setCloser(player.id)}
                  className="px-2 py-1 bg-[#DD0000] hover:bg-[#FF2222] text-xs font-bold"
                  title="Set as Closer"
                >
                  CP
                </button>
                <button
                  onClick={() => addSetup(player.id)}
                  className="px-2 py-1 bg-[#FF6600] hover:bg-[#FF8800] text-xs font-bold"
                  title="Add to Setup"
                >
                  SU
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// DEPTH CHART TAB
// ============================================

interface DepthChartTabProps {
  roster: TeamRoster;
  players: Player[];
  onUpdate: (update: Partial<TeamRoster>) => void;
}

function DepthChartTab({ roster, players, onUpdate }: DepthChartTabProps) {
  const mlbPlayers = players.filter((p) => roster.mlbRoster.includes(p.id));

  const updateDepthPosition = (position: keyof DepthChart, playerIds: string[]) => {
    onUpdate({
      depthChart: {
        ...roster.depthChart,
        [position]: playerIds,
      },
    });
  };

  const positions: (keyof DepthChart)[] = [
    'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CP'
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {positions.map((position) => {
          const depthIds = roster.depthChart[position] || [];
          const depthPlayers = depthIds
            .map((id) => players.find((p) => p.id === id))
            .filter(Boolean) as Player[];

          const availableForPosition = mlbPlayers.filter(
            (p) =>
              !depthIds.includes(p.id) &&
              (p.primaryPosition === position || p.secondaryPosition === position)
          );

          return (
            <div key={position} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
              <h5 className="font-bold text-sm mb-2 text-center bg-[#556B55] py-1">
                {position}
              </h5>
              <div className="space-y-1 min-h-[80px]">
                {depthPlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-1 bg-[#556B55] border border-[#E8E8D8]/20 p-1 text-xs"
                  >
                    <span className="w-4 text-center text-[#E8E8D8]/60">{idx + 1}</span>
                    <span className="flex-1 truncate">{player.firstName} {player.lastName}</span>
                    <button
                      onClick={() =>
                        updateDepthPosition(
                          position,
                          depthIds.filter((id) => id !== player.id)
                        )
                      }
                      className="text-[#DD0000] hover:text-[#FF2222]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {availableForPosition.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      updateDepthPosition(position, [...depthIds, e.target.value]);
                      e.target.value = "";
                    }
                  }}
                  className="w-full mt-2 bg-[#556B55] border-2 border-[#E8E8D8]/30 px-2 py-1 text-xs"
                  defaultValue=""
                >
                  <option value="">+ Add</option>
                  {availableForPosition.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

interface PlayerRosterCardProps {
  player: Player;
  actions: { label: string; onClick: () => void; danger?: boolean }[];
}

function PlayerRosterCard({ player, actions }: PlayerRosterCardProps) {
  return (
    <div className="flex items-center gap-2 bg-[#556B55] border-2 border-[#E8E8D8]/20 p-2">
      <span className="px-2 py-0.5 bg-[#4A6844] text-xs font-bold">
        {player.primaryPosition}
      </span>
      <span className="flex-1 font-bold text-sm truncate">{player.firstName} {player.lastName}</span>
      <div className="flex gap-1">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className={`px-2 py-0.5 text-xs font-bold transition ${
              action.danger
                ? "bg-[#DD0000] hover:bg-[#FF2222]"
                : "bg-[#4A6844] hover:bg-[#5A8352]"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
