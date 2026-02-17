import { useNavigate, useLocation, useParams } from "react-router";
import { Trophy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getTeamColors } from "@/config/teamColors";
import { useState, useEffect } from "react";
import { getCompletedGameById, type CompletedGameRecord } from "../../utils/gameStorage";

// Helper to format innings pitched from outs recorded
function formatIP(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const partialOuts = outsRecorded % 3;
  return partialOuts === 0 ? `${fullInnings}.0` : `${fullInnings}.${partialOuts}`;
}

// Helper to format batting average
function formatAvg(hits: number, atBats: number): string {
  if (atBats === 0) return ".000";
  const avg = hits / atBats;
  return avg.toFixed(3).replace(/^0/, "");
}

function normalizeTeamId(teamId: string | undefined | null): string {
  return (teamId ?? "").trim().toLowerCase();
}

type BadgeVariant = "default" | "success" | "fame";

interface BadgeData {
  label: string;
  variant?: BadgeVariant;
}

type FameEventRecord = CompletedGameRecord["fameEvents"] extends Array<infer U> ? U : never;

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/10 border-white/30 text-[#E8E8D8]",
  success: "bg-[#C4A853] border-[#C4A853] text-[#1b2a12]",
  fame: "bg-[#CC44CC] border-[#CC44CC] text-white",
};

function SummaryBadge({ label, variant = "default" }: { label: string; variant?: BadgeVariant }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border ${badgeVariantClasses[variant]}`}
    >
      {label}
    </span>
  );
}

function BadgeGroup({ badges }: { badges: BadgeData[] }) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {badges.map((badge, idx) => (
        <SummaryBadge key={`${badge.label}-${idx}`} label={badge.label} variant={badge.variant} />
      ))}
    </div>
  );
}

function normalizeBadgeLabel(value: string | undefined): string {
  if (!value) return "Fame Event";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(word => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getFameBadgeLabel(event: FameEventRecord): string {
  const type = event?.eventType?.toLowerCase() ?? "";
  if (type.includes("walkoff")) {
    if (type.includes("hr")) {
      return "Walk-off HR";
    }
    return "Walk-off";
  }
  if (type.includes("clutch")) {
    return "Clutch Moment";
  }
  if (type.includes("web")) {
    return "Web Gem";
  }
  if (event.description) {
    return event.description;
  }
  if (event.eventType) {
    return normalizeBadgeLabel(event.eventType);
  }
  return "Fame Event";
}

interface PlayerBadgeInputs {
  playerId: string;
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  so: number;
  h: number;
}

function buildPlayerBadgeData(player: PlayerBadgeInputs, fameMap: Map<string, FameEventRecord[]>): BadgeData[] {
  const badges: BadgeData[] = [];
  if (player.hr > 0) {
    badges.push({ label: `${player.hr} HR`, variant: "success" });
  }
  if (player.h >= 2) {
    badges.push({ label: `${player.h} Hits`, variant: "success" });
  }
  if (player.r >= 2) {
    badges.push({ label: `${player.r} R`, variant: "default" });
  }
  if (player.rbi >= 2) {
    badges.push({ label: `${player.rbi} RBI`, variant: "default" });
  }
  if (player.bb >= 3) {
    badges.push({ label: `${player.bb} BB`, variant: "default" });
  }
  const fameForPlayer = fameMap.get(player.playerId) ?? [];
  fameForPlayer.forEach(event => {
    badges.push({ label: getFameBadgeLabel(event), variant: "fame" });
  });
  return Array.from(new Map(badges.map(b => [b.label, b])).values());
}

interface PitcherBadgeInputs {
  pitcherId: string;
  outsRecorded: number;
  earnedRuns: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  isStarter: boolean;
}

function getPitcherBadgeData(
  pitcher: PitcherBadgeInputs,
  fameMap: Map<string, FameEventRecord[]>
): BadgeData[] {
  const badges: BadgeData[] = [];
  if (pitcher.outsRecorded >= 3) {
    badges.push({ label: "1+ IP", variant: "default" });
  }
  if (pitcher.earnedRuns === 0 && pitcher.outsRecorded > 0) {
    badges.push({ label: "Scoreless", variant: "success" });
  }
  if (pitcher.hitsAllowed === 0 && pitcher.outsRecorded > 0) {
    badges.push({ label: "Hitless", variant: "success" });
  }
  if (pitcher.strikeoutsThrown >= 3) {
    badges.push({ label: `${pitcher.strikeoutsThrown} K`, variant: "success" });
  }
  if (pitcher.walksAllowed === 0 && pitcher.outsRecorded > 0) {
    badges.push({ label: "No BB", variant: "default" });
  }
  if (pitcher.isStarter) {
    badges.push({ label: "Starter", variant: "default" });
  }

  const fameForPitcher = fameMap.get(pitcher.pitcherId) ?? [];
  fameForPitcher.forEach(event => {
    badges.push({ label: getFameBadgeLabel(event), variant: "fame" });
  });

  return Array.from(new Map(badges.map(b => [b.label, b])).values());
}

export function PostGameSummary({ gameId: gameIdProp }: { gameId?: string } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId: gameIdFromRoute } = useParams<{ gameId: string }>();
  const gameId = gameIdProp ?? gameIdFromRoute;
  const [boxScoreExpanded, setBoxScoreExpanded] = useState(false);
  const [gameData, setGameData] = useState<CompletedGameRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get game mode from navigation state to route back appropriately
  const navigationState = (location.state ?? {}) as {
    gameMode?: 'exhibition' | 'franchise' | 'playoff';
    franchiseId?: string;
    seasonId?: string;
  };

  const gameMode = navigationState?.gameMode || 'franchise';
  const franchiseId = navigationState?.franchiseId || '1';
  const baseNavigationState = {
    ...navigationState,
    gameMode,
    franchiseId,
  };

  // Load game data from IndexedDB
  useEffect(() => {
    let cancelled = false;

    async function loadGameData() {
      // Hard reset prior game state before loading next summary.
      setGameData(null);
      setError(null);
      setIsLoading(true);
      setBoxScoreExpanded(false);

      if (!gameId) {
        if (!cancelled) {
          setError("No game ID provided");
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await getCompletedGameById(gameId);
        if (cancelled) return;
        if (data && data.gameId === gameId) {
          setGameData(data);
        } else {
          setError("Game not found");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load game data:", err);
        setError("Failed to load game data");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGameData();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2a3a2d] text-white p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
          <div className="text-lg">Loading game summary...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-[#2a3a2d] text-white p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-red-400">{error || "Game data not available"}</div>
          <button
            onClick={() => navigate("/exhibition")}
            className="bg-[#556B55] border-[3px] border-white px-6 py-3 text-sm hover:bg-[#6B9462]"
          >
            BACK TO MENU
          </button>
        </div>
      </div>
    );
  }

  // Extract data from game record
  const homeTeamId = gameData.homeTeamId;
  const awayTeamId = gameData.awayTeamId;
  const homeTeamName = gameData.homeTeamName;
  const awayTeamName = gameData.awayTeamName;
  const stadiumLabel = gameData.stadiumName;
  const activityLogEntries = gameData.activityLog ?? [];
  const fameEvents = gameData.fameEvents ?? [];
  const fameCount = fameEvents.length;

  // Build batter stats from playerStats
  const normalizedAwayTeamId = normalizeTeamId(awayTeamId);
  const normalizedHomeTeamId = normalizeTeamId(homeTeamId);

  const allBatters = Object.entries(gameData.playerStats)
    .filter(([, stats]) => {
      const teamId = normalizeTeamId(stats.teamId);
      return (
        (teamId === normalizedAwayTeamId || teamId === normalizedHomeTeamId) &&
        typeof stats.playerName === "string" &&
        stats.playerName.trim().length > 0
      );
    })
    .map(([playerId, stats]) => {
      const teamId = normalizeTeamId(stats.teamId);
      const isAway = teamId === normalizedAwayTeamId;
      const plateAppearances = stats.pa;
      const hasOffensiveLine = plateAppearances > 0 || stats.h > 0 || stats.r > 0 || stats.rbi > 0;

      return {
        playerId,
        name: stats.playerName,
        isAway,
        teamId: stats.teamId,
        pa: plateAppearances,
        ab: stats.ab,
        r: stats.r,
        h: stats.h,
        hr: stats.hr,
        rbi: stats.rbi,
        bb: stats.bb,
        so: stats.k,
        avg: formatAvg(stats.h, stats.ab),
        hasOffensiveLine,
      };
    });

  // Build pitcher stats
  const allPitchers = gameData.pitcherGameStats
    .filter((pitcher) => {
      const teamId = normalizeTeamId(pitcher.teamId);
      return (
        (teamId === normalizedAwayTeamId || teamId === normalizedHomeTeamId) &&
        typeof pitcher.pitcherName === "string" &&
        pitcher.pitcherName.trim().length > 0 &&
        Number.isFinite(pitcher.outsRecorded)
      );
    })
    .map(pitcher => {
      const teamId = normalizeTeamId(pitcher.teamId);
      const isAway = teamId === normalizedAwayTeamId;
      const outsRecorded = pitcher.outsRecorded;

      return {
        pitcherId: pitcher.pitcherId,
        name: pitcher.pitcherName,
        teamId: pitcher.teamId,
        isAway,
        ip: formatIP(outsRecorded),
        h: pitcher.hitsAllowed,
        r: pitcher.runsAllowed,
        er: pitcher.earnedRuns,
        bb: pitcher.walksAllowed,
        so: pitcher.strikeoutsThrown,
        isStarter: pitcher.isStarter,
        outsRecorded,
        hitsAllowed: pitcher.hitsAllowed,
        earnedRuns: pitcher.earnedRuns,
        walksAllowed: pitcher.walksAllowed,
        strikeoutsThrown: pitcher.strikeoutsThrown,
      };
    });

  const awayPitchers = allPitchers.filter(p => p.isAway);
  const homePitchers = allPitchers.filter(p => !p.isAway);
  const awayBatters = allBatters.filter(b => b.isAway && b.hasOffensiveLine);
  const homeBatters = allBatters.filter(b => !b.isAway && b.hasOffensiveLine);

  // Calculate team totals strictly from this game's playerStats rows.
  const awayHits = awayBatters.reduce((sum, batter) => sum + batter.h, 0);
  const homeHits = homeBatters.reduce((sum, batter) => sum + batter.h, 0);
  const awayErrors = allBatters
    .filter((batter) => batter.isAway)
    .reduce((sum, batter) => sum + gameData.playerStats[batter.playerId].fieldingErrors, 0);
  const homeErrors = allBatters
    .filter((batter) => !batter.isAway)
    .reduce((sum, batter) => sum + gameData.playerStats[batter.playerId].fieldingErrors, 0);

  // Inning-by-inning scoring from this completed game only.
  const inningScores = gameData.inningScores ?? [];
  const numInnings = inningScores.length;
  const scoreboard = {
    innings: inningScores,
    away: { runs: gameData.finalScore.away, hits: awayHits, errors: awayErrors },
    home: { runs: gameData.finalScore.home, hits: homeHits, errors: homeErrors },
  };

  // Determine winner
  const homeWon = gameData.finalScore.home > gameData.finalScore.away;
  const winnerName = homeWon ? homeTeamName : awayTeamName;
  const winnerId = homeWon ? homeTeamId : awayTeamId;

  // Find players of the game from this game's saved batting lines only.
  const sortedBatters = allBatters
    .filter(b => b.hasOffensiveLine && Boolean(b.name))
    .sort((a, b) => {
    const aScore = a.h * 2 + a.rbi + a.r;
    const bScore = b.h * 2 + b.rbi + b.r;
    return bScore - aScore;
  });

  const topPerformers = sortedBatters.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#2a3a2d] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* TV Frame */}
        <div className="border-[12px] border-[#1a1a1a] bg-black rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.9)] relative">
          {/* Screen bezel shadow */}
          <div className="border-[6px] border-[#0a0a0a] bg-[#1a1a1a] p-1">
            {/* Inner screen glow */}
            <div className="border-[2px] border-[#333] bg-black p-0">
              {/* Broadcast header */}
              <div className="bg-gradient-to-r from-[#DD0000] via-[#CC44CC] to-[#0066FF] p-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#DD0000] text-white text-[10px] font-bold px-2 py-1 border-2 border-white">
                      FINAL
                    </div>
                    <div className="text-white text-lg font-bold tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      POST-GAME REPORT
                    </div>
                  </div>
                  {/* Super Mega Baseball Logo */}
                  <div className="bg-white border-[4px] border-[#0066FF] px-[12px] py-[6px] shadow-[2px_2px_0px_0px_#DD0000]">
                    <div className="text-[10px] text-[#DD0000] tracking-wide leading-tight font-bold">SUPER MEGA</div>
                    <div className="text-[13px] text-[#0066FF] tracking-wide leading-tight font-bold">BASEBALL</div>
                  </div>
                </div>
              </div>

              {/* Screen content */}
              <div className="bg-[#2a3a2d] p-6">
        {/* Final Score Banner - Fenway-style Scoreboard */}
        <div className="bg-[#556B55] border-[4px] border-[#3d5240] p-2 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
          {/* Stadium name header */}
          <div className="text-center text-[#E8E8D8] text-xs font-bold tracking-[0.3em] mb-1">
            {stadiumLabel}
          </div>

          {/* Scoreboard grid */}
          <div className="grid gap-[1px] mb-2" style={{ gridTemplateColumns: `90px repeat(${numInnings}, 24px) 6px 28px 28px 28px` }}>
            {/* Header row */}
            <div></div>
            {Array.from({ length: numInnings }, (_, i) => i + 1).map(inning => (
              <div key={inning} className="text-[#E8E8D8] text-[9px] font-bold text-center">{inning}</div>
            ))}
            <div></div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">R</div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">H</div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">E</div>

            {/* Away team row */}
            <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{
              textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
            }}>{awayTeamName.toUpperCase()}</div>
            {Array.from({ length: numInnings }, (_, idx) => {
              const score = scoreboard.innings[idx]?.away;
              return (
                <div key={idx} className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center">
                  {score !== undefined ? score : '-'}
                </div>
              );
            })}
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.runs}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.hits}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.errors}</div>

            {/* Home team row */}
            <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{
              textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
            }}>{homeTeamName.toUpperCase()}</div>
            {Array.from({ length: numInnings }, (_, idx) => {
              const score = scoreboard.innings[idx]?.home;
              return (
                <div key={idx} className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center">
                  {score !== undefined ? score : '-'}
                </div>
              );
            })}
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.runs}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.hits}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.errors}</div>
          </div>

          {/* Bottom indicator row - FINAL message */}
          <div className="border-t-2 border-[#E8E8D8] pt-2 text-center">
            <div className="text-sm font-bold" style={{
              color: getTeamColors(winnerId).secondary || '#C4A853',
              textShadow: '1px 1px 2px black'
            }}>★ {winnerName.toUpperCase()} WIN! ★</div>
          </div>
        </div>

        <div className="bg-[#1f2b21] border-2 border-[#314437] rounded-md p-3 text-[#E8E8D8] text-xs flex flex-col gap-2 mb-4">
          <div className="text-[10px] tracking-[0.4em] font-bold text-[#C4A853] uppercase">
            Activity Log
          </div>
          {activityLogEntries.length > 0 ? (
            <ul className="space-y-1 list-disc list-inside text-[#E8E8D8]">
              {activityLogEntries.slice(0, 5).map((entry, idx) => (
                <li key={idx}>{entry}</li>
              ))}
            </ul>
          ) : (
            <div className="text-[#A8B8A2]">No notable actions recorded during this game.</div>
          )}
          <div className="text-[10px] text-[#A8B8A2] uppercase tracking-[0.3em] mt-2">
            Fame events recorded: {fameCount}
          </div>
        </div>

        {/* Players of the game */}
        {[0, 1, 2].map(rank => {
          const player = topPerformers[rank];
          if (!player || player.h === 0) return null;
          const borderColor = rank === 0 ? '#C4A853' : rank === 1 ? '#E8E8D8' : '#FFFFFF';
          const label = rank === 0 ? 'POG ★★★' : rank === 1 ? 'POG ★★' : 'POG ★';
          return (
            <div
              key={rank}
              className="border-[5px] p-4 mb-4"
              style={{
                borderColor,
                backgroundColor: getTeamColors(player.isAway ? awayTeamId : homeTeamId).primary || '#2a3a2d'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-white" />
                <div className="text-sm text-white">{label}</div>
              </div>
              <div className="text-lg text-white">{player.name}</div>
              <div className="text-[8px] text-white/80 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{player.h}</span>
                  <span>-</span>
                  <span>{player.ab} AB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{player.bb} BB</span>
                  <span>•</span>
                  <span>{player.so} SO</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{player.rbi} RBI</span>
                  <span>•</span>
                  <span>{player.r} R</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Box score preview */}
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4 mb-4">
          <button
            onClick={() => setBoxScoreExpanded(!boxScoreExpanded)}
            className="w-full text-center hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
          >
            <div className="text-sm text-[#E8E8D8]">BOX SCORE</div>
            {boxScoreExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#E8E8D8]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />
            )}
          </button>

          {boxScoreExpanded && (
            <div className="space-y-4 mt-3">
              {/* Away Team Batting */}
              {awayBatters.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">{awayTeamName.toUpperCase()} BATTING</div>
                  <div className="text-[7px]">
                    <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                      <div className="col-span-2 text-left">BATTER</div>
                      <div className="text-center">AB</div>
                      <div className="text-center">R</div>
                      <div className="text-center">H</div>
                      <div className="text-center">RBI</div>
                      <div className="text-center">BB</div>
                      <div className="text-center">SO</div>
                    </div>
                    {awayBatters.map((batter, idx) => (
                      <div key={`${batter.playerId}-${idx}`} className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]">
                        <div className="col-span-2 text-left">{batter.name}</div>
                        <div className="text-center">{batter.ab}</div>
                        <div className="text-center">{batter.r}</div>
                        <div className="text-center">{batter.h}</div>
                        <div className="text-center">{batter.rbi}</div>
                        <div className="text-center">{batter.bb}</div>
                        <div className="text-center">{batter.so}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t-2 border-[#4A6844]"></div>

              {/* Home Team Batting */}
              {homeBatters.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">{homeTeamName.toUpperCase()} BATTING</div>
                  <div className="text-[7px]">
                    <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                      <div className="col-span-2 text-left">BATTER</div>
                      <div className="text-center">AB</div>
                      <div className="text-center">R</div>
                      <div className="text-center">H</div>
                      <div className="text-center">RBI</div>
                      <div className="text-center">BB</div>
                      <div className="text-center">SO</div>
                    </div>
                    {homeBatters.map((batter, idx) => (
                      <div key={`${batter.playerId}-${idx}`} className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]">
                        <div className="col-span-2 text-left">{batter.name}</div>
                        <div className="text-center">{batter.ab}</div>
                        <div className="text-center">{batter.r}</div>
                        <div className="text-center">{batter.h}</div>
                        <div className="text-center">{batter.rbi}</div>
                        <div className="text-center">{batter.bb}</div>
                        <div className="text-center">{batter.so}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t-2 border-[#4A6844]"></div>

              {/* Away Team Pitching */}
              {awayPitchers.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">{awayTeamName.toUpperCase()} PITCHING</div>
                  <div className="text-[7px]">
                    <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                      <div className="col-span-2 text-left">PITCHER</div>
                      <div className="text-center">IP</div>
                      <div className="text-center">H</div>
                      <div className="text-center">R</div>
                      <div className="text-center">ER</div>
                      <div className="text-center">BB</div>
                      <div className="text-center">SO</div>
                    </div>
                    {awayPitchers.map((pitcher, idx) => (
                      <div key={idx} className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]">
                        <div className="col-span-2 text-left">{pitcher.name}</div>
                        <div className="text-center">{pitcher.ip}</div>
                        <div className="text-center">{pitcher.h}</div>
                        <div className="text-center">{pitcher.r}</div>
                        <div className="text-center">{pitcher.er}</div>
                        <div className="text-center">{pitcher.bb}</div>
                        <div className="text-center">{pitcher.so}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t-2 border-[#4A6844]"></div>

              {/* Home Team Pitching */}
              {homePitchers.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">{homeTeamName.toUpperCase()} PITCHING</div>
                  <div className="text-[7px]">
                    <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                      <div className="col-span-2 text-left">PITCHER</div>
                      <div className="text-center">IP</div>
                      <div className="text-center">H</div>
                      <div className="text-center">R</div>
                      <div className="text-center">ER</div>
                      <div className="text-center">BB</div>
                      <div className="text-center">SO</div>
                    </div>
                    {homePitchers.map((pitcher, idx) => (
                      <div key={idx} className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]">
                        <div className="col-span-2 text-left">{pitcher.name}</div>
                        <div className="text-center">{pitcher.ip}</div>
                        <div className="text-center">{pitcher.h}</div>
                        <div className="text-center">{pitcher.r}</div>
                        <div className="text-center">{pitcher.er}</div>
                        <div className="text-center">{pitcher.bb}</div>
                        <div className="text-center">{pitcher.so}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show message if no pitcher stats */}
              {awayPitchers.length === 0 && homePitchers.length === 0 && awayBatters.length === 0 && homeBatters.length === 0 && (
                <div className="text-center text-[#E8E8D8]/60 text-xs py-4">
                  No box score statistics recorded
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              // Route based on game mode
              if (gameMode === 'exhibition') {
      navigate("/exhibition");
            } else if (gameMode === 'playoff') {
              // Return to franchise home (bracket tab) — NOT /world-series
              navigate(`/franchise/${franchiseId}`, {
                state: {
                  ...baseNavigationState,
                  refreshAfterGame: true,
                  refreshToken: Date.now(),
                },
              });
            } else {
              navigate(`/franchise/${franchiseId}`, {
                state: {
                  ...baseNavigationState,
                  refreshAfterGame: true,
                  refreshToken: Date.now(),
                },
              });
            }
          }}
            className="bg-[#556B55] border-[5px] border-white py-[16px] text-sm text-[#E8E8D8] hover:bg-[#6B9462] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] m-[0px] px-[10px]"
          >
            CONTINUE
          </button>
        </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
