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
          {screen === "LEAGUE_LEADERS" && <LeagueLeadersScreen onContinue={handleContinue} />}
          {screen === "GOLD_GLOVE" && (
            <GoldGloveScreen
              position={goldGlovePositions[currentPosition]}
              positionIndex={currentPosition}
              totalPositions={goldGlovePositions.length}
              onContinue={handleContinue}
            />
          )}
          {screen === "PLATINUM_GLOVE" && <PlatinumGloveScreen onContinue={handleContinue} />}
          {screen === "BOOGER_GLOVE" && <BoogerGloveScreen onContinue={handleContinue} />}
          {screen === "SILVER_SLUGGER" && (
            <SilverSluggerScreen
              position={silverSluggerPositions[currentPosition]}
              positionIndex={currentPosition}
              totalPositions={silverSluggerPositions.length}
              onContinue={handleContinue}
            />
          )}
          {screen === "RELIEVER_YEAR" && (
            <RelieverYearScreen league={currentLeague} onContinue={handleContinue} />
          )}
          {screen === "BENCH_PLAYER" && <BenchPlayerScreen onContinue={handleContinue} />}
          {screen === "ROOKIE_YEAR" && (
            <RookieYearScreen league={currentLeague} onContinue={handleContinue} />
          )}
          {screen === "CY_YOUNG" && <CyYoungScreen league={currentLeague} onContinue={handleContinue} />}
          {screen === "MVP" && <MVPScreen league={currentLeague} onContinue={handleContinue} />}
          {screen === "MANAGER_YEAR" && (
            <ManagerYearScreen league={currentLeague} onContinue={handleContinue} managerSeasonStats={managerSeasonStats} />
          )}
          {screen === "SPECIAL_AWARDS" && (
            <SpecialAwardsScreen
              awardType={specialAwardTypes[currentSpecialAward]}
              onContinue={handleContinue}
            />
          )}
          {screen === "SUMMARY" && <SummaryScreen awards={awards} onContinue={handleContinue} isSaving={isSaving} />}
        </div>
      </div>
    </div>
  );
}

// Screen 1: League Leaders
function LeagueLeadersScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-xl text-[#E8E8D8] text-center mb-6" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
          🏆 LEAGUE LEADERS - SEASON 2026
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Eastern League */}
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-base text-[#E8E8D8] mb-4 border-b-2 border-[#E8E8D8]/20 pb-2">
              EASTERN LEAGUE
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-[#E8E8D8]/60 mb-2">HITTING</div>
                <div className="space-y-1 text-[9px] text-[#E8E8D8]">
                  <div>AVG: M. Trout (.342) <span className="text-[#5599FF]">+5 CON</span></div>
                  <div>HR: A. Judge (58) <span className="text-[#5599FF]">+5 PWR</span></div>
                  <div>RBI: J. Ramirez (142)</div>
                  <div>SB: J. Rodriguez (62)</div>
                  <div>OPS: M. Trout (1.089)</div>
                  <div>Hits: B. Bichette (215)</div>
                  <div>Runs: M. Trout (128)</div>
                  <div>BB: C. Santana (112) <span className="text-[#5599FF]">+5 SPD</span></div>
                  <div>K's: A. Judge (198) <span className="text-[#DD0000]">WHIFFER</span></div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#E8E8D8]/60 mb-2">PITCHING</div>
                <div className="space-y-1 text-[9px] text-[#E8E8D8]">
                  <div>ERA: G. Cole (2.18)</div>
                  <div>K: G. Cole (298)</div>
                  <div>Wins: C. Javier (18)</div>
                  <div>Saves: E. Clase (48) <span className="text-[#5599FF]">CLUTCH</span></div>
                  <div>WHIP: G. Cole (0.92)</div>
                  <div>IP: L. Giolito (228.1)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Western League */}
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-base text-[#E8E8D8] mb-4 border-b-2 border-[#E8E8D8]/20 pb-2">
              WESTERN LEAGUE
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-[#E8E8D8]/60 mb-2">HITTING</div>
                <div className="space-y-1 text-[9px] text-[#E8E8D8]">
                  <div>AVG: F. Freeman (.338) <span className="text-[#5599FF]">+5 CON</span></div>
                  <div>HR: K. Schwarber (52) <span className="text-[#5599FF]">+5 PWR</span></div>
                  <div>RBI: P. Goldschmidt (138)</div>
                  <div>SB: T. Turner (58)</div>
                  <div>OPS: M. Betts (1.042)</div>
                  <div>Hits: T. Turner (208)</div>
                  <div>Runs: R. Acuña Jr. (132)</div>
                  <div>BB: J. Soto (118) <span className="text-[#5599FF]">+5 SPD</span></div>
                  <div>K's: P. Alonso (189) <span className="text-[#DD0000]">WHIFFER</span></div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#E8E8D8]/60 mb-2">PITCHING</div>
                <div className="space-y-1 text-[9px] text-[#E8E8D8]">
                  <div>ERA: S. Strider (2.05)</div>
                  <div>K: S. Strider (312)</div>
                  <div>Wins: Z. Gallen (19)</div>
                  <div>Saves: D. Bednar (45) <span className="text-[#5599FF]">CLUTCH</span></div>
                  <div>WHIP: S. Strider (0.88)</div>
                  <div>IP: M. Fried (232.0)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Applied */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-3">📊 REWARDS APPLIED:</div>
        <div className="grid grid-cols-2 gap-2 text-[9px] text-[#E8E8D8]/80">
          <div>• M. Trout: +5 Contact (AVG Leader)</div>
          <div>• F. Freeman: +5 Contact (AVG Leader)</div>
          <div>• A. Judge: +5 Power (HR Leader)</div>
          <div>• K. Schwarber: +5 Power (HR Leader)</div>
          <div>• E. Clase: CLUTCH trait (Saves Leader)</div>
          <div>• D. Bednar: CLUTCH trait (Saves Leader)</div>
          <div>• A. Judge: WHIFFER trait (Most K's)</div>
          <div>• P. Alonso: WHIFFER trait (Most K's)</div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
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
}: {
  position: Position;
  positionIndex: number;
  totalPositions: number;
  onContinue: () => void;
}) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  const candidates: AwardCandidate[] = [
    {
      player: { id: "1", name: "Francisco Lindor", team: "NYM", position: "SS", grade: "A", age: 30, salary: 34100000, league: "NL", traits: [] },
      score: 94.2,
      stats: { fWAR: 4.2, clutch: 18, eye: 8.5, errors: 8, drs: 18 },
    },
    {
      player: { id: "2", name: "Corey Seager", team: "TEX", position: "SS", grade: "A-", age: 29, salary: 32500000, league: "AL", traits: [] },
      score: 87.5,
      stats: { fWAR: 3.8, clutch: 12, eye: 7.2, errors: 11, drs: 12 },
    },
    {
      player: { id: "3", name: "Xander Bogaerts", team: "SD", position: "SS", grade: "B+", age: 31, salary: 28000000, league: "NL", traits: [] },
      score: 82.1,
      stats: { fWAR: 3.2, clutch: 15, eye: 6.8, errors: 14, drs: 8 },
    },
  ];

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
function PlatinumGloveScreen({ onContinue }: { onContinue: () => void }) {
  const winner = {
    name: "Francisco Lindor",
    team: "NYM",
    position: "SS",
    fWAR: 4.2,
  };

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
          <div>C: J.T. Realmuto (PHI) - fWAR: 3.1</div>
          <div>1B: Matt Olson (ATL) - fWAR: 2.8</div>
          <div>2B: Marcus Semien (TEX) - fWAR: 3.5</div>
          <div>3B: Manny Machado (SD) - fWAR: 3.9</div>
          <div className="text-[#FFD700]">SS: Francisco Lindor (NYM) - fWAR: 4.2 ★ HIGHEST</div>
          <div>LF: Steven Kwan (CLE) - fWAR: 2.4</div>
          <div>CF: Michael Harris II (ATL) - fWAR: 3.8</div>
          <div>RF: Mookie Betts (LAD) - fWAR: 4.0</div>
          <div>P: Max Fried (ATL) - fWAR: 1.2</div>
        </div>
      </div>

      {/* Winner Display */}
      <div className="text-center py-8">
        <div className="text-xl text-[#FFD700] mb-6" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
          ✨ PLATINUM GLOVE WINNER ✨
        </div>

        <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
          FL
        </div>

        <div className="text-2xl text-[#FFD700] mb-2">{winner.name}</div>
        <div className="text-base text-[#E8E8D8]/80 mb-6">
          {winner.team} - {winner.position}
        </div>

        <div className="bg-[#5A8352] border-[3px] border-[#FFD700] p-4 inline-block">
          <div className="text-sm text-[#E8E8D8] mb-2">fWAR: {winner.fWAR} (Highest among GG winners)</div>
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
function BoogerGloveScreen({ onContinue }: { onContinue: () => void }) {
  const [selectedTrait, setSelectedTrait] = useState<number | null>(null);

  const player = {
    name: "Sluggo McBRICKS",
    team: "SEA",
    position: "1B",
    fWAR: -1.8,
    errors: 23,
    drs: -28,
    traits: ["RBI Hero", "Power Surge"],
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
}: {
  position: Position;
  positionIndex: number;
  totalPositions: number;
  onContinue: () => void;
}) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  const candidates: AwardCandidate[] = [
    {
      player: { id: "1", name: "Shohei Ohtani", team: "LAA", position: "DH", grade: "A+", age: 29, salary: 30000000, league: "AL", traits: [] },
      score: 96.8,
      stats: { ops: 1.066, wrcPlus: 178, bwar: 9.2, avg: ".304", hr: 44, rbi: 95 },
    },
    {
      player: { id: "2", name: "Yordan Alvarez", team: "HOU", position: "DH", grade: "A", age: 26, salary: 12500000, league: "AL", traits: [] },
      score: 91.2,
      stats: { ops: 0.998, wrcPlus: 162, bwar: 6.8, avg: ".298", hr: 38, rbi: 112 },
    },
    {
      player: { id: "3", name: "J.D. Martinez", team: "BOS", position: "DH", grade: "B+", age: 36, salary: 10000000, league: "AL", traits: [] },
      score: 84.5,
      stats: { ops: 0.892, wrcPlus: 138, bwar: 4.2, avg: ".276", hr: 28, rbi: 88 },
    },
  ];

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
function RelieverYearScreen({ league, onContinue }: { league: League; onContinue: () => void }) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  const candidates: AwardCandidate[] = [
    {
      player: { id: "1", name: "Emmanuel Clase", team: "CLE", position: "P", grade: "A-", age: 26, salary: 3200000, league: "AL", traits: [] },
      score: 94.5,
      stats: { saves: 48, era: 1.28, whip: 0.85, clutch: 8.2 },
    },
    {
      player: { id: "2", name: "Jordan Romano", team: "TOR", position: "P", grade: "B+", age: 31, salary: 7400000, league: "AL", traits: [] },
      score: 88.2,
      stats: { saves: 42, era: 2.15, whip: 0.98, clutch: 5.8 },
    },
    {
      player: { id: "3", name: "Félix Bautista", team: "BAL", position: "P", grade: "A-", age: 28, salary: 760000, league: "AL", traits: [] },
      score: 85.8,
      stats: { saves: 38, era: 1.92, whip: 0.91, clutch: 6.4 },
    },
  ];

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
function BenchPlayerScreen({ onContinue }: { onContinue: () => void }) {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  const candidates: AwardCandidate[] = [
    {
      player: { id: "1", name: "David Freese", team: "LAD", position: "3B", grade: "B", age: 40, salary: 2100000, league: "NL", traits: [] },
      score: 89.2,
      stats: { phAvg: ".342", warPerPA: 0.018, clutch: 4.8, games: 98, starts: 32 },
    },
    {
      player: { id: "2", name: "Ben Gamel", team: "MIL", position: "LF", grade: "C+", age: 31, salary: 1100000, league: "NL", traits: [] },
      score: 82.5,
      stats: { phAvg: ".298", warPerPA: 0.014, clutch: 3.2, games: 112, starts: 45 },
    },
    {
      player: { id: "3", name: "Patrick Wisdom", team: "CHC", position: "3B", grade: "B-", age: 32, salary: 950000, league: "NL", traits: [] },
      score: 78.8,
      stats: { phAvg: ".275", warPerPA: 0.012, clutch: 2.8, games: 105, starts: 38 },
    },
  ];

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
function RookieYearScreen({ league, onContinue }: { league: League; onContinue: () => void }) {
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

  const candidates: AwardCandidate[] = [
    {
      player: { id: "1", name: "Corbin Carroll", team: "ARI", position: "CF", grade: "B+", age: 23, salary: 700000, league: "NL", traits: [] },
      score: 95.8,
      stats: { war: 5.8, avg: ".285", hr: 25, sb: 54, fame: 42, opsPlus: 145 },
    },
    {
      player: { id: "2", name: "James Outman", team: "LAD", position: "LF", grade: "B", age: 26, salary: 720000, league: "NL", traits: [] },
      score: 84.2,
      stats: { war: 3.9, avg: ".258", hr: 23, sb: 18, fame: 28, opsPlus: 122 },
    },
    {
      player: { id: "3", name: "Kodai Senga", team: "NYM", position: "P", grade: "A-", age: 30, salary: 15000000, league: "NL", traits: [] },
      score: 81.5,
      stats: { war: 4.2, wl: "12-5", era: 2.98, k: 202, fame: 25, eraPlus: 138 },
    },
  ];

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
function CyYoungScreen({ league, onContinue }: { league: League; onContinue: () => void }) {
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

  const winner = {
    name: league === "AL" ? "Gerrit Cole" : "Spencer Strider",
    team: league === "AL" ? "NYY" : "ATL",
    wins: league === "AL" ? 18 : 15,
    losses: league === "AL" ? 5 : 6,
    era: league === "AL" ? 2.18 : 2.05,
    whip: league === "AL" ? 0.92 : 0.88,
    strikeouts: league === "AL" ? 298 : 312,
    pwar: league === "AL" ? 7.8 : 8.2,
  };

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
          <div className="grid grid-cols-5 gap-6 text-center">
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">W-L</div>
              <div className="text-base text-[#E8E8D8]">{winner.wins}-{winner.losses}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">ERA</div>
              <div className="text-base text-[#E8E8D8]">{winner.era}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">WHIP</div>
              <div className="text-base text-[#E8E8D8]">{winner.whip}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">K</div>
              <div className="text-base text-[#E8E8D8]">{winner.strikeouts}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">pWAR</div>
              <div className="text-base text-[#E8E8D8]">{winner.pwar}</div>
            </div>
          </div>
        </div>

        {/* Voting Results */}
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 max-w-md mx-auto mb-6">
          <div className="text-sm text-[#E8E8D8] mb-4">VOTING RESULTS</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#E8E8D8] w-32">1st: {winner.name}</span>
              <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                <div className="bg-[#FFD700] h-full rounded" style={{ width: "87%" }}></div>
              </div>
              <span className="text-[9px] text-[#E8E8D8]">87%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#E8E8D8]/60 w-32">2nd: K. Gausman</span>
              <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                <div className="bg-[#E8E8D8]/60 h-full rounded" style={{ width: "42%" }}></div>
              </div>
              <span className="text-[9px] text-[#E8E8D8]/60">42%</span>
            </div>
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
function MVPScreen({ league, onContinue }: { league: League; onContinue: () => void }) {
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

  const winner = {
    name: league === "AL" ? "Mike Trout" : "Ronald Acuña Jr.",
    team: league === "AL" ? "LAA" : "ATL",
    avg: league === "AL" ? ".342" : ".337",
    hr: league === "AL" ? 44 : 41,
    rbi: league === "AL" ? 102 : 106,
    sb: league === "AL" ? 18 : 73,
    war: league === "AL" ? 9.2 : 9.8,
  };

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
          <div className="grid grid-cols-5 gap-6 text-center">
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">AVG</div>
              <div className="text-lg text-[#E8E8D8]">{winner.avg}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">HR</div>
              <div className="text-lg text-[#E8E8D8]">{winner.hr}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">RBI</div>
              <div className="text-lg text-[#E8E8D8]">{winner.rbi}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">SB</div>
              <div className="text-lg text-[#E8E8D8]">{winner.sb}</div>
            </div>
            <div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">WAR</div>
              <div className="text-lg text-[#E8E8D8]">{winner.war}</div>
            </div>
          </div>
        </div>

        {/* Voting Results */}
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 max-w-md mx-auto mb-6">
          <div className="text-sm text-[#E8E8D8] mb-4">VOTING RESULTS</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#E8E8D8] w-32">1st: {winner.name}</span>
              <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                <div className="bg-[#FFD700] h-full rounded" style={{ width: "92%" }}></div>
              </div>
              <span className="text-[9px] text-[#E8E8D8]">92%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#E8E8D8]/60 w-32">2nd: M. Betts</span>
              <div className="flex-1 bg-[#E8E8D8]/20 h-4 rounded">
                <div className="bg-[#E8E8D8]/60 h-full rounded" style={{ width: "58%" }}></div>
              </div>
              <span className="text-[9px] text-[#E8E8D8]/60">58%</span>
            </div>
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
  })() : {
    team: league === "AL" ? "Baltimore Orioles" : "Atlanta Braves",
    record: league === "AL" ? "98-64" : "104-58",
    winPct: league === "AL" ? ".605" : ".642",
    expected: league === "AL" ? "88-74" : "96-66",
    overperformance: league === "AL" ? "+10 wins" : "+8 wins",
    mwar: league === "AL" ? 4.2 : 3.8,
    isRealData: false,
  };

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
function SpecialAwardsScreen({ awardType, onContinue }: { awardType: string; onContinue: () => void }) {
  const [traitRevealed, setTraitRevealed] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState("BARGAIN BIN HERO");

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

  if (awardType === "KARA_KAWAGUCHI") {
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

          <div className="text-2xl text-[#E8E8D8] mb-2">RANDY AROZARENA</div>
          <div className="text-base text-[#E8E8D8]/80 mb-6">Tampa Bay Rays</div>

          <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-6 max-w-md mx-auto">
            <div className="text-sm text-[#E8E8D8] mb-4">VALUE BREAKDOWN</div>
            <div className="space-y-2 text-sm text-[#E8E8D8]">
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary:</span>
                <span>$2.8M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary %ile:</span>
                <span>12th percentile (among OF)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">WAR:</span>
                <span>5.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">WAR %ile:</span>
                <span>88th percentile (among OF)</span>
              </div>
              <div className="border-t border-[#E8E8D8]/20 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#E8E8D8]/60">Delta:</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#5599FF]">+76%</span>
                      <div className="flex-1 bg-[#E8E8D8]/20 h-3 rounded">
                        <div className="bg-[#5599FF] h-full rounded" style={{ width: "76%" }}></div>
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

          <div className="text-2xl text-[#E8E8D8] mb-2">CARLOS CORREA</div>
          <div className="text-base text-[#E8E8D8]/80 mb-6">San Francisco Giants</div>

          <div className="bg-[#5A8352] border-[5px] border-[#DD0000] p-6 max-w-md mx-auto">
            <div className="text-sm text-[#E8E8D8] mb-4">VALUE BREAKDOWN</div>
            <div className="space-y-2 text-sm text-[#E8E8D8]">
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary:</span>
                <span>$35.1M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">Salary %ile:</span>
                <span>98th percentile (among SS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">WAR:</span>
                <span>0.8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#E8E8D8]/60">WAR %ile:</span>
                <span>25th percentile (among SS)</span>
              </div>
              <div className="border-t border-[#E8E8D8]/20 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#E8E8D8]/60">Delta:</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#DD0000]">-73%</span>
                      <div className="flex-1 bg-[#E8E8D8]/20 h-3 rounded">
                        <div className="bg-[#DD0000] h-full rounded" style={{ width: "73%" }}></div>
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
  const [selectedCandidate, setSelectedCandidate] = useState(0);

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

  const candidates: AwardCandidate[] = [
    {
      player: { id: "1", name: "Clayton Kershaw", team: "LAD", position: "P", grade: "B+", age: 36, salary: 17000000, league: "NL", traits: [] },
      score: 92.5,
      stats: { war2025: 1.2, war2026: 5.8, deltaWar: 4.6, context: "Elbow surgery" },
    },
    {
      player: { id: "2", name: "Mike Clevinger", team: "CWS", position: "P", grade: "B", age: 33, salary: 8000000, league: "AL", traits: [] },
      score: 85.2,
      stats: { war2025: 0.5, war2026: 4.2, deltaWar: 3.7, context: "TJ Recovery" },
    },
    {
      player: { id: "3", name: "Cody Bellinger", team: "CHC", position: "CF", grade: "B+", age: 28, salary: 17500000, league: "NL", traits: [] },
      score: 81.8,
      stats: { war2025: 1.8, war2026: 5.2, deltaWar: 3.4, context: "Swing rebuild" },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
        <div className="text-lg text-[#E8E8D8]">🔄 COMEBACK PLAYER OF THE YEAR</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
        <div className="text-[9px] text-[#E8E8D8] text-center">
          ELIGIBILITY: Significant improvement vs previous season (+2.0 WAR)<br />
          VOTING: Year-over-year WAR improvement (70%) | Context (30%)
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
                <div>2025 WAR: {candidate.stats.war2025}</div>
                <div>2026 WAR: {candidate.stats.war2026}</div>
                <div className="flex items-center gap-2">
                  <span>Δ WAR: +{candidate.stats.deltaWar}</span>
                  <div className="flex-1 bg-[#E8E8D8]/20 h-2 rounded">
                    <div
                      className="bg-[#5599FF] h-full rounded"
                      style={{ width: `${(candidate.stats.deltaWar / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
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
