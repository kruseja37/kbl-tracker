import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, AlertCircle, Trash2 } from "lucide-react";
import type { Player as RosterPlayer, Pitcher as RosterPitcher } from "@/app/components/TeamRoster";
import type { MojoLevel } from "../../../engines/mojoEngine";
import type { FitnessState } from "../../../engines/fitnessEngine";
import { LineupPreview } from "@/app/components/LineupPreview";
import { ReporterAssignmentPanel } from "@/app/components/ReporterAssignmentPanel";
import { useLeagueBuilderData, type Player as LBPlayer } from "../../hooks/useLeagueBuilderData";
import { loadTeamLineup } from "../../utils/lineupLoader";
import { getEffectivePlayer } from "../../../utils/playerOverrides";
import { getTrackerDb } from "../../../utils/trackerDb";
import { syncEngine } from "../../../utils/syncEngine";
import { SYNC_REGISTRY, extractKey } from "../../../utils/syncConfig";
import { getParkNames } from "../../../data/parkLookup";
import chalkBgImg from '../../../assets/chalk-bg.png';
import chalkBgFaintImg from '../../../assets/chalk-bg-faint.png';

async function getEffectiveTeamPlayers(
  teamId: string,
  leagueId: string,
  players: LBPlayer[],
): Promise<LBPlayer[]> {
  const assignedPlayers = players.filter((player) =>
    player.leagueAssignments?.some(
      (assignment) => assignment.leagueId === leagueId && assignment.teamId === teamId,
    ) ?? false,
  );

  return (
    await Promise.all(assignedPlayers.map((player) => getEffectivePlayer(player.id, leagueId)))
  ).filter((player): player is LBPlayer => player !== null);
}

export function ExhibitionGame() {
  const navigate = useNavigate();
  const { leagues, teams, players, isLoading, error, getRoster } = useLeagueBuilderData();
  const [step, setStep] = useState<"league" | "select" | "lineups">("league");

  // League and team selection state
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [selectedAwayTeamId, setSelectedAwayTeamId] = useState<string | null>(null);
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState<string | null>(null);
  const [useDH, setUseDH] = useState(false);
  const [totalInnings, setTotalInnings] = useState(9);
  const [extraInningRunner, setExtraInningRunner] = useState(true);
  const [extraInningRunnerDelay, setExtraInningRunnerDelay] = useState<1 | 2>(2);
  const [selectedStadium, setSelectedStadium] = useState<string | null>(null);
  const [beatReporterEnabled, setBeatReporterEnabled] = useState(true);

  const parkNames = useMemo(() => getParkNames(), []);

  // State for rosters (loaded from League Builder)
  const [awayPlayers, setAwayPlayers] = useState<RosterPlayer[]>([]);
  const [awayPitchers, setAwayPitchers] = useState<RosterPitcher[]>([]);
  const [homePlayers, setHomePlayers] = useState<RosterPlayer[]>([]);
  const [homePitchers, setHomePitchers] = useState<RosterPitcher[]>([]);

  // Track whether lineups came from storage
  const [awayHasStoredLineup, setAwayHasStoredLineup] = useState(false);
  const [homeHasStoredLineup, setHomeHasStoredLineup] = useState(false);

  // Clear exhibition data
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const clearExhibitionData = async () => {
    setIsClearing(true);
    try {
      const db = await getTrackerDb();
      const storeNames = [
        'currentGame', 'completedGames', 'playerGameStats', 'pitcherGameStats',
        'playerSeasonBatting', 'playerSeasonPitching', 'playerSeasonFielding',
        'seasonMetadata', 'playerCareerBatting', 'playerCareerPitching',
        'playerCareerFielding', 'careerMilestones', 'rosterSnapshots',
        'mojoFitnessSnapshots', 'almanacCanonicalPlayers',
      ];
      const available = storeNames.filter(s => db.objectStoreNames.contains(s));

      // Push sync tombstones for all synced stores before clearing
      const syncedStores = SYNC_REGISTRY['kbl-tracker'] || {};
      const syncedAvailable = available.filter(s => s in syncedStores);
      if (syncedAvailable.length > 0 && !syncEngine.isSuppressed()) {
        const readTx = db.transaction(syncedAvailable, 'readonly');
        for (const storeName of syncedAvailable) {
          const keyPath = syncedStores[storeName];
          const records: Record<string, unknown>[] = await new Promise((resolve, reject) => {
            const req = readTx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          for (const record of records) {
            const key = extractKey(record, keyPath);
            syncEngine.remove('kbl-tracker', storeName, key);
          }
        }
      }

      const tx = db.transaction(available, 'readwrite');
      for (const name of available) {
        tx.objectStore(name).clear();
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      setShowClearConfirm(false);
    } catch (err) {
      console.error('[ExhibitionGame] Failed to clear data:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Loading state for lineup fetching
  const [isLoadingLineups, setIsLoadingLineups] = useState(false);

  // Get teams in selected league
  const leagueTeams = useMemo(() => {
    if (!selectedLeagueId) return [];
    const league = leagues.find(l => l.id === selectedLeagueId);
    if (!league) return [];
    return teams.filter(t => league.teamIds?.includes(t.id));
  }, [selectedLeagueId, leagues, teams]);

  // Load roster when away team is selected - uses stored lineup or auto-generates
  useEffect(() => {
    if (!selectedAwayTeamId || !selectedLeagueId) {
      setAwayPlayers([]);
      setAwayPitchers([]);
      setAwayHasStoredLineup(false);
      return;
    }

    let cancelled = false;
    setIsLoadingLineups(true);

    getEffectiveTeamPlayers(selectedAwayTeamId, selectedLeagueId, players)
      .then((teamPlayersList) => loadTeamLineup(selectedAwayTeamId, teamPlayersList, getRoster, useDH))
      .then((result) => {
        if (cancelled) return;
        setAwayPlayers(result.players);
        setAwayPitchers(result.pitchers);
        setAwayHasStoredLineup(result.hasStoredLineup);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLineups(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAwayTeamId, selectedLeagueId, players, getRoster, useDH]);

  // Load roster when home team is selected - uses stored lineup or auto-generates
  useEffect(() => {
    if (!selectedHomeTeamId || !selectedLeagueId) {
      setHomePlayers([]);
      setHomePitchers([]);
      setHomeHasStoredLineup(false);
      return;
    }

    let cancelled = false;
    setIsLoadingLineups(true);

    getEffectiveTeamPlayers(selectedHomeTeamId, selectedLeagueId, players)
      .then((teamPlayersList) => loadTeamLineup(selectedHomeTeamId, teamPlayersList, getRoster, useDH))
      .then((result) => {
        if (cancelled) return;
        setHomePlayers(result.players);
        setHomePitchers(result.pitchers);
        setHomeHasStoredLineup(result.hasStoredLineup);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLineups(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedHomeTeamId, selectedLeagueId, players, getRoster, useDH]);

  // Get selected team objects
  const awayTeam = teams.find(t => t.id === selectedAwayTeamId);
  const homeTeam = teams.find(t => t.id === selectedHomeTeamId);
  const reporterTeams = useMemo(() => {
    if (!awayTeam || !homeTeam) return [];
    return [
      { label: "Away team", team: awayTeam },
      { label: "Home team", team: homeTeam },
    ];
  }, [awayTeam, homeTeam]);

  // Default stadium to home team's field when home team changes
  useEffect(() => {
    if (homeTeam?.stadium) {
      setSelectedStadium(homeTeam.stadium);
    }
  }, [homeTeam?.stadium]);

  // Separate lineup from bench for preview display
  const awayLineup = awayPlayers.filter(p => p.battingOrder !== undefined);
  const awayBench = awayPlayers.filter(p => p.battingOrder === undefined);
  const homeLineup = homePlayers.filter(p => p.battingOrder !== undefined);
  const homeBench = homePlayers.filter(p => p.battingOrder === undefined);

  // Get starting pitchers
  const awayStartingPitcher = awayPitchers.find(p => p.isActive);
  const homeStartingPitcher = homePitchers.find(p => p.isActive);

  // Reorder lineup via drag-and-drop or tap-swap — merges reordered starters back with bench
  const handleAwayReorder = (reordered: RosterPlayer[]) => {
    setAwayPlayers([...reordered, ...awayBench]);
  };
  const handleHomeReorder = (reordered: RosterPlayer[]) => {
    setHomePlayers([...reordered, ...homeBench]);
  };

  // Position swap — swap defensive positions between two lineup players
  const handleAwayPositionSwap = (a: RosterPlayer, b: RosterPlayer) => {
    setAwayPlayers(prev => prev.map(p => {
      if (p.playerId === a.playerId) return { ...p, position: b.position };
      if (p.playerId === b.playerId) return { ...p, position: a.position };
      return p;
    }));
  };
  const handleHomePositionSwap = (a: RosterPlayer, b: RosterPlayer) => {
    setHomePlayers(prev => prev.map(p => {
      if (p.playerId === a.playerId) return { ...p, position: b.position };
      if (p.playerId === b.playerId) return { ...p, position: a.position };
      return p;
    }));
  };

  // Bench substitution — swap a lineup player with a bench player (pre-game only)
  const handleAwayBenchSub = (lineupPlayer: RosterPlayer, benchPlayer: RosterPlayer) => {
    setAwayPlayers(prev => prev.map(p => {
      if (p.playerId === lineupPlayer.playerId)
        return { ...p, battingOrder: undefined, position: undefined };
      if (p.playerId === benchPlayer.playerId)
        return { ...p, battingOrder: lineupPlayer.battingOrder, position: lineupPlayer.position };
      return p;
    }));
  };
  const handleHomeBenchSub = (lineupPlayer: RosterPlayer, benchPlayer: RosterPlayer) => {
    setHomePlayers(prev => prev.map(p => {
      if (p.playerId === lineupPlayer.playerId)
        return { ...p, battingOrder: undefined, position: undefined };
      if (p.playerId === benchPlayer.playerId)
        return { ...p, battingOrder: lineupPlayer.battingOrder, position: lineupPlayer.position };
      return p;
    }));
  };

  // Starting pitcher substitution — swap isActive flag and update batting order in no-DH
  const handleAwayPitcherSub = (newPitcher: RosterPitcher) => {
    const oldPitcher = awayPitchers.find(p => p.isActive);
    setAwayPitchers(prev => prev.map(p => ({
      ...p,
      isActive: p.playerId === newPitcher.playerId || p.name === newPitcher.name,
    })));
    // In no-DH mode, the pitcher is in the batting order — swap them in the players array too
    if (oldPitcher) {
      setAwayPlayers(prev => {
        const oldInLineup = prev.find(p =>
          (p.playerId && p.playerId === oldPitcher.playerId) || p.name === oldPitcher.name
        );
        if (!oldInLineup || oldInLineup.battingOrder === undefined) return prev;
        const newPitcherInPlayers = prev.some(p =>
          (p.playerId && p.playerId === newPitcher.playerId) || p.name === newPitcher.name
        );
        const updated = prev.map(p => {
          if ((p.playerId && p.playerId === oldPitcher.playerId) || p.name === oldPitcher.name) {
            return { ...p, battingOrder: undefined, position: undefined };
          }
          if ((p.playerId && p.playerId === newPitcher.playerId) || p.name === newPitcher.name) {
            return { ...p, battingOrder: oldInLineup.battingOrder, position: 'P' };
          }
          return p;
        });
        // New pitcher may only exist in pitchers array — add to players array
        if (!newPitcherInPlayers) {
          updated.push({
            name: newPitcher.name,
            fullName: newPitcher.fullName,
            playerId: newPitcher.playerId,
            position: 'P',
            battingOrder: oldInLineup.battingOrder,
            battingHand: (newPitcher.throwingHand || 'R') as 'L' | 'R' | 'S',
            stats: { pa: 0, ab: 0, h: 0, singles: 0, doubles: 0, triples: 0, hr: 0, r: 0, rbi: 0, bb: 0, hbp: 0, k: 0, sb: 0, cs: 0, sf: 0, sh: 0, gidp: 0, grandSlams: 0 },
            mojo: newPitcher.mojo,
            fitness: newPitcher.fitness,
            trait1: newPitcher.trait1,
            trait2: newPitcher.trait2,
            age: newPitcher.age,
            throws: newPitcher.throwingHand,
            velocity: newPitcher.velocity,
            junk: newPitcher.junk,
            accuracy: newPitcher.accuracy,
          } as RosterPlayer);
        }
        return updated;
      });
    }
  };
  const handleHomePitcherSub = (newPitcher: RosterPitcher) => {
    const oldPitcher = homePitchers.find(p => p.isActive);
    setHomePitchers(prev => prev.map(p => ({
      ...p,
      isActive: p.playerId === newPitcher.playerId || p.name === newPitcher.name,
    })));
    if (oldPitcher) {
      setHomePlayers(prev => {
        const oldInLineup = prev.find(p =>
          (p.playerId && p.playerId === oldPitcher.playerId) || p.name === oldPitcher.name
        );
        if (!oldInLineup || oldInLineup.battingOrder === undefined) return prev;
        const newPitcherInPlayers = prev.some(p =>
          (p.playerId && p.playerId === newPitcher.playerId) || p.name === newPitcher.name
        );
        const updated = prev.map(p => {
          if ((p.playerId && p.playerId === oldPitcher.playerId) || p.name === oldPitcher.name) {
            return { ...p, battingOrder: undefined, position: undefined };
          }
          if ((p.playerId && p.playerId === newPitcher.playerId) || p.name === newPitcher.name) {
            return { ...p, battingOrder: oldInLineup.battingOrder, position: 'P' };
          }
          return p;
        });
        if (!newPitcherInPlayers) {
          updated.push({
            name: newPitcher.name,
            fullName: newPitcher.fullName,
            playerId: newPitcher.playerId,
            position: 'P',
            battingOrder: oldInLineup.battingOrder,
            battingHand: (newPitcher.throwingHand || 'R') as 'L' | 'R' | 'S',
            stats: { pa: 0, ab: 0, h: 0, singles: 0, doubles: 0, triples: 0, hr: 0, r: 0, rbi: 0, bb: 0, hbp: 0, k: 0, sb: 0, cs: 0, sf: 0, sh: 0, gidp: 0, grandSlams: 0 },
            mojo: newPitcher.mojo,
            fitness: newPitcher.fitness,
            trait1: newPitcher.trait1,
            trait2: newPitcher.trait2,
            age: newPitcher.age,
            throws: newPitcher.throwingHand,
            velocity: newPitcher.velocity,
            junk: newPitcher.junk,
            accuracy: newPitcher.accuracy,
          } as RosterPlayer);
        }
        return updated;
      });
    }
  };

  // Mojo/Fitness handlers — update player/pitcher objects so GameTracker receives correct values
  const handleMojoChange = (playerId: string, newMojo: MojoLevel) => {
    setAwayPlayers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, mojo: newMojo } : p
    ));
    setHomePlayers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, mojo: newMojo } : p
    ));
    setAwayPitchers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, mojo: newMojo } : p
    ));
    setHomePitchers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, mojo: newMojo } : p
    ));
  };
  const handleFitnessChange = (playerId: string, newFitness: FitnessState) => {
    setAwayPlayers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, fitness: newFitness } : p
    ));
    setHomePlayers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, fitness: newFitness } : p
    ));
    setAwayPitchers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, fitness: newFitness } : p
    ));
    setHomePitchers(prev => prev.map(p =>
      (p.playerId || p.name) === playerId ? { ...p, fitness: newFitness } : p
    ));
  };

  const handleStartGame = () => {
    sessionStorage.setItem("kbl-pending-beat-reporter-enabled", JSON.stringify(beatReporterEnabled));
    // Pass the configured rosters and team info to the game tracker
    navigate("/game-tracker/exhibition-1", {
      state: {
        awayPlayers,
        awayPitchers,
        homePlayers,
        homePitchers,
        awayTeamName: awayTeam?.name || 'Away',
        homeTeamName: homeTeam?.name || 'Home',
        awayTeamId: awayTeam?.id,
        homeTeamId: homeTeam?.id,
        // Pass team colors from database
        awayTeamColor: awayTeam?.colors?.primary || '#4A6A42',
        awayTeamBorderColor: awayTeam?.colors?.secondary || '#E8E8D8',
        homeTeamColor: homeTeam?.colors?.primary || '#4A6A42',
        homeTeamBorderColor: homeTeam?.colors?.secondary || '#E8E8D8',
        stadiumName: selectedStadium || homeTeam?.stadium || homeTeam?.name,
        awayRecord: '0-0',
        homeRecord: '0-0',
        gameMode: 'exhibition' as const,
        leagueId: selectedLeagueId || leagues[0]?.id || 'sml',
        userTeamSide: 'home' as const, // Exhibition games default to user as home team
        useDH,
        totalInnings,
        extraInningRunner,
        extraInningRunnerDelay,
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#2b3a2e] text-[#E8E8D8] p-6" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-2 bg-[#3d4a42] hover:bg-[#4a5a50] border-2 border-[#556B55] transition active:scale-95"
            style={{ backgroundImage: `url(${chalkBgFaintImg})`, backgroundRepeat: 'repeat' }}
          >
            <ArrowLeft className="w-5 h-5 text-[#E8E8D8]" />
          </button>
          <div className="bg-[#1a2420] border-2 border-[#C4A853]/30 px-6 py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
            <h1 className="text-lg text-[#E8E8D8] tracking-[0.2em] font-bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>EXHIBITION GAME</h1>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
            <span className="ml-3 text-[#E8E8D8]">Loading leagues...</span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="w-8 h-8 text-[#CC3433] mb-3" />
            <p className="text-[#CC3433] mb-2">Failed to load leagues</p>
            <p className="text-xs text-[#a0a898]">{error}</p>
          </div>
        )}

        {/* No Leagues State */}
        {!isLoading && !error && leagues.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="w-8 h-8 text-[#C4A853] mb-3" />
            <p className="text-[#E8E8D8] mb-2">No leagues found</p>
            <p className="text-xs text-[#a0a898] mb-4">Create a league in League Builder first</p>
            <button
              onClick={() => navigate("/league-builder")}
              className="px-6 py-3 bg-[#3d4a42] border-2 border-[#C4A853] text-[#C4A853] font-bold text-sm tracking-[0.2em] hover:bg-[#4a5a50] transition-all"
              style={{ backgroundImage: `url(${chalkBgFaintImg})`, backgroundRepeat: 'repeat' }}
            >
              GO TO LEAGUE BUILDER
            </button>
          </div>
        )}

        {/* Step 1: League Selection */}
        {!isLoading && !error && leagues.length > 0 && step === "league" && (
          <div className="space-y-4">
            <div className="bg-[#3d4a42] border-2 border-[#556B55] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
              <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-[0.25em]" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>SELECT LEAGUE</div>
              <div className="space-y-2">
                {leagues.map(league => {
                  const teamCount = teams.filter(t => league.teamIds?.includes(t.id)).length;
                  const isSelected = selectedLeagueId === league.id;
                  return (
                    <button
                      key={league.id}
                      onClick={() => {
                        setSelectedLeagueId(league.id);
                        setSelectedAwayTeamId(null);
                        setSelectedHomeTeamId(null);
                      }}
                      className={`w-full text-left p-4 border-2 transition-all ${
                        isSelected
                          ? "border-[#C4A853] bg-[#C4A853]/20"
                          : "border-[#556B55] bg-[#1f2b21] hover:border-[#C4A853]"
                      }`}
                    >
                      <div className="text-sm font-bold text-[#E8E8D8] tracking-wider">
                        {league.name.toUpperCase()}
                      </div>
                      <div className="text-xs text-[#a0a898]">
                        {teamCount} teams
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setStep("select")}
              disabled={!selectedLeagueId}
              className={`w-full border-2 py-5 text-base font-bold tracking-[0.2em] transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] ${
                selectedLeagueId
                  ? "border-[#C4A853] bg-[#3d4a42] text-[#C4A853] hover:bg-[#4a5a50] active:scale-95"
                  : "border-[#556B55] bg-[#1f2b21] text-[#8A9A82] cursor-not-allowed"
              }`}
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)', backgroundImage: selectedLeagueId ? `url(${chalkBgFaintImg})` : undefined, backgroundRepeat: 'repeat' }}
            >
              CONTINUE ▶
            </button>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-[#CC3433]/50 py-3 text-xs font-bold text-[#CC3433] tracking-[0.2em] hover:bg-[#CC3433]/10 transition-all mt-2"
            >
              <Trash2 className="w-4 h-4" />
              CLEAR EXHIBITION DATA
            </button>
          </div>
        )}

        {/* Clear Data Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
            <div className="bg-[#3d4a42] border-2 border-[#556B55] p-6 max-w-sm mx-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]" style={{ backgroundImage: `url(${chalkBgImg})`, backgroundRepeat: 'repeat' }}>
              <div className="text-sm font-bold text-[#C4A853] mb-3 tracking-[0.15em]">CLEAR ALL EXHIBITION DATA?</div>
              <div className="text-xs text-[#a0a898] mb-4 leading-relaxed">
                This will delete all exhibition game history, stats, and almanac records. Teams and leagues will not be affected.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isClearing}
                  className="flex-1 border-2 border-[#556B55] bg-[#1f2b21] py-3 text-xs font-bold text-[#E8E8D8] tracking-wider hover:bg-[#2b3a2e] transition"
                >
                  CANCEL
                </button>
                <button
                  onClick={clearExhibitionData}
                  disabled={isClearing}
                  className="flex-1 border-2 border-[#CC3433] bg-[#CC3433]/20 py-3 text-xs font-bold text-[#CC3433] tracking-wider hover:bg-[#CC3433]/30 transition"
                >
                  {isClearing ? 'CLEARING...' : 'YES, CLEAR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Team Selection */}
        {!isLoading && !error && step === "select" && (
          <div className="space-y-4">
            {/* Away team selection */}
            <div className="bg-[#3d4a42] border-2 border-[#556B55] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
              <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-[0.25em]" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>▲ AWAY TEAM</div>
              <select
                value={selectedAwayTeamId || ""}
                onChange={(e) => setSelectedAwayTeamId(e.target.value || null)}
                className="w-full bg-[#1f2b21] border-2 border-[#556B55] p-3 text-sm text-[#E8E8D8] font-bold tracking-wider"
              >
                <option value="">SELECT AWAY TEAM...</option>
                {leagueTeams.map(team => (
                  <option key={team.id} value={team.id} disabled={team.id === selectedHomeTeamId}>
                    {team.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Home team selection */}
            <div className="bg-[#3d4a42] border-2 border-[#556B55] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
              <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-[0.25em]" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>▼ HOME TEAM</div>
              <select
                value={selectedHomeTeamId || ""}
                onChange={(e) => setSelectedHomeTeamId(e.target.value || null)}
                className="w-full bg-[#1f2b21] border-2 border-[#556B55] p-3 text-sm text-[#E8E8D8] font-bold tracking-wider"
              >
                <option value="">SELECT HOME TEAM...</option>
                {leagueTeams.map(team => (
                  <option key={team.id} value={team.id} disabled={team.id === selectedAwayTeamId}>
                    {team.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStep("league")}
                className="bg-[#3d4a42] border-2 border-[#556B55] py-4 text-sm text-[#E8E8D8] font-bold tracking-[0.2em] hover:bg-[#4a5a50] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)', backgroundImage: `url(${chalkBgFaintImg})`, backgroundRepeat: 'repeat' }}
              >
                ◀ BACK
              </button>
              <button
                onClick={() => setStep("lineups")}
                disabled={!selectedAwayTeamId || !selectedHomeTeamId}
                className={`border-2 py-4 text-sm font-bold tracking-[0.2em] transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] ${
                  selectedAwayTeamId && selectedHomeTeamId
                    ? "border-[#C4A853] bg-[#3d4a42] text-[#C4A853] hover:bg-[#4a5a50] active:scale-95"
                    : "border-[#556B55] bg-[#1f2b21] text-[#8A9A82] cursor-not-allowed"
                }`}
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)', backgroundImage: selectedAwayTeamId && selectedHomeTeamId ? `url(${chalkBgFaintImg})` : undefined, backgroundRepeat: 'repeat' }}
              >
                CONTINUE ▶
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Lineup Preview (Read-Only) */}
        {!isLoading && !error && step === "lineups" && awayTeam && homeTeam && (
          <div className="space-y-4">
            <div className="bg-[#3d4a42] border-2 border-[#556B55] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
              <div className="text-sm text-[#C4A853] mb-2 font-bold tracking-[0.2em]" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>STARTING LINEUPS</div>
              <div className="text-xs text-[#a0a898]">
                {awayHasStoredLineup || homeHasStoredLineup
                  ? "Lineups loaded from League Builder. Drag to reorder batting order."
                  : "Default lineups. Drag to reorder batting order."}
              </div>
            </div>

            {/* Loading lineups */}
            {isLoadingLineups && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#C4A853]" />
                <span className="ml-2 text-sm text-[#E8E8D8]">Loading lineups...</span>
              </div>
            )}

            {/* Team Lineup Previews (Read-Only) */}
            {!isLoadingLineups && (
              <div className="grid grid-cols-2 gap-3">
                <LineupPreview
                  teamName={awayTeam.name.toUpperCase()}
                  lineup={awayLineup}
                  bench={awayBench}
                  benchPitchers={awayPitchers.filter(p => !p.isActive)}
                  startingPitcher={awayStartingPitcher}
                  teamColor={awayTeam.colors?.primary || '#4A6A42'}
                  teamBorderColor={awayTeam.colors?.secondary || '#E8E8D8'}
                  isAway={true}
                  onReorder={handleAwayReorder}
                  onPositionSwap={handleAwayPositionSwap}
                  onBenchSub={handleAwayBenchSub}
                  onPitcherSub={handleAwayPitcherSub}
                  onMojoChange={handleMojoChange}
                  onFitnessChange={handleFitnessChange}
                />
                <LineupPreview
                  teamName={homeTeam.name.toUpperCase()}
                  lineup={homeLineup}
                  bench={homeBench}
                  benchPitchers={homePitchers.filter(p => !p.isActive)}
                  startingPitcher={homeStartingPitcher}
                  teamColor={homeTeam.colors?.primary || '#4A6A42'}
                  teamBorderColor={homeTeam.colors?.secondary || '#E8E8D8'}
                  isAway={false}
                  onReorder={handleHomeReorder}
                  onPositionSwap={handleHomePositionSwap}
                  onBenchSub={handleHomeBenchSub}
                  onPitcherSub={handleHomePitcherSub}
                  onMojoChange={handleMojoChange}
                  onFitnessChange={handleFitnessChange}
                />
              </div>
            )}

            <ReporterAssignmentPanel
              leagueId={selectedLeagueId || leagues[0]?.id || 'sml'}
              teams={reporterTeams}
              enabled={beatReporterEnabled}
              onEnabledChange={setBeatReporterEnabled}
            />

            <div className="border-2 border-[#556B55] bg-[#3d4a42] p-4 space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
              <div>
                <div className="text-sm text-[#C4A853] font-bold tracking-[0.2em]" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>GAME RULES</div>
                <div className="text-xs text-[#a0a898] mt-1">
                  Set exhibition-specific rules before first pitch.
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-[#a0a898] tracking-wider">Innings per game</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((inningOption) => (
                    <button
                      key={inningOption}
                      onClick={() => setTotalInnings(inningOption)}
                      className={`px-4 py-2 border-2 text-xs font-bold transition-all ${
                        totalInnings === inningOption
                          ? "border-[#C4A853] bg-[#C4A853]/20 text-[#C4A853]"
                          : "border-[#556B55] bg-[#1f2b21] text-[#E8E8D8] hover:border-[#C4A853]"
                      }`}
                    >
                      {inningOption}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-[#E8E8D8]">Designated hitter</div>
                  <div className="text-xs text-[#a0a898] mt-1">
                    Use the DH rule for both lineups.
                  </div>
                </div>
                <div className="flex gap-2">
                  {[
                    { label: 'ON', value: true },
                    { label: 'OFF', value: false },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setUseDH(option.value)}
                      className={`px-4 py-2 border-2 text-xs font-bold ${
                        useDH === option.value
                          ? 'border-[#C4A853] bg-[#C4A853]/20 text-[#C4A853]'
                          : 'border-[#556B55] bg-[#1f2b21] text-[#E8E8D8] hover:border-[#C4A853]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-[#E8E8D8]">Runner on 2nd in extras</div>
                  <div className="text-xs text-[#a0a898] mt-1">
                    Place a runner on second base at the start of each extra inning half.
                  </div>
                </div>
                <div className="flex gap-2">
                  {[
                    { label: 'ON', value: true },
                    { label: 'OFF', value: false },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setExtraInningRunner(option.value)}
                      className={`px-4 py-2 border-2 text-xs font-bold ${
                        extraInningRunner === option.value
                          ? 'border-[#C4A853] bg-[#C4A853]/20 text-[#C4A853]'
                          : 'border-[#556B55] bg-[#1f2b21] text-[#E8E8D8] hover:border-[#C4A853]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {extraInningRunner && (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-[#E8E8D8]">Runner starts in</div>
                    <div className="text-xs text-[#a0a898] mt-1">
                      Which extra inning does the runner rule begin?
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {([1, 2] as const).map((delay) => (
                      <button
                        key={delay}
                        onClick={() => setExtraInningRunnerDelay(delay)}
                        className={`px-4 py-2 border-2 text-xs font-bold ${
                          extraInningRunnerDelay === delay
                            ? 'border-[#C4A853] bg-[#C4A853]/20 text-[#C4A853]'
                            : 'border-[#556B55] bg-[#1f2b21] text-[#E8E8D8] hover:border-[#C4A853]'
                        }`}
                      >
                        {delay === 1 ? '1st' : '2nd'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs text-[#a0a898] tracking-wider">Stadium</div>
                <select
                  value={selectedStadium || ''}
                  onChange={(e) => setSelectedStadium(e.target.value)}
                  className="w-full bg-[#1f2b21] text-[#E8E8D8] border-2 border-[#556B55] p-2 text-xs font-bold"
                >
                  {parkNames.map((name) => (
                    <option key={name} value={name}>
                      {name}{name === homeTeam?.stadium ? ' (Home)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStep("select")}
                className="bg-[#3d4a42] border-2 border-[#556B55] py-4 text-sm text-[#E8E8D8] font-bold tracking-[0.2em] hover:bg-[#4a5a50] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)', backgroundImage: `url(${chalkBgFaintImg})`, backgroundRepeat: 'repeat' }}
              >
                ◀ BACK
              </button>
              <button
                onClick={handleStartGame}
                disabled={awayPlayers.length === 0 || homePlayers.length === 0 || isLoadingLineups}
                className={`border-2 py-4 text-sm font-bold tracking-[0.2em] transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] ${
                  awayPlayers.length > 0 && homePlayers.length > 0 && !isLoadingLineups
                    ? "border-[#C4A853] bg-[#3d4a42] text-[#C4A853] hover:bg-[#4a5a50] active:scale-95"
                    : "border-[#556B55] bg-[#1f2b21] text-[#8A9A82] cursor-not-allowed"
                }`}
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)', backgroundImage: awayPlayers.length > 0 && homePlayers.length > 0 && !isLoadingLineups ? `url(${chalkBgFaintImg})` : undefined, backgroundRepeat: 'repeat' }}
              >
                START GAME ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
