import { useState, useMemo } from "react";
import { Edit, TrendingUp, TrendingDown, XCircle, Users, Building2, User } from "lucide-react";
import { useOffseasonData, type OffseasonTeam, type OffseasonPlayer } from "@/hooks/useOffseasonData";
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../../hooks/useSeasonStats';

type TeamHubTab = "team" | "fan-morale" | "roster" | "stats" | "stadium" | "manager";

// Empty fallbacks — populated from real data when available
const MOCK_TEAMS: string[] = [];
const MOCK_STADIUMS: string[] = [];

const MOCK_ROSTER_DATA: { name: string; position: string; grade: string; morale: number; contract: string; trueValue: string; netDiff: string; fitness: number }[] = [];

const MOCK_STATS_DATA: { name: string; pos: string; war: number; pwar: number; bwar: number; rwar: number; fwar: number; era?: number; ip?: number; k?: number; w?: number; l?: number; sv?: number; avg?: number; hr?: number; rbi?: number; sb?: number; ops?: number }[] = [];

// Helper to convert OffseasonPlayer to roster format
function convertToRosterItem(player: OffseasonPlayer) {
  const salary = player.salary || 1000000;
  const trueValue = salary * (0.8 + Math.random() * 0.4); // Random true value within 20% of contract
  const diff = trueValue - salary;
  const diffStr = diff >= 0 ? `+$${(diff / 1000000).toFixed(1)}M` : `-$${(Math.abs(diff) / 1000000).toFixed(1)}M`;

  return {
    name: player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' '),
    position: player.position,
    grade: player.grade,
    morale: 70 + Math.floor(Math.random() * 25),
    contract: `$${(salary / 1000000).toFixed(1)}M`,
    trueValue: `$${(trueValue / 1000000).toFixed(1)}M`,
    netDiff: diffStr,
    fitness: 85 + Math.floor(Math.random() * 13),
  };
}

// Helper to convert OffseasonPlayer to stats format
function convertToStatsItem(player: OffseasonPlayer) {
  const isPitcher = ['SP', 'RP', 'CP'].includes(player.position);
  const baseWar = 1.0 + Math.random() * 7;

  if (isPitcher) {
    return {
      name: player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' '),
      pos: player.position,
      war: parseFloat(baseWar.toFixed(1)),
      pwar: parseFloat(baseWar.toFixed(1)),
      bwar: 0.0,
      rwar: 0.0,
      fwar: 0.0,
      era: parseFloat((2.5 + Math.random() * 2.5).toFixed(2)),
      ip: parseFloat((60 + Math.random() * 140).toFixed(1)),
      k: Math.floor(80 + Math.random() * 160),
      w: Math.floor(5 + Math.random() * 12),
      l: Math.floor(2 + Math.random() * 10),
    };
  } else {
    return {
      name: player.name.split(' ').map((n, i) => i === 0 ? n[0] + '.' : n).join(' '),
      pos: player.position,
      war: parseFloat(baseWar.toFixed(1)),
      pwar: 0.0,
      bwar: parseFloat((baseWar * 0.7).toFixed(1)),
      rwar: parseFloat((baseWar * 0.15).toFixed(1)),
      fwar: parseFloat((baseWar * 0.15).toFixed(1)),
      avg: parseFloat((0.220 + Math.random() * 0.100).toFixed(3)),
      hr: Math.floor(5 + Math.random() * 35),
      rbi: Math.floor(30 + Math.random() * 80),
      sb: Math.floor(Math.random() * 30),
      ops: parseFloat((0.650 + Math.random() * 0.350).toFixed(3)),
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
  const [selectedTeam, setSelectedTeam] = useState<string>("Tigers");
  const [selectedStadium, setSelectedStadium] = useState<string>("Tiger Stadium");
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<string>("J. Rodriguez");
  const [statsView, setStatsView] = useState<"table" | "spraychart">("table");
  const [rosterSortColumn, setRosterSortColumn] = useState<string>("name");
  const [rosterSortDirection, setRosterSortDirection] = useState<"asc" | "desc">("asc");
  const [statsSortColumn, setStatsSortColumn] = useState<string>("war");
  const [statsSortDirection, setStatsSortDirection] = useState<"asc" | "desc">("desc");

  // Convert real data to local formats with mock fallback
  const teams = useMemo(() => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams.slice(0, 10).map(t => t.name);
    }
    return MOCK_TEAMS;
  }, [realTeams, hasRealData]);

  const stadiums = useMemo(() => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams.slice(0, 10).map(t => `${t.name} Stadium`);
    }
    return MOCK_STADIUMS;
  }, [realTeams, hasRealData]);

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
    return MOCK_ROSTER_DATA;
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
    return MOCK_STATS_DATA;
  }, [realPlayers, realTeams, selectedTeam, hasRealData, battingByPlayer, pitchingByPlayer]);

  // Mock fan morale data (no real data equivalent yet)
  const fanMorale = {
    netMorale: 78,
    changes: [
      { date: "Week 14 • Game 3", change: +5, reason: "Walk-off home run by J. Rodriguez", type: "positive" },
      { date: "Week 14 • Game 2", change: -3, reason: "Blown save in 9th inning", type: "negative" },
      { date: "Week 14 • Game 1", change: +8, reason: "Dominant pitching performance", type: "positive" },
      { date: "Week 13 • Game 5", change: +4, reason: "Three-game winning streak", type: "positive" },
      { date: "Week 13 • Game 2", change: -6, reason: "Shutout loss to division rival", type: "negative" },
    ],
    beatReports: [
      { reporter: "Sarah Jenkins", text: "The city is buzzing after Rodriguez's heroics. Ticket sales are up 15% for next week's homestand." },
      { reporter: "Mike Patterson", text: "Despite the bullpen struggles, fans remain optimistic about the team's playoff chances." },
      { reporter: "Elena Rodriguez", text: "The front office reports record merchandise sales following the recent winning streak." },
    ]
  };

  // Mock stadium data
  const stadiumData = {
    name: selectedStadium,
    parkFactors: {
      overall: 102,
      leftField: 98,
      centerField: 105,
      rightField: 101,
      doubles: 104,
      triples: 98,
      homeRuns: 106,
    },
    records: {
      attendance: "54,234 (Week 8 vs Sox)",
      mostRuns: "Tigers 15 - Bears 3 (Week 5)",
      longestGame: "14 innings (Week 11 vs Crocs)",
      noHitters: 3,
    },
    notableMoments: [
      { reporter: "Tom Anderson", text: "Rodriguez's perfect game in Week 3 will be remembered forever at this ballpark." },
      { reporter: "Lisa Chen", text: "The atmosphere during last week's playoff-implications game was electric - loudest crowd of the season." },
    ]
  };

  // Mock manager data
  const managerData = {
    name: "Frank Sullivan",
    mwar: 4.2,
    record: "56-34",
    winPct: 0.622,
    jobSecurity: 87,
    yearsWithTeam: 3,
    championships: 1,
  };

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
                onClick={() => setSelectedTeam(team)}
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
        <div className="space-y-4">
          {/* Net Morale */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
            <div className="text-center">
              <div className="text-[10px] text-[#E8E8D8]/70 mb-2">NET FAN MORALE</div>
              <div 
                className="text-[32px] text-[#E8E8D8] font-bold"
                style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}
              >
                {fanMorale.netMorale}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60 mt-1">
                {fanMorale.netMorale >= 80 ? "EXCELLENT" : fanMorale.netMorale >= 60 ? "GOOD" : fanMorale.netMorale >= 40 ? "AVERAGE" : "POOR"}
              </div>
            </div>
          </div>

          {/* Morale Changes */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div 
              className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              RECENT MORALE CHANGES
            </div>
            <div className="space-y-2">
              {fanMorale.changes.map((change, idx) => (
                <div key={idx} className="bg-[#5A8352] p-3 border-l-4" style={{
                  borderLeftColor: change.type === "positive" ? "#00DD00" : "#DD0000"
                }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-[8px] text-[#E8E8D8]/70 mb-1">{change.date}</div>
                      <div className="text-[10px] text-[#E8E8D8]">{change.reason}</div>
                    </div>
                    <div className={`text-[14px] font-bold ${
                      change.type === "positive" ? "text-[#00DD00]" : "text-[#DD0000]"
                    }`}>
                      {change.change > 0 ? "+" : ""}{change.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Beat Reporter Comments */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div 
              className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              BEAT REPORTERS ON FAN MORALE
            </div>
            <div className="space-y-3">
              {fanMorale.beatReports.map((report, idx) => (
                <div key={idx} className="bg-[#5A8352] p-3">
                  <div className="text-[8px] text-[#E8E8D8]/70 mb-1">— {report.reporter}</div>
                  <div className="text-[10px] text-[#E8E8D8] italic">"{report.text}"</div>
                </div>
              ))}
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
                      <span className={player.morale >= 85 ? "text-[#00DD00]" : player.morale >= 70 ? "text-[#E8E8D8]" : "text-[#DD0000]"}>
                        {player.morale}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.contract}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.trueValue}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={player.netDiff.startsWith("+") ? "text-[#00DD00]" : "text-[#DD0000]"}>
                        {player.netDiff}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={player.fitness >= 90 ? "text-[#00DD00]" : player.fitness >= 80 ? "text-[#E8E8D8]" : "text-[#DD0000]"}>
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
                        <td className="py-2 px-2 text-[#E8E8D8] text-center text-[8px]">
                          {player.pos === "SP" || player.pos === "RP" 
                            ? `${player.era} ERA, ${player.k} K`
                            : `${player.avg} AVG, ${player.hr} HR`
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

          {/* Park Factors */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div 
              className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              PARK FACTORS
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">OVERALL</div>
                <div className={`text-[16px] font-bold ${
                  stadiumData.parkFactors.overall > 100 ? "text-[#DD0000]" : "text-[#0066FF]"
                }`}>
                  {stadiumData.parkFactors.overall}
                </div>
              </div>
              <div className="bg-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">LEFT FIELD</div>
                <div className="text-[16px] text-[#E8E8D8] font-bold">{stadiumData.parkFactors.leftField}</div>
              </div>
              <div className="bg-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">CENTER</div>
                <div className="text-[16px] text-[#E8E8D8] font-bold">{stadiumData.parkFactors.centerField}</div>
              </div>
              <div className="bg-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">RIGHT FIELD</div>
                <div className="text-[16px] text-[#E8E8D8] font-bold">{stadiumData.parkFactors.rightField}</div>
              </div>
              <div className="bg-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">DOUBLES</div>
                <div className="text-[16px] text-[#E8E8D8] font-bold">{stadiumData.parkFactors.doubles}</div>
              </div>
              <div className="bg-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">TRIPLES</div>
                <div className="text-[16px] text-[#E8E8D8] font-bold">{stadiumData.parkFactors.triples}</div>
              </div>
              <div className="bg-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">HOME RUNS</div>
                <div className="text-[16px] text-[#E8E8D8] font-bold">{stadiumData.parkFactors.homeRuns}</div>
              </div>
            </div>
          </div>

          {/* Stadium Records */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div 
              className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              STADIUM RECORDS
            </div>
            <div className="space-y-2">
              <div className="bg-[#5A8352] p-3">
                <div className="text-[8px] text-[#E8E8D8]/70">HIGHEST ATTENDANCE</div>
                <div className="text-[10px] text-[#E8E8D8]">{stadiumData.records.attendance}</div>
              </div>
              <div className="bg-[#5A8352] p-3">
                <div className="text-[8px] text-[#E8E8D8]/70">HIGHEST SCORING GAME</div>
                <div className="text-[10px] text-[#E8E8D8]">{stadiumData.records.mostRuns}</div>
              </div>
              <div className="bg-[#5A8352] p-3">
                <div className="text-[8px] text-[#E8E8D8]/70">LONGEST GAME</div>
                <div className="text-[10px] text-[#E8E8D8]">{stadiumData.records.longestGame}</div>
              </div>
              <div className="bg-[#5A8352] p-3">
                <div className="text-[8px] text-[#E8E8D8]/70">NO-HITTERS</div>
                <div className="text-[10px] text-[#E8E8D8]">{stadiumData.records.noHitters} career</div>
              </div>
            </div>
          </div>

          {/* Notable Moments */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div 
              className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              NOTABLE MOMENTS
            </div>
            <div className="space-y-3">
              {stadiumData.notableMoments.map((moment, idx) => (
                <div key={idx} className="bg-[#5A8352] p-3">
                  <div className="text-[8px] text-[#E8E8D8]/70 mb-1">— {moment.reporter}</div>
                  <div className="text-[10px] text-[#E8E8D8] italic">"{moment.text}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manager Tab */}
      {activeHubTab === "manager" && (
        <div className="space-y-4">
          {/* Manager Overview */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
            <div className="text-center mb-4">
              <div 
                className="text-[18px] text-[#E8E8D8] mb-1"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {managerData.name}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/70">HEAD COACH</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
              <div className="bg-[#5A8352] p-4 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">mWAR</div>
                <div className="text-[18px] text-[#E8E8D8] font-bold">{managerData.mwar.toFixed(1)}</div>
              </div>
              <div className="bg-[#5A8352] p-4 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">RECORD</div>
                <div className="text-[18px] text-[#E8E8D8] font-bold">{managerData.record}</div>
              </div>
              <div className="bg-[#5A8352] p-4 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">WIN %</div>
                <div className="text-[18px] text-[#E8E8D8] font-bold">{(managerData.winPct * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-[#5A8352] p-4 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">YEARS w/ TEAM</div>
                <div className="text-[18px] text-[#E8E8D8] font-bold">{managerData.yearsWithTeam}</div>
              </div>
              <div className="bg-[#5A8352] p-4 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">CHAMPIONSHIPS</div>
                <div className="text-[18px] text-[#E8E8D8] font-bold">{managerData.championships}</div>
              </div>
              <div className="bg-[#5A8352] p-4 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-1">JOB SECURITY</div>
                <div className={`text-[18px] font-bold ${
                  managerData.jobSecurity >= 80 ? "text-[#00DD00]" : 
                  managerData.jobSecurity >= 60 ? "text-[#E8E8D8]" : 
                  "text-[#DD0000]"
                }`}>
                  {managerData.jobSecurity}
                </div>
              </div>
            </div>
          </div>

          {/* Job Security Meter */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div 
              className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              JOB SECURITY STATUS
            </div>
            <div className="bg-[#4A6844] h-8 rounded overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  managerData.jobSecurity >= 80 ? "bg-[#00DD00]" : 
                  managerData.jobSecurity >= 60 ? "bg-[#0066FF]" : 
                  "bg-[#DD0000]"
                }`}
                style={{ width: `${managerData.jobSecurity}%` }}
              >
                <div className="h-full flex items-center justify-center text-[10px] text-white font-bold">
                  {managerData.jobSecurity >= 80 ? "SECURE" : 
                   managerData.jobSecurity >= 60 ? "STABLE" : 
                   managerData.jobSecurity >= 40 ? "WARM SEAT" : "HOT SEAT"}
                </div>
              </div>
            </div>
          </div>

          {/* Fire Manager Button */}
          <div className="bg-[#6B9462] border-[5px] border-[#DD0000] p-6">
            <div className="text-center">
              <div className="text-[10px] text-[#E8E8D8]/70 mb-3">MANAGEMENT ACTION</div>
              <button 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to fire ${managerData.name}? This action cannot be undone.`)) {
                    // Fire manager logic would go here
                    alert("Manager has been fired.");
                  }
                }}
                className="bg-[#DD0000] hover:bg-[#BB0000] text-white px-6 py-3 text-[11px] font-bold border-[3px] border-[#990000] transition active:scale-95"
              >
                <div className="flex items-center gap-2 justify-center">
                  <XCircle className="w-4 h-4" />
                  FIRE MANAGER
                </div>
              </button>
              <div className="text-[8px] text-[#DD0000] mt-2">⚠️ This action cannot be undone</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}