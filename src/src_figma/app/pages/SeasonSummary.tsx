/**
 * SeasonSummary — Full-page season end summary view
 *
 * Displays after regular season is complete:
 * 1. Final standings by division/conference
 * 2. League leaders (batting, pitching, WAR)
 * 3. League awards from the finalized awards store, with leader previews as fallback
 * 4. User's team summary
 * 5. "START PLAYOFFS" button
 *
 * Route: /franchise/:franchiseId/season-summary
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { Trophy, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import {
  useSeasonStats,
  type BattingLeaderEntry,
  type BattingSortKey,
  type PitchingLeaderEntry,
  type PitchingSortKey,
} from "../../../hooks/useSeasonStats";
import { useFranchiseData } from "@/hooks/useFranchiseData";
import { useScheduleData } from "@/hooks/useScheduleData";
import { usePlayoffData } from "@/hooks/usePlayoffData";
import type { StandingEntry } from "@/hooks/useFranchiseData";
import { getSeasonIdForScope } from "../../../utils/franchisePersistenceContract";
import {
  getInitialRouteSeasonNumber,
  loadRouteSeasonNumber,
} from "../utils/franchiseRouteSeason";
import {
  getFranchiseSeasonSummary,
  type FranchiseSeasonSummary,
} from "../../../utils/franchiseSeasonSummaryStorage";
import {
  calculateBattingDerived,
  calculatePitchingDerived,
} from "../../../utils/seasonStorage";
import AwardsWatchlist from "../components/AwardsWatchlist";

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

type BattingLeaderBuckets = Record<'AVG' | 'HR' | 'RBI' | 'OBP' | 'SLG', BattingLeaderEntry[]>;
type PitchingLeaderBuckets = Record<'W' | 'ERA' | 'K' | 'WHIP' | 'SV', PitchingLeaderEntry[]>;

function persistedBattingLeaderEntry(
  stats: FranchiseSeasonSummary['seasonStats']['batting'][number],
  rank: number,
): BattingLeaderEntry {
  const derived = calculateBattingDerived(stats);
  const bWAR = stats.bwar ?? 0;
  const fWAR = stats.fwar ?? 0;
  const rWAR = stats.rwar ?? 0;
  return {
    ...stats,
    rank,
    avg: derived.avg,
    obp: derived.obp,
    slg: derived.slg,
    ops: derived.ops,
    bWAR,
    fWAR,
    rWAR,
    totalWAR: stats.totalWar ?? bWAR + fWAR + rWAR,
  };
}

function persistedPitchingLeaderEntry(
  stats: FranchiseSeasonSummary['seasonStats']['pitching'][number],
  rank: number,
): PitchingLeaderEntry {
  const derived = calculatePitchingDerived(stats);
  const fullInnings = Math.floor(stats.outsRecorded / 3);
  const partialOuts = stats.outsRecorded % 3;
  return {
    ...stats,
    rank,
    era: derived.era,
    whip: derived.whip,
    ip: partialOuts === 0 ? `${fullInnings}.0` : `${fullInnings}.${partialOuts}`,
    pWAR: stats.pwar ?? 0,
  };
}

function getPersistedBattingLeaders(
  summary: FranchiseSeasonSummary,
  sortBy: BattingSortKey,
  limit: number,
): BattingLeaderEntry[] {
  const isRateStat = sortBy === 'avg' || sortBy === 'obp' || sortBy === 'slg' || sortBy === 'ops';
  const qualifyingAB = isRateStat ? 10 : 0;
  const entries = summary.seasonStats.batting
    .filter((stats) => stats.ab >= qualifyingAB)
    .map((stats) => persistedBattingLeaderEntry(stats, 0));

  const value = (entry: BattingLeaderEntry): number => {
    switch (sortBy) {
      case 'avg': return entry.avg;
      case 'obp': return entry.obp;
      case 'slg': return entry.slg;
      case 'ops': return entry.ops;
      case 'hr': return entry.homeRuns;
      case 'rbi': return entry.rbi;
      case 'hits': return entry.hits;
      case 'runs': return entry.runs;
      case 'sb': return entry.stolenBases;
      case 'fameNet': return entry.fameNet;
      case 'bWAR': return entry.bWAR;
      case 'fWAR': return entry.fWAR;
      case 'rWAR': return entry.rWAR;
      case 'totalWAR': return entry.totalWAR;
      default: return 0;
    }
  };

  return entries
    .sort((left, right) => value(right) - value(left))
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function getPersistedPitchingLeaders(
  summary: FranchiseSeasonSummary,
  sortBy: PitchingSortKey,
  limit: number,
): PitchingLeaderEntry[] {
  const qualifyingOuts = sortBy === 'era' || sortBy === 'whip' ? 9 : 0;
  const entries = summary.seasonStats.pitching
    .filter((stats) => stats.outsRecorded >= qualifyingOuts)
    .map((stats) => persistedPitchingLeaderEntry(stats, 0));

  const value = (entry: PitchingLeaderEntry): number => {
    switch (sortBy) {
      case 'era': return entry.era;
      case 'whip': return entry.whip;
      case 'wins': return entry.wins;
      case 'strikeouts': return entry.strikeouts;
      case 'saves': return entry.saves;
      case 'ip': return entry.outsRecorded;
      case 'fameNet': return entry.fameNet;
      case 'pWAR': return entry.pWAR;
      default: return 0;
    }
  };

  const lowerIsBetter = sortBy === 'era' || sortBy === 'whip';
  return entries
    .sort((left, right) => lowerIsBetter ? value(left) - value(right) : value(right) - value(left))
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// ============================================
// COMPONENT
// ============================================

export function SeasonSummary() {
  const navigate = useNavigate();
  const { franchiseId } = useParams<{ franchiseId: string }>();

  // Franchise routes derive season from franchise metadata, not the global season marker.
  const [currentSeason, setCurrentSeason] = useState(() => getInitialRouteSeasonNumber(franchiseId));

  useEffect(() => {
    let cancelled = false;

    loadRouteSeasonNumber(franchiseId)
      .then((seasonNumber) => {
        if (!cancelled) {
          setCurrentSeason(seasonNumber);
        }
      })
      .catch((err) => {
        console.warn('[SeasonSummary] Failed to load route season number:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId]);

  const seasonId = getSeasonIdForScope(franchiseId, currentSeason);
  const [persistedSummary, setPersistedSummary] = useState<FranchiseSeasonSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsSummaryLoading(true);

    getFranchiseSeasonSummary(seasonId)
      .then((summary) => {
        if (!cancelled) {
          setPersistedSummary(summary);
          setIsSummaryLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[SeasonSummary] Failed to load persisted franchise season summary:', err);
        if (!cancelled) {
          setPersistedSummary(null);
          setIsSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  // Data hooks
  const franchiseData = useFranchiseData(franchiseId, currentSeason);
  const scheduleData = useScheduleData(currentSeason, { franchiseId });
  const seasonStats = useSeasonStats(seasonId, { franchiseId });
  const playoffData = usePlayoffData(currentSeason, { franchiseId });

  // Expandable sections
  const [expandedSection, setExpandedSection] = useState<string | null>("standings");

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // ============================================
  // DERIVE LEADERS (top 5)
  // ============================================

  const battingLeaders = useMemo(() => {
    if (isSummaryLoading) return null;
    if (persistedSummary) {
      return {
        AVG: getPersistedBattingLeaders(persistedSummary, 'avg', 5),
        HR: getPersistedBattingLeaders(persistedSummary, 'hr', 5),
        RBI: getPersistedBattingLeaders(persistedSummary, 'rbi', 5),
        OBP: getPersistedBattingLeaders(persistedSummary, 'obp', 5),
        SLG: getPersistedBattingLeaders(persistedSummary, 'slg', 5),
      };
    }
    if (seasonStats.isLoading) return null;
    return {
      AVG: seasonStats.getBattingLeaders('avg', 5),
      HR: seasonStats.getBattingLeaders('hr', 5),
      RBI: seasonStats.getBattingLeaders('rbi', 5),
      OBP: seasonStats.getBattingLeaders('obp', 5),
      SLG: seasonStats.getBattingLeaders('slg', 5),
    };
  }, [isSummaryLoading, persistedSummary, seasonStats.isLoading, seasonStats.getBattingLeaders]);

  const pitchingLeaders = useMemo(() => {
    if (isSummaryLoading) return null;
    if (persistedSummary) {
      return {
        W: getPersistedPitchingLeaders(persistedSummary, 'wins', 5),
        ERA: getPersistedPitchingLeaders(persistedSummary, 'era', 5),
        K: getPersistedPitchingLeaders(persistedSummary, 'strikeouts', 5),
        WHIP: getPersistedPitchingLeaders(persistedSummary, 'whip', 5),
        SV: getPersistedPitchingLeaders(persistedSummary, 'saves', 5),
      };
    }
    if (seasonStats.isLoading) return null;
    return {
      W: seasonStats.getPitchingLeaders('wins', 5),
      ERA: seasonStats.getPitchingLeaders('era', 5),
      K: seasonStats.getPitchingLeaders('strikeouts', 5),
      WHIP: seasonStats.getPitchingLeaders('whip', 5),
      SV: seasonStats.getPitchingLeaders('saves', 5),
    };
  }, [isSummaryLoading, persistedSummary, seasonStats.isLoading, seasonStats.getPitchingLeaders]);

  // Combined WAR leaderboard (position players + pitchers)
  const warLeaders = useMemo(() => {
    if (isSummaryLoading) return [];
    if (persistedSummary) {
      const batters = getPersistedBattingLeaders(persistedSummary, 'totalWAR', 20)
        .filter((entry) => entry.totalWAR !== 0);
      const pitchers = getPersistedPitchingLeaders(persistedSummary, 'pWAR', 20)
        .filter((entry) => entry.pWAR !== 0);

      const combined: Array<{ playerName: string; teamId: string; war: number; type: 'position' | 'pitcher' }> = [];
      for (const b of batters) {
        combined.push({ playerName: b.playerName, teamId: b.teamId, war: b.totalWAR, type: 'position' });
      }
      for (const p of pitchers) {
        combined.push({ playerName: p.playerName, teamId: p.teamId, war: p.pWAR, type: 'pitcher' });
      }

      combined.sort((a, b) => b.war - a.war);
      return combined.slice(0, 5);
    }
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
  }, [isSummaryLoading, persistedSummary, seasonStats.isLoading, seasonStats.getBattingLeaders, seasonStats.getPitchingLeaders]);

  // ============================================
  // AUTO-CALCULATE READ-ONLY LEADER PREVIEWS
  // ============================================

  const awards = useMemo(() => {
    if (isSummaryLoading) return null;
    if (persistedSummary) return null;
    if (seasonStats.isLoading) return null;

    // Position player preview: highest totalWAR among position players
    const topBatters = seasonStats.getBattingLeaders('totalWAR', 1);
    const mvp: AwardWinner | null = topBatters.length > 0 ? {
      playerName: topBatters[0].playerName,
      teamId: topBatters[0].teamId,
      value: topBatters[0].totalWAR.toFixed(1),
      statLabel: 'WAR',
    } : null;

    // Pitcher preview: highest pWAR among pitchers
    const topPitchers = seasonStats.getPitchingLeaders('pWAR', 1);
    const cyYoung: AwardWinner | null = topPitchers.length > 0 ? {
      playerName: topPitchers[0].playerName,
      teamId: topPitchers[0].teamId,
      value: topPitchers[0].pWAR.toFixed(1),
      statLabel: 'pWAR',
    } : null;

    // Fielding preview: highest fWAR at each position
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
  }, [isSummaryLoading, persistedSummary, seasonStats.isLoading, seasonStats.getBattingLeaders, seasonStats.getPitchingLeaders, seasonStats.getFieldingLeaders]);

  // ============================================
  // USER'S TEAM SUMMARY
  // ============================================

  const userTeamSummary = useMemo(() => {
    if (isSummaryLoading) return null;
    if (!franchiseData.standings || !franchiseData.franchiseConfig) return null;

    // Find user's team(s) from franchise config
    const selectedTeams = franchiseData.franchiseConfig.teams?.selectedTeams ?? [];
    if (selectedTeams.length === 0) return null;

    const userTeamId = selectedTeams[0]; // Primary team

    if (persistedSummary) {
      const teamEntry = persistedSummary.standings.teams.find(
        (team) => team.teamId === userTeamId || team.teamName.toLowerCase().replace(/\s+/g, '-') === userTeamId,
      );
      if (!teamEntry) return null;

      const topBatters = getPersistedBattingLeaders(persistedSummary, 'totalWAR', 50)
        .filter((b) => b.teamId === teamEntry.teamId)
        .slice(0, 3);
      const topPitchers = getPersistedPitchingLeaders(persistedSummary, 'pWAR', 50)
        .filter((p) => p.teamId === teamEntry.teamId)
        .slice(0, 2);

      return {
        teamName: teamEntry.teamName,
        teamId: teamEntry.teamId,
        wins: teamEntry.wins,
        losses: teamEntry.losses,
        divisionName: 'Final Standings',
        conferenceName: '',
        divisionRank: persistedSummary.standings.teams.findIndex((team) => team.teamId === teamEntry.teamId) + 1,
        gamesBack: teamEntry.gamesBack,
        runDiff: teamEntry.runDiff,
        topBatters,
        topPitchers,
      };
    }

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
  }, [franchiseData.standings, franchiseData.franchiseConfig, isSummaryLoading, persistedSummary, seasonStats.getBattingLeaders, seasonStats.getPitchingLeaders]);

  // ============================================
  // HANDLE START PLAYOFFS
  // ============================================

  const handleStartPlayoffs = () => {
    // Bracket creation is intentionally review-first. FranchiseHome's bracket
    // tab owns confirmed standings/tiebreaker review and playoff start.
    navigate(`/franchise/${franchiseId}?tab=bracket`);
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (franchiseData.isLoading || isSummaryLoading || (!persistedSummary && seasonStats.isLoading) || scheduleData.isLoading || playoffData.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--franchise-field)] flex items-center justify-center">
        <div className="text-[var(--franchise-text)] text-lg">Loading season summary...</div>
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
        className="w-full bg-[var(--franchise-border)] border-[5px] border-[var(--franchise-panel)] py-3 px-4 text-left flex items-center justify-between hover:bg-[var(--franchise-panel-dark)] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        <span className="text-sm text-[var(--franchise-text)] uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          {title}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--franchise-text)]" /> : <ChevronDown className="w-4 h-4 text-[var(--franchise-text)]" />}
      </button>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  const gamesPerTeam = franchiseData.franchiseConfig?.season?.gamesPerTeam ?? 0;
  const summaryStandings = persistedSummary?.standings.teams ?? [];
  const completedGames = persistedSummary?.completedGames.gameIds.length ?? scheduleData.completedGames?.length ?? 0;
  const skippedGames = persistedSummary?.schedule.skippedGameIds.length ?? (scheduleData.games ?? []).filter(g => g.status === 'SKIPPED').length;

  return (
    <div className="min-h-screen bg-[var(--franchise-field)]">
      {/* Header */}
      <div className="bg-[var(--franchise-gold)] border-b-[6px] border-[var(--franchise-gold-dark)] p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-[var(--franchise-ink)]" />
          <div className="text-3xl text-[var(--franchise-ink)]" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}>
            SEASON {currentSeason} SUMMARY
          </div>
          <Trophy className="w-8 h-8 text-[var(--franchise-ink)]" />
        </div>
        <div className="text-sm text-[var(--franchise-ink)]/70">
          {franchiseData.leagueName || 'KRUSE BASEBALL'} — {gamesPerTeam} games per team
        </div>
        <div className="text-[10px] text-[var(--franchise-ink)]/50 mt-1">
          {completedGames} played{skippedGames > 0 ? ` / ${skippedGames} skipped` : ''}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* ============================================ */}
        {/* 1. FINAL STANDINGS */}
        {/* ============================================ */}
        <SectionHeader title="Final Standings" section="standings" />
        {expandedSection === "standings" && (
          <div className="bg-[var(--franchise-header)] border-[6px] border-[var(--franchise-border)] p-4 space-y-4">
            {summaryStandings.length > 0 ? (
              <table className="w-full text-[10px] text-[var(--franchise-text)]">
                <thead>
                  <tr className="text-[var(--franchise-text)]/60">
                    <th className="text-left py-0.5 w-1/3">Team</th>
                    <th className="text-center py-0.5">W</th>
                    <th className="text-center py-0.5">L</th>
                    <th className="text-center py-0.5">GB</th>
                    <th className="text-center py-0.5">DIFF</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStandings.map((team, idx) => (
                    <tr key={team.teamId} className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
                      <td className="py-0.5">{team.teamName}</td>
                      <td className="text-center py-0.5">{team.wins}</td>
                      <td className="text-center py-0.5">{team.losses}</td>
                      <td className="text-center py-0.5">{team.gamesBack}</td>
                      <td className="text-center py-0.5">{team.runDiff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : Object.entries(franchiseData.standings).map(([conference, divisions]) => (
              <div key={conference}>
                <div className="text-xs text-[var(--franchise-gold)] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  {conference} Conference
                </div>
                {Object.entries(divisions as Record<string, StandingEntry[]>).map(([division, teams]) => (
                  <div key={division} className="mb-3">
                    <div className="text-[9px] text-[var(--franchise-text)]/70 mb-1 uppercase">{division}</div>
                    <table className="w-full text-[10px] text-[var(--franchise-text)]">
                      <thead>
                        <tr className="text-[var(--franchise-text)]/60">
                          <th className="text-left py-0.5 w-1/3">Team</th>
                          <th className="text-center py-0.5">W</th>
                          <th className="text-center py-0.5">L</th>
                          <th className="text-center py-0.5">GB</th>
                          <th className="text-center py-0.5">DIFF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(teams as StandingEntry[]).map((team, idx) => (
                          <tr key={team.team} className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
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
          <div className="bg-[var(--franchise-header)] border-[6px] border-[var(--franchise-border)] p-4 space-y-4">
            {/* Batting Leaders */}
            <div>
              <div className="text-xs text-[var(--franchise-gold)] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                Batting
              </div>
              {battingLeaders && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.entries(battingLeaders) as [string, BattingLeaderEntry[]][]).map(([stat, leaders]) => (
                    <div key={stat} className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-border)] p-2">
                      <div className="text-[9px] text-[var(--franchise-gold)] mb-1">{stat}</div>
                      {leaders.map((player, idx) => (
                        <div key={player.playerId} className="flex justify-between text-[9px] text-[var(--franchise-text)]">
                          <span className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
                            {idx + 1}. {player.playerName}
                          </span>
                          <span className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
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
              <div className="text-xs text-[var(--franchise-gold)] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                Pitching
              </div>
              {pitchingLeaders && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.entries(pitchingLeaders) as [string, PitchingLeaderEntry[]][]).map(([stat, leaders]) => (
                    <div key={stat} className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-border)] p-2">
                      <div className="text-[9px] text-[var(--franchise-gold)] mb-1">{stat}</div>
                      {leaders.map((player, idx) => (
                        <div key={player.playerId} className="flex justify-between text-[9px] text-[var(--franchise-text)]">
                          <span className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
                            {idx + 1}. {player.playerName}
                          </span>
                          <span className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
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
              <div className="text-xs text-[var(--franchise-gold)] mb-2 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                WAR (Overall)
              </div>
              <div className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-border)] p-2">
                {warLeaders.length === 0 && (
                  <div className="text-[9px] text-[var(--franchise-text)]/50 italic">No data available</div>
                )}
                {warLeaders.map((entry, idx) => (
                  <div key={`${entry.playerName}-${idx}`} className="flex justify-between text-[9px] text-[var(--franchise-text)]">
                    <span className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
                      {idx + 1}. {entry.playerName} ({entry.teamId.toUpperCase()})
                      <span className="text-[var(--franchise-text)]/50 ml-1">{entry.type === 'pitcher' ? 'P' : 'POS'}</span>
                    </span>
                    <span className={idx === 0 ? 'text-[var(--franchise-gold)]' : ''}>
                      {entry.war.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* 3. AWARDS STATUS / LEAGUE AWARDS */}
        {/* ============================================ */}
        <SectionHeader title="Awards Status" section="awards" />
        {expandedSection === "awards" && (
          <div className="bg-[var(--franchise-header)] border-[6px] border-[var(--franchise-border)] p-4 space-y-3">
            <div className="text-[10px] text-[var(--franchise-text)]/70 leading-relaxed">
              League awards finalize from the season-end awards store when rows exist for this scope. Leader previews appear only when finalized award rows are not available.
            </div>

            <AwardsWatchlist
              franchiseId={franchiseId}
              seasonId={seasonId}
              statsScopeId={seasonId}
              seasonNumber={currentSeason}
            />

            {/* Position player preview fallback */}
            {!persistedSummary && awards?.mvp && (
              <div className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-gold)] p-3">
                <div className="text-[9px] text-[var(--franchise-gold)] mb-1">TOP POSITION PLAYER PREVIEW</div>
                <div className="text-sm text-[var(--franchise-text)]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  {awards.mvp.playerName}
                </div>
                <div className="text-[9px] text-[var(--franchise-text)]/70">
                  {awards.mvp.teamId.toUpperCase()} — {awards.mvp.value} {awards.mvp.statLabel}
                </div>
              </div>
            )}

            {/* Pitcher preview fallback */}
            {!persistedSummary && awards?.cyYoung && (
              <div className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-gold)] p-3">
                <div className="text-[9px] text-[var(--franchise-gold)] mb-1">TOP PITCHER PREVIEW</div>
                <div className="text-sm text-[var(--franchise-text)]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  {awards.cyYoung.playerName}
                </div>
                <div className="text-[9px] text-[var(--franchise-text)]/70">
                  {awards.cyYoung.teamId.toUpperCase()} — {awards.cyYoung.value} {awards.cyYoung.statLabel}
                </div>
              </div>
            )}

            {/* Fielding preview fallback */}
            {!persistedSummary && awards?.goldGloves && awards.goldGloves.length > 0 && (
              <div className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-border)] p-3">
                <div className="text-[9px] text-[var(--franchise-gold)] mb-2">FIELDING LEADER PREVIEW</div>
                <div className="grid grid-cols-2 gap-1">
                  {awards.goldGloves.map(gg => (
                    <div key={gg.position} className="flex justify-between text-[9px] text-[var(--franchise-text)]">
                      <span>
                        <span className="text-[var(--franchise-gold)]">{gg.position}</span> — {gg.playerName}
                      </span>
                      <span className="text-[var(--franchise-text)]/60">{gg.fWAR.toFixed(1)} fWAR</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No awards message */}
            {!persistedSummary && !awards?.mvp && !awards?.cyYoung && (
              <div className="text-[10px] text-[var(--franchise-text)]/50 italic text-center py-4">
                No stat leader preview data available — play or score games to generate stats
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* 4. YOUR TEAM */}
        {/* ============================================ */}
        <SectionHeader title="Your Team" section="team" />
        {expandedSection === "team" && (
          <div className="bg-[var(--franchise-header)] border-[6px] border-[var(--franchise-border)] p-4">
            {userTeamSummary ? (
              <div className="space-y-3">
                {/* Record */}
                <div className="text-center">
                  <div className="text-lg text-[var(--franchise-text)]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    {userTeamSummary.teamName.toUpperCase()}
                  </div>
                  <div className="text-2xl text-[var(--franchise-gold)]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {userTeamSummary.wins}-{userTeamSummary.losses}
                  </div>
                  <div className="text-[10px] text-[var(--franchise-text)]/70">
                    {userTeamSummary.divisionRank === 1 ? '1st' :
                     userTeamSummary.divisionRank === 2 ? '2nd' :
                     userTeamSummary.divisionRank === 3 ? '3rd' :
                     `${userTeamSummary.divisionRank}th`} in {userTeamSummary.divisionName}{userTeamSummary.conferenceName ? ` (${userTeamSummary.conferenceName})` : ''}
                    {userTeamSummary.gamesBack !== '-' && ` — ${userTeamSummary.gamesBack} GB`}
                  </div>
                  <div className="text-[9px] text-[var(--franchise-text)]/50 mt-1">
                    Run Differential: {userTeamSummary.runDiff}
                  </div>
                </div>

                {/* Key Performers */}
                {(userTeamSummary.topBatters.length > 0 || userTeamSummary.topPitchers.length > 0) && (
                  <div>
                    <div className="text-[9px] text-[var(--franchise-gold)] mb-1 uppercase">Key Performers</div>
                    <div className="space-y-1">
                      {userTeamSummary.topBatters.map(b => (
                        <div key={b.playerId} className="flex justify-between text-[9px] text-[var(--franchise-text)]">
                          <span>{b.playerName}</span>
                          <span>
                            {formatAvg(b.avg)} / {b.homeRuns} HR / {b.rbi} RBI / {b.totalWAR.toFixed(1)} WAR
                          </span>
                        </div>
                      ))}
                      {userTeamSummary.topPitchers.map(p => (
                        <div key={p.playerId} className="flex justify-between text-[9px] text-[var(--franchise-text)]">
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
              <div className="text-[10px] text-[var(--franchise-text)]/50 italic text-center py-4">
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
            className="w-full bg-[var(--franchise-gold)] border-[6px] border-[var(--franchise-gold-dark)] py-4 px-8 text-lg text-[var(--franchise-ink)] hover:bg-[var(--franchise-gold-light)] active:scale-[0.98] transition-transform shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}
          >
            <span>{playoffData.hasActivePlayoff ? 'VIEW PLAYOFFS' : 'REVIEW PLAYOFF SEEDING'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          {playoffData.error && (
            <div className="mt-3 border-[3px] border-[var(--franchise-loss-border)] bg-[var(--franchise-loss-panel-deep)]/80 px-3 py-2 text-[10px] text-[var(--franchise-loss-text-alt)]">
              {playoffData.error}
            </div>
          )}

          <button
            onClick={() => navigate(`/franchise/${franchiseId}`)}
            className="w-full mt-2 bg-[var(--franchise-border)] border-[4px] border-[var(--franchise-panel)] py-2 px-4 text-[10px] text-[var(--franchise-text)]/70 hover:bg-[var(--franchise-panel-dark)] active:scale-[0.99] transition-transform"
          >
            BACK TO FRANCHISE
          </button>
        </div>
      </div>
    </div>
  );
}
