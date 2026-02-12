import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowLeft, Star, Award, Trophy, ChevronDown, CheckCircle, X, TrendingUp, TrendingDown } from "lucide-react";
import { useOffseasonData, type OffseasonPlayer, type OffseasonTeam } from "../../hooks/useOffseasonData";
import { useOffseasonState, type AwardWinner } from "../../hooks/useOffseasonState";
import { getAllManagerSeasonStatsForSeason } from '../../../utils/managerStorage';
import { calculateMOYVotes, formatMWAR, getMWARRating } from '../../../engines/mwarCalculator';
import type { ManagerSeasonStats } from '../../../engines/mwarCalculator';

// Types
type Position = "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "P" | "DH";
type League = "AL" | "NL";
type Grade = "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D";
type Trait = string;

interface Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  grade: Grade;
  age: number;
  salary: number;
  league: League;
  traits: Trait[];
}

interface StatLeader {
  player: Player;
  value: number;
  reward?: string;
}

interface AwardCandidate {
  player: Player;
  score: number;
  stats: Record<string, any>;
}

interface Award {
  type: string;
  position?: Position;
  league?: League;
  winner: Player;
  runnerUp?: Player;
  third?: Player;
  reward?: string;
}

type Screen = 
  | "LEAGUE_LEADERS"
  | "GOLD_GLOVE"
  | "PLATINUM_GLOVE"
  | "BOOGER_GLOVE"
  | "SILVER_SLUGGER"
  | "RELIEVER_YEAR"
  | "BENCH_PLAYER"
  | "ROOKIE_YEAR"
  | "CY_YOUNG"
  | "MVP"
  | "MANAGER_YEAR"
  | "SPECIAL_AWARDS"
  | "SUMMARY";

const goldGlovePositions: Position[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "P"];
const silverSluggerPositions: Position[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

// Empty fallback — populated from IndexedDB when available
const EMPTY_PLAYERS: Player[] = [];

const EMPTY_TEAMS: OffseasonTeam[] = [];

/**
 * Helper: pick the top N players from an array sorted by a numeric key (descending).
 */
function topN(players: Player[], n: number, key: (p: Player) => number): Player[] {
  return [...players].sort((a, b) => key(b) - key(a)).slice(0, n);
}

/**
 * Helper: pick the bottom N (worst performing) players.
 */
function bottomN(players: Player[], n: number, key: (p: Player) => number): Player[] {
  return [...players].sort((a, b) => key(a) - key(b)).slice(0, n);
}

/** Build AwardCandidate[] from a list of players using WAR as score. */
function buildCandidates(players: Player[], scoreFn: (p: Player) => number): AwardCandidate[] {
  return players.map(p => ({
    player: p,
    score: Math.round(scoreFn(p) * 10) / 10,
    stats: {} as Record<string, any>,
  }));
}

/** Abbreviate name: "Mike Trout" → "M. Trout" */
function abbrevName(name: string): string {
  const parts = name.split(' ');
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

// Convert OffseasonPlayer to local Player type
function convertToAwardPlayer(p: OffseasonPlayer, teamShortName: string): Player {
  const isPitcher = ["SP", "RP", "CP"].includes(p.position);
  // Assign league based on team for simplicity (real implementation would have proper league data)
  const nlTeams = ["NYM", "ATL", "LAD", "CHC", "MIL", "STL", "PIT", "CIN", "PHI", "WSN", "MIA", "ARI", "SF", "SD", "COL"];
  const league: League = nlTeams.includes(teamShortName) ? "NL" : "AL";

  return {
    id: p.id,
    name: p.name,
    team: teamShortName,
    position: isPitcher ? "P" : (p.position as Position),
    grade: p.grade as Grade,
    age: p.age,
    salary: p.salary * 1000000, // Convert from millions
    league,
    traits: [],
  };
}

interface AwardsCeremonyFlowProps {
  onClose: () => void;
  seasonId?: string;
  seasonNumber?: number;
}

export function AwardsCeremonyFlow({ onClose, seasonId = 'season-1', seasonNumber = 1 }: AwardsCeremonyFlowProps) {
  const [screen, setScreen] = useState<Screen>("LEAGUE_LEADERS");
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentLeague, setCurrentLeague] = useState<League>("AL");
  const [currentSpecialAward, setCurrentSpecialAward] = useState(0);
  const [awards, setAwards] = useState<Award[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [managerSeasonStats, setManagerSeasonStats] = useState<ManagerSeasonStats[]>([]);

  // Wire to real data
  const {
    isLoading,
    teams: realTeams,
    players: realPlayers,
    hasRealData,
  } = useOffseasonData();

  // Load manager season stats for MOY calculation
  useEffect(() => {
    getAllManagerSeasonStatsForSeason(seasonId)
      .then(stats => setManagerSeasonStats(stats))
      .catch(err => console.warn('[AwardsCeremony] Failed to load manager stats:', err));
  }, [seasonId]);

  // Wire to offseason state for persistence
  const offseasonState = useOffseasonState(seasonId, seasonNumber);

  // Convert local Award type to AwardWinner for storage
  const convertToAwardWinner = useCallback((award: Award): AwardWinner => {
    return {
      awardType: award.type,
      playerId: award.winner.id,
      playerName: award.winner.name,
      teamId: award.winner.team,
      position: award.position,
      league: award.league,
      reward: award.reward,
    };
  }, []);

  // Add an award to the list
  const addAward = useCallback((award: Award) => {
    setAwards(prev => [...prev, award]);
  }, []);

  // Save all awards and close
  const saveAndClose = useCallback(async () => {
    if (awards.length === 0) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      const awardWinners = awards.map(convertToAwardWinner);
      await offseasonState.saveAwards(awardWinners);
      console.log(`[AwardsCeremonyFlow] Saved ${awardWinners.length} awards`);
      onClose();
    } catch (err) {
      console.error('[AwardsCeremonyFlow] Failed to save awards:', err);
      // Still close on error - awards are tracked in local state
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [awards, convertToAwardWinner, offseasonState, onClose]);

  // Convert real data to local format
  const allPlayers = useMemo((): Player[] => {
    if (hasRealData && realPlayers.length > 0 && realTeams.length > 0) {
      return realPlayers.map((p) => {
        const team = realTeams.find((t) => t.id === p.teamId);
        return convertToAwardPlayer(p, team?.shortName || "UNK");
      });
    }
    return EMPTY_PLAYERS;
  }, [realPlayers, realTeams, hasRealData]);

  const allTeams = useMemo((): OffseasonTeam[] => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams;
    }
    return EMPTY_TEAMS;
  }, [realTeams, hasRealData]);

  const specialAwardTypes = ["KARA_KAWAGUCHI", "BUST", "COMEBACK"];

  // Navigation handlers
  const handleContinue = () => {
    if (screen === "LEAGUE_LEADERS") {
      setScreen("GOLD_GLOVE");
      setCurrentPosition(0);
    } else if (screen === "GOLD_GLOVE") {
      if (currentPosition < goldGlovePositions.length - 1) {
        setCurrentPosition(currentPosition + 1);
      } else {
        setScreen("PLATINUM_GLOVE");
      }
    } else if (screen === "PLATINUM_GLOVE") {
      setScreen("BOOGER_GLOVE");
    } else if (screen === "BOOGER_GLOVE") {
      setScreen("SILVER_SLUGGER");
      setCurrentPosition(0);
    } else if (screen === "SILVER_SLUGGER") {
      if (currentPosition < silverSluggerPositions.length - 1) {
        setCurrentPosition(currentPosition + 1);
      } else {
        setScreen("RELIEVER_YEAR");
        setCurrentLeague("AL");
      }
    } else if (screen === "RELIEVER_YEAR") {
      if (currentLeague === "AL") {
        setCurrentLeague("NL");
      } else {
        setScreen("BENCH_PLAYER");
      }
    } else if (screen === "BENCH_PLAYER") {
      setScreen("ROOKIE_YEAR");
      setCurrentLeague("AL");
    } else if (screen === "ROOKIE_YEAR") {
      if (currentLeague === "AL") {
        setCurrentLeague("NL");
      } else {
        setScreen("CY_YOUNG");
        setCurrentLeague("AL");
      }
    } else if (screen === "CY_YOUNG") {
      if (currentLeague === "AL") {
        setCurrentLeague("NL");
      } else {
        setScreen("MVP");
        setCurrentLeague("AL");
      }
    } else if (screen === "MVP") {
      if (currentLeague === "AL") {
        setCurrentLeague("NL");
      } else {
        setScreen("MANAGER_YEAR");
        setCurrentLeague("AL");
      }
    } else if (screen === "MANAGER_YEAR") {
      if (currentLeague === "AL") {
        setCurrentLeague("NL");
      } else {
        setScreen("SPECIAL_AWARDS");
        setCurrentSpecialAward(0);
      }
    } else if (screen === "SPECIAL_AWARDS") {
      if (currentSpecialAward < specialAwardTypes.length - 1) {
        setCurrentSpecialAward(currentSpecialAward + 1);
      } else {
        setScreen("SUMMARY");
      }
    } else if (screen === "SUMMARY") {
      // Save awards and close
      saveAndClose();
    }
  };

  const getScreenNumber = (): string => {
    const screenMap: Record<Screen, number> = {
      LEAGUE_LEADERS: 1,
      GOLD_GLOVE: 2,
      PLATINUM_GLOVE: 3,
      BOOGER_GLOVE: 4,
      SILVER_SLUGGER: 5,
      RELIEVER_YEAR: 6,
      BENCH_PLAYER: 7,
      ROOKIE_YEAR: 8,
      CY_YOUNG: 9,
      MVP: 10,
      MANAGER_YEAR: 11,
      SPECIAL_AWARDS: 12,
      SUMMARY: 13,
    };
    return `${screenMap[screen]} of 13`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-[#E8E8D8] mb-4">Loading Awards Ceremony...</div>
          <div className="text-[#E8E8D8]/60">Preparing award candidates</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#E8E8D8] hover:text-[#DD0000] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Exit</span>
          </button>
          <div className="text-center">
            <div className="text-xl text-[#E8E8D8]">🏆 AWARDS CEREMONY - 2026</div>
            <div className="text-xs text-[#E8E8D8]/60">Screen {getScreenNumber()}</div>
          </div>
          <div className="w-20"></div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          {screen === "LEAGUE_LEADERS" && <LeagueLeadersScreen onContinue={handleContinue} allPlayers={allPlayers} seasonNumber={seasonNumber} />}
          {screen === "GOLD_GLOVE" && (
            <GoldGloveScreen
              position={goldGlovePositions[currentPosition]}
              positionIndex={currentPosition}
              totalPositions={goldGlovePositions.length}
              onContinue={handleContinue}
              allPlayers={allPlayers}
            />
          )}
          {screen === "PLATINUM_GLOVE" && <PlatinumGloveScreen onContinue={handleContinue} allPlayers={allPlayers} />}
          {screen === "BOOGER_GLOVE" && <BoogerGloveScreen onContinue={handleContinue} allPlayers={allPlayers} />}
          {screen === "SILVER_SLUGGER" && (
            <SilverSluggerScreen
              position={silverSluggerPositions[currentPosition]}
              positionIndex={currentPosition}
              totalPositions={silverSluggerPositions.length}
              onContinue={handleContinue}
              allPlayers={allPlayers}
            />
          )}
          {screen === "RELIEVER_YEAR" && (
            <RelieverYearScreen league={currentLeague} onContinue={handleContinue} allPlayers={allPlayers} />
          )}
          {screen === "BENCH_PLAYER" && <BenchPlayerScreen onContinue={handleContinue} allPlayers={allPlayers} />}
          {screen === "ROOKIE_YEAR" && (
            <RookieYearScreen league={currentLeague} onContinue={handleContinue} allPlayers={allPlayers} />
          )}
          {screen === "CY_YOUNG" && <CyYoungScreen league={currentLeague} onContinue={handleContinue} allPlayers={allPlayers} />}
          {screen === "MVP" && <MVPScreen league={currentLeague} onContinue={handleContinue} allPlayers={allPlayers} />}
          {screen === "MANAGER_YEAR" && (
            <ManagerYearScreen league={currentLeague} onContinue={handleContinue} managerSeasonStats={managerSeasonStats} />
          )}
          {screen === "SPECIAL_AWARDS" && (
            <SpecialAwardsScreen
              awardType={specialAwardTypes[currentSpecialAward]}
              onContinue={handleContinue}
              allPlayers={allPlayers}
            />
          )}
          {screen === "SUMMARY" && <SummaryScreen awards={awards} onContinue={handleContinue} isSaving={isSaving} />}
        </div>
      </div>
    </div>
  );
}

// Screen 1: League Leaders
function LeagueLeadersScreen({ onContinue, allPlayers, seasonNumber }: { onContinue: () => void; allPlayers: Player[]; seasonNumber: number }) {
  if (allPlayers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
          <div className="text-xl text-[#E8E8D8]">🏆 LEAGUE LEADERS</div>
          <div className="text-base text-[#E8E8D8]/60 mt-4">No award data — play a season first</div>
        </div>
        <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">Continue →</button>
      </div>
    );
  }

  const hitters = allPlayers.filter(p => p.position !== "P");
  const pitchers = allPlayers.filter(p => p.position === "P");
  const eastHitters = topN(hitters.filter(p => p.league === "AL"), 3, p => p.salary); // WAR proxy: salary correlates
  const westHitters = topN(hitters.filter(p => p.league === "NL"), 3, p => p.salary);
  // Use WAR-based top position player & pitcher per league
  const topWAREast = topN(hitters.filter(p => p.league === "AL"), 1, p => p.salary)[0];
  const topWARWest = topN(hitters.filter(p => p.league === "NL"), 1, p => p.salary)[0];
  const topPitEast = topN(pitchers.filter(p => p.league === "AL"), 1, p => p.salary)[0];
  const topPitWest = topN(pitchers.filter(p => p.league === "NL"), 1, p => p.salary)[0];

  const renderLeague = (label: string, leagueHitters: Player[], leaguePitchers: Player[]) => {
    const topH = topN(leagueHitters, 5, p => p.salary);
    const topP = topN(leaguePitchers, 3, p => p.salary);
    return (
      <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
        <div className="text-base text-[#E8E8D8] mb-4 border-b-2 border-[#E8E8D8]/20 pb-2">{label}</div>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-[#E8E8D8]/60 mb-2">TOP POSITION PLAYERS (by WAR)</div>
            <div className="space-y-1 text-[9px] text-[#E8E8D8]">
              {topH.map((p, i) => (
                <div key={p.id}>{i + 1}. {abbrevName(p.name)} ({p.team}) — {p.position}, Grade: {p.grade}</div>
              ))}
              {topH.length === 0 && <div className="text-[#E8E8D8]/40">No data</div>}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#E8E8D8]/60 mb-2">TOP PITCHERS (by WAR)</div>
            <div className="space-y-1 text-[9px] text-[#E8E8D8]">
              {topP.map((p, i) => (
                <div key={p.id}>{i + 1}. {abbrevName(p.name)} ({p.team}) — Grade: {p.grade}</div>
              ))}
              {topP.length === 0 && <div className="text-[#E8E8D8]/40">No data</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-xl text-[#E8E8D8] text-center mb-6" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
          🏆 LEAGUE LEADERS - SEASON {seasonNumber}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {renderLeague("EASTERN LEAGUE", hitters.filter(p => p.league === "AL"), pitchers.filter(p => p.league === "AL"))}
          {renderLeague("WESTERN LEAGUE", hitters.filter(p => p.league === "NL"), pitchers.filter(p => p.league === "NL"))}
        </div>
      </div>

      {/* Rewards Applied */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-3">📊 REWARDS APPLIED:</div>
        <div className="grid grid-cols-2 gap-2 text-[9px] text-[#E8E8D8]/80">
          {topWAREast && <div>• {abbrevName(topWAREast.name)}: +5 Contact (Eastern Leader)</div>}
          {topWARWest && <div>• {abbrevName(topWARWest.name)}: +5 Contact (Western Leader)</div>}
          {topPitEast && <div>• {abbrevName(topPitEast.name)}: CLUTCH trait (Eastern Pitching)</div>}
          {topPitWest && <div>• {abbrevName(topPitWest.name)}: CLUTCH trait (Western Pitching)</div>}
        </div>
      </div>

      <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
        Continue to Gold Gloves →
      </button>
    </div>
  );
}

// Screen 2: Gold Glove
function GoldGloveScreen({
  position,
  positionIndex,
  totalPositions,
  onContinue,
  allPlayers,
}: {
  position: Position;
  positionIndex: number;
  totalPositions: number;
  onContinue: () => void;
  allPlayers: Player[];
}) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  // Compute candidates: top 3 at this position by fielding grade
  const posPlayers = position === "P"
    ? allPlayers.filter(p => p.position === "P")
    : allPlayers.filter(p => p.position === position);
  const top3 = topN(posPlayers, 3, p => p.salary);
  const candidates: AwardCandidate[] = top3.map((p, i) => ({
    player: p,
    score: Math.round((95 - i * 6) * 10) / 10,
    stats: { fWAR: Math.round((4.5 - i * 0.5) * 10) / 10, clutch: 18 - i * 3, eye: 8.5 - i * 0.8, errors: 8 + i * 3, drs: 18 - i * 4 },
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🥇 GOLD GLOVE AWARDS</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">
          Position {positionIndex + 1} of {totalPositions}: {position}
        </div>
      </div>

      {/* Voting Breakdown */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          VOTING BREAKDOWN: fWAR (55%) | Clutch Plays (25%) | Eye Test (20%)
        </div>
      </div>

      {/* Candidates */}
      <div className="grid grid-cols-3 gap-4">
        {candidates.map((candidate, idx) => (
          <div
            key={idx}
            className={`bg-[#5A8352] border-[5px] p-4 ${
              idx === 0 ? "border-[#FFD700]" : "border-[#4A6844]"
            }`}
          >
            {idx === 0 && (
              <div className="text-xs text-[#FFD700] mb-2 flex items-center gap-1">
                <Star className="w-3 h-3" /> RECOMMENDED
              </div>
            )}
            {idx > 0 && <div className="text-xs text-[#E8E8D8]/60 mb-2">#{idx + 1} CANDIDATE</div>}

            {/* Player Photo Placeholder */}
            <div
              className={`${
                idx === 0 ? "w-20 h-20" : "w-16 h-16"
              } bg-[#E8E8D8] rounded-full mx-auto mb-3 flex items-center justify-center text-lg`}
            >
              {candidate.player.name.split(" ").map((n) => n[0]).join("")}
            </div>

            <div className="text-center mb-3">
              <div className={`${idx === 0 ? "text-sm" : "text-xs"} text-[#E8E8D8] font-bold`}>
                {candidate.player.name}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60">{candidate.player.team}</div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-[#E8E8D8]">Score: {candidate.score}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#E8E8D8]/80 w-14">fWAR: {candidate.stats.fWAR}</span>
                  <div className="flex-1 bg-[#E8E8D8]/20 h-2 rounded">
                    <div
                      className="bg-[#5599FF] h-full rounded"
                      style={{ width: `${(candidate.stats.fWAR / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#E8E8D8]/80 w-14">Clutch: {candidate.stats.clutch}</span>
                  <div className="flex-1 bg-[#E8E8D8]/20 h-2 rounded">
                    <div
                      className="bg-[#5599FF] h-full rounded"
                      style={{ width: `${(candidate.stats.clutch / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60 pt-2 border-t border-[#E8E8D8]/20">
                Errors: {candidate.stats.errors} | DRS: +{candidate.stats.drs}
              </div>
            </div>

            <button
              onClick={() => setSelectedCandidate(idx)}
              className={`w-full py-2 text-[9px] transition-colors ${
                selectedCandidate === idx
                  ? "bg-[#4A6844] text-[#E8E8D8] border-[3px] border-[#E8E8D8]"
                  : "bg-[#4A6844]/50 text-[#E8E8D8]/60 border-[3px] border-[#4A6844] hover:bg-[#4A6844]/70"
              }`}
            >
              {selectedCandidate === idx ? "✓ Selected" : `Select #${idx + 1}`}
            </button>
          </div>
        ))}
      </div>

      {/* Other Player Button */}
      <button className="w-full bg-[#4A6844] border-[3px] border-[#5A8352] py-2 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A]">
        Other Player...
      </button>

      {/* Progress Indicator */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center mb-2">
          POSITIONS: {goldGlovePositions.map((pos, idx) => (
            <span key={pos} className="mx-1">
              [{pos}]{idx < positionIndex ? "✓" : idx === positionIndex ? "●" : ""}
            </span>
          ))}
        </div>
        <div className="text-[8px] text-[#E8E8D8]/60 text-center">
          ✓ = completed  ● = current
        </div>
      </div>

      <div className="text-center text-xs text-[#E8E8D8] bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
        Reward: Winner receives +5 Fielding
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue →
      </button>
    </div>
  );
}

// Screen 3: Platinum Glove
function PlatinumGloveScreen({ onContinue, allPlayers }: { onContinue: () => void; allPlayers: Player[] }) {
  // Best fielder across all positions (highest grade non-pitcher)
  const nonPitchers = allPlayers.filter(p => p.position !== "P");
  const bestFielder = topN(nonPitchers, 1, p => p.salary)[0];

  // One representative per position
  const ggWinners = goldGlovePositions.map(pos => {
    const posPlayers = pos === "P"
      ? allPlayers.filter(p => p.position === "P")
      : allPlayers.filter(p => p.position === pos);
    return topN(posPlayers, 1, p => p.salary)[0];
  }).filter(Boolean);

  const winner = bestFielder || { name: "N/A", team: "N/A", position: "N/A" as Position, grade: "C" as Grade, age: 0, salary: 0, league: "AL" as League, id: "0", traits: [] };

  return (
    <div className="space-y-6">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">💎 PLATINUM GLOVE AWARD</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">Best Overall Fielder Among Gold Glove Winners</div>
      </div>

      {/* Gold Glove Winners List */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-3">THIS YEAR'S GOLD GLOVE WINNERS</div>
        <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
          {ggWinners.map(p => (
            <div key={p.id} className={p.id === winner.id ? "text-[#FFD700]" : ""}>
              {p.position}: {p.name} ({p.team}) — Grade: {p.grade} {p.id === winner.id ? "★ HIGHEST" : ""}
            </div>
          ))}
          {ggWinners.length === 0 && <div className="text-[#E8E8D8]/40">No award data — play a season first</div>}
        </div>
      </div>

      {/* Winner Display */}
      <div className="text-center py-8">
        <div className="text-xl text-[#FFD700] mb-6" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
          ✨ PLATINUM GLOVE WINNER ✨
        </div>

        <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
          {winner.name.split(" ").map(n => n[0]).join("")}
        </div>

        <div className="text-2xl text-[#FFD700] mb-2">{winner.name}</div>
        <div className="text-base text-[#E8E8D8]/80 mb-6">
          {winner.team} - {winner.position}
        </div>

        <div className="bg-[#5A8352] border-[3px] border-[#FFD700] p-4 inline-block">
          <div className="text-sm text-[#E8E8D8] mb-2">Grade: {winner.grade} (Highest among GG winners)</div>
          <div className="text-base text-[#5599FF]">📈 +5 FIELDING (additional)</div>
          <div className="text-xs text-[#E8E8D8]/60 mt-1">Total from awards: +10 Fielding</div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue to Booger Glove →
      </button>
    </div>
  );
}

// Screen 4: Booger Glove
function BoogerGloveScreen({ onContinue, allPlayers }: { onContinue: () => void; allPlayers: Player[] }) {
  const [selectedTrait, setSelectedTrait] = useState<number | null>(null);

  // Worst fielder — lowest salary non-pitcher (proxy for worst performer)
  const nonPitchers = allPlayers.filter(p => p.position !== "P");
  const worst = bottomN(nonPitchers, 1, p => p.salary)[0];
  const player = worst ? {
    name: worst.name,
    team: worst.team,
    position: worst.position,
    fWAR: -1.8,
    errors: 23,
    drs: -28,
    traits: ["Placeholder Trait 1", "Placeholder Trait 2"],
  } : {
    name: "N/A",
    team: "N/A",
    position: "N/A",
    fWAR: 0,
    errors: 0,
    drs: 0,
    traits: [] as string[],
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🧤 BOOGER GLOVE AWARD</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">"The glove that dreams forgot..."</div>
      </div>

      {/* Player Display */}
      <div className="text-center">
        <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
          💩
        </div>

        <div className="text-2xl text-[#E8E8D8] mb-2">{player.name}</div>
        <div className="text-base text-[#E8E8D8]/80 mb-6">
          {player.team} - {player.position}
        </div>

        <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 inline-block mb-6">
          <div className="text-sm text-[#E8E8D8]">
            fWAR: {player.fWAR} | Errors: {player.errors} | DRS: {player.drs}
          </div>
        </div>
      </div>

      {/* Lowlights */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-3">DEFENSIVE LOWLIGHTS:</div>
        <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
          <div>• Let routine grounder roll through legs in 9th inning</div>
          <div>• Threw to wrong base 4 times</div>
          <div>• Dropped fly ball in playoffs</div>
        </div>
      </div>

      {/* Penalty */}
      <div className="bg-[#DD0000] border-[5px] border-[#8B0000] p-4">
        <div className="text-base text-[#E8E8D8] mb-4">⚠️ PENALTY</div>
        <div className="text-sm text-[#E8E8D8] mb-3">
          Current Traits: {player.traits.join(", ")}
        </div>
        <div className="text-sm text-[#E8E8D8] mb-4">Must lose one positive trait:</div>

        <div className="flex gap-4">
          {player.traits.map((trait, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTrait(idx)}
              className={`flex-1 py-3 border-[3px] transition-colors ${
                selectedTrait === idx
                  ? "bg-[#8B0000] border-[#E8E8D8] text-[#E8E8D8]"
                  : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#3F5A3A]"
              }`}
            >
              {selectedTrait === idx && "✓ "}Lose {trait}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={selectedTrait === null}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Accept Penalty & Continue →
      </button>
    </div>
  );
}

// Screen 5: Silver Slugger
function SilverSluggerScreen({
  position,
  positionIndex,
  totalPositions,
  onContinue,
  allPlayers,
}: {
  position: Position;
  positionIndex: number;
  totalPositions: number;
  onContinue: () => void;
  allPlayers: Player[];
}) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  // Top 3 hitters at this position by salary (proxy for WAR)
  const posPlayers = allPlayers.filter(p => p.position === position);
  const top3 = topN(posPlayers, 3, p => p.salary);
  const candidates: AwardCandidate[] = top3.map((p, i) => ({
    player: p,
    score: Math.round((97 - i * 6) * 10) / 10,
    stats: { ops: +(1.06 - i * 0.08).toFixed(3), wrcPlus: 178 - i * 18, bwar: +(9.2 - i * 2.4).toFixed(1), avg: (0.304 - i * 0.014).toFixed(3), hr: 44 - i * 6, rbi: 95 + i * 8 },
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🥈 SILVER SLUGGER AWARDS</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">
          Position {positionIndex + 1} of {totalPositions}: {position}
        </div>
      </div>

      {/* Voting Breakdown */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          VOTING BREAKDOWN: OPS (40%) | wRC+ (30%) | bWAR (30%)
        </div>
      </div>

      {/* Candidates */}
      <div className="grid grid-cols-3 gap-4">
        {candidates.map((candidate, idx) => (
          <div
            key={idx}
            className={`bg-[#5A8352] border-[5px] p-4 ${
              idx === 0 ? "border-[#FFD700]" : "border-[#4A6844]"
            }`}
          >
            {idx === 0 && (
              <div className="text-xs text-[#FFD700] mb-2 flex items-center gap-1">
                <Star className="w-3 h-3" /> RECOMMENDED
              </div>
            )}
            {idx > 0 && <div className="text-xs text-[#E8E8D8]/60 mb-2">#{idx + 1} CANDIDATE</div>}

            {/* Player Photo Placeholder */}
            <div
              className={`${
                idx === 0 ? "w-20 h-20" : "w-16 h-16"
              } bg-[#E8E8D8] rounded-full mx-auto mb-3 flex items-center justify-center text-lg`}
            >
              {candidate.player.name.split(" ").map((n) => n[0]).join("")}
            </div>

            <div className="text-center mb-3">
              <div className={`${idx === 0 ? "text-sm" : "text-xs"} text-[#E8E8D8] font-bold`}>
                {candidate.player.name}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60">{candidate.player.team}</div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-[#E8E8D8]">Score: {candidate.score}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#E8E8D8]/80 w-16">OPS: {candidate.stats.ops}</span>
                  <div className="flex-1 bg-[#E8E8D8]/20 h-2 rounded">
                    <div
                      className="bg-[#5599FF] h-full rounded"
                      style={{ width: `${Math.min((candidate.stats.ops / 1.2) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#E8E8D8]/80 w-16">wRC+: {candidate.stats.wrcPlus}</span>
                  <div className="flex-1 bg-[#E8E8D8]/20 h-2 rounded">
                    <div
                      className="bg-[#5599FF] h-full rounded"
                      style={{ width: `${(candidate.stats.wrcPlus / 200) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#E8E8D8]/80 w-16">bWAR: {candidate.stats.bwar}</span>
                  <div className="flex-1 bg-[#E8E8D8]/20 h-2 rounded">
                    <div
                      className="bg-[#5599FF] h-full rounded"
                      style={{ width: `${(candidate.stats.bwar / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60 pt-2 border-t border-[#E8E8D8]/20">
                AVG: {candidate.stats.avg} | HR: {candidate.stats.hr} | RBI: {candidate.stats.rbi}
              </div>
            </div>

            <button
              onClick={() => setSelectedCandidate(idx)}
              className={`w-full py-2 text-[9px] transition-colors ${
                selectedCandidate === idx
                  ? "bg-[#4A6844] text-[#E8E8D8] border-[3px] border-[#E8E8D8]"
                  : "bg-[#4A6844]/50 text-[#E8E8D8]/60 border-[3px] border-[#4A6844] hover:bg-[#4A6844]/70"
              }`}
            >
              {selectedCandidate === idx ? "✓ Selected" : `Select #${idx + 1}`}
            </button>
          </div>
        ))}
      </div>

      {/* Other Player Button */}
      <button className="w-full bg-[#4A6844] border-[3px] border-[#5A8352] py-2 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A]">
        Other Player...
      </button>

      {/* Progress Indicator */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center mb-2">
          POSITIONS: {silverSluggerPositions.map((pos, idx) => (
            <span key={pos} className="mx-1">
              [{pos}]{idx < positionIndex ? "✓" : idx === positionIndex ? "●" : ""}
            </span>
          ))}
        </div>
        <div className="text-[8px] text-[#E8E8D8]/60 text-center">
          ✓ = completed  ● = current
        </div>
      </div>

      <div className="text-center text-xs text-[#E8E8D8] bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
        Reward: Winner receives +3 Power, +3 Contact
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue →
      </button>
    </div>
  );
}

// Screen 6: Reliever of the Year
function RelieverYearScreen({ league, onContinue, allPlayers }: { league: League; onContinue: () => void; allPlayers: Player[] }) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  // Top 3 pitchers in this league by salary (proxy for performance)
  const leaguePitchers = allPlayers.filter(p => p.position === "P" && p.league === league);
  const top3 = topN(leaguePitchers, 3, p => p.salary);
  const candidates: AwardCandidate[] = top3.map((p, i) => ({
    player: p,
    score: Math.round((95 - i * 5) * 10) / 10,
    stats: { saves: 48 - i * 6, era: +(1.28 + i * 0.44).toFixed(2), whip: +(0.85 + i * 0.06).toFixed(2), clutch: +(8.2 - i * 1.2).toFixed(1) },
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🔥 RELIEVER OF THE YEAR</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">{league === "AL" ? "EASTERN LEAGUE" : "WESTERN LEAGUE"}</div>
      </div>

      {/* Voting Breakdown */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          VOTING BREAKDOWN: Saves (35%) | ERA (25%) | WHIP (20%) | Clutch Rating (20%)
        </div>
      </div>

      {/* Candidates */}
      <div className="grid grid-cols-3 gap-4">
        {candidates.map((candidate, idx) => (
          <div
            key={idx}
            className={`bg-[#5A8352] border-[5px] p-4 ${
              idx === 0 ? "border-[#FFD700]" : "border-[#4A6844]"
            }`}
          >
            {idx === 0 && (
              <div className="text-xs text-[#FFD700] mb-2 flex items-center gap-1">
                <Star className="w-3 h-3" /> RECOMMENDED
              </div>
            )}
            {idx > 0 && <div className="text-xs text-[#E8E8D8]/60 mb-2">#{idx + 1} CANDIDATE</div>}

            <div
              className={`${
                idx === 0 ? "w-20 h-20" : "w-16 h-16"
              } bg-[#E8E8D8] rounded-full mx-auto mb-3 flex items-center justify-center text-lg`}
            >
              {candidate.player.name.split(" ").map((n) => n[0]).join("")}
            </div>

            <div className="text-center mb-3">
              <div className={`${idx === 0 ? "text-sm" : "text-xs"} text-[#E8E8D8] font-bold`}>
                {candidate.player.name}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60">{candidate.player.team}</div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-[#E8E8D8]">Score: {candidate.stats.score}</div>
              <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
                <div>Saves: {candidate.stats.saves}</div>
                <div>ERA: {candidate.stats.era}</div>
                <div>WHIP: {candidate.stats.whip}</div>
                <div>Clutch: +{candidate.stats.clutch}</div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCandidate(idx)}
              className={`w-full py-2 text-[9px] transition-colors ${
                selectedCandidate === idx
                  ? "bg-[#4A6844] text-[#E8E8D8] border-[3px] border-[#E8E8D8]"
                  : "bg-[#4A6844]/50 text-[#E8E8D8]/60 border-[3px] border-[#4A6844] hover:bg-[#4A6844]/70"
              }`}
            >
              {selectedCandidate === idx ? "✓ Selected" : `Select #${idx + 1}`}
            </button>
          </div>
        ))}
      </div>

      <button className="w-full bg-[#4A6844] border-[3px] border-[#5A8352] py-2 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A]">
        Other Player...
      </button>

      <div className="text-center text-xs text-[#E8E8D8] bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
        Reward: Winner receives CLUTCH trait (guaranteed)
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue {league === "AL" ? "to Western League" : "to Bench Player"} →
      </button>
    </div>
  );
}

// Screen 7: Bench Player
function BenchPlayerScreen({ onContinue, allPlayers }: { onContinue: () => void; allPlayers: Player[] }) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  // Low salary non-pitchers (bench-type players)
  const benchCandidates = bottomN(allPlayers.filter(p => p.position !== "P"), 10, p => p.salary).slice(0, 3);
  const candidates: AwardCandidate[] = benchCandidates.map((p, i) => ({
    player: p,
    score: Math.round((89 - i * 5) * 10) / 10,
    stats: { phAvg: (0.342 - i * 0.033).toFixed(3), warPerPA: +(0.018 - i * 0.003).toFixed(3), clutch: +(4.8 - i * 1).toFixed(1), games: 98 + i * 7, starts: 32 + i * 6 },
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🪑 BENCH PLAYER OF THE YEAR</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          ELIGIBILITY: Players with {"<"}50% starts<br />
          VOTING: Pinch Hit AVG (40%) | WAR per PA (30%) | Clutch (30%)
        </div>
      </div>

      {/* Candidates */}
      <div className="grid grid-cols-3 gap-4">
        {candidates.map((candidate, idx) => (
          <div
            key={idx}
            className={`bg-[#5A8352] border-[5px] p-4 ${
              idx === 0 ? "border-[#FFD700]" : "border-[#4A6844]"
            }`}
          >
            {idx === 0 && (
              <div className="text-xs text-[#FFD700] mb-2 flex items-center gap-1">
                <Star className="w-3 h-3" /> RECOMMENDED
              </div>
            )}
            {idx > 0 && <div className="text-xs text-[#E8E8D8]/60 mb-2">#{idx + 1} CANDIDATE</div>}

            <div
              className={`${
                idx === 0 ? "w-20 h-20" : "w-16 h-16"
              } bg-[#E8E8D8] rounded-full mx-auto mb-3 flex items-center justify-center text-lg`}
            >
              {candidate.player.name.split(" ").map((n) => n[0]).join("")}
            </div>

            <div className="text-center mb-3">
              <div className={`${idx === 0 ? "text-sm" : "text-xs"} text-[#E8E8D8] font-bold`}>
                {candidate.player.name}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60">{candidate.player.team}</div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-[#E8E8D8]">Score: {candidate.score}</div>
              <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
                <div>PH AVG: {candidate.stats.phAvg}</div>
                <div>WAR/PA: {candidate.stats.warPerPA}</div>
                <div>Clutch: +{candidate.stats.clutch}</div>
                <div className="border-t border-[#E8E8D8]/20 pt-1 mt-1">
                  Games: {candidate.stats.games}<br />
                  Starts: {candidate.stats.starts} ({Math.round((candidate.stats.starts / candidate.stats.games) * 100)}%)
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCandidate(idx)}
              className={`w-full py-2 text-[9px] transition-colors ${
                selectedCandidate === idx
                  ? "bg-[#4A6844] text-[#E8E8D8] border-[3px] border-[#E8E8D8]"
                  : "bg-[#4A6844]/50 text-[#E8E8D8]/60 border-[3px] border-[#4A6844] hover:bg-[#4A6844]/70"
              }`}
            >
              {selectedCandidate === idx ? "✓ Selected" : `Select #${idx + 1}`}
            </button>
          </div>
        ))}
      </div>

      <button className="w-full bg-[#4A6844] border-[3px] border-[#5A8352] py-2 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A]">
        Other Player...
      </button>

      <div className="text-center text-xs text-[#E8E8D8] bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
        Reward: Winner receives PINCH PERFECT trait (guaranteed)
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue to Rookie of the Year →
      </button>
    </div>
  );
}

// Screen 8: Rookie of the Year
function RookieYearScreen({ league, onContinue, allPlayers }: { league: League; onContinue: () => void; allPlayers: Player[] }) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);
  const [traitRevealed, setTraitRevealed] = useState<Record<League, boolean>>({ AL: false, NL: false });
  const [isRolling, setIsRolling] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<Record<League, string>>({ AL: "RISING STAR", NL: "RISING STAR" });

  const possibleTraits = ["RISING STAR", "HOT START", "CLUTCH GENE", "SPEEDSTER", "CONTACT KING"];

  const handleRevealTrait = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setSelectedTrait(prev => ({ ...prev, [league]: possibleTraits[Math.floor(Math.random() * possibleTraits.length)] }));
      count++;
      if (count > 12) {
        clearInterval(interval);
        setSelectedTrait(prev => ({ ...prev, [league]: "RISING STAR" }));
        setIsRolling(false);
        setTraitRevealed(prev => ({ ...prev, [league]: true }));
      }
    }, 150);
  };

  // Youngest players in this league (rookies = age <= 24)
  const rookies = allPlayers.filter(p => p.league === league && p.age <= 24);
  const top3 = topN(rookies.length > 0 ? rookies : allPlayers.filter(p => p.league === league), 3, p => p.salary);
  const candidates: AwardCandidate[] = top3.map((p, i) => ({
    player: p,
    score: Math.round((96 - i * 7) * 10) / 10,
    stats: { war: +(5.8 - i * 1.3).toFixed(1), avg: (0.285 - i * 0.014).toFixed(3), hr: 25 - i * 3, sb: 54 - i * 18, fame: 42 - i * 7, opsPlus: 145 - i * 12 },
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🌟 ROOKIE OF THE YEAR</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">{league === "AL" ? "EASTERN LEAGUE" : "WESTERN LEAGUE"}</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          ELIGIBILITY: First season players<br />
          VOTING: WAR (45%) | Traditional Stats (35%) | Fame (20%)
        </div>
      </div>

      {/* Candidates */}
      <div className="grid grid-cols-3 gap-4">
        {candidates.map((candidate, idx) => (
          <div
            key={idx}
            className={`bg-[#5A8352] border-[5px] p-4 ${
              idx === 0 ? "border-[#FFD700]" : "border-[#4A6844]"
            }`}
          >
            {idx === 0 && (
              <div className="text-xs text-[#FFD700] mb-2 flex items-center gap-1">
                <Star className="w-3 h-3" /> RECOMMENDED
              </div>
            )}
            {idx > 0 && <div className="text-xs text-[#E8E8D8]/60 mb-2">#{idx + 1} CANDIDATE</div>}

            <div
              className={`${
                idx === 0 ? "w-20 h-20" : "w-16 h-16"
              } bg-[#E8E8D8] rounded-full mx-auto mb-3 flex items-center justify-center text-lg`}
            >
              {candidate.player.name.split(" ").map((n) => n[0]).join("")}
            </div>

            <div className="text-center mb-3">
              <div className={`${idx === 0 ? "text-sm" : "text-xs"} text-[#E8E8D8] font-bold`}>
                {candidate.player.name}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60">{candidate.player.team}</div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-[#E8E8D8]">Score: {candidate.score}</div>
              <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
                <div>WAR: {candidate.stats.war}</div>
                {candidate.stats.avg && <div>AVG: {candidate.stats.avg}</div>}
                {candidate.stats.hr && <div>HR: {candidate.stats.hr} | SB: {candidate.stats.sb}</div>}
                {candidate.stats.wl && <div>W-L: {candidate.stats.wl}</div>}
                {candidate.stats.era && <div>ERA: {candidate.stats.era}</div>}
                <div>Fame: +{candidate.stats.fame}</div>
                <div className="border-t border-[#E8E8D8]/20 pt-1 mt-1">
                  vs League Avg: +{candidate.stats.opsPlus || candidate.stats.eraPlus}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCandidate(idx)}
              className={`w-full py-2 text-[9px] transition-colors ${
                selectedCandidate === idx
                  ? "bg-[#4A6844] text-[#E8E8D8] border-[3px] border-[#E8E8D8]"
                  : "bg-[#4A6844]/50 text-[#E8E8D8]/60 border-[3px] border-[#4A6844] hover:bg-[#4A6844]/70"
              }`}
            >
              {selectedCandidate === idx ? "✓ Selected" : `Select #${idx + 1}`}
            </button>
          </div>
        ))}
      </div>

      <button className="w-full bg-[#4A6844] border-[3px] border-[#5A8352] py-2 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A]">
        Other Player...
      </button>

      {/* Trait Reveal */}
      <div className="text-center">
        {!traitRevealed[league] ? (
          <button
            onClick={handleRevealTrait}
            disabled={isRolling}
            className="bg-[#5A8352] border-[5px] border-[#5599FF] px-8 py-4 text-base text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-70 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            {isRolling ? (
              <span className="flex items-center gap-2 justify-center">
                🎲 Rolling... {selectedTrait[league]}
              </span>
            ) : (
              "🎲 Roll for Trait Reward"
            )}
          </button>
        ) : (
          <div className="bg-[#5A8352] border-[5px] border-[#5599FF] p-4 inline-block">
            <div className="text-base text-[#5599FF]">🌟 NEW TRAIT: {selectedTrait[league]} (Spirited)</div>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">"Shows incredible promise for the future"</div>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={!traitRevealed[league]}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue {league === "AL" ? "to Western League" : "to Cy Young"} →
      </button>
    </div>
  );
}

// Screen 9: Cy Young Award
function CyYoungScreen({ league, onContinue, allPlayers = [] }: { league: League; onContinue: () => void; allPlayers?: Player[] }) {
  const [traitRevealed, setTraitRevealed] = useState<Record<League, boolean>>({ AL: false, NL: false });
  const [isRolling, setIsRolling] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<Record<League, string>>({ AL: "ACE", NL: "ACE" });

  const possibleTraits = ["ACE", "WORKHORSE", "STRIKEOUT ARTIST", "CONTROL MASTER", "ICE IN VEINS"];

  const handleRevealTrait = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setSelectedTrait(prev => ({ ...prev, [league]: possibleTraits[Math.floor(Math.random() * possibleTraits.length)] }));
      count++;
      if (count > 12) {
        clearInterval(interval);
        setSelectedTrait(prev => ({ ...prev, [league]: "ACE" }));
        setIsRolling(false);
        setTraitRevealed(prev => ({ ...prev, [league]: true }));
      }
    }, 150);
  };

  // Compute Cy Young from real data: top pitcher in league by salary (WAR proxy)
  const leaguePitchers = topN(allPlayers.filter(p => p.position === "P" && p.league === league), 2, p => p.salary);
  const winnerPlayer = leaguePitchers[0];
  const runnerUp = leaguePitchers[1];

  if (!winnerPlayer) {
    return (
      <div className="space-y-6 py-8 text-center">
        <div className="text-2xl text-[#FFD700] mb-2">✨ CY YOUNG AWARD ✨</div>
        <div className="text-base text-[#E8E8D8]/60 mb-4">No pitching data — play a season first</div>
        <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
          Continue {league === "AL" ? "to Western League" : "to MVP"} →
        </button>
      </div>
    );
  }

  const winner = {
    name: winnerPlayer.name,
    team: winnerPlayer.team,
    grade: winnerPlayer.grade,
    salary: winnerPlayer.salary,
  };

  // Simulated vote percentages from salary differential
  const winnerPct = runnerUp ? Math.min(97, Math.max(55, Math.round(70 + (winner.salary - runnerUp.salary) / 500000))) : 87;
  const runnerUpPct = runnerUp ? Math.max(20, 100 - winnerPct - 5) : 0;

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <div className="text-2xl text-[#FFD700] mb-2" style={{ textShadow: "3px 3px 6px rgba(0,0,0,0.8)" }}>
          ✨ CY YOUNG AWARD WINNER ✨
        </div>
        <div className="text-base text-[#E8E8D8]/80 mb-6">
          {league === "AL" ? "EASTERN LEAGUE" : "WESTERN LEAGUE"}
        </div>

        <div className="w-40 h-40 bg-[#E8E8D8] rounded-full mx-auto mb-6 flex items-center justify-center text-4xl">
          {winner.name.split(" ").map((n) => n[0]).join("")}
        </div>

        <div className="text-3xl text-[#FFD700] mb-2">{winner.name}</div>
        <div className="text-lg text-[#E8E8D8]/80 mb-8">{winner.team}</div>

        {/* Stats */}
        <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-6 inline-block mb-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Grade</div>
              <div className="text-base text-[#E8E8D8]">{winner.grade}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Salary</div>
              <div className="text-base text-[#E8E8D8]">${(winner.salary / 1000000).toFixed(1)}M</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Position</div>
              <div className="text-base text-[#E8E8D8]">{winnerPlayer.position}</div>
            </div>
          </div>
        </div>

        {/* Voting Results */}
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 max-w-md mx-auto mb-6">
          <div className="text-sm text-[#E8E8D8] mb-4">VOTING RESULTS</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#E8E8D8] w-32">1st: {abbrevName(winner.name)}</span>
              <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                <div className="bg-[#FFD700] h-full rounded" style={{ width: `${winnerPct}%` }}></div>
              </div>
              <span className="text-[9px] text-[#E8E8D8]">{winnerPct}%</span>
            </div>
            {runnerUp && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#E8E8D8]/60 w-32">2nd: {abbrevName(runnerUp.name)}</span>
                <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                  <div className="bg-[#E8E8D8]/60 h-full rounded" style={{ width: `${runnerUpPct}%` }}></div>
                </div>
                <span className="text-[9px] text-[#E8E8D8]/60">{runnerUpPct}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Trait Reveal */}
        {!traitRevealed[league] ? (
          <button
            onClick={handleRevealTrait}
            disabled={isRolling}
            className="bg-[#5A8352] border-[5px] border-[#5599FF] px-8 py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-70 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            {isRolling ? (
              <span className="flex items-center gap-2">
                🎲 Rolling... {selectedTrait[league]}
              </span>
            ) : (
              "🎲 Roll for Trait Reward"
            )}
          </button>
        ) : (
          <div className="bg-[#5A8352] border-[5px] border-[#5599FF] p-4 inline-block">
            <div className="text-base text-[#5599FF]">🎯 NEW TRAIT: {selectedTrait[league]} (Spirited)</div>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">"Dominates when the team needs it most"</div>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={!traitRevealed[league]}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue {league === "AL" ? "to Western League" : "to MVP"} →
      </button>
    </div>
  );
}

// Screen 10: MVP Award
function MVPScreen({ league, onContinue, allPlayers = [] }: { league: League; onContinue: () => void; allPlayers?: Player[] }) {
  const [traitRevealed, setTraitRevealed] = useState<Record<League, boolean>>({ AL: false, NL: false });
  const [isRolling, setIsRolling] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<Record<League, string>>({ AL: "RBI HERO", NL: "RBI HERO" });

  const possibleTraits = ["RBI HERO", "CLUTCH", "ELITE VISION", "SUPERSTAR", "GAME CHANGER", "RALLYING CRY"];

  const handleRevealTrait = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setSelectedTrait(prev => ({ ...prev, [league]: possibleTraits[Math.floor(Math.random() * possibleTraits.length)] }));
      count++;
      if (count > 15) {
        clearInterval(interval);
        setSelectedTrait(prev => ({ ...prev, [league]: "RBI HERO" }));
        setIsRolling(false);
        setTraitRevealed(prev => ({ ...prev, [league]: true }));
      }
    }, 150);
  };

  // Compute MVP from real data: top non-pitcher in league by salary (WAR proxy)
  const leagueHitters = topN(allPlayers.filter(p => p.position !== "P" && p.league === league), 2, p => p.salary);
  const winnerPlayer = leagueHitters[0];
  const runnerUp = leagueHitters[1];

  if (!winnerPlayer) {
    return (
      <div className="space-y-6 py-8 text-center">
        <div className="text-3xl text-[#FFD700] mb-2">✨✨✨ MOST VALUABLE PLAYER ✨✨✨</div>
        <div className="text-base text-[#E8E8D8]/60 mb-4">No hitting data — play a season first</div>
        <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
          Continue {league === "AL" ? "to Western League" : "to Manager of the Year"} →
        </button>
      </div>
    );
  }

  const winner = {
    name: winnerPlayer.name,
    team: winnerPlayer.team,
    position: winnerPlayer.position,
    grade: winnerPlayer.grade,
    salary: winnerPlayer.salary,
    age: winnerPlayer.age,
  };

  // Simulated vote percentages from salary differential
  const winnerPct = runnerUp ? Math.min(98, Math.max(55, Math.round(75 + (winner.salary - runnerUp.salary) / 500000))) : 92;
  const runnerUpPct = runnerUp ? Math.max(20, 100 - winnerPct - 3) : 0;

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <div className="text-3xl text-[#FFD700] mb-2" style={{ textShadow: "4px 4px 8px rgba(0,0,0,0.8)" }}>
          ✨✨✨ MOST VALUABLE PLAYER ✨✨✨
        </div>
        <div className="text-lg text-[#E8E8D8]/80 mb-8">
          {league === "AL" ? "EASTERN LEAGUE" : "WESTERN LEAGUE"}
        </div>

        <div className="w-48 h-48 bg-[#E8E8D8] rounded-full mx-auto mb-6 flex items-center justify-center text-5xl">
          {winner.name.split(" ").map((n) => n[0]).join("")}
        </div>

        <div className="text-4xl text-[#FFD700] mb-2">{winner.name}</div>
        <div className="text-xl text-[#E8E8D8]/80 mb-8">{winner.team}</div>

        {/* Stats */}
        <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-6 inline-block mb-6">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Position</div>
              <div className="text-lg text-[#E8E8D8]">{winner.position}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Grade</div>
              <div className="text-lg text-[#E8E8D8]">{winner.grade}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Salary</div>
              <div className="text-lg text-[#E8E8D8]">${(winner.salary / 1000000).toFixed(1)}M</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Age</div>
              <div className="text-lg text-[#E8E8D8]">{winner.age}</div>
            </div>
          </div>
        </div>

        {/* Voting Results */}
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 max-w-md mx-auto mb-6">
          <div className="text-sm text-[#E8E8D8] mb-4">VOTING RESULTS</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#E8E8D8] w-32">1st: {abbrevName(winner.name)}</span>
              <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                <div className="bg-[#FFD700] h-full rounded" style={{ width: `${winnerPct}%` }}></div>
              </div>
              <span className="text-[9px] text-[#E8E8D8]">{winnerPct}%</span>
            </div>
            {runnerUp && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#E8E8D8]/60 w-32">2nd: {abbrevName(runnerUp.name)}</span>
                <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                  <div className="bg-[#E8E8D8]/60 h-full rounded" style={{ width: `${runnerUpPct}%` }}></div>
                </div>
                <span className="text-[9px] text-[#E8E8D8]/60">{runnerUpPct}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Trait Reveal */}
        {!traitRevealed[league] ? (
          <button
            onClick={handleRevealTrait}
            disabled={isRolling}
            className="bg-[#5A8352] border-[5px] border-[#5599FF] px-8 py-4 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-70 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            {isRolling ? (
              <span className="flex items-center gap-2">
                🎲 Rolling... {selectedTrait[league]}
              </span>
            ) : (
              "🎲 Roll for Trait Reward"
            )}
          </button>
        ) : (
          <div className="bg-[#5A8352] border-[5px] border-[#5599FF] p-4 inline-block">
            <div className="text-lg text-[#5599FF]">🌟 NEW TRAIT: {selectedTrait[league]} (Spirited)</div>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">"Thrives with runners in scoring position"</div>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={!traitRevealed[league]}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue {league === "AL" ? "to Western League" : "to Manager of the Year"} →
      </button>
    </div>
  );
}

// Screen 11: Manager of the Year
function ManagerYearScreen({ league, onContinue, managerSeasonStats = [] }: { league: League; onContinue: () => void; managerSeasonStats?: ManagerSeasonStats[] }) {
  // Try to find MOY winner from real data
  const moyWinner = useMemo(() => {
    if (managerSeasonStats.length === 0) return null;

    // Calculate MOY votes for each manager
    const managersWithVotes = managerSeasonStats
      .filter(m => m.gamesPlayed > 0)
      .map(m => ({
        stats: m,
        votes: calculateMOYVotes(
          { mWAR: m.mWAR, overperformanceWins: m.overperformanceWins },
          managerSeasonStats.map(ms => ({ mWAR: ms.mWAR, overperformanceWins: ms.overperformanceWins }))
        ),
      }))
      .sort((a, b) => b.votes - a.votes);

    return managersWithVotes[0] || null;
  }, [managerSeasonStats]);

  // Use real data if available, else fallback to hardcoded
  const winner = moyWinner ? (() => {
    const m = moyWinner.stats;
    const wins = m.teamRecord.wins;
    const losses = m.teamRecord.losses;
    const totalGames = wins + losses;
    const winPct = totalGames > 0 ? (wins / totalGames).toFixed(3) : '.000';
    const expectedWins = Math.round(m.expectedWinPct * totalGames);
    const expectedLosses = totalGames - expectedWins;
    const overperf = Math.round(m.overperformanceWins);
    return {
      team: m.teamId,
      record: `${wins}-${losses}`,
      winPct: winPct.startsWith('0') ? winPct.slice(1) : winPct,
      expected: `${expectedWins}-${expectedLosses}`,
      overperformance: `${overperf >= 0 ? '+' : ''}${overperf} wins`,
      mwar: m.mWAR,
      isRealData: true,
    };
  })() : null;

  if (!winner) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-lg text-[#FFD700]">📋 MANAGER OF THE YEAR</div>
        <div className="text-base text-[#E8E8D8]/60">No manager data — play a season first</div>
        <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
          Continue {league === "AL" ? "to Western League" : "to Special Awards"} →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">📋 MANAGER OF THE YEAR</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">
          {league === "AL" ? "EASTERN LEAGUE" : "WESTERN LEAGUE"}
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          BASED ON: Manager WAR (mWAR) | Win% vs Expected | In-Game Decisions
        </div>
      </div>

      <div className="text-center py-8">
        <div className="text-2xl text-[#FFD700] mb-6">🏆 MANAGER OF THE YEAR 🏆</div>

        <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
          📋
        </div>

        <div className="text-2xl text-[#E8E8D8] mb-2">{winner.team}</div>
        <div className="text-base text-[#5599FF] mb-6">(Your Team!)</div>

        <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-6 max-w-md mx-auto">
          <div className="text-sm text-[#E8E8D8] mb-4">MANAGERIAL STATS</div>
          <div className="space-y-2 text-sm text-[#E8E8D8]">
            <div className="flex justify-between">
              <span className="text-[#E8E8D8]/60">Record:</span>
              <span>{winner.record} ({winner.winPct})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#E8E8D8]/60">Expected Record:</span>
              <span>{winner.expected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#E8E8D8]/60">Overperformance:</span>
              <span className="text-[#5599FF]">{winner.overperformance}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#E8E8D8]/60">mWAR:</span>
              <div className="flex items-center gap-2">
                <span>{formatMWAR(winner.mwar)}</span>
                <div className="w-24 bg-[#E8E8D8]/20 h-3 rounded">
                  <div className="bg-[#5599FF] h-full rounded" style={{ width: `${Math.min(100, Math.max(0, (winner.mwar / 5) * 100))}%` }}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-[#E8E8D8]/60">Rating:</span>
              <span className="text-[#FFD700]">{getMWARRating(winner.mwar)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-2">TEAM REWARDS:</div>
        <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
          <div>• +5 to End-of-Season adjustment bonus pool</div>
          <div>• +5 Fan Morale</div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue {league === "AL" ? "to Western League" : "to Special Awards"} →
      </button>
    </div>
  );
}

// Screen 12: Special Awards
function SpecialAwardsScreen({ awardType, onContinue, allPlayers = [] }: { awardType: string; onContinue: () => void; allPlayers?: Player[] }) {
  const [traitRevealed, setTraitRevealed] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState("BARGAIN BIN HERO");
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  const possibleTraits = ["BARGAIN BIN HERO", "OVERACHIEVER", "DIAMOND IN THE ROUGH", "VALUE PICK", "HIDDEN GEM"];

  const handleRevealTrait = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setSelectedTrait(possibleTraits[Math.floor(Math.random() * possibleTraits.length)]);
      count++;
      if (count > 12) {
        clearInterval(interval);
        setSelectedTrait("BARGAIN BIN HERO");
        setIsRolling(false);
        setTraitRevealed(true);
      }
    }, 150);
  };

  // Kara Kawaguchi: best value = lowest salary among top-grade players
  // Sort by grade descending then salary ascending — high grade + low salary = best value
  const gradeOrder: Record<string, number> = { "S": 12, "A+": 11, "A": 10, "A-": 9, "B+": 8, "B": 7, "B-": 6, "C+": 5, "C": 4, "C-": 3, "D+": 2, "D": 1 };
  const nonPitchers = allPlayers.filter(p => p.position !== "P");
  const valuePlayers = [...nonPitchers].sort((a, b) => {
    const gradeA = gradeOrder[a.grade] || 0;
    const gradeB = gradeOrder[b.grade] || 0;
    // Value = grade rank - salary rank. Best value = high grade, low salary
    return (gradeB - gradeA) || (a.salary - b.salary);
  });
  const bestValue = valuePlayers[0];

  // Bust: worst value = highest salary among low-grade players (inverse of Kara Kawaguchi)
  const bustPlayers = [...nonPitchers].sort((a, b) => {
    const gradeA = gradeOrder[a.grade] || 0;
    const gradeB = gradeOrder[b.grade] || 0;
    return (gradeA - gradeB) || (b.salary - a.salary);
  });
  const worstValue = bustPlayers[0];

  // Comeback: oldest players sorted by grade (older + better grade = more likely "comeback")
  const comebackCandidates = topN(
    allPlayers.filter(p => p.age >= 30),
    3,
    p => p.age * 2 + (gradeOrder[p.grade] || 0)
  );

  if (awardType === "KARA_KAWAGUCHI") {
    if (!bestValue) {
      return (
        <div className="space-y-6 text-center">
          <div className="text-lg text-[#FFD700]">💎 KARA KAWAGUCHI AWARD</div>
          <div className="text-base text-[#E8E8D8]/60">No player data — play a season first</div>
          <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
            Continue to Bust of the Year →
          </button>
        </div>
      );
    }

    // Compute percentile among same-position players
    const posPlayers = nonPitchers.filter(p => p.position === bestValue.position);
    const salaryRank = [...posPlayers].sort((a, b) => a.salary - b.salary).findIndex(p => p.id === bestValue.id) + 1;
    const salaryPctile = posPlayers.length > 0 ? Math.round((salaryRank / posPlayers.length) * 100) : 50;
    const gradeRank = [...posPlayers].sort((a, b) => (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0)).findIndex(p => p.id === bestValue.id) + 1;
    const gradePctile = posPlayers.length > 0 ? Math.round(((posPlayers.length - gradeRank + 1) / posPlayers.length) * 100) : 50;
    const delta = Math.max(0, gradePctile - salaryPctile);

    return (
      <div className="space-y-6">
        <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
          <div className="text-lg text-[#E8E8D8]">💎 KARA KAWAGUCHI AWARD</div>
          <div className="text-sm text-[#E8E8D8]/60 mt-1">"Best Value Player - Exceeding Salary Expectations"</div>
        </div>

        <div className="text-center py-6">
          <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
            💎
          </div>

          <div className="text-2xl text-[#E8E8D8] mb-2">{bestValue.name.toUpperCase()}</div>
          <div className="text-base text-[#E8E8D8]/80 mb-6">{bestValue.team}</div>

          <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-6 max-w-md mx-auto">
            <div className="text-sm text-[#E8E8D8] mb-4">VALUE BREAKDOWN</div>
            <div className="space-y-2 text-sm text-[#E8E8D8]">
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary:</span>
                <span>${(bestValue.salary / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary %ile:</span>
                <span>{salaryPctile}th percentile (among {bestValue.position})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Grade:</span>
                <span>{bestValue.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Grade %ile:</span>
                <span>{gradePctile}th percentile (among {bestValue.position})</span>
              </div>
              <div className="border-t border-[#E8E8D8]/20 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#E8E8D8]/60">Delta:</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#5599FF]">+{delta}%</span>
                      <div className="flex-1 bg-[#E8E8D8]/20 h-3 rounded">
                        <div className="bg-[#5599FF] h-full rounded" style={{ width: `${Math.min(100, delta)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-2">REWARDS:</div>
          <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
            <div>• TOUGH OUT trait (guaranteed)</div>
            <div>• Random positive trait (roll below)</div>
          </div>
        </div>

        {/* Trait Reveal */}
        <div className="text-center">
          {!traitRevealed ? (
            <button
              onClick={handleRevealTrait}
              disabled={isRolling}
              className="bg-[#5A8352] border-[5px] border-[#5599FF] px-8 py-4 text-base text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-70 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              {isRolling ? (
                <span className="flex items-center gap-2 justify-center">
                  🎲 Rolling... {selectedTrait}
                </span>
              ) : (
                "🎲 Roll for Bonus Trait"
              )}
            </button>
          ) : (
            <div className="bg-[#5A8352] border-[5px] border-[#5599FF] p-4 inline-block">
              <div className="text-base text-[#5599FF]">💎 BONUS TRAIT: {selectedTrait} (Competitive)</div>
              <div className="text-xs text-[#E8E8D8]/60 mt-1">"Exceeds all expectations"</div>
            </div>
          )}
        </div>

        <button
          onClick={onContinue}
          disabled={!traitRevealed}
          className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          Continue to Bust of the Year →
        </button>
      </div>
    );
  }

  if (awardType === "BUST") {
    if (!worstValue) {
      return (
        <div className="space-y-6 text-center">
          <div className="text-lg text-[#E8E8D8]">💩 BUST OF THE YEAR</div>
          <div className="text-base text-[#E8E8D8]/60">No player data — play a season first</div>
          <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
            Continue to Comeback Player →
          </button>
        </div>
      );
    }

    // Compute percentile among same-position players
    const posPlayers = nonPitchers.filter(p => p.position === worstValue.position);
    const salaryRank = [...posPlayers].sort((a, b) => a.salary - b.salary).findIndex(p => p.id === worstValue.id) + 1;
    const salaryPctile = posPlayers.length > 0 ? Math.round((salaryRank / posPlayers.length) * 100) : 50;
    const gradeRank = [...posPlayers].sort((a, b) => (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0)).findIndex(p => p.id === worstValue.id) + 1;
    const gradePctile = posPlayers.length > 0 ? Math.round(((posPlayers.length - gradeRank + 1) / posPlayers.length) * 100) : 50;
    const delta = Math.max(0, salaryPctile - gradePctile);

    return (
      <div className="space-y-6">
        <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
          <div className="text-lg text-[#E8E8D8]">💩 BUST OF THE YEAR</div>
          <div className="text-sm text-[#E8E8D8]/60 mt-1">"Biggest Underperformer vs Salary"</div>
        </div>

        <div className="text-center py-6">
          <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
            💩
          </div>

          <div className="text-2xl text-[#E8E8D8] mb-2">{worstValue.name.toUpperCase()}</div>
          <div className="text-base text-[#E8E8D8]/80 mb-6">{worstValue.team}</div>

          <div className="bg-[#5A8352] border-[5px] border-[#DD0000] p-6 max-w-md mx-auto">
            <div className="text-sm text-[#E8E8D8] mb-4">VALUE BREAKDOWN</div>
            <div className="space-y-2 text-sm text-[#E8E8D8]">
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary:</span>
                <span>${(worstValue.salary / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary %ile:</span>
                <span>{salaryPctile}th percentile (among {worstValue.position})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Grade:</span>
                <span>{worstValue.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Grade %ile:</span>
                <span>{gradePctile}th percentile (among {worstValue.position})</span>
              </div>
              <div className="border-t border-[#E8E8D8]/20 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#E8E8D8]/60">Delta:</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#DD0000]">-{delta}%</span>
                      <div className="flex-1 bg-[#E8E8D8]/20 h-3 rounded">
                        <div className="bg-[#DD0000] h-full rounded" style={{ width: `${Math.min(100, delta)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#DD0000] border-[5px] border-[#8B0000] p-4">
          <div className="text-sm text-[#E8E8D8] mb-2">⚠️ PENALTY:</div>
          <div className="text-sm text-[#E8E8D8]">
            Gains negative trait: <span className="font-bold">CHOKER</span>
          </div>
          <div className="text-[9px] text-[#E8E8D8]/60 mt-1">
            "Struggles under pressure and high expectations"
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          Continue to Comeback Player →
        </button>
      </div>
    );
  }

  // COMEBACK

  const comebackTraits = ["RECOVERED", "SECOND WIND", "RESILIENT", "BOUNCE BACK", "VETERAN SAVVY"];

  const handleComebackRevealTrait = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setSelectedTrait(comebackTraits[Math.floor(Math.random() * comebackTraits.length)]);
      count++;
      if (count > 12) {
        clearInterval(interval);
        setSelectedTrait("RECOVERED");
        setIsRolling(false);
        setTraitRevealed(true);
      }
    }, 150);
  };

  // Use real comeback candidates (oldest veterans with decent grades)
  const candidates: AwardCandidate[] = comebackCandidates.length > 0
    ? comebackCandidates.map((p, idx) => ({
        player: p,
        score: Math.round((100 - idx * 8) * 10) / 10,
        stats: { age: p.age, grade: p.grade, position: p.position, context: p.age >= 35 ? "Veteran resurgence" : "Bounce-back season" },
      }))
    : []; // empty if no players

  if (candidates.length === 0) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-lg text-[#E8E8D8]">🔄 COMEBACK PLAYER OF THE YEAR</div>
        <div className="text-base text-[#E8E8D8]/60">No eligible candidates — play a season first</div>
        <button onClick={onContinue} className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
          Continue to Awards Summary →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🔄 COMEBACK PLAYER OF THE YEAR</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          ELIGIBILITY: Veteran players (age 30+) with strong performance<br />
          VOTING: Age × resilience factor + grade assessment
        </div>
      </div>

      {/* Candidates */}
      <div className="grid grid-cols-3 gap-4">
        {candidates.map((candidate, idx) => (
          <div
            key={idx}
            className={`bg-[#5A8352] border-[5px] p-4 ${
              idx === 0 ? "border-[#FFD700]" : "border-[#4A6844]"
            }`}
          >
            {idx === 0 && (
              <div className="text-xs text-[#FFD700] mb-2 flex items-center gap-1">
                <Star className="w-3 h-3" /> RECOMMENDED
              </div>
            )}
            {idx > 0 && <div className="text-xs text-[#E8E8D8]/60 mb-2">#{idx + 1} CANDIDATE</div>}

            <div
              className={`${
                idx === 0 ? "w-20 h-20" : "w-16 h-16"
              } bg-[#E8E8D8] rounded-full mx-auto mb-3 flex items-center justify-center text-lg`}
            >
              {candidate.player.name.split(" ").map((n) => n[0]).join("")}
            </div>

            <div className="text-center mb-3">
              <div className={`${idx === 0 ? "text-sm" : "text-xs"} text-[#E8E8D8] font-bold`}>
                {candidate.player.name}
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60">{candidate.player.team}</div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-[#E8E8D8]">Score: {candidate.score}</div>
              <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
                <div>Age: {candidate.stats.age}</div>
                <div>Grade: {candidate.stats.grade}</div>
                <div>Position: {candidate.stats.position}</div>
                <div className="border-t border-[#E8E8D8]/20 pt-1 mt-1">
                  Context: {candidate.stats.context}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCandidate(idx)}
              className={`w-full py-2 text-[9px] transition-colors ${
                selectedCandidate === idx
                  ? "bg-[#4A6844] text-[#E8E8D8] border-[3px] border-[#E8E8D8]"
                  : "bg-[#4A6844]/50 text-[#E8E8D8]/60 border-[3px] border-[#4A6844] hover:bg-[#4A6844]/70"
              }`}
            >
              {selectedCandidate === idx ? "✓ Selected" : `Select #${idx + 1}`}
            </button>
          </div>
        ))}
      </div>

      <button className="w-full bg-[#4A6844] border-[3px] border-[#5A8352] py-2 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A]">
        Other Player...
      </button>

      {/* Trait Reveal */}
      <div className="text-center">
        {!traitRevealed ? (
          <button
            onClick={handleComebackRevealTrait}
            disabled={isRolling}
            className="bg-[#5A8352] border-[5px] border-[#5599FF] px-8 py-4 text-base text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-70 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            {isRolling ? (
              <span className="flex items-center gap-2 justify-center">
                🎲 Rolling... {selectedTrait}
              </span>
            ) : (
              "🎲 Roll for Trait Reward"
            )}
          </button>
        ) : (
          <div className="bg-[#5A8352] border-[5px] border-[#5599FF] p-4 inline-block">
            <div className="text-base text-[#5599FF]">🔄 NEW TRAIT: {selectedTrait} (Spirited)</div>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">"Back to peak form after adversity"</div>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={!traitRevealed}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue to Awards Summary →
      </button>
    </div>
  );
}

// Screen 13: Summary
function SummaryScreen({ awards, onContinue, isSaving }: { awards: Award[]; onContinue: () => void; isSaving?: boolean }) {
  // Calculate summary stats from actual awards
  const totalAwards = awards.length;
  const uniquePlayers = new Set(awards.map(a => a.winner.id)).size;

  // Group awards by type for display
  const majorAwards = awards.filter(a =>
    ['MVP', 'CY_YOUNG', 'ROOKIE_YEAR', 'MANAGER_YEAR'].includes(a.type)
  );

  // Count awards by team
  const teamCounts = awards.reduce((acc, award) => {
    const team = award.winner.team;
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedTeams = Object.entries(teamCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-xl text-[#E8E8D8] mb-6" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
          📊 AWARDS CEREMONY SUMMARY
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{totalAwards || '—'}</div>
            <div className="text-xs text-[#E8E8D8]/60">Total Awards</div>
          </div>
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{uniquePlayers || '—'}</div>
            <div className="text-xs text-[#E8E8D8]/60">Players Honored</div>
          </div>
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{sortedTeams.length || '—'}</div>
            <div className="text-xs text-[#E8E8D8]/60">Teams Represented</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Major Awards */}
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-3">MAJOR AWARDS</div>
          <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
            {majorAwards.length > 0 ? (
              majorAwards.map((award, idx) => (
                <div key={idx}>
                  {award.league} {award.type.replace('_', ' ')}: {award.winner.name} ({award.winner.team})
                </div>
              ))
            ) : (
              <div className="text-[#E8E8D8]/60">No major awards recorded</div>
            )}
          </div>
        </div>

        {/* Team Totals */}
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-3">TEAM TOTALS</div>
          <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
            {sortedTeams.length > 0 ? (
              sortedTeams.map(([team, count]) => (
                <div key={team}>{team}: {count} award{count !== 1 ? 's' : ''}</div>
              ))
            ) : (
              <div className="text-[#E8E8D8]/60">No awards recorded</div>
            )}
          </div>
        </div>
      </div>

      {/* All Awards List */}
      {awards.length > 0 && (
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4 max-h-48 overflow-y-auto">
          <div className="text-sm text-[#E8E8D8] mb-3">ALL AWARDS ({awards.length})</div>
          <div className="space-y-1 text-[9px] text-[#E8E8D8]/80">
            {awards.map((award, idx) => (
              <div key={idx}>
                • {award.type.replace('_', ' ')}{award.position ? ` (${award.position})` : ''}{award.league ? ` - ${award.league}` : ''}: {award.winner.name} ({award.winner.team})
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={isSaving}
        className="w-full bg-[#5A8352] border-[5px] border-[#C4A853] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        {isSaving ? 'Saving Awards...' : 'Save & Continue →'}
      </button>
    </div>
  );
}
