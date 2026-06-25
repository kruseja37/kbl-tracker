import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Database, Users, User, Folder, Shuffle, Settings, ArrowLeft, Loader2, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useLeagueBuilderData } from "../../hooks/useLeagueBuilderData";
import { farmDraftRouteForLeague } from "../utils/draftRouting";

export function LeagueBuilder() {
  const navigate = useNavigate();
  const { leagues, teams, players, rulesPresets, isLoading, error, seedSMB4Data, isSMB4Seeded, seedMLBData, isMLBSeeded } = useLeagueBuilderData();
  const defaultFarmDraftRoute = leagues[0] ? farmDraftRouteForLeague(leagues[0]) : "/league-builder/draft";

  const [isSeeding, setIsSeeding] = useState<'sml' | 'mlb' | null>(null);
  const [seedResult, setSeedResult] = useState<{ source: string; teams: number; players: number } | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isSMLSeeded, setIsSMLSeeded] = useState(false);
  const [isMLBSeededState, setIsMLBSeededState] = useState(false);

  // Check if already seeded on mount
  useEffect(() => {
    isSMB4Seeded().then(setIsSMLSeeded);
    isMLBSeeded().then(setIsMLBSeededState);
  }, [isSMB4Seeded, isMLBSeeded, players]);

  const handleSeedDatabase = async (source: 'sml' | 'mlb') => {
    if (isSeeding) return;

    const label = source === 'sml' ? 'Super Mega League (20 teams)' : 'Major League Baseball (30 teams)';
    const confirmed = window.confirm(
      `This will import all ${label} teams and players into the League Builder database.\n\n` +
      `Any existing ${source.toUpperCase()} teams/players will be refreshed. Other leagues are preserved.\n\n` +
      'Continue?'
    );

    if (!confirmed) return;

    setIsSeeding(source);
    setSeedResult(null);
    setSeedError(null);

    try {
      const result = source === 'sml'
        ? await seedSMB4Data(true)
        : await seedMLBData(true);
      setSeedResult({ source: label, ...result });
      if (source === 'sml') setIsSMLSeeded(true);
      else setIsMLBSeededState(true);
      // Re-check both since clearing replaces all data
      isSMB4Seeded().then(setIsSMLSeeded);
      isMLBSeeded().then(setIsMLBSeededState);
    } catch (err) {
      console.error(`Failed to seed ${source} database:`, err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSeedError(message);
    } finally {
      setIsSeeding(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
          </button>
          <div className="bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
            <h1 className="text-2xl font-bold text-[#E8E8D8] tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>LEAGUE BUILDER</h1>
          </div>
        </div>

        {/* Database Import Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* SML Import */}
          <div className="bg-[#556B55] border-[4px] border-[#C4A853] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Database className="w-6 h-6 text-[#C4A853] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#E8E8D8]">Super Mega League</div>
                  <div className="text-xs text-[#E8E8D8]/70">
                    {isSMLSeeded
                      ? '20 teams, ~440 players'
                      : 'Import 20 SML teams + players'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSeedDatabase('sml')}
                disabled={!!isSeeding}
                className={`flex items-center gap-2 px-4 py-2 border-4 font-bold text-xs transition-all active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] shrink-0 ${
                  isSeeding
                    ? 'bg-[#4A6844] border-[#E8E8D8]/30 text-[#E8E8D8]/50 cursor-wait'
                    : isSMLSeeded
                      ? 'bg-[#4A6844] border-[#5A8352] text-[#E8E8D8] hover:bg-[#5A8352]'
                      : 'bg-[#C4A853] border-[#E8E8D8] text-[#1A1A1A] hover:bg-[#D4B863]'
                }`}
              >
                {isSeeding === 'sml' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> IMPORTING...</>
                ) : isSMLSeeded ? (
                  <><CheckCircle className="w-4 h-4" /> REIMPORT</>
                ) : (
                  <><Download className="w-4 h-4" /> IMPORT SML</>
                )}
              </button>
            </div>
          </div>

          {/* MLB Import */}
          <div className="bg-[#556B55] border-[4px] border-[#3B7DD8] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Database className="w-6 h-6 text-[#3B7DD8] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#E8E8D8]">Major League Baseball</div>
                  <div className="text-xs text-[#E8E8D8]/70">
                    {isMLBSeededState
                      ? '30 teams, ~660 players'
                      : 'Import 30 MLB teams + players'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSeedDatabase('mlb')}
                disabled={!!isSeeding}
                className={`flex items-center gap-2 px-4 py-2 border-4 font-bold text-xs transition-all active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] shrink-0 ${
                  isSeeding
                    ? 'bg-[#4A6844] border-[#E8E8D8]/30 text-[#E8E8D8]/50 cursor-wait'
                    : isMLBSeededState
                      ? 'bg-[#4A6844] border-[#3B7DD8] text-[#E8E8D8] hover:bg-[#5A8352]'
                      : 'bg-[#3B7DD8] border-[#E8E8D8] text-[#E8E8D8] hover:bg-[#4B8DE8]'
                }`}
              >
                {isSeeding === 'mlb' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> IMPORTING...</>
                ) : isMLBSeededState ? (
                  <><CheckCircle className="w-4 h-4" /> REIMPORT</>
                ) : (
                  <><Download className="w-4 h-4" /> IMPORT MLB</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Import status messages */}
        {(seedResult || seedError) && (
          <div className="mb-8 -mt-4">
            {seedResult && (
              <div className="bg-[#556B55] border-[2px] border-[#4CAF50] p-3 text-xs text-[#4CAF50]">
                Successfully imported {seedResult.source}: {seedResult.teams} teams and {seedResult.players} players!
              </div>
            )}
            {seedError && (
              <div className="bg-[#556B55] border-[2px] border-[#F44336] p-3 text-xs text-[#F44336] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Import failed: {seedError}</span>
              </div>
            )}
          </div>
        )}

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <ModuleCard
            icon={<Database className="w-8 h-8" />}
            title="LEAGUES"
            description="Create, edit, and organize league templates"
            count={isLoading ? "..." : `${leagues.length} league${leagues.length !== 1 ? 's' : ''}`}
            color="#CC44CC"
            onClick={() => navigate("/league-builder/leagues")}
          />

          <ModuleCard
            icon={<Users className="w-8 h-8" />}
            title="TEAMS"
            description="Manage team roster pool and branding"
            count={isLoading ? "..." : `${teams.length} team${teams.length !== 1 ? 's' : ''}`}
            color="#5599FF"
            onClick={() => navigate("/league-builder/teams")}
          />

          <ModuleCard
            icon={<User className="w-8 h-8" />}
            title="PLAYERS"
            description="Player database, ratings, and traits"
            count={isLoading ? "..." : `${players.length} player${players.length !== 1 ? 's' : ''}`}
            color="#3366FF"
            onClick={() => navigate("/league-builder/players")}
          />

          <ModuleCard
            icon={<Folder className="w-8 h-8" />}
            title="ROSTERS"
            description="Assign players to teams and set lineups"
            count={isLoading ? "..." : `${teams.length} roster${teams.length !== 1 ? 's' : ''}`}
            color="#0066FF"
            onClick={() => navigate("/league-builder/rosters")}
          />

          <ModuleCard
            icon={<Shuffle className="w-8 h-8" />}
            title="DRAFT"
            description="Farm prospect draft"
            count="Configure"
            color="#7733DD"
            onClick={() => navigate(defaultFarmDraftRoute)}
          />

          <ModuleCard
            icon={<Shuffle className="w-8 h-8" />}
            title="MLB DRAFT"
            description="Build the pool, see IV, lock, and draft"
            count="Setup"
            color="#3B7DD8"
            onClick={() => navigate(leagues[0] ? `/league-builder/draft-setup?leagueId=${leagues[0].id}` : "/league-builder/draft-setup")}
          />

          <ModuleCard
            icon={<Settings className="w-8 h-8" />}
            title="RULES"
            description="Game, season, and simulation settings"
            count={isLoading ? "..." : `${rulesPresets.length} preset${rulesPresets.length !== 1 ? 's' : ''}`}
            color="#DD0000"
            onClick={() => navigate("/league-builder/rules")}
          />
        </div>

        {/* Current Leagues Section */}
        <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-base text-[#E8E8D8] font-bold tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>▼ CURRENT LEAGUES</div>
          </div>

          <div className="space-y-3 mb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-[#E8E8D8]/60">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading leagues...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-[#DD0000]">
                Error: {error}
              </div>
            ) : leagues.length === 0 ? (
              <div className="text-center py-8 text-[#E8E8D8]/60">
                No leagues created yet. Create your first league below!
              </div>
            ) : (
              leagues.map((league) => (
                <LeagueRow
                  key={league.id}
                  icon="⚾"
                  name={league.name.toUpperCase()}
                  teams={league.teamIds.length}
                  onClick={() => navigate(`/league-builder/leagues?id=${league.id}`)}
                />
              ))
            )}
          </div>

          <button
            onClick={() => navigate("/league-builder/leagues?new=true")}
            className="w-full bg-[#5A8352] hover:bg-[#4A6844] border-[5px] border-[#E8E8D8] py-4 transition-all active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]"
          >
            <span className="text-[#E8E8D8] font-bold text-base tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>+ CREATE NEW LEAGUE</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: string;
  color: string;
  onClick?: () => void;
}

function ModuleCard({ icon, title, description, count, color, onClick }: ModuleCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center text-center border-[4px] border-[#4A6844] p-6 hover:border-[#5A8352] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all active:scale-[0.98] bg-[#556B55] group min-h-[200px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
    >
      <div className="mb-4 group-hover:scale-110 transition-transform" style={{ color }}>
        {icon}
      </div>
      <div className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{title}</div>
      <div className="text-xs text-[#E8E8D8]/80 leading-relaxed mb-4 flex-grow">{description}</div>
      <div className="text-xs font-bold px-3 py-1 border-2 border-[#E8E8D8]/40 rounded-full" style={{ color, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
        {count}
      </div>
    </button>
  );
}

function LeagueRow({ icon, name, teams, onClick }: { icon: string; name: string; teams: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4 hover:bg-[#5A8352] hover:border-[#E8E8D8]/50 transition-all active:scale-[0.99] group shadow-[2px_2px_0px_0px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="text-left">
          <div className="text-sm font-bold text-[#E8E8D8] tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{name}</div>
          <div className="text-xs text-[#E8E8D8]/70">{teams} team{teams !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div className="text-[#E8E8D8] text-xl group-hover:translate-x-1 transition-transform">▶</div>
    </button>
  );
}
