import { useState, useMemo, useEffect } from "react";
import { Edit, Building2, User } from "lucide-react";
import { useOffseasonData, type OffseasonTeam, type OffseasonPlayer } from "@/hooks/useOffseasonData";
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../../hooks/useSeasonStats';

type TeamHubTab = "team" | "fan-morale" | "roster" | "stats" | "stadium" | "manager";

// Empty fallbacks — populated from real data when available
const EMPTY_TEAMS: string[] = [];
const EMPTY_STADIUMS: string[] = [];

const EMPTY_ROSTER_DATA: { name: string; position: string; grade: string; morale: string | number; contract: string; trueValue: string; netDiff: string; fitness: string | number }[] = [];

const EMPTY_STATS_DATA: { name: string; pos: string; war: number; pwar: number; bwar: number; rwar: number; fwar: number; era?: number; ip?: number; k?: number; w?: number; l?: number; sv?: number; avg?: number; hr?: number; rbi?: number; sb?: number; ops?: number }[] = [];

// Helper to convert OffseasonPlayer to roster format
function convertToRosterItem(player: OffseasonPlayer) {
  const salary = player.salary || 0;
  const contractStr = salary > 0 ? `$${(salary / 1000000).toFixed(1)}M` : '—';

  return {
    name: player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' '),
    position: player.position,
    grade: player.grade,
    morale: '—' as string | number,
    contract: contractStr,
    trueValue: '—',
    netDiff: '—',
    fitness: '—' as string | number,
  };
}

// Helper to convert OffseasonPlayer to stats format (empty — no season data yet)
function convertToStatsItem(player: OffseasonPlayer) {
  const shortName = player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' ');
  const isPitcher = ['SP', 'RP', 'CP'].includes(player.position);

  if (isPitcher) {
    return {
      name: shortName,
      pos: player.position,
      war: 0.0,
      pwar: 0.0,
      bwar: 0.0,
      rwar: 0.0,
      fwar: 0.0,
      era: undefined as number | undefined,
      ip: undefined as number | undefined,
      k: undefined as number | undefined,
      w: undefined as number | undefined,
      l: undefined as number | undefined,
    };
  } else {
    return {
      name: shortName,
      pos: player.position,
      war: 0.0,
      pwar: 0.0,
      bwar: 0.0,
      rwar: 0.0,
      fwar: 0.0,
      avg: undefined as number | undefined,
      hr: undefined as number | undefined,
      rbi: undefined as number | undefined,
      sb: undefined as number | undefined,
      ops: undefined as number | undefined,
    };
  }
}

// Helper to convert OffseasonPlayer + real season stats to stats format
function convertToStatsItemFromSeason(
  player: OffseasonPlayer,
  batting: BattingLeaderEntry | undefined,
  pitching: PitchingLeaderEntry | undefined,
) {
  const shortName = player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' ');
  const isPitcher = ['SP', 'RP', 'CP'].includes(player.position);

  if (isPitcher && pitching) {
    return {
      name: shortName,
      pos: player.position,
      war: parseFloat(pitching.pWAR.toFixed(1)),
      pwar: parseFloat(pitching.pWAR.toFixed(1)),
      bwar: 0.0,
      rwar: 0.0,
      fwar: 0.0,
      era: parseFloat(pitching.era.toFixed(2)),
      ip: parseFloat(pitching.ip),
      k: pitching.strikeouts,
      w: pitching.wins,
      l: pitching.losses,
    };
  } else if (!isPitcher && batting) {
    return {
      name: shortName,
      pos: player.position,
      war: parseFloat(batting.totalWAR.toFixed(1)),
      pwar: 0.0,
      bwar: parseFloat(batting.bWAR.toFixed(1)),
      rwar: parseFloat(batting.rWAR.toFixed(1)),
      fwar: parseFloat(batting.fWAR.toFixed(1)),
      avg: parseFloat(batting.avg.toFixed(3)),
      hr: batting.homeRuns,
      rbi: batting.rbi,
      sb: batting.stolenBases,
      ops: parseFloat(batting.ops.toFixed(3)),
    };
  }

  // Fallback: player exists in roster but has no matching season stats
  return convertToStatsItem(player);
}

export function TeamHubContent() {
  // Get real data from hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();
  const seasonStats = useSeasonStats();

  const [activeHubTab, setActiveHubTab] = useState<TeamHubTab>("team");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedStadium, setSelectedStadium] = useState<string>("");
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<string>("J. Rodriguez");
  const [statsView, setStatsView] = useState<"table" | "spraychart">("table");
  const [rosterSortColumn, setRosterSortColumn] = useState<string>("name");
  const [rosterSortDirection, setRosterSortDirection] = useState<"asc" | "desc">("asc");
  const [statsSortColumn, setStatsSortColumn] = useState<string>("war");
  const [statsSortDirection, setStatsSortDirection] = useState<"asc" | "desc">("desc");

  // Convert real data to local formats with mock fallback
  const teams = useMemo(() => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams.map(t => t.name);
    }
    return EMPTY_TEAMS;
  }, [realTeams, hasRealData]);

  const stadiums = useMemo(() => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams.map(t => t.stadium || t.name);
    }
    return EMPTY_STADIUMS;
  }, [realTeams, hasRealData]);

  // Default to first team once data loads
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
      setSelectedStadium(stadiums[0] || teams[0]);
    }
  }, [teams, stadiums, selectedTeam]);

  // Get roster for selected team
  const rosterData = useMemo(() => {
    if (hasRealData && realPlayers.length > 0 && realTeams.length > 0) {
      const selectedTeamObj = realTeams.find(t => t.name === selectedTeam);
      if (selectedTeamObj) {
        const teamPlayers = realPlayers.filter(p => p.teamId === selectedTeamObj.id).slice(0, 15);
        if (teamPlayers.length > 0) {
          return teamPlayers.map(p => convertToRosterItem(p));
        }
      }
    }
    return EMPTY_ROSTER_DATA;
  }, [realPlayers, realTeams, selectedTeam, hasRealData]);

  // Build lookup maps from season stats for real WAR
  const battingByPlayer = useMemo(() => {
    const map = new Map<string, BattingLeaderEntry>();
    if (!seasonStats.isLoading) {
      // Get all batting leaders (large limit to capture all players)
      const allBatters = seasonStats.getBattingLeaders('totalWAR', 500);
      for (const b of allBatters) {
        map.set(b.playerId, b);
      }
    }
    return map;
  }, [seasonStats.isLoading, seasonStats.getBattingLeaders]);

  const pitchingByPlayer = useMemo(() => {
    const map = new Map<string, PitchingLeaderEntry>();
    if (!seasonStats.isLoading) {
      const allPitchers = seasonStats.getPitchingLeaders('pWAR', 500);
      for (const p of allPitchers) {
        map.set(p.playerId, p);
      }
    }
    return map;
  }, [seasonStats.isLoading, seasonStats.getPitchingLeaders]);

  // Get stats for selected team
  const statsData = useMemo(() => {
    if (hasRealData && realPlayers.length > 0 && realTeams.length > 0) {
      const selectedTeamObj = realTeams.find(t => t.name === selectedTeam);
      if (selectedTeamObj) {
        const teamPlayers = realPlayers.filter(p => p.teamId === selectedTeamObj.id).slice(0, 15);
        if (teamPlayers.length > 0) {
          // Try to use real WAR from season stats
          const hasSeasonData = battingByPlayer.size > 0 || pitchingByPlayer.size > 0;
          return teamPlayers.map(p => {
            const batting = battingByPlayer.get(p.id);
            const pitching = pitchingByPlayer.get(p.id);
            if (hasSeasonData && (batting || pitching)) {
              return convertToStatsItemFromSeason(p, batting, pitching);
            }
            return convertToStatsItem(p);
          }).sort((a, b) => b.war - a.war);
        }
      }
    }
    return EMPTY_STATS_DATA;
  }, [realPlayers, realTeams, selectedTeam, hasRealData, battingByPlayer, pitchingByPlayer]);

  // NOTE: Fan morale, stadium park factors, and manager tracking
  // are not yet implemented — their tabs show empty states.

  // Sorting functions
  const handleRosterSort = (column: string) => {
    if (rosterSortColumn === column) {
      setRosterSortDirection(rosterSortDirection === "asc" ? "desc" : "asc");
    } else {
      setRosterSortColumn(column);
      setRosterSortDirection("asc");
    }
  };

  const handleStatsSort = (column: string) => {
    if (statsSortColumn === column) {
      setStatsSortDirection(statsSortDirection === "asc" ? "desc" : "asc");
    } else {
      setStatsSortColumn(column);
      setStatsSortDirection("desc");
    }
  };

  const getSortedRoster = () => {
    const sorted = [...rosterData].sort((a, b) => {
      let aVal: any = a[rosterSortColumn as keyof typeof a];
      let bVal: any = b[rosterSortColumn as keyof typeof b];

      // Handle numeric string values
      if (typeof aVal === "string" && aVal.includes("$")) {
        aVal = parseFloat(aVal.replace(/[$M]/g, ""));
        bVal = parseFloat(bVal.replace(/[$M]/g, ""));
      }

      if (aVal < bVal) return rosterSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return rosterSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const getSortedStats = () => {
    const sorted = [...statsData].sort((a, b) => {
      let aVal: any = a[statsSortColumn as keyof typeof a];
      let bVal: any = b[statsSortColumn as keyof typeof b];

      if (aVal < bVal) return statsSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return statsSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-[#E8E8D8] text-xl">Loading team hub data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Hub Tabs */}
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] overflow-x-auto">
        <div className="flex">
          {[
            { id: "team", label: "TEAM SELECT" },
            { id: "fan-morale", label: "FAN MORALE" },
            { id: "roster", label: "ROSTER" },
            { id: "stats", label: "STATS" },
            { id: "stadium", label: "STADIUM" },
            { id: "manager", label: "MANAGER" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveHubTab(tab.id as TeamHubTab)}
              className={`flex-1 px-3 py-2 text-[9px] whitespace-nowrap transition border-r-2 border-[#4A6844] last:border-r-0 ${
                activeHubTab === tab.id
                  ? "bg-[#4A6844] text-[#E8E8D8]"
                  : "text-[#E8E8D8]/60 hover:bg-[#5A8352]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Selection Tab */}
      {activeHubTab === "team" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
          <div className="text-center mb-6">
            <div 
              className="text-[14px] text-[#E8E8D8] mb-2"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              SELECT A TEAM
            </div>
            <div className="text-[8px] text-[#E8E8D8]/70">Choose a team to view detailed information</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {teams.map((team) => (
              <button
                key={team}
                onClick={() => {
                  setSelectedTeam(team);
                  const idx = teams.indexOf(team);
                  if (idx >= 0 && stadiums[idx]) setSelectedStadium(stadiums[idx]);
                }}
                className={`p-4 transition border-[3px] ${
                  selectedTeam === team
                    ? "bg-[#4A6844] border-[#E8E8D8] text-[#E8E8D8]"
                    : "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[11px] font-bold">{team}</div>
                <div className="text-[8px] mt-1">56-34 • 1st</div>
              </button>
            ))}
          </div>

          {selectedTeam && (
            <div className="mt-6 p-4 bg-[#4A6844] border-[3px] border-[#3F5A3A] max-w-2xl mx-auto">
              <div className="text-[10px] text-[#E8E8D8] text-center">
                Currently viewing: <span className="font-bold">{selectedTeam}</span>
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60 text-center mt-1">
                Use the tabs above to explore team details
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fan Morale Tab */}
      {activeHubTab === "fan-morale" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
          <div className="text-center">
            <div className="text-[24px] text-[#E8E8D8]/30 mb-4">📊</div>
            <div className="text-[12px] text-[#E8E8D8]/50 mb-2">FAN MORALE</div>
            <div className="text-[10px] text-[#E8E8D8]/40">
              Fan morale tracking begins after games are played.
            </div>
          </div>
        </div>
      )}

      {/* Roster Tab */}
      {activeHubTab === "roster" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
          <div 
            className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {selectedTeam.toUpperCase()} ROSTER
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="border-b-2 border-[#4A6844]">
                  <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("name")}>
                    NAME {rosterSortColumn === "name" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("position")}>
                    POS {rosterSortColumn === "position" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("grade")}>
                    GRADE {rosterSortColumn === "grade" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("morale")}>
                    MORALE {rosterSortColumn === "morale" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("contract")}>
                    CONTRACT {rosterSortColumn === "contract" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("trueValue")}>
                    TRUE VAL {rosterSortColumn === "trueValue" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("netDiff")}>
                    NET DIFF {rosterSortColumn === "netDiff" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleRosterSort("fitness")}>
                    FITNESS {rosterSortColumn === "fitness" && (rosterSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70">EDIT</th>
                </tr>
              </thead>
              <tbody>
                {getSortedRoster().map((player, idx) => (
                  <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? 'bg-[#5A8352]/20' : ''}`}>
                    <td className="py-2 px-2 text-[#E8E8D8]">{player.name}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.position}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center font-bold">{player.grade}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={typeof player.morale === 'number' ? (player.morale >= 85 ? "text-[#00DD00]" : player.morale >= 70 ? "text-[#E8E8D8]" : "text-[#DD0000]") : "text-[#E8E8D8]/50"}>
                        {player.morale}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.contract}</td>
                    <td className="py-2 px-2 text-[#E8E8D8]/50 text-center">{player.trueValue}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={typeof player.netDiff === 'string' && player.netDiff.startsWith("+") ? "text-[#00DD00]" : player.netDiff === '—' ? "text-[#E8E8D8]/50" : "text-[#DD0000]"}>
                        {player.netDiff}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={typeof player.fitness === 'number' ? (player.fitness >= 90 ? "text-[#00DD00]" : player.fitness >= 80 ? "text-[#E8E8D8]" : "text-[#DD0000]") : "text-[#E8E8D8]/50"}>
                        {player.fitness}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button className="p-1 hover:bg-[#4A6844] transition">
                        <Edit className="w-3 h-3 text-[#E8E8D8]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeHubTab === "stats" && (
        <div className="space-y-4">
          {/* Stats View Toggle */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-3">
            <div className="flex gap-2">
              <button
                onClick={() => setStatsView("table")}
                className={`flex-1 py-2 px-3 text-[9px] transition ${
                  statsView === "table"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                STATS TABLE
              </button>
              <button
                onClick={() => setStatsView("spraychart")}
                className={`flex-1 py-2 px-3 text-[9px] transition ${
                  statsView === "spraychart"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                SPRAY CHARTS
              </button>
            </div>
          </div>

          {statsView === "table" && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
              <div 
                className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {selectedTeam.toUpperCase()} PLAYER STATS
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b-2 border-[#4A6844]">
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("name")}>
                        NAME {statsSortColumn === "name" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">POS</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("war")}>
                        WAR {statsSortColumn === "war" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("pwar")}>
                        pWAR {statsSortColumn === "pwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("bwar")}>
                        bWAR {statsSortColumn === "bwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("rwar")}>
                        rWAR {statsSortColumn === "rwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStatsSort("fwar")}>
                        fWAR {statsSortColumn === "fwar" && (statsSortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">PRIMARY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedStats().map((player, idx) => (
                      <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? 'bg-[#5A8352]/20' : ''}`}>
                        <td className="py-2 px-2 text-[#E8E8D8]">{player.name}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.pos}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center font-bold">{player.war.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.pwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.bwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.rwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.fwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8]/50 text-center text-[8px]">
                          {player.pos === "SP" || player.pos === "RP"
                            ? (player.era != null ? `${player.era} ERA, ${player.k} K` : '—')
                            : (player.avg != null ? `${player.avg} AVG, ${player.hr} HR` : '—')
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {statsView === "spraychart" && (
            <div className="space-y-4">
              {/* Player Selection */}
              <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                <div className="text-[10px] text-[#E8E8D8]/70 mb-2">SELECT PLAYER</div>
                <select
                  value={selectedStatsPlayer}
                  onChange={(e) => setSelectedStatsPlayer(e.target.value)}
                  className="w-full bg-[#4A6844] text-[#E8E8D8] p-2 text-[10px] border-2 border-[#3F5A3A]"
                >
                  {statsData.map((player) => (
                    <option key={player.name} value={player.name}>
                      {player.name} ({player.pos})
                    </option>
                  ))}
                </select>
              </div>

              {/* Spray Chart Visualization */}
              <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
                <div 
                  className="text-[12px] text-[#E8E8D8] mb-4 text-center"
                  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                >
                  {selectedStatsPlayer} SPRAY CHART
                </div>
                
                {/* Simplified spray chart placeholder */}
                <div className="relative bg-[#4A6844] aspect-square max-w-md mx-auto rounded-full border-[5px] border-[#3F5A3A]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[10px] text-[#E8E8D8]/70 mb-2">HIT DISTRIBUTION</div>
                      <div className="grid grid-cols-3 gap-2 text-[8px]">
                        <div className="bg-[#5A8352] p-2">
                          <div className="text-[#E8E8D8]/70">LEFT</div>
                          <div className="text-[#E8E8D8] font-bold">32%</div>
                        </div>
                        <div className="bg-[#5A8352] p-2">
                          <div className="text-[#E8E8D8]/70">CENTER</div>
                          <div className="text-[#E8E8D8] font-bold">41%</div>
                        </div>
                        <div className="bg-[#5A8352] p-2">
                          <div className="text-[#E8E8D8]/70">RIGHT</div>
                          <div className="text-[#E8E8D8] font-bold">27%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Stats */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="bg-[#5A8352] p-3">
                    <div className="text-[8px] text-[#E8E8D8]/70">HARD HIT %</div>
                    <div className="text-[14px] text-[#E8E8D8] font-bold">42.3%</div>
                  </div>
                  <div className="bg-[#5A8352] p-3">
                    <div className="text-[8px] text-[#E8E8D8]/70">EXIT VELO AVG</div>
                    <div className="text-[14px] text-[#E8E8D8] font-bold">92.4 MPH</div>
                  </div>
                  <div className="bg-[#5A8352] p-3">
                    <div className="text-[8px] text-[#E8E8D8]/70">LAUNCH ANGLE</div>
                    <div className="text-[14px] text-[#E8E8D8] font-bold">18.2°</div>
                  </div>
                  <div className="bg-[#5A8352] p-3">
                    <div className="text-[8px] text-[#E8E8D8]/70">BARREL %</div>
                    <div className="text-[14px] text-[#E8E8D8] font-bold">11.8%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stadiums Tab */}
      {activeHubTab === "stadium" && (
        <div className="space-y-4">
          {/* Stadium Selection */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div className="text-[10px] text-[#E8E8D8]/70 mb-2">SELECT STADIUM</div>
            <select
              value={selectedStadium}
              onChange={(e) => setSelectedStadium(e.target.value)}
              className="w-full bg-[#4A6844] text-[#E8E8D8] p-2 text-[10px] border-2 border-[#3F5A3A]"
            >
              {stadiums.map((stadium) => (
                <option key={stadium} value={stadium}>
                  {stadium}
                </option>
              ))}
            </select>
          </div>

          {/* Empty state — park factors/records not yet tracked */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center">
              <Building2 className="w-8 h-8 text-[#E8E8D8]/30 mx-auto mb-4" />
              <div className="text-[12px] text-[#E8E8D8]/50 mb-2">{selectedStadium || 'STADIUM'}</div>
              <div className="text-[10px] text-[#E8E8D8]/40">
                Park factors and stadium records will be available after games are played.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Tab */}
      {activeHubTab === "manager" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
          <div className="text-center">
            <User className="w-8 h-8 text-[#E8E8D8]/30 mx-auto mb-4" />
            <div className="text-[12px] text-[#E8E8D8]/50 mb-2">MANAGER</div>
            <div className="text-[10px] text-[#E8E8D8]/40">
              Manager tracking is not yet available. mWAR, record, and job security will appear here once implemented.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}