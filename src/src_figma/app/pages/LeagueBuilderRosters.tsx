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
    leagues,
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
  const [activeLeagueId, setActiveLeagueId] = useState<string>("");

  // Auto-select first league on load
  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(leagues[0].id);
    }
  }, [leagues, activeLeagueId]);

  // Filter teams to only those in the selected league
  const leagueTeams = useMemo(() => {
    if (!activeLeagueId) return teams;
    const league = leagues.find(l => l.id === activeLeagueId);
    if (!league?.teamIds?.length) return teams;
    return teams.filter(t => league.teamIds!.includes(t.id));
  }, [activeLeagueId, leagues, teams]);

  const isPlayerOnTeam = (player: Player, teamId: string) =>
    player.leagueAssignments?.some(
      (assignment) => assignment.leagueId === activeLeagueId && assignment.teamId === teamId,
    ) ?? false;

  // Reset team selection when league changes
  useEffect(() => {
    setSelectedTeamId(null);
    setCurrentRoster(null);
  }, [activeLeagueId]);

  // Get team roster summary for team list
  const teamSummaries = useMemo(() => {
    return leagueTeams.map((team) => {
      const roster = players.filter((player) => isPlayerOnTeam(player, team.id));
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
  }, [teams, players, activeLeagueId]);

  // Load roster when team is selected
  useEffect(() => {
    if (selectedTeamId) {
      loadRoster(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadRoster = async (teamId: string) => {
    const roster = await getRoster(teamId);
    if (roster) {
      setCurrentRoster(migratePitcherBuckets(roster, players));
    } else {
      setCurrentRoster(createEmptyRoster(teamId));
    }
    setHasChanges(false);
  };

  // Migrate legacy rosters where SP/RP pitchers were placed in startingRotation
  // before the longRelievers bucket existed. Only re-sorts if a misplaced pitcher is detected.
  const migratePitcherBuckets = (roster: TeamRoster, allPlayers: Player[]): TeamRoster => {
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

    // Check if any pitcher in startingRotation has a non-SP position (SP/RP, RP, CP)
    const hasMisplacedPitcher = roster.startingRotation.some((id) => {
      const player = playerMap.get(id);
      return player && player.primaryPosition !== 'SP';
    });

    if (!hasMisplacedPitcher) return roster;

    const allBucketIds = [
      ...roster.startingRotation,
      ...(roster.longRelievers || []),
      ...roster.setupPitchers,
      ...(roster.closingPitcher ? [roster.closingPitcher] : []),
    ].filter(Boolean);

    if (allBucketIds.length === 0) return roster;

    const starters: string[] = [];
    const longRelievers: string[] = [];
    const relievers: string[] = [];
    let closer = '';

    for (const id of allBucketIds) {
      const player = playerMap.get(id);
      if (!player) continue;
      switch (player.primaryPosition) {
        case 'SP': starters.push(id); break;
        case 'SP/RP': longRelievers.push(id); break;
        case 'CP': closer = id; break;
        default: relievers.push(id); break;
      }
    }

    return {
      ...roster,
      startingRotation: starters,
      longRelievers,
      setupPitchers: relievers,
      closingPitcher: closer,
    };
  };

  const createEmptyRoster = (teamId: string): TeamRoster => ({
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
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
    () => selectedTeamId ? players.filter((player) => isPlayerOnTeam(player, selectedTeamId)) : [],
    [players, selectedTeamId, activeLeagueId]
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
            {/* League Selector */}
            {leagues.length > 1 && (
              <select
                value={activeLeagueId}
                onChange={(e) => setActiveLeagueId(e.target.value)}
                className="bg-[#4A6844] border-4 border-[#E8E8D8] text-[#E8E8D8] px-4 py-2 text-sm font-bold tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] cursor-pointer"
              >
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
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
  const [lineupMode, setLineupMode] = useState<"DH" | "NO_DH">("DH");
  const isDH = lineupMode === "DH";

  const mlbPlayers = players.filter((p) => roster.mlbRoster.includes(p.id));
  const positionPlayers = mlbPlayers.filter(
    (p) => !PITCHER_POSITIONS.includes(p.primaryPosition)
  );

  // In No DH mode, the starting pitcher is auto-locked at batting order 9
  const startingPitcherId = roster.startingRotation?.[0] || mlbPlayers.find(
    (p) => p.primaryPosition === 'SP'
  )?.id;
  const startingPitcher = startingPitcherId ? players.find((p) => p.id === startingPitcherId) : null;

  // Build the displayed lineup: stored slots + pitcher lock for No DH
  const storedLineup = isDH ? roster.lineupWithDH : roster.lineupWithoutDH;
  const maxUserSlots = isDH ? 9 : 8;
  // In No DH, filter out pitcher slots, DH slots, and the auto-locked starting pitcher, then cap at 8
  const userSlots = isDH
    ? storedLineup
    : storedLineup
        .filter((s) =>
          s.fieldingPosition !== ('P' as unknown as Position)
          && s.fieldingPosition !== 'DH'
          && s.playerId !== startingPitcherId
        )
        .slice(0, maxUserSlots)
        .map((s, idx) => ({ ...s, battingOrder: idx + 1 }));

  // The full lineup shown to the user (user slots + pitcher lock at 9th)
  const currentLineup = isDH
    ? userSlots
    : [
        ...userSlots,
        ...(startingPitcher ? [{
          battingOrder: 9,
          playerId: startingPitcher.id,
          fieldingPosition: 'P' as unknown as Position,
        }] : []),
      ];

  // Positions available for assignment
  const noDhFieldPositions: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
  const availablePositions = isDH ? FIELDING_POSITIONS : noDhFieldPositions;

  const setLineup = (lineup: LineupSlot[]) => {
    if (isDH) {
      onUpdate({ lineupWithDH: lineup });
    } else {
      // Strip the auto-locked pitcher slot before saving
      const withoutPitcher = lineup.filter((s) => s.fieldingPosition !== ('P' as unknown as Position));
      onUpdate({ lineupWithoutDH: withoutPitcher });
    }
  };

  const addToLineup = (playerId: string, position: Position) => {
    const nextOrder = userSlots.length + 1;
    if (nextOrder > maxUserSlots) return;

    const newSlots = [
      ...userSlots,
      { battingOrder: nextOrder, playerId, fieldingPosition: position },
    ];
    setLineup(newSlots);
  };

  const removeFromLineup = (battingOrder: number) => {
    // Don't allow removing the pitcher in No DH mode
    const slot = currentLineup.find((s) => s.battingOrder === battingOrder);
    if (!isDH && slot?.fieldingPosition === ('P' as unknown as Position)) return;

    const newLineup = userSlots
      .filter((s) => s.battingOrder !== battingOrder)
      .map((s, idx) => ({ ...s, battingOrder: idx + 1 }));
    setLineup(newLineup);
  };

  // Drag-and-drop reordering state
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const reorderLineup = (fromOrder: number, toOrder: number) => {
    if (fromOrder === toOrder) return;
    // Don't reorder into the pitcher's locked 9th slot
    if (!isDH && (fromOrder === 9 || toOrder === 9)) return;

    const sorted = [...userSlots].sort((a, b) => a.battingOrder - b.battingOrder);
    const fromIdx = sorted.findIndex((s) => s.battingOrder === fromOrder);
    const toIdx = sorted.findIndex((s) => s.battingOrder === toOrder);
    if (fromIdx < 0 || toIdx < 0) return;

    // Remove the dragged item and insert at the new position
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);

    // Reassign batting orders sequentially
    const reordered = sorted.map((s, idx) => ({ ...s, battingOrder: idx + 1 }));
    setLineup(reordered);
  };

  const handleDragStart = (e: React.DragEvent, battingOrder: number) => {
    setDragFrom(battingOrder);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, battingOrder: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(battingOrder);
  };

  const handleDrop = (e: React.DragEvent, battingOrder: number) => {
    e.preventDefault();
    if (dragFrom !== null) {
      reorderLineup(dragFrom, battingOrder);
    }
    setDragFrom(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  const usedPlayerIds = currentLineup.map((s) => s.playerId);
  const availablePlayers = positionPlayers.filter(
    (p) => !usedPlayerIds.includes(p.id)
  );

  return (
    <div className="space-y-4">
      {/* DH Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setLineupMode("DH")}
          className={`px-4 py-2 font-bold transition ${
            lineupMode === "DH"
              ? "bg-[#DD0000] border-4 border-[#E8E8D8]"
              : "bg-[#4A6844] border-4 border-[#E8E8D8]/30"
          }`}
        >
          DH
        </button>
        <button
          onClick={() => setLineupMode("NO_DH")}
          className={`px-4 py-2 font-bold transition ${
            lineupMode === "NO_DH"
              ? "bg-[#DD0000] border-4 border-[#E8E8D8]"
              : "bg-[#4A6844] border-4 border-[#E8E8D8]/30"
          }`}
        >
          No DH
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Current Lineup */}
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            LINEUP {isDH ? "(DH)" : "(No DH)"} ({currentLineup.length}/9)
          </h4>
          <div className="space-y-2">
            {currentLineup
              .sort((a, b) => a.battingOrder - b.battingOrder)
              .map((slot) => {
                const player = players.find((p) => p.id === slot.playerId);
                if (!player) return null;
                const isPitcherSlot = !isDH && slot.fieldingPosition === ('P' as unknown as Position);
                const isDragging = dragFrom === slot.battingOrder;
                const isDropTarget = dragOver === slot.battingOrder && dragFrom !== slot.battingOrder;
                return (
                  <div
                    key={`${slot.battingOrder}-${slot.playerId}`}
                    draggable={!isPitcherSlot}
                    onDragStart={(e) => !isPitcherSlot && handleDragStart(e, slot.battingOrder)}
                    onDragOver={(e) => !isPitcherSlot && handleDragOver(e, slot.battingOrder)}
                    onDrop={(e) => !isPitcherSlot && handleDrop(e, slot.battingOrder)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 border-2 p-2 transition-all ${
                      isPitcherSlot
                        ? "bg-[#3A5A3A] border-[#E8E8D8]/40 opacity-80"
                        : isDragging
                          ? "bg-[#556B55]/50 border-[#E8E8D8]/10 opacity-40"
                          : isDropTarget
                            ? "bg-[#5A8352] border-[#FFD700] border-2"
                            : "bg-[#556B55] border-[#E8E8D8]/20"
                    } ${!isPitcherSlot ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    <span className="w-6 h-6 bg-[#DD0000] flex items-center justify-center font-bold text-sm">
                      {slot.battingOrder}
                    </span>
                    {!isPitcherSlot && (
                      <span className="text-[#E8E8D8]/40 text-sm select-none" title="Drag to reorder">⠿</span>
                    )}
                    <span className="px-2 py-0.5 bg-[#4A6844] text-xs font-bold">
                      {slot.fieldingPosition}
                    </span>
                    <span className="flex-1 font-bold text-sm truncate">
                      {player.firstName} {player.lastName}
                      {isPitcherSlot && <span className="text-[#E8E8D8]/50 text-xs ml-1">(auto)</span>}
                    </span>
                    {!isPitcherSlot && (
                      <button
                        onClick={() => removeFromLineup(slot.battingOrder)}
                        className="p-1 bg-[#DD0000] hover:bg-[#FF2222] text-xs"
                      >
                        ✕
                      </button>
                    )}
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
                  disabled={userSlots.length >= maxUserSlots}
                >
                  <option value="">Add at...</option>
                  {availablePositions.map((pos) => (
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

  const longRelievers = (roster.longRelievers || [])
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const relievers = roster.setupPitchers
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const closerPlayer = players.find((p) => p.id === roster.closingPitcher);

  const usedIds = [
    ...roster.startingRotation,
    ...(roster.longRelievers || []),
    ...roster.setupPitchers,
    roster.closingPitcher,
  ].filter(Boolean);
  const availablePitchers = pitchers.filter((p) => !usedIds.includes(p.id));

  const addTo = (bucket: 'startingRotation' | 'longRelievers' | 'setupPitchers', playerId: string) => {
    onUpdate({ [bucket]: [...(roster[bucket] || []), playerId] });
  };

  const removeFrom = (bucket: 'startingRotation' | 'longRelievers' | 'setupPitchers', playerId: string) => {
    onUpdate({ [bucket]: (roster[bucket] || []).filter((id: string) => id !== playerId) });
  };

  const setCloser = (playerId: string) => {
    onUpdate({ closingPitcher: playerId });
  };

  type BucketConfig = {
    key: 'startingRotation' | 'longRelievers' | 'setupPitchers';
    label: string;
    badge: string;
    color: string;
    items: Player[];
    numbered?: boolean;
  };

  const buckets: BucketConfig[] = [
    { key: 'startingRotation', label: 'STARTERS', badge: 'SP', color: '#0066FF', items: starters, numbered: true },
    { key: 'longRelievers', label: 'LONG RELIEVERS', badge: 'LR', color: '#8855CC', items: longRelievers },
    { key: 'setupPitchers', label: 'RELIEVERS', badge: 'RP', color: '#FF6600', items: relievers },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
            <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
              {bucket.label} ({bucket.items.length})
            </h4>
            <div className="space-y-2">
              {bucket.items.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 bg-[#556B55] border-2 border-[#E8E8D8]/20 p-2"
                >
                  <span
                    className="w-6 h-6 flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: bucket.color }}
                  >
                    {bucket.numbered ? idx + 1 : bucket.badge}
                  </span>
                  <span className="flex-1 font-bold text-sm truncate">
                    {player.firstName} {player.lastName}
                  </span>
                  <button
                    onClick={() => removeFrom(bucket.key, player.id)}
                    className="p-1 bg-[#DD0000] hover:bg-[#FF2222] text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {bucket.items.length === 0 && (
                <p className="text-center text-[#E8E8D8]/50 py-2 text-sm">None assigned</p>
              )}
            </div>
          </div>
        ))}

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
            <p className="text-center text-[#E8E8D8]/50 py-2 text-sm">No closer assigned</p>
          )}
        </div>
      </div>

      {/* Available Pitchers */}
      {availablePitchers.length > 0 && (
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <h4 className="font-bold mb-3 text-sm border-b border-[#E8E8D8]/20 pb-2">
            UNASSIGNED ({availablePitchers.length})
          </h4>
          <div className="grid grid-cols-2 gap-2">
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
                    onClick={() => addTo('startingRotation', player.id)}
                    className="px-2 py-1 text-xs font-bold"
                    style={{ backgroundColor: '#0066FF' }}
                    title="Starter"
                  >
                    SP
                  </button>
                  <button
                    onClick={() => addTo('longRelievers', player.id)}
                    className="px-2 py-1 text-xs font-bold"
                    style={{ backgroundColor: '#8855CC' }}
                    title="Long Reliever"
                  >
                    LR
                  </button>
                  <button
                    onClick={() => addTo('setupPitchers', player.id)}
                    className="px-2 py-1 text-xs font-bold"
                    style={{ backgroundColor: '#FF6600' }}
                    title="Reliever"
                  >
                    RP
                  </button>
                  <button
                    onClick={() => setCloser(player.id)}
                    className="px-2 py-1 text-xs font-bold bg-[#DD0000]"
                    title="Closer"
                  >
                    CP
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
