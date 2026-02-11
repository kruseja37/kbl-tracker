/**
 * SeasonSummary — Full-page season end summary view
 *
 * Displays after regular season is complete:
 * 1. Final standings by division/conference
 * 2. League leaders (batting, pitching, WAR)
 * 3. Awards (MVP, Cy Young, Gold Glove per position)
 * 4. User's team summary
 * 5. "START PLAYOFFS" button
 *
 * Route: /franchise/:franchiseId/season-summary
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { Trophy, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from "../../../hooks/useSeasonStats";
import { useFranchiseData } from "@/hooks/useFranchiseData";
import { useScheduleData } from "@/hooks/useScheduleData";
import { usePlayoffData } from "@/hooks/usePlayoffData";
import type { LeagueStandings, StandingEntry } from "@/hooks/useFranchiseData";

// ============================================
// TYPES
// ============================================

interface AwardWinner {
  playerName: string;
  teamId: string;
  value: string;        // Formatted stat value
  statLabel: string;    // e.g., "4.2 WAR"
}

interface GoldGloveWinner {
  position: string;
  playerName: string;
  teamId: string;
  fWAR: number;
}

// ============================================
// COMPONENT
// ============================================

export function SeasonSummary() {
  const navigate = useNavigate();
  const { franchiseId } = useParams<{ franchiseId: string }>();

  // Load season from localStorage (same as FranchiseHome)
  const currentSeason = (() => {
    const stored = localStorage.getItem('kbl-current-season');
    return stored ? parseInt(stored, 10) : 1;
  })();

  const seasonId = `season-${currentSeason}`;

  // Data hooks
  const franchiseData = useFranchiseData(franchiseId);
  const scheduleData = useScheduleData(currentSeason);
  const seasonStats = useSeasonStats(seasonId);
  const playoffData = usePlayoffData(currentSeason);

  // Expandable sections
  const [expandedSection, setExpandedSection] = useState<string | null>("standings");

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // ============================================
  // DERIVE LEADERS (top 5)
  // ============================================

  const battingLeaders = useMemo(() => {
    if (seasonStats.isLoading) return null;
    return {
      AVG: seasonStats.getBattingLeaders('avg', 5),
      HR: seasonStats.getBattingLeaders('hr', 5),
      RBI: seasonStats.getBattingLeaders('rbi', 5),
      OBP: seasonStats.getBattingLeaders('obp', 5),
      SLG: seasonStats.getBattingLeaders('slg', 5),
    };
  }, [seasonStats.isLoading, seasonStats.getBattingLeaders]);

  const pitchingLeaders = useMemo(() => {
    if (seasonStats.isLoading) return null;
    return {
      W: seasonStats.getPitchingLeaders('wins', 5),
      ERA: seasonStats.getPitchingLeaders('era', 5),
      K: seasonStats.getPitchingLeaders('strikeouts', 5),
      WHIP: seasonStats.getPitchingLeaders('whip', 5),
      SV: seasonStats.getPitchingLeaders('saves', 5),
    };
  }, [seasonStats.isLoading, seasonStats.getPitchingLeaders]);

  // Combined WAR leaderboard (position players + pitchers)
  const warLeaders = useMemo(() => {
    if (seasonStats.isLoading) return [];

    const batters = seasonStats.getBattingLeaders('totalWAR', 20);
    const pitchers = seasonStats.getPitchingLeaders('pWAR', 20);

    // Combine into unified leaderboard
    const combined: Array<{ playerName: string; teamId: string; war: number; type: 'position' | 'pitcher' }> = [];

    for (const b of batters) {
      combined.push({ playerName: b.playerName, teamId: b.teamId, war: b.totalWAR, type: 'position' });
    }
    for (const p of pitchers) {
      combined.push({ playerName: p.playerName, teamId: p.teamId, war: p.pWAR, type: 'pitcher' });
    }

    combined.sort((a, b) => b.war - a.war);
    return combined.slice(0, 5);
  }, [seasonStats.isLoading, seasonStats.getBattingLeaders, seasonStats.getPitchingLeaders]);

  // ============================================
  // AUTO-CALCULATE AWARDS
  // ============================================

  const awards = useMemo(() => {
    if (seasonStats.isLoading) return null;

    // MVP: highest totalWAR among position players
    const topBatters = seasonStats.getBattingLeaders('totalWAR', 1);
    const mvp: AwardWinner | null = topBatters.length > 0 ? {
      playerName: topBatters[0].playerName,
      teamId: topBatters[0].teamId,
      value: topBatters[0].totalWAR.toFixed(1),
      statLabel: 'WAR',
    } : null;

    // Cy Young: highest pWAR among pitchers
    const topPitchers = seasonStats.getPitchingLeaders('pWAR', 1);
    const cyYoung: AwardWinner | null = topPitchers.length > 0 ? {
      playerName: topPitchers[0].playerName,
      teamId: topPitchers[0].teamId,
      value: topPitchers[0].pWAR.toFixed(1),
      statLabel: 'pWAR',
    } : null;

    // Gold Glove: highest fWAR at each position
    const allBatters = seasonStats.getBattingLeaders('totalWAR', 100);
    const goldGloves: GoldGloveWinner[] = [];
    const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
    // Group by primary position (stored in fielding stats, but we approximate from the data)
    // For now, show top fWAR players — fielding leaders are available
    const fieldingTop = seasonStats.getFieldingLeaders('fieldingPct', 50);

    // Build a map of position -> best fWAR player
    const posMap = new Map<string, GoldGloveWinner>();
    for (const b of allBatters) {
      if (b.fWAR <= 0) continue;
      // Find this player in fielding stats to get primary position
      const fEntry = fieldingTop.find(f => f.playerId === b.playerId);
      if (!fEntry || !fEntry.gamesByPosition) continue;

      // Determine primary position
      let primaryPos = '';
      let maxGames = 0;
      for (const [pos, games] of Object.entries(fEntry.gamesByPosition)) {
        if (games > maxGames) {
          maxGames = games;
          primaryPos = pos;
        }
      }

      if (!primaryPos || !positions.includes(primaryPos)) continue;

      const existing = posMap.get(primaryPos);
      if (!existing || b.fWAR > existing.fWAR) {
        posMap.set(primaryPos, {
          position: primaryPos,
          playerName: b.playerName,
          teamId: b.teamId,
          fWAR: b.fWAR,
        });
      }
    }

    for (const pos of positions) {
      const winner = posMap.get(pos);
      if (winner) goldGloves.push(winner);
    }

    return { mvp, cyYoung, goldGloves };
  }, [seasonStats.isLoading, seasonStats.getBattingLeaders, seasonStats.getPitchingLeaders, seasonStats.getFieldingLeaders]);

  // ============================================
  // USER'S TEAM SUMMARY
  // ============================================

  const userTeamSummary = useMemo(() => {
    if (!franchiseData.standings || !franchiseData.franchiseConfig) return null;

    // Find user's team(s) from franchise config
    const selectedTeams = franchiseData.franchiseConfig.teams?.selectedTeams ?? [];
    if (selectedTeams.length === 0) return null;

    const userTeamId = selectedTeams[0]; // Primary team
    const standings = franchiseData.standings;

    // Find team in standings
    let teamEntry: StandingEntry | null = null;
    let divisionName = '';
    let conferenceName = '';

    for (const [conf, divisions] of Object.entries(standings)) {
      for (const [div, teams] of Object.entries(divisions as Record<string, StandingEntry[]>)) {
        for (const team of teams) {
          if (team.team.toLowerCase().replace(/\s+/g, '-') === userTeamId || team.team.toLowerCase() === userTeamId) {
            teamEntry = team;
            divisionName = div;
            conferenceName = conf;
            break;
          }
        }
        if (teamEntry) break;
      }
      if (teamEntry) break;
    }

    if (!teamEntry) return null;

    // Get division rank
    const confStandings = conferenceName === 'Eastern' ? standings.Eastern : standings.Western;
    const divTeams = confStandings[divisionName] ?? [];
    const divRank = divTeams.findIndex(t => t.team === teamEntry!.team) + 1;

    // Top performers from user's team
    const teamBatters = seasonStats.getBattingLeaders('totalWAR', 50)
      .filter(b => b.teamId === userTeamId)
      .slice(0, 3);

    const teamPitchers = seasonStats.getPitchingLeaders('pWAR', 50)
      .filter(p => p.teamId === userTeamId)
      .slice(0, 2);

    return {
      teamName: teamEntry.team,
      teamId: userTeamId,
      wins: teamEntry.wins,
      losses: teamEntry.losses,
      divisionName,
      conferenceName,
      divisionRank: divRank,
      gamesBack: teamEntry.gamesBack,
      runDiff: teamEntry.runDiff,
      topBatters: teamBatters,
      topPitchers: teamPitchers,
    };
  }, [franchiseData.standings, franchiseData.franchiseConfig, seasonStats.getBattingLeaders, seasonStats.getPitchingLeaders]);

  // ============================================
  // HANDLE START PLAYOFFS
  // ============================================

  const [isCreatingPlayoff, setIsCreatingPlayoff] = useState(false);

  const handleStartPlayoffs = async () => {
    // If playoff already exists, just navigate to the bracket tab
    if (playoffData.hasActivePlayoff) {
      navigate(`/franchise/${franchiseId}?tab=bracket`);
      return;
    }

    setIsCreatingPlayoff(true);
    try {
      const playoffConfig = franchiseData.franchiseConfig?.playoffs;
      const teamsQualifying = playoffConfig?.teamsQualifying ?? 8;

      // Convert seriesLengths strings (e.g. "Best-of-5") to gamesPerRound numbers
      const parseSeriesLength = (val: string): number => {
        const match = val?.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 7;
      };

      const gamesPerRound: number[] = [];
      if (playoffConfig?.seriesLengths) {
        const sl = playoffConfig.seriesLengths;
        // Only include wildCard round if we have enough qualifying teams to need it
        if (teamsQualifying > 4 && sl.wildCard) {
          gamesPerRound.push(parseSeriesLength(sl.wildCard));
        }
        if (sl.divisionSeries) gamesPerRound.push(parseSeriesLength(sl.divisionSeries));
        if (sl.championship) gamesPerRound.push(parseSeriesLength(sl.championship));
        if (sl.worldSeries) gamesPerRound.push(parseSeriesLength(sl.worldSeries));
      }

      // Fallback if no config
      if (gamesPerRound.length === 0) {
        gamesPerRound.push(5, 7, 7);
      }

      const inningsPerGame = franchiseData.franchiseConfig?.season?.inningsPerGame ?? 9;

      await playoffData.createNewPlayoff({
        seasonNumber: currentSeason,
        seasonId,
        teamsQualifying,
        gamesPerRound,
        inningsPerGame,
        useDH: true,
      });

      navigate(`/franchise/${franchiseId}?tab=bracket`);
    } catch (err) {
      console.error('Failed to create playoff:', err);
    } finally {
      setIsCreatingPlayoff(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (franchiseData.isLoading || seasonStats.isLoading || scheduleData.isLoading || playoffData.isLoading) {
    return (
      <div className="min-h-screen bg-[#567A50] flex items-center justify-center">
        <div className="text-[#E8E8D8] text-lg">Loading season summary...</div>
      </div>
    );
  }

  // ============================================
  // RENDER HELPERS
  // ============================================

  function formatAvg(val: number): string {
    return val.toFixed(3).replace(/^0/, '');
  }

  function formatERA(val: number): string {
    return val === Infinity || isNaN(val) ? '-.--' : val.toFixed(2);
  }

  function formatWHIP(val: number): string {
    return val === Infinity || isNaN(val) ? '-.--' : val.toFixed(2);
  }

  function SectionHeader({ title, section }: { title: string; section: string }) {
    const isExpanded = expandedSection === section;
    return (
      <button
        onClick={() => toggleSection(section)}
        className="w-full bg-[#4A6844] border-[5px] border-[#5A8352] py-3 px-4 text-left flex items-center justify-between hover:bg-[#3F5A3A] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        <span className="text-sm text-[#E8E8D8] uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          {title}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#E8E8D8]" /> : <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />}
      </button>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  const gamesPerTeam = franchiseData.franchiseConfig?.season?.gamesPerTeam ?? 0;
  const completedGames = scheduleData.completedGames?.length ?? 0;
  const skippedGames = (scheduleData.games ?? []).filter(g => g.status === 'SKIPPED').length;

  return (
    <div className="min-h-screen bg-[#567A50]">
      {/* Header */}
      <div className="bg-[#C4A853] border-b-[6px] border-[#9A7B2C] p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-[#1a1a1a]" />
          <div className="text-3xl text-[#1a1a1a]" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}>
            SEASON {currentSeason} SUMMARY
          </div>
          <Trophy className="w-8 h-8 text-[#1a1a1a]" />
        </div>
        <div className="text-sm text-[#1a1a1a]/70">
          {franchiseData.leagueName || 'KRUSE BASEBALL'} — {gamesPerTeam} games per team
        </div>
        <div className="text-[10px] text-[#1a1a1a]/50 mt-1">
          {completedGames} played{skippedGames > 0 ? ` / ${skippedGames} skipped` : ''}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* ============================================ */}
        {/* 1. FINAL STANDINGS */}
        {/* ============================================ */}
        <SectionHeader title="Final Standings" section="standings" />
        {expandedSection === "standings" && (
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4 space-y-4">
            {Object.entries(franchiseData.standings).map(([conference, divisions]) => (
              <div key={conference}>
                <div className="text-xs text-[#C4A853] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  {conference} Conference
                </div>
                {Object.entries(divisions as Record<string, StandingEntry[]>).map(([division, teams]) => (
                  <div key={division} className="mb-3">
                    <div className="text-[9px] text-[#E8E8D8]/70 mb-1 uppercase">{division}</div>
                    <table className="w-full text-[10px] text-[#E8E8D8]">
                      <thead>
                        <tr className="text-[#E8E8D8]/60">
                          <th className="text-left py-0.5 w-1/3">Team</th>
                          <th className="text-center py-0.5">W</th>
                          <th className="text-center py-0.5">L</th>
                          <th className="text-center py-0.5">GB</th>
                          <th className="text-center py-0.5">DIFF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(teams as StandingEntry[]).map((team, idx) => (
                          <tr key={team.team} className={idx === 0 ? 'text-[#C4A853]' : ''}>
                            <td className="py-0.5">{team.team}</td>
                            <td className="text-center py-0.5">{team.wins}</td>
                            <td className="text-center py-0.5">{team.losses}</td>
                            <td className="text-center py-0.5">{team.gamesBack}</td>
                            <td className="text-center py-0.5">{team.runDiff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ============================================ */}
        {/* 2. LEAGUE LEADERS */}
        {/* ============================================ */}
        <SectionHeader title="League Leaders" section="leaders" />
        {expandedSection === "leaders" && (
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4 space-y-4">
            {/* Batting Leaders */}
            <div>
              <div className="text-xs text-[#C4A853] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                Batting
              </div>
              {battingLeaders && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.entries(battingLeaders) as [string, BattingLeaderEntry[]][]).map(([stat, leaders]) => (
                    <div key={stat} className="bg-[#5A8352] border-[3px] border-[#4A6844] p-2">
                      <div className="text-[9px] text-[#C4A853] mb-1">{stat}</div>
                      {leaders.map((player, idx) => (
                        <div key={player.playerId} className="flex justify-between text-[9px] text-[#E8E8D8]">
                          <span className={idx === 0 ? 'text-[#C4A853]' : ''}>
                            {idx + 1}. {player.playerName}
                          </span>
                          <span className={idx === 0 ? 'text-[#C4A853]' : ''}>
                            {stat === 'AVG' ? formatAvg(player.avg) :
                             stat === 'OBP' ? formatAvg(player.obp) :
                             stat === 'SLG' ? formatAvg(player.slg) :
                             stat === 'HR' ? player.homeRuns :
                             stat === 'RBI' ? player.rbi : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pitching Leaders */}
            <div>
              <div className="text-xs text-[#C4A853] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                Pitching
              </div>
              {pitchingLeaders && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.entries(pitchingLeaders) as [string, PitchingLeaderEntry[]][]).map(([stat, leaders]) => (
                    <div key={stat} className="bg-[#5A8352] border-[3px] border-[#4A6844] p-2">
                      <div className="text-[9px] text-[#C4A853] mb-1">{stat}</div>
                      {leaders.map((player, idx) => (
                        <div key={player.playerId} className="flex justify-between text-[9px] text-[#E8E8D8]">
                          <span className={idx === 0 ? 'text-[#C4A853]' : ''}>
                            {idx + 1}. {player.playerName}
                          </span>
                          <span className={idx === 0 ? 'text-[#C4A853]' : ''}>
                            {stat === 'ERA' ? formatERA(player.era) :
                             stat === 'WHIP' ? formatWHIP(player.whip) :
                             stat === 'W' ? player.wins :
                             stat === 'K' ? player.strikeouts :
                             stat === 'SV' ? player.saves : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WAR Leaders */}
            <div>
              <div className="text-xs text-[#C4A853] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                WAR (Overall)
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-2">
                {warLeaders.length === 0 && (
                  <div className="text-[9px] text-[#E8E8D8]/50 italic">No data available</div>
                )}
                {warLeaders.map((entry, idx) => (
                  <div key={`${entry.playerName}-${idx}`} className="flex justify-between text-[9px] text-[#E8E8D8]">
                    <span className={idx === 0 ? 'text-[#C4A853]' : ''}>
                      {idx + 1}. {entry.playerName} ({entry.teamId.toUpperCase()})
                      <span className="text-[#E8E8D8]/50 ml-1">{entry.type === 'pitcher' ? 'P' : 'POS'}</span>
                    </span>
                    <span className={idx === 0 ? 'text-[#C4A853]' : ''}>
                      {entry.war.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* 3. AWARDS */}
        {/* ============================================ */}
        <SectionHeader title="Awards" section="awards" />
        {expandedSection === "awards" && (
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4 space-y-3">
            {/* MVP */}
            {awards?.mvp && (
              <div className="bg-[#5A8352] border-[3px] border-[#C4A853] p-3">
                <div className="text-[9px] text-[#C4A853] mb-1">MOST VALUABLE PLAYER</div>
                <div className="text-sm text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  {awards.mvp.playerName}
                </div>
                <div className="text-[9px] text-[#E8E8D8]/70">
                  {awards.mvp.teamId.toUpperCase()} — {awards.mvp.value} {awards.mvp.statLabel}
                </div>
              </div>
            )}

            {/* Cy Young */}
            {awards?.cyYoung && (
              <div className="bg-[#5A8352] border-[3px] border-[#C4A853] p-3">
                <div className="text-[9px] text-[#C4A853] mb-1">CY YOUNG AWARD</div>
                <div className="text-sm text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  {awards.cyYoung.playerName}
                </div>
                <div className="text-[9px] text-[#E8E8D8]/70">
                  {awards.cyYoung.teamId.toUpperCase()} — {awards.cyYoung.value} {awards.cyYoung.statLabel}
                </div>
              </div>
            )}

            {/* Gold Gloves */}
            {awards?.goldGloves && awards.goldGloves.length > 0 && (
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                <div className="text-[9px] text-[#C4A853] mb-2">GOLD GLOVE AWARDS</div>
                <div className="grid grid-cols-2 gap-1">
                  {awards.goldGloves.map(gg => (
                    <div key={gg.position} className="flex justify-between text-[9px] text-[#E8E8D8]">
                      <span>
                        <span className="text-[#C4A853]">{gg.position}</span> — {gg.playerName}
                      </span>
                      <span className="text-[#E8E8D8]/60">{gg.fWAR.toFixed(1)} fWAR</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No awards message */}
            {!awards?.mvp && !awards?.cyYoung && (
              <div className="text-[10px] text-[#E8E8D8]/50 italic text-center py-4">
                No award data available — play or simulate games to generate stats
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* 4. YOUR TEAM */}
        {/* ============================================ */}
        <SectionHeader title="Your Team" section="team" />
        {expandedSection === "team" && (
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
            {userTeamSummary ? (
              <div className="space-y-3">
                {/* Record */}
                <div className="text-center">
                  <div className="text-lg text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    {userTeamSummary.teamName.toUpperCase()}
                  </div>
                  <div className="text-2xl text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {userTeamSummary.wins}-{userTeamSummary.losses}
                  </div>
                  <div className="text-[10px] text-[#E8E8D8]/70">
                    {userTeamSummary.divisionRank === 1 ? '1st' :
                     userTeamSummary.divisionRank === 2 ? '2nd' :
                     userTeamSummary.divisionRank === 3 ? '3rd' :
                     `${userTeamSummary.divisionRank}th`} in {userTeamSummary.divisionName} ({userTeamSummary.conferenceName})
                    {userTeamSummary.gamesBack !== '-' && ` — ${userTeamSummary.gamesBack} GB`}
                  </div>
                  <div className="text-[9px] text-[#E8E8D8]/50 mt-1">
                    Run Differential: {userTeamSummary.runDiff}
                  </div>
                </div>

                {/* Key Performers */}
                {(userTeamSummary.topBatters.length > 0 || userTeamSummary.topPitchers.length > 0) && (
                  <div>
                    <div className="text-[9px] text-[#C4A853] mb-1 uppercase">Key Performers</div>
                    <div className="space-y-1">
                      {userTeamSummary.topBatters.map(b => (
                        <div key={b.playerId} className="flex justify-between text-[9px] text-[#E8E8D8]">
                          <span>{b.playerName}</span>
                          <span>
                            {formatAvg(b.avg)} / {b.homeRuns} HR / {b.rbi} RBI / {b.totalWAR.toFixed(1)} WAR
                          </span>
                        </div>
                      ))}
                      {userTeamSummary.topPitchers.map(p => (
                        <div key={p.playerId} className="flex justify-between text-[9px] text-[#E8E8D8]">
                          <span>{p.playerName}</span>
                          <span>
                            {p.wins}-{p.losses} / {formatERA(p.era)} ERA / {p.strikeouts} K / {p.pWAR.toFixed(1)} pWAR
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-[#E8E8D8]/50 italic text-center py-4">
                No team data available
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* 5. START PLAYOFFS BUTTON */}
        {/* ============================================ */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleStartPlayoffs}
            disabled={isCreatingPlayoff}
            className="w-full bg-[#C4A853] border-[6px] border-[#9A7B2C] py-4 px-8 text-lg text-[#1a1a1a] hover:bg-[#D4B863] active:scale-[0.98] transition-transform shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}
          >
            <span>{isCreatingPlayoff ? 'CREATING BRACKET...' : playoffData.hasActivePlayoff ? 'VIEW PLAYOFFS' : 'START PLAYOFFS'}</span>
            {!isCreatingPlayoff && <ArrowRight className="w-5 h-5" />}
          </button>

          <button
            onClick={() => navigate(`/franchise/${franchiseId}`)}
            className="w-full mt-2 bg-[#4A6844] border-[4px] border-[#5A8352] py-2 px-4 text-[10px] text-[#E8E8D8]/70 hover:bg-[#3F5A3A] active:scale-[0.99] transition-transform"
          >
            BACK TO FRANCHISE
          </button>
        </div>
      </div>
    </div>
  );
}
