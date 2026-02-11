import { useState, useMemo } from "react";
import { Trophy, TrendingUp, TrendingDown, Building2, Award, Zap } from "lucide-react";
import { useOffseasonData } from "../../hooks/useOffseasonData";
import { useMuseumData } from "../../hooks/useMuseumData";

type MuseumTab = "league-history" | "team" | "stadiums" | "hall-of-fame" | "records" | "moments";
type TeamSubTab = "season-standings" | "top-10" | "accolades" | "retired-jerseys";

export interface RetiredJersey {
  number: number;
  name: string;
  years: string;
  position: string;
  teamId: string;
  retiredYear: number;
}

interface MuseumContentProps {
  retiredJerseys?: RetiredJersey[];
}

// Empty fallback — populated from real data when available
const MOCK_TEAMS: string[] = [];

export function MuseumContent({ retiredJerseys: propRetiredJerseys = [] }: MuseumContentProps) {
  const [activeTab, setActiveTab] = useState<MuseumTab>("league-history");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [activeTeamSubTab, setActiveTeamSubTab] = useState<TeamSubTab>("season-standings");
  const [leagueHistoryView, setLeagueHistoryView] = useState<"champions" | "team-records" | "awards" | "leaders">("champions");
  const [sortColumn, setSortColumn] = useState<string>("war");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [stadiumSortColumn, setStadiumSortColumn] = useState<string>("name");
  const [stadiumSortDirection, setStadiumSortDirection] = useState<"asc" | "desc">("asc");
  const [recordCategory, setRecordCategory] = useState<"batting" | "pitching" | "fielding" | "team">("batting");

  // Wire to real data
  const {
    isLoading: offseasonLoading,
    teams: realTeams,
    hasRealData: hasOffseasonData,
  } = useOffseasonData();

  // Wire to museum data
  const {
    isLoading: museumLoading,
    championships: museumChampionships,
    teamRecords: museumTeamRecords,
    awardWinners: museumAwardWinners,
    allTimeLeaders: museumAllTimeLeaders,
    hallOfFamers: museumHallOfFamers,
    records: museumRecords,
    moments: museumMoments,
    retiredJerseys: museumRetiredJerseys,
    stadiums: museumStadiums,
    getRecordsByCategory,
    hasData: hasMuseumData,
  } = useMuseumData();

  const isLoading = offseasonLoading || museumLoading;

  // Get team names from real data or use mock
  const teams = useMemo((): string[] => {
    if (hasOffseasonData && realTeams.length > 0) {
      return realTeams.map((t) => t.name);
    }
    return MOCK_TEAMS;
  }, [realTeams, hasOffseasonData]);

  // Transform museum data to component format
  const champions = useMemo(() => {
    return museumChampionships.map((c) => ({
      year: c.year,
      champion: c.champion,
      runnerUp: c.runnerUp,
      series: c.series,
    }));
  }, [museumChampionships]);

  // Transform team records to component format
  const teamRecords = useMemo(() => {
    return museumTeamRecords.map((t) => ({
      team: t.teamName,
      wins: t.totalWins,
      losses: t.totalLosses,
      winPct: t.winPct,
      championships: t.championships,
      playoffApps: t.playoffAppearances,
    }));
  }, [museumTeamRecords]);

  // Group award winners by year for display
  const awardWinners = useMemo(() => {
    const byYear: Record<number, { mvp: string; cy: string; roy: string }> = {};

    museumAwardWinners.forEach((a) => {
      if (!byYear[a.year]) {
        byYear[a.year] = { mvp: "", cy: "", roy: "" };
      }
      const display = `${a.playerName} (${a.teamName})`;
      if (a.awardType === "MVP") byYear[a.year].mvp = display;
      if (a.awardType === "CY_YOUNG") byYear[a.year].cy = display;
      if (a.awardType === "ROY") byYear[a.year].roy = display;
    });

    return Object.entries(byYear)
      .map(([year, awards]) => ({ year: parseInt(year), ...awards }))
      .sort((a, b) => b.year - a.year);
  }, [museumAwardWinners]);

  // Transform all-time leaders to component format
  const allTimeLeaders = useMemo(() => {
    return museumAllTimeLeaders.map((l) => ({
      name: l.name,
      team: l.teamName,
      war: l.war,
      pwar: l.pwar,
      bwar: l.bwar,
      rwar: l.rwar,
      fwar: l.fwar,
      era: l.era,
      wins: l.wins,
      avg: l.avg,
      hr: l.hr,
    }));
  }, [museumAllTimeLeaders]);

  // Empty season standings — populated from real data when available
  const seasonStandings: { year: number; record: string; standing: string; playoffs: string }[] = [];

  // Empty team top 10 — populated from real data when available
  const teamTop10: { name: string; war: number; pwar: number; bwar: number; rwar: number; fwar: number; years: string }[] = [];

  // Empty team accolades — populated from real data when available
  const teamAccolades = {
    championships: [] as number[],
    mvps: [] as { player: string; year: number }[],
    cyYoungs: [] as { player: string; year: number }[],
    roys: [] as { player: string; year: number }[],
  };

  // Transform retired jerseys to component format
  const retiredJerseys = useMemo((): RetiredJersey[] => {
    return museumRetiredJerseys.map((j) => ({
      number: j.number,
      name: j.playerName,
      years: j.years,
      position: j.position,
      teamId: j.teamId,
      retiredYear: j.retiredYear,
    }));
  }, [museumRetiredJerseys]);

  // Transform stadiums to component format
  const stadiumsData = useMemo(() => {
    return museumStadiums.map((s) => ({
      name: s.name,
      opened: s.opened,
      capacity: s.capacity,
      overall: s.overall,
      hr: s.hr,
      doubles: s.doubles,
      triples: s.triples,
    }));
  }, [museumStadiums]);

  // Transform hall of fame to component format
  const hallOfFame = useMemo(() => {
    return museumHallOfFamers.map((h) => ({
      number: h.jerseyNumber,
      name: h.name,
      team: h.teamName,
      position: h.position,
      inducted: h.inductedYear,
    }));
  }, [museumHallOfFamers]);

  // Transform records to component format (grouped by category)
  const recordsData = useMemo(() => {
    const transformRecords = (category: 'batting' | 'pitching' | 'fielding' | 'team') => {
      return getRecordsByCategory(category).map((r) => ({
        record: r.recordName,
        player: r.playerName,
        team: r.teamName,
        year: r.year,
        value: r.value,
      }));
    };

    return {
      batting: transformRecords('batting'),
      pitching: transformRecords('pitching'),
      fielding: transformRecords('fielding'),
      team: transformRecords('team'),
    };
  }, [getRecordsByCategory]);

  // Transform moments to component format
  const moments = useMemo(() => {
    return museumMoments.map((m) => ({
      date: m.date,
      title: m.title,
      reporter: m.reporter || "Staff Reporter",
      text: m.description,
    }));
  }, [museumMoments]);

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleStadiumSort = (column: string) => {
    if (stadiumSortColumn === column) {
      setStadiumSortDirection(stadiumSortDirection === "asc" ? "desc" : "asc");
    } else {
      setStadiumSortColumn(column);
      setStadiumSortDirection("asc");
    }
  };

  const getSortedLeaders = () => {
    const sorted = [...allTimeLeaders].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const getSortedStadiums = () => {
    const sorted = [...stadiumsData].sort((a, b) => {
      let aVal: any = a[stadiumSortColumn as keyof typeof a];
      let bVal: any = b[stadiumSortColumn as keyof typeof b];

      if (aVal < bVal) return stadiumSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return stadiumSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-12 text-center">
        <div className="text-lg text-[#E8E8D8] mb-2">Loading Museum...</div>
        <div className="text-sm text-[#E8E8D8]/60">Fetching historical data</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Museum Tabs */}
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] overflow-x-auto">
        <div className="flex">
          {[
            { id: "league-history", label: "LEAGUE HISTORY" },
            { id: "team", label: "TEAM" },
            { id: "stadiums", label: "STADIUMS" },
            { id: "hall-of-fame", label: "HALL OF FAME" },
            { id: "records", label: "RECORDS" },
            { id: "moments", label: "MOMENTS" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MuseumTab)}
              className={`flex-1 px-3 py-2 text-[9px] whitespace-nowrap transition border-r-2 border-[#4A6844] last:border-r-0 ${
                activeTab === tab.id
                  ? "bg-[#4A6844] text-[#E8E8D8]"
                  : "text-[#E8E8D8]/60 hover:bg-[#5A8352]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* League History Tab */}
      {activeTab === "league-history" && (
        <div className="space-y-4">
          {/* View Selection */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => setLeagueHistoryView("champions")}
                className={`py-2 px-3 text-[9px] transition ${
                  leagueHistoryView === "champions"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                CHAMPIONS
              </button>
              <button
                onClick={() => setLeagueHistoryView("team-records")}
                className={`py-2 px-3 text-[9px] transition ${
                  leagueHistoryView === "team-records"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                TEAM RECORDS
              </button>
              <button
                onClick={() => setLeagueHistoryView("awards")}
                className={`py-2 px-3 text-[9px] transition ${
                  leagueHistoryView === "awards"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                AWARDS
              </button>
              <button
                onClick={() => setLeagueHistoryView("leaders")}
                className={`py-2 px-3 text-[9px] transition ${
                  leagueHistoryView === "leaders"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                ALL-TIME LEADERS
              </button>
            </div>
          </div>

          {/* Champions View */}
          {leagueHistoryView === "champions" && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
              <div
                className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                CHAMPIONSHIP HISTORY
              </div>
              <div className="space-y-2">
                {champions.map((champ, idx) => (
                  <div key={idx} className="bg-[#5A8352] p-3 flex items-center gap-4">
                    <Trophy className="w-6 h-6 text-[#FFD700]" />
                    <div className="flex-1">
                      <div className="text-[11px] text-[#E8E8D8] font-bold">{champ.year}</div>
                      <div className="text-[9px] text-[#E8E8D8]/80 mt-1">
                        {champ.champion} defeated {champ.runnerUp}, {champ.series}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Records View */}
          {leagueHistoryView === "team-records" && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
              <div
                className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                ALL-TIME TEAM RECORDS
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b-2 border-[#4A6844]">
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70">TEAM</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">WINS</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">LOSSES</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">WIN %</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">TITLES</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70">PLAYOFF APPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRecords.map((team, idx) => (
                      <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? "bg-[#5A8352]/20" : ""}`}>
                        <td className="py-2 px-2 text-[#E8E8D8] font-bold">{team.team}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{team.wins}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{team.losses}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{team.winPct.toFixed(3)}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={team.championships > 0 ? "text-[#FFD700] font-bold" : "text-[#E8E8D8]"}>
                            {team.championships}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{team.playoffApps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Awards View */}
          {leagueHistoryView === "awards" && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
              <div
                className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                MAJOR AWARD WINNERS
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b-2 border-[#4A6844]">
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70">YEAR</th>
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70">MVP</th>
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70">CY YOUNG</th>
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70">ROOKIE OF YEAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awardWinners.map((year, idx) => (
                      <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? "bg-[#5A8352]/20" : ""}`}>
                        <td className="py-2 px-2 text-[#E8E8D8] font-bold">{year.year}</td>
                        <td className="py-2 px-2 text-[#E8E8D8]">{year.mvp}</td>
                        <td className="py-2 px-2 text-[#E8E8D8]">{year.cy}</td>
                        <td className="py-2 px-2 text-[#E8E8D8]">{year.roy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All-Time Leaders View */}
          {leagueHistoryView === "leaders" && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
              <div
                className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                ALL-TIME STATISTICAL LEADERS
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b-2 border-[#4A6844]">
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70">NAME</th>
                      <th className="text-left py-2 px-2 text-[#E8E8D8]/70">TEAM</th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleSort("war")}>
                        WAR {sortColumn === "war" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleSort("pwar")}>
                        pWAR {sortColumn === "pwar" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleSort("bwar")}>
                        bWAR {sortColumn === "bwar" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleSort("rwar")}>
                        rWAR {sortColumn === "rwar" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleSort("fwar")}>
                        fWAR {sortColumn === "fwar" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedLeaders().map((player, idx) => (
                      <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? "bg-[#5A8352]/20" : ""}`}>
                        <td className="py-2 px-2 text-[#E8E8D8]">{player.name}</td>
                        <td className="py-2 px-2 text-[#E8E8D8]">{player.team}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center font-bold">{player.war.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.pwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.bwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.rwar.toFixed(1)}</td>
                        <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.fwar.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-4">
          {/* Team Selection */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div className="text-[10px] text-[#E8E8D8]/70 mb-2">SELECT TEAM</div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-[#4A6844] text-[#E8E8D8] p-2 text-[10px] border-2 border-[#3F5A3A]"
            >
              <option value="">-- Choose a team --</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Team Sub-Tabs (only show if team selected) */}
          {selectedTeam && (
            <>
              <div className="bg-[#6B9462] border-[5px] border-[#4A6844]">
                <div className="grid grid-cols-2 md:grid-cols-4">
                  {[
                    { id: "season-standings", label: "SEASON STANDINGS" },
                    { id: "top-10", label: "TOP 10" },
                    { id: "accolades", label: "ACCOLADES" },
                    { id: "retired-jerseys", label: "RETIRED JERSEYS" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTeamSubTab(tab.id as TeamSubTab)}
                      className={`px-3 py-2 text-[9px] whitespace-nowrap transition border-r-2 border-[#4A6844] last:border-r-0 ${
                        activeTeamSubTab === tab.id
                          ? "bg-[#4A6844] text-[#E8E8D8]"
                          : "text-[#E8E8D8]/60 hover:bg-[#5A8352]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season Standings Sub-Tab */}
              {activeTeamSubTab === "season-standings" && (
                <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                  <div
                    className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                  >
                    {selectedTeam.toUpperCase()} SEASON BY SEASON
                  </div>
                  <div className="space-y-2">
                    {seasonStandings.map((season, idx) => (
                      <div key={idx} className="bg-[#5A8352] p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[11px] text-[#E8E8D8] font-bold">{season.year}</div>
                            <div className="text-[9px] text-[#E8E8D8]/80 mt-1">
                              {season.record} • {season.standing}
                            </div>
                          </div>
                          <div className={`text-[9px] font-bold ${
                            season.playoffs.includes("Champions") ? "text-[#FFD700]" :
                            season.playoffs.includes("Series") ? "text-[#0066FF]" :
                            season.playoffs.includes("Wild") ? "text-[#5599FF]" :
                            "text-[#E8E8D8]/60"
                          }`}>
                            {season.playoffs}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top 10 Sub-Tab */}
              {activeTeamSubTab === "top-10" && (
                <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                  <div
                    className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                  >
                    {selectedTeam.toUpperCase()} ALL-TIME TOP 10
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="border-b-2 border-[#4A6844]">
                          <th className="text-left py-2 px-2 text-[#E8E8D8]/70">NAME</th>
                          <th className="text-center py-2 px-2 text-[#E8E8D8]/70">YEARS</th>
                          <th className="text-center py-2 px-2 text-[#E8E8D8]/70">WAR</th>
                          <th className="text-center py-2 px-2 text-[#E8E8D8]/70">pWAR</th>
                          <th className="text-center py-2 px-2 text-[#E8E8D8]/70">bWAR</th>
                          <th className="text-center py-2 px-2 text-[#E8E8D8]/70">rWAR</th>
                          <th className="text-center py-2 px-2 text-[#E8E8D8]/70">fWAR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamTop10.map((player, idx) => (
                          <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? "bg-[#5A8352]/20" : ""}`}>
                            <td className="py-2 px-2 text-[#E8E8D8]">{player.name}</td>
                            <td className="py-2 px-2 text-[#E8E8D8]/70 text-center text-[8px]">{player.years}</td>
                            <td className="py-2 px-2 text-[#E8E8D8] text-center font-bold">{player.war.toFixed(1)}</td>
                            <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.pwar.toFixed(1)}</td>
                            <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.bwar.toFixed(1)}</td>
                            <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.rwar.toFixed(1)}</td>
                            <td className="py-2 px-2 text-[#E8E8D8] text-center">{player.fwar.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Accolades Sub-Tab */}
              {activeTeamSubTab === "accolades" && (
                <div className="space-y-4">
                  <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                    <div
                      className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      CHAMPIONSHIPS
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {teamAccolades.championships.map((year, idx) => (
                        <div key={idx} className="bg-[#5A8352] p-4 text-center min-w-[80px]">
                          <Trophy className="w-8 h-8 text-[#FFD700] mx-auto mb-2" />
                          <div className="text-[14px] text-[#E8E8D8] font-bold">{year}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                    <div
                      className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      MVP AWARDS
                    </div>
                    <div className="space-y-2">
                      {teamAccolades.mvps.map((award, idx) => (
                        <div key={idx} className="bg-[#5A8352] p-3 flex items-center gap-3">
                          <Award className="w-5 h-5 text-[#FFD700]" />
                          <div className="text-[10px] text-[#E8E8D8]">
                            <span className="font-bold">{award.player}</span> • {award.year}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                    <div
                      className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
                      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      CY YOUNG AWARDS
                    </div>
                    <div className="space-y-2">
                      {teamAccolades.cyYoungs.map((award, idx) => (
                        <div key={idx} className="bg-[#5A8352] p-3 flex items-center gap-3">
                          <Award className="w-5 h-5 text-[#0066FF]" />
                          <div className="text-[10px] text-[#E8E8D8]">
                            <span className="font-bold">{award.player}</span> • {award.year}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                    <div
                      className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-[#4A6844]"
                      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      ROOKIE OF THE YEAR
                    </div>
                    <div className="space-y-2">
                      {teamAccolades.roys.map((award, idx) => (
                        <div key={idx} className="bg-[#5A8352] p-3 flex items-center gap-3">
                          <Award className="w-5 h-5 text-[#5599FF]" />
                          <div className="text-[10px] text-[#E8E8D8]">
                            <span className="font-bold">{award.player}</span> • {award.year}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Retired Jerseys Sub-Tab */}
              {activeTeamSubTab === "retired-jerseys" && (
                <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
                  <div
                    className="text-[12px] text-[#E8E8D8] mb-4 pb-2 border-b-2 border-[#4A6844]"
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                  >
                    RETIRED JERSEYS
                  </div>
                  {[...retiredJerseys, ...propRetiredJerseys].filter(jersey => jersey.teamId.toLowerCase() === selectedTeam.toLowerCase()).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[...retiredJerseys, ...propRetiredJerseys].filter(jersey => jersey.teamId.toLowerCase() === selectedTeam.toLowerCase()).map((jersey, idx) => (
                        <div key={idx} className="bg-[#5A8352] p-6 text-center border-[3px] border-[#4A6844]">
                          <div className="text-[48px] text-[#E8E8D8] font-bold mb-2" style={{ textShadow: "3px 3px 6px rgba(0,0,0,0.8)" }}>
                            {jersey.number}
                          </div>
                          <div className="text-[11px] text-[#E8E8D8] font-bold">{jersey.name}</div>
                          <div className="text-[8px] text-[#E8E8D8]/70 mt-1">{jersey.position} • {jersey.years}</div>
                          <div className="text-[8px] text-[#FFD700] mt-2">Retired {jersey.retiredYear}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[#E8E8D8]/60 text-[10px]">
                      No retired jerseys for this team
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedTeam && (
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-12 text-center">
              <div className="text-[10px] text-[#E8E8D8]/60">Select a team above to view historical data</div>
            </div>
          )}
        </div>
      )}

      {/* Stadiums Tab */}
      {activeTab === "stadiums" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
          <div
            className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
          >
            STADIUM COMPARISON
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="border-b-2 border-[#4A6844]">
                  <th className="text-left py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStadiumSort("name")}>
                    STADIUM {stadiumSortColumn === "name" && (stadiumSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStadiumSort("opened")}>
                    OPENED {stadiumSortColumn === "opened" && (stadiumSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStadiumSort("capacity")}>
                    CAPACITY {stadiumSortColumn === "capacity" && (stadiumSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStadiumSort("overall")}>
                    OVERALL {stadiumSortColumn === "overall" && (stadiumSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStadiumSort("hr")}>
                    HR {stadiumSortColumn === "hr" && (stadiumSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStadiumSort("doubles")}>
                    2B {stadiumSortColumn === "doubles" && (stadiumSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-center py-2 px-2 text-[#E8E8D8]/70 cursor-pointer hover:text-[#E8E8D8]" onClick={() => handleStadiumSort("triples")}>
                    3B {stadiumSortColumn === "triples" && (stadiumSortDirection === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedStadiums().map((stadium, idx) => (
                  <tr key={idx} className={`border-b border-[#4A6844]/30 ${idx % 2 === 0 ? "bg-[#5A8352]/20" : ""}`}>
                    <td className="py-2 px-2 text-[#E8E8D8] font-bold">{stadium.name}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{stadium.opened}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{stadium.capacity.toLocaleString()}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{stadium.overall}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{stadium.hr}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{stadium.doubles}</td>
                    <td className="py-2 px-2 text-[#E8E8D8] text-center">{stadium.triples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hall of Fame Tab */}
      {activeTab === "hall-of-fame" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
          <div
            className="text-[12px] text-[#E8E8D8] mb-4 pb-2 border-b-2 border-[#4A6844]"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
          >
            HALL OF FAME
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hallOfFame.map((member, idx) => (
              <div key={idx} className="bg-[#5A8352] p-6 text-center border-[3px] border-[#FFD700]">
                <Trophy className="w-8 h-8 text-[#FFD700] mx-auto mb-3" />
                <div className="text-[36px] text-[#E8E8D8] font-bold mb-2" style={{ textShadow: "3px 3px 6px rgba(0,0,0,0.8)" }}>
                  {member.number}
                </div>
                <div className="text-[11px] text-[#E8E8D8] font-bold">{member.name}</div>
                <div className="text-[8px] text-[#E8E8D8]/70 mt-1">{member.team} • {member.position}</div>
                <div className="text-[8px] text-[#FFD700] mt-2">Inducted {member.inducted}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === "records" && (
        <div className="space-y-4">
          {/* Record Category Selection */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => setRecordCategory("batting")}
                className={`py-2 px-3 text-[9px] transition ${
                  recordCategory === "batting"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                BATTING
              </button>
              <button
                onClick={() => setRecordCategory("pitching")}
                className={`py-2 px-3 text-[9px] transition ${
                  recordCategory === "pitching"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                PITCHING
              </button>
              <button
                onClick={() => setRecordCategory("fielding")}
                className={`py-2 px-3 text-[9px] transition ${
                  recordCategory === "fielding"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                FIELDING
              </button>
              <button
                onClick={() => setRecordCategory("team")}
                className={`py-2 px-3 text-[9px] transition ${
                  recordCategory === "team"
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
                }`}
              >
                TEAM
              </button>
            </div>
          </div>

          {/* Records List */}
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
            <div
              className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            >
              {recordCategory.toUpperCase()} RECORDS
            </div>
            <div className="space-y-2">
              {recordsData[recordCategory].map((record, idx) => (
                <div key={idx} className="bg-[#5A8352] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] text-[#E8E8D8] font-bold mb-1">{record.record}</div>
                      <div className="text-[8px] text-[#E8E8D8]/70">
                        {record.player} • {record.team} • {record.year}
                      </div>
                    </div>
                    <div className="text-[14px] text-[#FFD700] font-bold">{record.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Moments Tab */}
      {activeTab === "moments" && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
          <div
            className="text-[12px] text-[#E8E8D8] mb-4 pb-2 border-b-2 border-[#4A6844]"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
          >
            LEGENDARY MOMENTS
          </div>
          <div className="space-y-4">
            {moments.map((moment, idx) => (
              <div key={idx} className="bg-[#5A8352] p-4 border-l-4 border-[#FFD700]">
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-[#FFD700] flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="text-[8px] text-[#E8E8D8]/70 mb-1">{moment.date}</div>
                    <div className="text-[11px] text-[#E8E8D8] font-bold mb-2">{moment.title}</div>
                    <div className="text-[9px] text-[#E8E8D8] italic mb-2">"{moment.text}"</div>
                    <div className="text-[8px] text-[#E8E8D8]/70">— {moment.reporter}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}