import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import type { Player as RosterPlayer, Pitcher as RosterPitcher } from "@/app/components/TeamRoster";
import { LineupPreview } from "@/app/components/LineupPreview";
import { useLeagueBuilderData, type LeagueTemplate, type Team, type Player as LBPlayer } from "../../hooks/useLeagueBuilderData";
import { loadTeamLineup } from "../../utils/lineupLoader";

export function ExhibitionGame() {
  const navigate = useNavigate();
  const { leagues, teams, players, isLoading, error, getRoster } = useLeagueBuilderData();
  const [step, setStep] = useState<"league" | "select" | "lineups">("league");

  // League and team selection state
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [selectedAwayTeamId, setSelectedAwayTeamId] = useState<string | null>(null);
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState<string | null>(null);

  // State for rosters (loaded from League Builder)
  const [awayPlayers, setAwayPlayers] = useState<RosterPlayer[]>([]);
  const [awayPitchers, setAwayPitchers] = useState<RosterPitcher[]>([]);
  const [homePlayers, setHomePlayers] = useState<RosterPlayer[]>([]);
  const [homePitchers, setHomePitchers] = useState<RosterPitcher[]>([]);

  // Track whether lineups came from storage
  const [awayHasStoredLineup, setAwayHasStoredLineup] = useState(false);
  const [homeHasStoredLineup, setHomeHasStoredLineup] = useState(false);

  // Loading state for lineup fetching
  const [isLoadingLineups, setIsLoadingLineups] = useState(false);

  // Get teams in selected league
  const leagueTeams = useMemo(() => {
    if (!selectedLeagueId) return [];
    const league = leagues.find(l => l.id === selectedLeagueId);
    if (!league) return [];
    return teams.filter(t => league.teamIds?.includes(t.id));
  }, [selectedLeagueId, leagues, teams]);

  // Get players for a specific team (using currentTeamId)
  const getTeamPlayersList = (teamId: string): LBPlayer[] => {
    return players.filter(p => p.currentTeamId === teamId);
  };

  // Load roster when away team is selected - uses stored lineup or auto-generates
  useEffect(() => {
    if (selectedAwayTeamId) {
      const teamPlayersList = getTeamPlayersList(selectedAwayTeamId);
      setIsLoadingLineups(true);

      loadTeamLineup(selectedAwayTeamId, teamPlayersList, getRoster)
        .then(result => {
          setAwayPlayers(result.players);
          setAwayPitchers(result.pitchers);
          setAwayHasStoredLineup(result.hasStoredLineup);
        })
        .finally(() => setIsLoadingLineups(false));
    }
  }, [selectedAwayTeamId, players, getRoster]);

  // Load roster when home team is selected - uses stored lineup or auto-generates
  useEffect(() => {
    if (selectedHomeTeamId) {
      const teamPlayersList = getTeamPlayersList(selectedHomeTeamId);
      setIsLoadingLineups(true);

      loadTeamLineup(selectedHomeTeamId, teamPlayersList, getRoster)
        .then(result => {
          setHomePlayers(result.players);
          setHomePitchers(result.pitchers);
          setHomeHasStoredLineup(result.hasStoredLineup);
        })
        .finally(() => setIsLoadingLineups(false));
    }
  }, [selectedHomeTeamId, players, getRoster]);

  // Get selected team objects
  const awayTeam = teams.find(t => t.id === selectedAwayTeamId);
  const homeTeam = teams.find(t => t.id === selectedHomeTeamId);

  // Separate lineup from bench for preview display
  const awayLineup = awayPlayers.filter(p => p.battingOrder !== undefined);
  const awayBench = awayPlayers.filter(p => p.battingOrder === undefined);
  const homeLineup = homePlayers.filter(p => p.battingOrder !== undefined);
  const homeBench = homePlayers.filter(p => p.battingOrder === undefined);

  // Get starting pitchers
  const awayStartingPitcher = awayPitchers.find(p => p.isActive);
  const homeStartingPitcher = homePitchers.find(p => p.isActive);

  const handleStartGame = () => {
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
        stadiumName: homeTeam?.stadium || homeTeam?.name,
        awayRecord: '0-0',
        homeRecord: '0-0',
        gameMode: 'exhibition' as const,
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-2 bg-[#4A6A42] hover:bg-[#5A7A52] border-4 border-[#E8E8D8] transition active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#E8E8D8]" />
          </button>
          <div className="bg-[#4A6A42] border-[6px] border-[#E8E8D8] px-6 py-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
            <h1 className="text-lg text-[#E8E8D8] tracking-wider font-bold" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>EXHIBITION GAME</h1>
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
            <AlertCircle className="w-8 h-8 text-[#DD0000] mb-3" />
            <p className="text-[#DD0000] mb-2">Failed to load leagues</p>
            <p className="text-xs text-[#E8E8D8]/70">{error}</p>
          </div>
        )}

        {/* No Leagues State */}
        {!isLoading && !error && leagues.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="w-8 h-8 text-[#C4A853] mb-3" />
            <p className="text-[#E8E8D8] mb-2">No leagues found</p>
            <p className="text-xs text-[#E8E8D8]/70 mb-4">Create a league in League Builder first</p>
            <button
              onClick={() => navigate("/league-builder")}
              className="px-6 py-3 bg-[#C4A853] border-4 border-[#E8E8D8] text-[#4A6A42] font-bold text-sm hover:bg-[#B59A4A] transition-all"
            >
              GO TO LEAGUE BUILDER
            </button>
          </div>
        )}

        {/* Step 1: League Selection */}
        {!isLoading && !error && leagues.length > 0 && step === "league" && (
          <div className="space-y-4">
            <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
              <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SELECT LEAGUE</div>
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
                      className={`w-full text-left p-4 border-4 transition-all ${
                        isSelected
                          ? "border-[#C4A853] bg-[#C4A853]/20"
                          : "border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]"
                      }`}
                    >
                      <div className="text-sm font-bold text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                        {league.name.toUpperCase()}
                      </div>
                      <div className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
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
              className={`w-full border-[6px] border-[#E8E8D8] py-5 text-base font-bold tracking-wide transition-transform shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] ${
                selectedLeagueId
                  ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95"
                  : "bg-[#3A5A32] text-[#8A9A82] cursor-not-allowed"
              }`}
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              CONTINUE ▶
            </button>
          </div>
        )}

        {/* Step 2: Team Selection */}
        {!isLoading && !error && step === "select" && (
          <div className="space-y-4">
            {/* Away team selection */}
            <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
              <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▲ AWAY TEAM</div>
              <select
                value={selectedAwayTeamId || ""}
                onChange={(e) => setSelectedAwayTeamId(e.target.value || null)}
                className="w-full bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 text-sm text-[#E8E8D8] font-bold"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
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
            <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
              <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▼ HOME TEAM</div>
              <select
                value={selectedHomeTeamId || ""}
                onChange={(e) => setSelectedHomeTeamId(e.target.value || null)}
                className="w-full bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 text-sm text-[#E8E8D8] font-bold"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
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
                className="bg-[#4A6A42] border-[5px] border-[#E8E8D8] py-4 text-sm text-[#E8E8D8] font-bold hover:bg-[#5A7A52] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                ◀ BACK
              </button>
              <button
                onClick={() => setStep("lineups")}
                disabled={!selectedAwayTeamId || !selectedHomeTeamId}
                className={`border-[5px] border-[#E8E8D8] py-4 text-sm font-bold transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] ${
                  selectedAwayTeamId && selectedHomeTeamId
                    ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95"
                    : "bg-[#3A5A32] text-[#8A9A82] cursor-not-allowed"
                }`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
              >
                CONTINUE ▶
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Lineup Preview (Read-Only) */}
        {!isLoading && !error && step === "lineups" && awayTeam && homeTeam && (
          <div className="space-y-4">
            <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
              <div className="text-sm text-[#E8E8D8] mb-2 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>STARTING LINEUPS</div>
              <div className="text-xs text-[#E8E8D8]/80" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                {awayHasStoredLineup || homeHasStoredLineup
                  ? "Lineups loaded from League Builder. Edit lineups in League Builder > Rosters."
                  : "Default lineups. Configure custom lineups in League Builder > Rosters."}
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
                  startingPitcher={awayStartingPitcher}
                  teamColor={awayTeam.colors?.primary || '#4A6A42'}
                  teamBorderColor={awayTeam.colors?.secondary || '#E8E8D8'}
                  isAway={true}
                />
                <LineupPreview
                  teamName={homeTeam.name.toUpperCase()}
                  lineup={homeLineup}
                  bench={homeBench}
                  startingPitcher={homeStartingPitcher}
                  teamColor={homeTeam.colors?.primary || '#4A6A42'}
                  teamBorderColor={homeTeam.colors?.secondary || '#E8E8D8'}
                  isAway={false}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStep("select")}
                className="bg-[#4A6A42] border-[5px] border-[#E8E8D8] py-4 text-sm text-[#E8E8D8] font-bold hover:bg-[#5A7A52] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                ◀ BACK
              </button>
              <button
                onClick={handleStartGame}
                disabled={awayPlayers.length === 0 || homePlayers.length === 0 || isLoadingLineups}
                className={`border-[5px] border-[#E8E8D8] py-4 text-sm font-bold transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] ${
                  awayPlayers.length > 0 && homePlayers.length > 0 && !isLoadingLineups
                    ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95"
                    : "bg-[#3A5A32] text-[#8A9A82] cursor-not-allowed"
                }`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
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
