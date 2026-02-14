import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, Gamepad2, Loader2, AlertCircle } from "lucide-react";
import { useLeagueBuilderData, type LeagueTemplate, type Team } from "../../hooks/useLeagueBuilderData";
import type { FranchiseConfig } from "../../../types/franchise";
import { initializeFranchise } from "../../../utils/franchiseInitializer";

const INITIAL_CONFIG: FranchiseConfig = {
  league: null,
  leagueDetails: null,
  season: {
    gamesPerTeam: 32,
    inningsPerGame: 7,
    extraInningsRule: "Standard",
    scheduleType: "Balanced",
    allStarGame: true,
    tradeDeadline: true,
    mercyRule: false,
  },
  playoffs: {
    teamsQualifying: 4,
    format: "Bracket",
    seriesLengths: {
      wildCard: "3 games",
      divisionSeries: "3 games",
      championship: "5 games",
      worldSeries: "7 games",
    },
    homeFieldAdvantage: "2-3-2",
  },
  teams: {
    selectedTeams: [],
    mode: "single",
    playerAssignments: {},
  },
  roster: {
    mode: "existing",
  },
  franchiseName: "Dynasty League Season 1",
};

export function FranchiseSetup() {
  const navigate = useNavigate();
  const { leagues, teams, isLoading, error, seedSMB4Data } = useLeagueBuilderData();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<FranchiseConfig>(INITIAL_CONFIG);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const autoSeedAttempted = useRef(false);

  // Auto-seed SMB4 data if no leagues exist (first-time setup)
  useEffect(() => {
    if (!isLoading && !error && leagues.length === 0 && !autoSeedAttempted.current) {
      autoSeedAttempted.current = true;
      console.log('[FranchiseSetup] No leagues found, auto-seeding SMB4 data...');
      seedSMB4Data(false).catch((err) => {
        console.error('[FranchiseSetup] Auto-seed failed:', err);
      });
    }
  }, [isLoading, error, leagues.length, seedSMB4Data]);

  // Get teams that belong to the selected league
  const leagueTeams = useMemo(() => {
    if (!config.league) return [];
    const selectedLeague = leagues.find(l => l.id === config.league);
    if (!selectedLeague) return [];
    // Filter teams that are in the selected league's teamIds array
    return teams.filter(t => selectedLeague.teamIds?.includes(t.id));
  }, [config.league, leagues, teams]);

  const totalSteps = 6;

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Start franchise — persist to IndexedDB and navigate
      setIsInitializing(true);
      setInitError(null);
      try {
        const franchiseId = await initializeFranchise(config);
        navigate(`/franchise/${franchiseId}`);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Failed to create franchise');
        setIsInitializing(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return config.league !== null;
      case 4:
        return config.teams.selectedTeams.length > 0;
      default:
        return true;
    }
  };

  const jumpToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8] flex items-center justify-center p-6">
      {/* Initialization overlay */}
      {isInitializing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#4A6A42] border-[6px] border-[#E8E8D8] p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
            <Loader2 className="w-12 h-12 animate-spin text-[#C4A853] mx-auto mb-4" />
            <p className="text-lg text-[#E8E8D8] font-bold tracking-wider" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>CREATING FRANCHISE</p>
            <p className="text-xs text-[#E8E8D8]/70 mt-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Generating schedule and initializing season...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[800px] bg-[#5A7A52] border-[6px] border-[#E8E8D8] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        {/* Init error banner */}
        {initError && (
          <div className="bg-[#DD0000]/20 border-b-4 border-[#DD0000] px-6 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#DD0000] shrink-0" />
            <p className="text-xs text-[#DD0000]">{initError}</p>
            <button onClick={() => setInitError(null)} className="ml-auto text-xs text-[#DD0000]/70 hover:text-[#DD0000]">[Dismiss]</button>
          </div>
        )}

        {/* Header */}
        <div className="bg-[#4A6A42] border-b-[6px] border-[#E8E8D8] px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#E8E8D8] tracking-wider" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>NEW FRANCHISE</h1>
            <span className="text-sm text-[#E8E8D8]/80" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>Step {currentStep} of {totalSteps}</span>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((step, idx) => (
              <div key={step} className="flex items-center" style={{ flex: idx < 5 ? 1 : 0 }}>
                <button
                  onClick={() => jumpToStep(step)}
                  disabled={step > currentStep}
                  className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${
                    step < currentStep
                      ? "bg-[#00CC00] border-[#00CC00] cursor-pointer hover:scale-110"
                      : step === currentStep
                      ? "bg-[#C4A853] border-[#C4A853] animate-pulse"
                      : "bg-transparent border-[#8A9A82]"
                  }`}
                >
                  {step < currentStep ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs text-[#4A6A42] font-bold">{step}</span>
                  )}
                </button>
                {idx < 5 && (
                  <div
                    className={`h-1 mx-2 flex-1 ${
                      step < currentStep
                        ? "bg-[#00CC00]"
                        : step === currentStep
                        ? "bg-gradient-to-r from-[#C4A853] to-[#8A9A82]"
                        : "bg-[#8A9A82] opacity-30"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex items-center justify-between mt-2">
            {["League", "Season", "Playoffs", "Teams", "Rosters", "Confirm"].map((label, idx) => (
              <div
                key={label}
                className="text-[9px] text-[#E8E8D8]/70 text-center"
                style={{ flex: idx < 5 ? 1 : 0, width: idx === 5 ? "60px" : "auto", textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
              <span className="ml-3 text-[#E8E8D8]">Loading leagues...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#DD0000] mb-3" />
              <p className="text-[#DD0000] mb-2">Failed to load leagues</p>
              <p className="text-xs text-[#E8E8D8]/70">{error}</p>
            </div>
          ) : leagues.length === 0 ? (
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
          ) : (
            <>
              {currentStep === 1 && <Step1SelectLeague config={config} setConfig={setConfig} expandedLeague={expandedLeague} setExpandedLeague={setExpandedLeague} leagues={leagues} teams={teams} />}
              {currentStep === 2 && <Step2SeasonSettings config={config} setConfig={setConfig} />}
              {currentStep === 3 && <Step3PlayoffSettings config={config} setConfig={setConfig} />}
              {currentStep === 4 && <Step4TeamControl config={config} setConfig={setConfig} leagueTeams={leagueTeams} />}
              {currentStep === 5 && <Step5RosterMode config={config} setConfig={setConfig} leagueTeams={leagueTeams} />}
              {currentStep === 6 && <Step6Confirm config={config} setConfig={setConfig} jumpToStep={jumpToStep} leagues={leagues} leagueTeams={leagueTeams} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-[6px] border-[#E8E8D8] px-8 py-5 flex items-center justify-end gap-3 bg-[#4A6A42]">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-transparent border-4 border-[#E8E8D8] text-[#E8E8D8] hover:bg-[#E8E8D8]/10 transition-all active:scale-95 font-bold text-sm tracking-wide flex items-center gap-2"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
          )}
          <button
            onClick={handleCancel}
            className="px-6 py-3 text-[#DD0000] hover:text-[#FF0000] transition-all font-bold text-sm tracking-wide"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
          >
            CANCEL
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`px-8 py-3 border-4 border-[#E8E8D8] font-bold text-sm tracking-wide transition-all flex items-center gap-2 ${
              canProceed()
                ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                : "bg-[#3A5A32] text-[#8A9A82] border-[#8A9A82] cursor-not-allowed"
            }`}
            style={canProceed() ? { textShadow: '1px 1px 0px rgba(0,0,0,0.2)' } : {}}
          >
            {currentStep === totalSteps ? (
              <>
                <Gamepad2 className="w-4 h-4" />
                START FRANCHISE
              </>
            ) : (
              <>
                NEXT
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Select League
function Step1SelectLeague({
  config,
  setConfig,
  expandedLeague,
  setExpandedLeague,
  leagues,
  teams,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  expandedLeague: string | null;
  setExpandedLeague: (id: string | null) => void;
  leagues: LeagueTemplate[];
  teams: Team[];
}) {
  const navigate = useNavigate();

  const selectLeague = (leagueId: string) => {
    const league = leagues.find((l) => l.id === leagueId);
    if (league) {
      // Get teams count for this league
      const leagueTeamCount = teams.filter(t => league.teamIds?.includes(t.id)).length;
      setConfig({
        ...config,
        league: leagueId,
        leagueDetails: {
          name: league.name,
          teams: leagueTeamCount || league.teamIds?.length || 0,
          conferences: league.conferences?.length || 0,
          divisions: league.divisions?.length || 0,
        },
        // Reset team selection when league changes
        teams: {
          ...config.teams,
          selectedTeams: [],
        },
      });
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>SELECT A LEAGUE</h2>
      <p className="text-xs text-[#E8E8D8]/70 mb-6">Choose the league template for your franchise</p>

      <div className="space-y-4">
        {leagues.map((league) => {
          const isSelected = config.league === league.id;
          const isExpanded = expandedLeague === league.id;
          const leagueTeamCount = teams.filter(t => league.teamIds?.includes(t.id)).length;
          const conferenceCount = league.conferences?.length || 0;
          const divisionCount = league.divisions?.length || 0;

          return (
            <div
              key={league.id}
              onClick={() => selectLeague(league.id)}
              className={`border-4 p-4 transition-all cursor-pointer ${
                isSelected
                  ? "border-[#C4A853] bg-[#C4A853]/10"
                  : "border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${
                    isSelected ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8] bg-transparent"
                  }`}
                >
                  {isSelected && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[#E8E8D8] mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{league.name.toUpperCase()}</h3>
                  <div className="h-[1px] bg-[#E8E8D8]/30 mb-2" />
                  <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                    {leagueTeamCount || league.teamIds?.length || 0} teams
                    {conferenceCount > 0 && ` • ${conferenceCount} conferences`}
                    {divisionCount > 0 && ` • ${divisionCount} divisions`}
                  </p>
                  {league.description && (
                    <p className="text-xs text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{league.description}</p>
                  )}

                  {/* Show conferences/divisions if expanded */}
                  {isExpanded && (league.conferences?.length || 0) > 0 && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                      {league.conferences?.map((conf) => (
                        <div key={conf.id}>
                          <p className="text-xs text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{conf.name}</p>
                          <div className="ml-4 space-y-1">
                            {league.divisions?.filter(d => d.conferenceId === conf.id).map((div) => (
                              <p key={div.id} className="text-[10px] text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                                ├─ {div.name} ({div.teamIds?.length || 0} teams)
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show teams list if expanded and no conferences */}
                  {isExpanded && (league.conferences?.length || 0) === 0 && (league.teamIds?.length || 0) > 0 && (
                    <div className="mt-4 animate-in fade-in duration-300">
                      <p className="text-xs text-[#E8E8D8] font-bold mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>Teams in this league:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {teams.filter(t => league.teamIds?.includes(t.id)).map(team => (
                          <div key={team.id} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border border-[#E8E8D8]/30"
                              style={{ backgroundColor: team.colors?.primary || '#666' }}
                            />
                            <span className="text-[10px] text-[#E8E8D8]/70">{team.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {((league.conferences?.length || 0) > 0 || (league.teamIds?.length || 0) > 0) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedLeague(isExpanded ? null : league.id); }}
                    className="text-[#E8E8D8]/50 hover:text-[#E8E8D8] text-xs"
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => navigate("/league-builder/leagues?new=true")}
          className="w-full border-4 border-dashed border-[#E8E8D8]/30 p-4 text-[#E8E8D8]/50 hover:text-[#E8E8D8] hover:border-[#E8E8D8]/50 transition-all text-xs"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
        >
          [+] Create New League in League Builder
        </button>
      </div>
    </div>
  );
}

// Step 2: Season Settings
function Step2SeasonSettings({
  config,
  setConfig,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
}) {
  const presets = [
    { id: "standard", name: "Standard", games: 32, innings: 7 },
    { id: "quick", name: "Quick Play", games: 16, innings: 6 },
    { id: "full", name: "Full Season", games: 162, innings: 9 },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setConfig({
      ...config,
      season: {
        ...config.season,
        gamesPerTeam: preset.games,
        inningsPerGame: preset.innings,
      },
    });
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>SEASON SETTINGS</h2>
      <p className="text-xs text-[#E8E8D8]/70 mb-6">Configure how the regular season will be played</p>

      {/* Quick Presets */}
      <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4 mb-6">
        <p className="text-xs text-[#E8E8D8]/70 mb-3" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>QUICK PRESETS</p>
        <div className="flex gap-2 flex-wrap">
          {presets.map((preset) => {
            const isActive =
              config.season.gamesPerTeam === preset.games && config.season.inningsPerGame === preset.innings;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`px-4 py-2 rounded-full border-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                    : "bg-transparent border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
                }`}
                style={{ textShadow: isActive ? '1px 1px 0px rgba(0,0,0,0.2)' : '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                {preset.name} {isActive && "✓"}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[#E8E8D8]/50 mt-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Selecting a preset auto-fills settings below</p>
      </div>

      {/* Games Per Team */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>GAMES PER TEAM</p>
        <div className="flex gap-2 flex-wrap">
          {[16, 32, 40, 80, 128, 162].map((num) => (
            <button
              key={num}
              onClick={() =>
                setConfig({
                  ...config,
                  season: { ...config.season, gamesPerTeam: num },
                })
              }
              className={`w-16 h-10 border-4 text-sm font-bold transition-all ${
                config.season.gamesPerTeam === num
                  ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                  : "bg-[#4A6A42] border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
              }`}
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Innings Per Game */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>INNINGS PER GAME</p>
        <div className="flex gap-2">
          {[6, 7, 9].map((num) => (
            <button
              key={num}
              onClick={() =>
                setConfig({
                  ...config,
                  season: { ...config.season, inningsPerGame: num },
                })
              }
              className={`w-16 h-10 border-4 text-sm font-bold transition-all ${
                config.season.inningsPerGame === num
                  ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                  : "bg-[#4A6A42] border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
              }`}
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Extra Innings Rule */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>EXTRA INNINGS RULE</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-4 mb-2">
            {["Standard", "Runner on 2nd", "Sudden Death"].map((rule) => (
              <button
                key={rule}
                onClick={() =>
                  setConfig({
                    ...config,
                    season: { ...config.season, extraInningsRule: rule },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.season.extraInningsRule === rule ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.season.extraInningsRule === rule && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                {rule}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
            ℹ️ Standard: No runner placed, play until there's a winner
          </p>
        </div>
      </div>

      {/* Schedule Type */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SCHEDULE TYPE</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-4 mb-2">
            {["Balanced", "Division Heavy", "Rivalry Focused"].map((type) => (
              <button
                key={type}
                onClick={() =>
                  setConfig({
                    ...config,
                    season: { ...config.season, scheduleType: type },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.season.scheduleType === type ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.season.scheduleType === type && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                {type}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>ℹ️ Balanced: Equal games vs all opponents in league</p>
        </div>
      </div>

      {/* Additional Options */}
      <div>
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>ADDITIONAL OPTIONS</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4 space-y-2">
          {[
            { key: "allStarGame", label: "All-Star Game", note: "(at 60% of season)" },
            { key: "tradeDeadline", label: "Trade Deadline", note: "(at 70% of season)" },
            { key: "mercyRule", label: "Mercy Rule", note: "(10 runs after 5 innings)" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() =>
                setConfig({
                  ...config,
                  season: {
                    ...config.season,
                    [option.key]: !config.season[option.key as keyof typeof config.season],
                  },
                })
              }
              className="flex items-center gap-3 text-xs text-[#E8E8D8] w-full"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
            >
              <div
                className={`w-5 h-5 border-2 flex items-center justify-center ${
                  config.season[option.key as keyof typeof config.season]
                    ? "border-[#C4A853] bg-[#C4A853]"
                    : "border-[#E8E8D8]"
                }`}
              >
                {config.season[option.key as keyof typeof config.season] && (
                  <Check className="w-3 h-3 text-[#4A6A42]" />
                )}
              </div>
              <span className="flex-1 text-left">
                {option.label} <span className="text-[#E8E8D8]/50">{option.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 3: Playoff Settings
function Step3PlayoffSettings({
  config,
  setConfig,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>PLAYOFF SETTINGS</h2>
      <p className="text-xs text-[#E8E8D8]/70 mb-6" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Configure the postseason structure</p>

      {/* Teams Qualifying */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>TEAMS QUALIFYING</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-2 mb-3">
            {[4, 6, 8, 10, 12].map((num) => (
              <button
                key={num}
                onClick={() =>
                  setConfig({
                    ...config,
                    playoffs: { ...config.playoffs, teamsQualifying: num },
                  })
                }
                className={`w-16 h-10 border-4 text-sm font-bold transition-all ${
                  config.playoffs.teamsQualifying === num
                    ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                    : "bg-[#3A5A32] border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
                }`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
            With {config.leagueDetails?.teams || 16} teams in league: Top {config.playoffs.teamsQualifying} teams
            qualify
          </p>
        </div>
      </div>

      {/* Playoff Format */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PLAYOFF FORMAT</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-4 mb-2">
            {["Bracket", "Pool Play", "Best Record Bye"].map((format) => (
              <button
                key={format}
                onClick={() =>
                  setConfig({
                    ...config,
                    playoffs: { ...config.playoffs, format },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.playoffs.format === format ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.playoffs.format === format && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                {format}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>ℹ️ Bracket: Traditional elimination tournament</p>
        </div>
      </div>

      {/* Series Lengths */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SERIES LENGTHS</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="space-y-3">
            {[
              { key: "wildCard", label: "Wild Card", options: ["1 game", "3 games"] },
              { key: "divisionSeries", label: "Division Series", options: ["3 games", "5 games"] },
              { key: "championship", label: "Championship", options: ["5 games", "7 games"] },
              { key: "worldSeries", label: "World Series", options: ["5 games", "7 games"] },
            ].map((round) => (
              <div key={round.key} className="flex items-center justify-between">
                <span className="text-xs text-[#E8E8D8]/70 w-40" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>{round.label}:</span>
                <div className="flex gap-2">
                  {round.options.map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        setConfig({
                          ...config,
                          playoffs: {
                            ...config.playoffs,
                            seriesLengths: {
                              ...config.playoffs.seriesLengths,
                              [round.key]: option,
                            },
                          },
                        })
                      }
                      className={`px-4 py-1 border-2 text-xs transition-all ${
                        config.playoffs.seriesLengths[round.key as keyof typeof config.playoffs.seriesLengths] ===
                        option
                          ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                          : "bg-transparent border-[#E8E8D8]/30 text-[#E8E8D8] hover:border-[#E8E8D8]"
                      }`}
                      style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Home Field Advantage */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>HOME FIELD ADVANTAGE</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-4 mb-2">
            {["2-3-2", "2-2-1", "Alternating"].map((format) => (
              <button
                key={format}
                onClick={() =>
                  setConfig({
                    ...config,
                    playoffs: { ...config.playoffs, homeFieldAdvantage: format },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.playoffs.homeFieldAdvantage === format ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.playoffs.homeFieldAdvantage === format && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                {format}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-[#C4A853] space-y-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
            <p>ℹ️ 2-3-2: Higher seed hosts G1-2 and G6-7</p>
            <p className="ml-7">Lower seed hosts G3-4-5</p>
          </div>
        </div>
      </div>

      {/* Bracket Preview */}
      <div>
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>BRACKET PREVIEW</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-6">
          <div className="flex items-center justify-center">
            <div className="space-y-4 text-xs text-[#E8E8D8]/70 font-mono" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              <div className="flex items-center">
                <span className="w-16">#1 ──┐</span>
              </div>
              <div className="flex items-center ml-8">
                <span className="w-32">├── Semifinal ──┐</span>
              </div>
              <div className="flex items-center">
                <span className="w-16">#4 ──┘</span>
              </div>
              <div className="flex items-center ml-20">
                <span className="w-32">├── Finals</span>
              </div>
              <div className="flex items-center">
                <span className="w-16">#2 ──┐</span>
              </div>
              <div className="flex items-center ml-8">
                <span className="w-32">├── Semifinal ──┘</span>
              </div>
              <div className="flex items-center">
                <span className="w-16">#3 ──┘</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4: Team Control
function Step4TeamControl({
  config,
  setConfig,
  leagueTeams,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  leagueTeams: Team[];
}) {
  const toggleTeam = (teamId: string) => {
    const isSelected = config.teams.selectedTeams.includes(teamId);
    const newSelected = isSelected
      ? config.teams.selectedTeams.filter((id) => id !== teamId)
      : [...config.teams.selectedTeams, teamId];

    setConfig({
      ...config,
      teams: {
        ...config.teams,
        selectedTeams: newSelected,
      },
    });
  };

  const selectAll = () => {
    setConfig({
      ...config,
      teams: {
        ...config.teams,
        selectedTeams: leagueTeams.map((t) => t.id),
      },
    });
  };

  const clearAll = () => {
    setConfig({
      ...config,
      teams: {
        ...config.teams,
        selectedTeams: [],
      },
    });
  };

  const selectRandom = () => {
    if (leagueTeams.length === 0) return;
    const randomTeam = leagueTeams[Math.floor(Math.random() * leagueTeams.length)];
    setConfig({
      ...config,
      teams: {
        ...config.teams,
        selectedTeams: [randomTeam.id],
      },
    });
  };

  const selectedCount = config.teams.selectedTeams.length;
  const aiCount = leagueTeams.length - selectedCount;

  if (leagueTeams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-8 h-8 text-[#C4A853] mb-3" />
        <p className="text-[#E8E8D8] mb-2">No teams in selected league</p>
        <p className="text-xs text-[#E8E8D8]/70">Add teams to this league in League Builder first</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>SELECT YOUR TEAM(S)</h2>
      <p className="text-xs text-[#E8E8D8]/70 mb-6" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
        Click teams you want to control. Unselected teams will be AI.
      </p>

      {/* Quick Select */}
      <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 mb-6 flex gap-2 flex-wrap">
        <span className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>QUICK SELECT:</span>
        <button onClick={selectAll} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          [Select All]
        </button>
        <button onClick={clearAll} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          [Clear All]
        </button>
        <button onClick={selectRandom} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          [Random 1]
        </button>
      </div>

      {/* Teams Grid */}
      <div className="mb-6">
        <div className="h-[2px] bg-[#E8E8D8] mb-2" />
        <p className="text-sm text-[#E8E8D8] font-bold mb-2 tracking-wider" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>LEAGUE TEAMS</p>
        <div className="h-[2px] bg-[#E8E8D8] mb-4" />

        <div className="grid grid-cols-4 gap-3">
          {leagueTeams.map((team) => {
            const isSelected = config.teams.selectedTeams.includes(team.id);
            return (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`relative border-4 p-4 text-center transition-all ${
                  isSelected
                    ? "border-[#C4A853] bg-[#C4A853]/10 scale-102"
                    : "border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-[#C4A853] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#4A6A42]" />
                  </div>
                )}
                {/* Team color icon */}
                <div
                  className="w-10 h-10 mx-auto mb-2 rounded-full border-2 border-[#E8E8D8]/30"
                  style={{ backgroundColor: team.colors?.primary || '#666' }}
                >
                  {team.colors?.secondary && (
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        background: `linear-gradient(135deg, transparent 50%, ${team.colors.secondary} 50%)`,
                      }}
                    />
                  )}
                </div>
                <div className="text-xs font-bold text-[#E8E8D8] mb-1 truncate" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{team.name.toUpperCase()}</div>
                <div className="text-[10px] text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>{team.abbreviation}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#3A5A32] border-4 border-[#E8E8D8] p-4">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SUMMARY</p>
        <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
        <div className="space-y-2 mb-4">
          <p className="text-xs text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
            SELECTED: <span className="text-[#C4A853] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{selectedCount} teams</span>
            {selectedCount > 0 && (
              <span className="text-[#E8E8D8]/70">
                {" "}
                (
                {config.teams.selectedTeams
                  .map((id) => leagueTeams.find((t) => t.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
                )
              </span>
            )}
          </p>
          <p className="text-xs text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
            AI-CONTROLLED: <span className="text-[#E8E8D8]/50">{aiCount} teams</span>
          </p>
        </div>

        {selectedCount >= 2 && (
          <div className="border-t-2 border-[#E8E8D8]/30 pt-4">
            <p className="text-xs text-[#E8E8D8]/70 mb-3" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Mode:</p>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    teams: { ...config.teams, mode: "single" },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.teams.mode === "single" ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.teams.mode === "single" && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
                </div>
                Single Player
              </button>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    teams: { ...config.teams, mode: "multiplayer" },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.teams.mode === "multiplayer" ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.teams.mode === "multiplayer" && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                Multiplayer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 5: Roster Mode
function Step5RosterMode({
  config,
  setConfig,
  leagueTeams,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  leagueTeams: Team[];
}) {
  const navigate = useNavigate();
  return (
    <div>
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>ROSTER MODE</h2>
      <p className="text-xs text-[#E8E8D8]/70 mb-6" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Choose how team rosters will be populated</p>

      {/* Existing Rosters Option */}
      <div
        className={`border-4 p-5 mb-4 transition-all ${
          config.roster.mode === "existing"
            ? "border-[#C4A853] bg-[#C4A853]/10 border-l-[8px]"
            : "border-[#E8E8D8] bg-[#4A6A42]"
        }`}
      >
        <button
          onClick={() =>
            setConfig({
              ...config,
              roster: { mode: "existing" },
            })
          }
          className="flex items-start gap-3 w-full text-left"
        >
          <div
            className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${
              config.roster.mode === "existing" ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8] bg-transparent"
            }`}
          >
            {config.roster.mode === "existing" && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#E8E8D8] mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>USE EXISTING ROSTERS</h3>
            <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Start with the current rosters from League Builder.</p>
            <p className="text-xs text-[#E8E8D8]/70 mb-4" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Teams keep their assigned players.</p>
          </div>
        </button>

        {config.roster.mode === "existing" && (
          <div className="ml-9 mt-4 bg-[#3A5A32] border-2 border-[#E8E8D8]/30 p-4">
            <p className="text-xs text-[#E8E8D8]/70 mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>ROSTER SUMMARY</p>
            <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
            <div className="space-y-2 mb-3">
              <p className="text-xs text-[#00CC00]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>✓ All {leagueTeams.length} teams have valid rosters (22 MLB + up to 10 farm)</p>
              <p className="text-xs text-[#00CC00]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>✓ 506 total players assigned</p>
            </div>
            <button onClick={() => navigate('/league-builder/rosters')} className="text-xs text-[#C4A853] hover:text-[#FFD700] underline" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>[View Rosters]</button>
          </div>
        )}
      </div>

      {/* Fantasy Draft Option */}
      <div
        className={`border-4 p-5 transition-all ${
          config.roster.mode === "draft" ? "border-[#C4A853] bg-[#C4A853]/10 border-l-[8px]" : "border-[#E8E8D8] bg-[#4A6A42]"
        }`}
      >
        <button
          onClick={() =>
            setConfig({
              ...config,
              roster: {
                mode: "draft",
                draftSettings: {
                  playerPool: "league",
                  rounds: 22,
                  format: "Snake",
                  timePerPick: "Unlimited",
                },
              },
            })
          }
          className="flex items-start gap-3 w-full text-left"
        >
          <div
            className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${
              config.roster.mode === "draft" ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8] bg-transparent"
            }`}
          >
            {config.roster.mode === "draft" && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#E8E8D8] mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FANTASY DRAFT</h3>
            <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Run a snake draft to build all rosters from scratch.</p>
            <p className="text-xs text-[#E8E8D8]/70 mb-4" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>You draft for your team(s), AI drafts for others.</p>
          </div>
        </button>

        {config.roster.mode === "draft" && config.roster.draftSettings && (
          <div className="ml-9 mt-4 space-y-4">
            {/* Player Pool Source */}
            <div className="bg-[#3A5A32] border-2 border-[#E8E8D8]/30 p-4">
              <p className="text-xs text-[#E8E8D8]/70 mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>PLAYER POOL SOURCE</p>
              <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
              <div className="space-y-2">
                {[
                  { value: "league", label: "Players from Kruse Baseball League" },
                  { value: "all", label: "All players in database (includes all leagues)" },
                  { value: "generate", label: "Generate new fictional players" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setConfig({
                        ...config,
                        roster: {
                          ...config.roster,
                          draftSettings: {
                            ...config.roster.draftSettings!,
                            playerPool: option.value,
                          },
                        },
                      })
                    }
                    className="flex items-center gap-2 text-xs text-[#E8E8D8] w-full"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        config.roster.draftSettings?.playerPool === option.value
                          ? "border-[#C4A853] bg-[#C4A853]"
                          : "border-[#E8E8D8]"
                      }`}
                    >
                      {config.roster.draftSettings?.playerPool === option.value && (
                        <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                      )}
                    </div>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Draft Settings */}
            <div className="bg-[#3A5A32] border-2 border-[#E8E8D8]/30 p-4">
              <p className="text-xs text-[#E8E8D8]/70 mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>DRAFT SETTINGS</p>
              <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Rounds:</span>
                  <input
                    type="number"
                    value={config.roster.draftSettings?.rounds}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        roster: {
                          ...config.roster,
                          draftSettings: {
                            ...config.roster.draftSettings!,
                            rounds: parseInt(e.target.value) || 22,
                          },
                        },
                      })
                    }
                    className="w-20 px-2 py-1 bg-[#2A4A22] border-2 border-[#E8E8D8] text-[#E8E8D8] text-xs text-right"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  />
                  <span className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>(fills 22-man MLB roster)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Format:</span>
                  <select
                    value={config.roster.draftSettings?.format}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        roster: {
                          ...config.roster,
                          draftSettings: {
                            ...config.roster.draftSettings!,
                            format: e.target.value,
                          },
                        },
                      })
                    }
                    className="px-3 py-1 bg-[#2A4A22] border-2 border-[#E8E8D8] text-[#E8E8D8] text-xs"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    <option>Snake</option>
                    <option>Linear</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Time/Pick:</span>
                  <select
                    value={config.roster.draftSettings?.timePerPick}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        roster: {
                          ...config.roster,
                          draftSettings: {
                            ...config.roster.draftSettings!,
                            timePerPick: e.target.value,
                          },
                        },
                      })
                    }
                    className="px-3 py-1 bg-[#2A4A22] border-2 border-[#E8E8D8] text-[#E8E8D8] text-xs"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    <option>Unlimited</option>
                    <option>30 seconds</option>
                    <option>60 seconds</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 6: Confirm & Start
function Step6Confirm({
  config,
  setConfig,
  jumpToStep,
  leagues,
  leagueTeams,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  jumpToStep: (step: number) => void;
  leagues: LeagueTemplate[];
  leagueTeams: Team[];
}) {
  const selectedTeams = leagueTeams.filter((t) => config.teams.selectedTeams.includes(t.id));

  return (
    <div>
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>CONFIRM & START</h2>
      <p className="text-xs text-[#E8E8D8]/70 mb-6" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Review your settings and begin your franchise</p>

      {/* Franchise Name */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FRANCHISE NAME</p>
        <input
          type="text"
          value={config.franchiseName}
          onChange={(e) =>
            setConfig({
              ...config,
              franchiseName: e.target.value,
            })
          }
          className="w-full px-4 py-3 bg-[#2A4A22] border-4 border-[#E8E8D8] text-[#E8E8D8] text-sm"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
          placeholder="Enter franchise name..."
        />
      </div>

      {/* Settings Summary */}
      <div className="bg-[#3A5A32] border-4 border-[#E8E8D8] p-5">
        <p className="text-xs text-[#E8E8D8] font-bold mb-4 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SETTINGS SUMMARY</p>
        <div className="h-[2px] bg-[#E8E8D8] mb-4" />

        <div className="space-y-4">
          {/* League */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>LEAGUE</p>
              <button onClick={() => jumpToStep(1)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>{config.leagueDetails?.name}</p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.leagueDetails?.teams} teams • {config.leagueDetails?.conferences} conferences •{" "}
              {config.leagueDetails?.divisions} divisions
            </p>
          </div>

          {/* Season */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SEASON</p>
              <button onClick={() => jumpToStep(2)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.season.gamesPerTeam} games • {config.season.inningsPerGame} innings •{" "}
              {config.season.scheduleType} schedule
            </p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.season.allStarGame && "All-Star Game ✓  "}
              {config.season.tradeDeadline && "Trade Deadline ✓"}
            </p>
          </div>

          {/* Playoffs */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PLAYOFFS</p>
              <button onClick={() => jumpToStep(3)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.playoffs.teamsQualifying} teams • {config.playoffs.format} format
            </p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              Championship: {config.playoffs.seriesLengths.championship} • World Series:{" "}
              {config.playoffs.seriesLengths.worldSeries}
            </p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Home field: {config.playoffs.homeFieldAdvantage}</p>
          </div>

          {/* Your Teams */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>YOUR TEAMS</p>
              <button onClick={() => jumpToStep(4)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              {selectedTeams.slice(0, 4).map((team) => (
                <div key={team.id} className="bg-[#1A3A12] border-2 border-[#E8E8D8]/30 p-2 text-center">
                  <div
                    className="w-8 h-8 mx-auto mb-1 rounded-full border-2 border-[#E8E8D8]/30"
                    style={{ backgroundColor: team.colors?.primary || '#666' }}
                  />
                  <div className="text-[9px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{team.abbreviation}</div>
                </div>
              ))}
              {selectedTeams.length > 4 && (
                <div className="flex items-center text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>+{selectedTeams.length - 4} more</div>
              )}
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.teams.mode === "multiplayer" ? "Multiplayer" : "Single Player"}: {selectedTeams.length} player
              {selectedTeams.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {leagueTeams.length - selectedTeams.length} AI-controlled teams
            </p>
          </div>

          {/* Rosters */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>ROSTERS</p>
              <button onClick={() => jumpToStep(5)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.roster.mode === "existing"
                ? "Using existing rosters from League Builder"
                : "Fantasy draft - all rosters will be drafted"}
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 bg-[#DD0000]/10 border-2 border-[#DD0000] p-4">
        <p className="text-xs text-[#DD0000] mb-1">
          ⚠️ This will create a new franchise save slot.
        </p>
        <p className="text-xs text-[#DD0000]/70">You can have multiple franchises saved simultaneously.</p>
      </div>
    </div>
  );
}
