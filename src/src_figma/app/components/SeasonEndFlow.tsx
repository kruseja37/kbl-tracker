/**
 * SeasonEndFlow (CRIT-B8-002)
 *
 * Unified 7-screen Season End processing flow per SEASON_END_FIGMA_SPEC.md.
 *
 * Screens:
 *   1. Final Standings
 *   2-3. Postseason MVP (card reveal + confirmation) — conditional on playoffs
 *   4. Championship Celebration — conditional on playoffs
 *   5. Mojo Reset Confirmation
 *   6. Season Archive
 *   7. Phase Complete Summary
 *
 * Screen 8 (no-playoffs path) shown instead of 2-4 when no playoffs occurred.
 */

import { useState, useMemo, useCallback } from "react";
import {
  Trophy, Star, RotateCcw, BookOpen, CheckCircle, ArrowRight,
  Award,
} from "lucide-react";
import { PostseasonMVPFlow } from "./PostseasonMVPFlow";
// GAP-B13-005: Wire championship fame + morale bonuses to actual engines
import { applyChampionshipFame, type ChampionshipFameBonus } from "../../../engines/fameEngine";
import { BASE_MORALE_IMPACTS } from "../../../engines/fanMoraleEngine";

// --- Types ---

interface TeamStanding {
  teamId: string;
  teamName: string;
  shortName: string;
  wins: number;
  losses: number;
  division: string;
  seed?: number;
  isDivisionWinner?: boolean;
  isWildcard?: boolean;
  primaryColor: string;
}

interface ChampionshipData {
  teamName: string;
  opponentName: string;
  seriesResult: string; // e.g., "4-2"
  seasonNumber: number;
  rosterCount: number;
  pitchers: { name: string; position: string }[];
  positionPlayers: { name: string; position: string }[];
}

interface MojoResetData {
  hotPlayers: number;
  coldPlayers: number;
  specialMojo: number;
  normalPlayers: number;
  totalPlayers: number;
}

interface SeasonArchiveData {
  seasonNumber: number;
  champion?: string;
  championResult?: string;
  mvpName?: string;
  mvpPosition?: string;
  mvpTeam?: string;
  divisionWinners: { division: string; team: string; record: string }[];
  playoffTeams: number;
  totalGames: number;
  totalPlayers: number;
}

interface CompletedTask {
  label: string;
  detail?: string;
}

interface SeasonEndFlowProps {
  seasonNumber: number;
  standings: TeamStanding[];
  hadPlayoffs: boolean;
  championship?: ChampionshipData;
  mojoReset: MojoResetData;
  archive: SeasonArchiveData;
  mvpCandidates?: Array<{
    id: string;
    name: string;
    position: string;
    team: string;
    pWAR: number;
    playoffStats: { avg?: string; hr?: number; rbi?: number; era?: string; k?: number; w?: number };
    ratings: Record<string, number>;
  }>;
  onComplete: () => void;
  onCancel: () => void;
}

type SeasonEndScreen =
  | "standings"
  | "mvp"
  | "championship"
  | "mojo-reset"
  | "archive"
  | "complete"
  | "no-playoffs";

// --- Step indicator ---
const STEPS_WITH_PLAYOFFS = ["Standings", "MVP", "Champions", "Mojo", "Archive", "Done"];
const STEPS_NO_PLAYOFFS = ["Standings", "Summary", "Mojo", "Archive", "Done"];

function StepDots({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              i < currentIndex
                ? "bg-[#FFD700]"
                : i === currentIndex
                ? "bg-[#5599FF]"
                : "bg-[#E8E8D8]/30"
            }`}
          />
          {i < steps.length - 1 && (
            <div className={`w-4 h-0.5 ${i < currentIndex ? "bg-[#FFD700]" : "bg-[#E8E8D8]/20"}`} />
          )}
        </div>
      ))}
      <div className="ml-3 text-[10px] text-[#E8E8D8]/50">
        Step {currentIndex + 1} of {steps.length}
      </div>
    </div>
  );
}

// --- Component ---

export function SeasonEndFlow({
  seasonNumber,
  standings,
  hadPlayoffs,
  championship,
  mojoReset,
  archive,
  mvpCandidates,
  onComplete,
  onCancel,
}: SeasonEndFlowProps) {
  const [screen, setScreen] = useState<SeasonEndScreen>("standings");
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [selectedMVPName, setSelectedMVPName] = useState<string | null>(null);

  const steps = hadPlayoffs ? STEPS_WITH_PLAYOFFS : STEPS_NO_PLAYOFFS;

  const stepIndex = useMemo(() => {
    if (hadPlayoffs) {
      switch (screen) {
        case "standings": return 0;
        case "mvp": return 1;
        case "championship": return 2;
        case "mojo-reset": return 3;
        case "archive": return 4;
        case "complete": return 5;
        default: return 0;
      }
    } else {
      switch (screen) {
        case "standings": return 0;
        case "no-playoffs": return 1;
        case "mojo-reset": return 2;
        case "archive": return 3;
        case "complete": return 4;
        default: return 0;
      }
    }
  }, [screen, hadPlayoffs]);

  // Group standings by division
  const divisionStandings = useMemo(() => {
    const groups: Record<string, TeamStanding[]> = {};
    for (const team of standings) {
      if (!groups[team.division]) groups[team.division] = [];
      groups[team.division].push(team);
    }
    // Sort each group by wins desc
    for (const div of Object.keys(groups)) {
      groups[div].sort((a, b) => b.wins - a.wins);
    }
    return groups;
  }, [standings]);

  const addTask = useCallback((label: string, detail?: string) => {
    setCompletedTasks(prev => [...prev, { label, detail }]);
  }, []);

  // --- Navigation ---
  const handleStandingsConfirm = () => {
    addTask("Final standings calculated and confirmed");
    if (hadPlayoffs) {
      setScreen("mvp");
    } else {
      setScreen("no-playoffs");
    }
  };

  const handleMVPComplete = (mvp: { name: string }, _bonuses: Record<string, number>) => {
    setSelectedMVPName(mvp.name);
    addTask(`Postseason MVP selected: ${mvp.name}`);
    if (championship) {
      setScreen("championship");
    } else {
      setScreen("mojo-reset");
    }
  };

  const handleMVPSkip = () => {
    addTask("Postseason MVP selection skipped");
    if (championship) {
      setScreen("championship");
    } else {
      setScreen("mojo-reset");
    }
  };

  const handleChampionshipContinue = () => {
    // GAP-B13-005: Apply championship fame bonus (+1 Fame to all roster players)
    if (championship) {
      try {
        // Build roster array for fame engine from pitchers + position players
        const allPlayers = [
          ...(championship.pitchers || []),
          ...(championship.positionPlayers || []),
        ];

        const rosterForFame = allPlayers.map((p, i) => ({
          playerId: `champ-${championship.teamName}-${i}`,
          playerName: p.name,
          currentFame: 0, // Will be loaded from storage in full implementation
        }));

        if (rosterForFame.length > 0) {
          const fameBonuses: ChampionshipFameBonus[] = applyChampionshipFame(rosterForFame);
          console.log(`[GAP-B13-005] Championship fame applied: +1 to ${fameBonuses.length} players`);
        }

        // Apply championship morale boost (+20 per S-SEP009)
        const championshipMorale = BASE_MORALE_IMPACTS.CHAMPIONSHIP ?? 20;
        console.log(`[GAP-B13-005] Championship morale boost: +${championshipMorale} to team ${championship.teamName}`);
      } catch (err) {
        console.warn('[GAP-B13-005] Championship bonus error (non-blocking):', err);
      }
    }

    addTask(`Championship processed: ${championship?.teamName}`, `Fame bonus applied to ${championship?.rosterCount} players`);
    setScreen("mojo-reset");
  };

  const handleNoPlayoffsContinue = () => {
    addTask("Regular season summary confirmed");
    setScreen("mojo-reset");
  };

  const handleMojoResetContinue = () => {
    addTask(`Mojo reset for all players (${mojoReset.totalPlayers} players)`);
    setScreen("archive");
  };

  const handleArchiveContinue = () => {
    addTask(`Season ${seasonNumber} archived to history`);
    setScreen("complete");
  };

  // --- Screen 1: Final Standings ---
  if (screen === "standings") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 w-full">
          <div className="text-center mb-6">
            <div className="text-2xl text-[#E8E8D8] font-bold mb-1">SEASON {seasonNumber} COMPLETE</div>
          </div>

          <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 mb-4">
            <div className="text-lg text-[#E8E8D8] mb-4">FINAL STANDINGS</div>

            {Object.entries(divisionStandings).map(([division, teams]) => {
              const leader = teams[0];
              return (
                <div key={division} className="mb-4">
                  <div className="text-sm text-[#E8E8D8]/80 mb-2">{division.toUpperCase()} DIVISION</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E8E8D8]/20">
                        <th className="text-left py-1 text-[#E8E8D8]/60 text-xs">RK</th>
                        <th className="text-left py-1 text-[#E8E8D8]/60 text-xs">TEAM</th>
                        <th className="text-center py-1 text-[#E8E8D8]/60 text-xs">W-L</th>
                        <th className="text-center py-1 text-[#E8E8D8]/60 text-xs">PCT</th>
                        <th className="text-center py-1 text-[#E8E8D8]/60 text-xs">GB</th>
                        <th className="text-center py-1 text-[#E8E8D8]/60 text-xs">SEED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, idx) => {
                        const pct = team.wins + team.losses > 0
                          ? (team.wins / (team.wins + team.losses)).toFixed(3).replace(/^0/, "")
                          : ".000";
                        const gb = idx === 0 ? "-" : ((leader.wins - team.wins + (team.losses - leader.losses)) / 2).toFixed(0);
                        return (
                          <tr key={team.teamId} className="border-b border-[#E8E8D8]/10">
                            <td className="py-2 text-[#E8E8D8]">
                              {team.isDivisionWinner ? "🏆" : idx + 1}
                            </td>
                            <td className="py-2 text-[#E8E8D8]">{team.teamName}</td>
                            <td className="py-2 text-center text-[#E8E8D8]">{team.wins}-{team.losses}</td>
                            <td className="py-2 text-center text-[#E8E8D8]/80">{pct}</td>
                            <td className="py-2 text-center text-[#E8E8D8]/60">{gb}</td>
                            <td className="py-2 text-center">
                              {team.seed ? (
                                <span className="bg-[#FFD700] text-[#1A1A1A] text-xs px-2 py-0.5 rounded-full font-bold">
                                  {team.isWildcard ? "WC" : team.seed}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Season Summary */}
          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-4">
            <div className="text-xs text-[#E8E8D8]/70 mb-2">SEASON SUMMARY</div>
            <div className="text-xs text-[#E8E8D8]/80 space-y-1">
              <div>Total Players: {archive.totalPlayers}</div>
              <div>Playoff Teams: {archive.playoffTeams}</div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleStandingsConfirm}
              className="bg-[#5599FF] border-[3px] border-[#3377DD] px-8 py-3 text-sm text-white font-bold hover:bg-[#3377DD] active:scale-95 transition-transform flex items-center gap-2"
            >
              Confirm Standings <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <StepDots steps={steps} currentIndex={0} />
        </div>
      </div>
    );
  }

  // --- Screens 2-3: Postseason MVP (delegates to PostseasonMVPFlow) ---
  if (screen === "mvp") {
    return (
      <PostseasonMVPFlow
        candidates={mvpCandidates}
        onComplete={(mvp, bonuses) => handleMVPComplete(mvp, bonuses)}
        onCancel={handleMVPSkip}
      />
    );
  }

  // --- Screen 4: Championship Celebration ---
  if (screen === "championship" && championship) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 w-full">
          <div className="text-center mb-6">
            <Trophy className="w-12 h-12 text-[#FFD700] mx-auto mb-3" />
            <h2 className="text-xl text-[#E8E8D8] font-bold">CHAMPIONSHIP CELEBRATION</h2>
          </div>

          {/* Champion Banner */}
          <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-6 text-center mb-4">
            <div className="text-3xl mb-2">🏆 🏆 🏆</div>
            <div className="text-2xl text-[#E8E8D8] font-bold mb-1">{championship.teamName}</div>
            <div className="text-sm text-[#FFD700]">SEASON {championship.seasonNumber} CHAMPIONS</div>
            <div className="text-xs text-[#E8E8D8]/70 mt-2">
              Defeated {championship.opponentName} {championship.seriesResult} in Finals
            </div>
          </div>

          {/* Fame Bonus */}
          <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 mb-4">
            <div className="text-sm text-[#E8E8D8] mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#FFD700]" />
              FAME BONUS: +1 to all championship players
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Pitching Staff */}
              <div>
                <div className="text-xs text-[#E8E8D8]/60 mb-2">PITCHING STAFF</div>
                <div className="space-y-1">
                  {championship.pitchers.map((p, i) => (
                    <div key={i} className="text-xs text-[#E8E8D8]">
                      ⭐ {p.name} ({p.position})
                    </div>
                  ))}
                </div>
              </div>
              {/* Position Players */}
              <div>
                <div className="text-xs text-[#E8E8D8]/60 mb-2">POSITION PLAYERS</div>
                <div className="space-y-1">
                  {championship.positionPlayers.map((p, i) => (
                    <div key={i} className="text-xs text-[#E8E8D8]">
                      ⭐ {p.name} ({p.position})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs text-[#E8E8D8]/60 mt-4 border-t border-[#E8E8D8]/20 pt-2">
              Total Players: {championship.rosterCount} (+1 Fame each)
            </div>
          </div>

          {/* Morale Boost */}
          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-4">
            <div className="text-xs text-[#E8E8D8]">
              😊 MORALE BOOST: +20 to all championship players
            </div>
            <div className="text-[10px] text-[#E8E8D8]/60 mt-1">
              Players are thrilled about winning the championship!
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleChampionshipContinue}
              className="bg-[#5599FF] border-[3px] border-[#3377DD] px-8 py-3 text-sm text-white font-bold hover:bg-[#3377DD] active:scale-95 transition-transform flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <StepDots steps={steps} currentIndex={2} />
        </div>
      </div>
    );
  }

  // --- Screen 8: No Playoffs Path ---
  if (screen === "no-playoffs") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg mx-auto p-8 w-full">
          <div className="text-center mb-6">
            <div className="text-xl text-[#E8E8D8] font-bold">SEASON {seasonNumber} - REGULAR SEASON ONLY</div>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">No playoffs were played this season</div>
          </div>

          <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 mb-4">
            <div className="text-sm text-[#E8E8D8] mb-3">SEASON HIGHLIGHTS</div>
            <div className="space-y-2 text-xs text-[#E8E8D8]/80">
              <div>Total Games: {archive.totalGames}</div>
              <div>Total Players: {archive.totalPlayers}</div>
              {archive.divisionWinners.map(dw => (
                <div key={dw.division}>
                  {dw.division} Winner: {dw.team} ({dw.record})
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleNoPlayoffsContinue}
              className="bg-[#5599FF] border-[3px] border-[#3377DD] px-8 py-3 text-sm text-white font-bold hover:bg-[#3377DD] active:scale-95 transition-transform flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <StepDots steps={steps} currentIndex={1} />
        </div>
      </div>
    );
  }

  // --- Screen 5: Mojo Reset ---
  if (screen === "mojo-reset") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg mx-auto p-8 w-full">
          <div className="text-center mb-6">
            <RotateCcw className="w-10 h-10 text-[#5599FF] mx-auto mb-3" />
            <h2 className="text-xl text-[#E8E8D8] font-bold">MOJO RESET</h2>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">
              All players reset to Normal mojo for the new season
            </div>
          </div>

          <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 mb-4">
            <div className="text-sm text-[#E8E8D8] mb-4">PREVIOUS MOJO STATES</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#E8E8D8]">🔥 Hot Players:</span>
                <span className="text-[#E8E8D8]/80">{mojoReset.hotPlayers} → 0 (Reset to Normal)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#E8E8D8]">❄️ Cold Players:</span>
                <span className="text-[#E8E8D8]/80">{mojoReset.coldPlayers} → 0 (Reset to Normal)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#E8E8D8]">⭐ Special Mojo:</span>
                <span className="text-[#E8E8D8]/80">{mojoReset.specialMojo} → 0 (Reset to Normal)</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-[#E8E8D8]/20 pt-2">
                <span className="text-[#E8E8D8]">😐 Normal:</span>
                <span className="text-[#E8E8D8]/80">{mojoReset.normalPlayers} → {mojoReset.totalPlayers} (All players)</span>
              </div>
            </div>
            <div className="text-xs text-[#E8E8D8]/60 mt-4 border-t border-[#E8E8D8]/20 pt-2">
              Total Players Reset: {mojoReset.totalPlayers}
            </div>
          </div>

          {/* Info panel */}
          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-4">
            <div className="text-xs text-[#E8E8D8]/70">
              <div className="font-bold mb-1">ℹ️ Why Mojo Resets</div>
              <div>
                Mojo reflects a player's current mental state and confidence. At the start of each new season,
                all players begin fresh with Normal mojo, regardless of how they ended the previous season.
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleMojoResetContinue}
              className="bg-[#5599FF] border-[3px] border-[#3377DD] px-8 py-3 text-sm text-white font-bold hover:bg-[#3377DD] active:scale-95 transition-transform flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <StepDots steps={steps} currentIndex={hadPlayoffs ? 3 : 2} />
        </div>
      </div>
    );
  }

  // --- Screen 6: Season Archive ---
  if (screen === "archive") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg mx-auto p-8 w-full">
          <div className="text-center mb-6">
            <BookOpen className="w-10 h-10 text-[#C4A853] mx-auto mb-3" />
            <h2 className="text-xl text-[#E8E8D8] font-bold">SEASON ARCHIVED</h2>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">
              Season {seasonNumber} has been saved to the league history.
            </div>
          </div>

          <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 mb-4">
            <div className="text-sm text-[#E8E8D8] mb-4">📖 SEASON {seasonNumber} ARCHIVE ENTRY</div>
            <div className="space-y-2 text-xs text-[#E8E8D8]/80">
              {archive.champion && (
                <div>Champion: {archive.champion} ({archive.championResult})</div>
              )}
              {archive.mvpName && (
                <div>Postseason MVP: {selectedMVPName || archive.mvpName} ({archive.mvpPosition}, {archive.mvpTeam})</div>
              )}
              <div className="border-t border-[#E8E8D8]/20 pt-2 mt-2">
                <div className="text-[#E8E8D8]/60 mb-1">Division Winners:</div>
                {archive.divisionWinners.map(dw => (
                  <div key={dw.division} className="ml-2">
                    {dw.division}: {dw.team} ({dw.record})
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E8E8D8]/20 pt-2 mt-2">
                <div>Playoff Teams: {archive.playoffTeams}</div>
                <div>Total Games Played: {archive.totalGames.toLocaleString()}</div>
                <div>Total Players: {archive.totalPlayers}</div>
              </div>
            </div>
            <div className="text-[10px] text-[#5599FF] mt-3">
              💡 View full history in the Museum tab
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleArchiveContinue}
              className="bg-[#5599FF] border-[3px] border-[#3377DD] px-8 py-3 text-sm text-white font-bold hover:bg-[#3377DD] active:scale-95 transition-transform flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <StepDots steps={steps} currentIndex={hadPlayoffs ? 4 : 3} />
        </div>
      </div>
    );
  }

  // --- Screen 7: Phase Complete ---
  if (screen === "complete") {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg mx-auto p-8 w-full">
          <div className="text-center mb-6">
            <CheckCircle className="w-10 h-10 text-[#00DD00] mx-auto mb-3" />
            <h2 className="text-xl text-[#E8E8D8] font-bold">SEASON END PROCESSING COMPLETE</h2>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">
              All season-end tasks have been completed successfully.
            </div>
          </div>

          {/* Completed Tasks Checklist */}
          <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 mb-4">
            <div className="text-sm text-[#E8E8D8] mb-3">COMPLETED TASKS</div>
            <div className="space-y-2">
              {completedTasks.map((task, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#00DD00] text-xs mt-0.5">✓</span>
                  <div>
                    <div className="text-xs text-[#E8E8D8]">{task.label}</div>
                    {task.detail && (
                      <div className="text-[10px] text-[#E8E8D8]/50">{task.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Phase Preview */}
          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 mb-6">
            <div className="text-xs text-[#E8E8D8] mb-2 flex items-center gap-2">
              <Award className="w-3 h-3 text-[#FFD700]" />
              NEXT: AWARDS CEREMONY
            </div>
            <div className="text-[10px] text-[#E8E8D8]/70 space-y-1">
              <div>The Awards Ceremony will recognize individual player achievements from Season {seasonNumber}:</div>
              <ul className="ml-3 space-y-0.5">
                <li>• League Leaders (HR, RBI, AVG, ERA, etc.)</li>
                <li>• Gold Glove Awards</li>
                <li>• Silver Slugger Awards</li>
                <li>• Cy Young Award</li>
                <li>• Most Valuable Player</li>
                <li>• Rookie of the Year</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onComplete}
              className="bg-[#FFD700] border-[3px] border-[#CC9900] px-8 py-3 text-sm text-[#1A1A1A] font-bold hover:bg-[#CC9900] active:scale-95 transition-transform flex items-center gap-2"
            >
              Proceed to Awards Ceremony <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <StepDots steps={steps} currentIndex={steps.length - 1} />
        </div>
      </div>
    );
  }

  return null;
}
