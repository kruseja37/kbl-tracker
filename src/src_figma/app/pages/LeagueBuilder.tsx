import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Database, Users, User, Folder, Shuffle, Settings, ArrowLeft, Loader2, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useLeagueBuilderData } from "../../hooks/useLeagueBuilderData";

export function LeagueBuilder() {
  const navigate = useNavigate();
  const { leagues, teams, players, rulesPresets, isLoading, error, seedSMB4Data, isSMB4Seeded } = useLeagueBuilderData();

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ teams: number; players: number } | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isAlreadySeeded, setIsAlreadySeeded] = useState(false);

  // Check if already seeded on mount
  useEffect(() => {
    isSMB4Seeded().then(setIsAlreadySeeded);
  }, [isSMB4Seeded, players]);

  const handleSeedDatabase = async () => {
    if (isSeeding) return;

    const confirmed = window.confirm(
      'This will import all SMB4 teams and players into the League Builder database.\n\n' +
      'Any existing teams and players will be REPLACED.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    setIsSeeding(true);
    setSeedResult(null);
    setSeedError(null);

    try {
      const result = await seedSMB4Data(true);
      setSeedResult(result);
      setIsAlreadySeeded(true);
    } catch (err) {
      console.error('Failed to seed database:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSeedError(message);
    } finally {
      setIsSeeding(false);
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

        {/* SMB4 Database Import Banner */}
        <div className="bg-[#556B55] border-[4px] border-[#C4A853] p-4 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-[#C4A853]" />
              <div>
                <div className="text-sm font-bold text-[#E8E8D8]">SMB4 Player Database</div>
                <div className="text-xs text-[#E8E8D8]/70">
                  {isAlreadySeeded
                    ? `✓ Loaded: ${teams.length} teams, ${players.length} players`
                    : 'Import real SMB4 teams and players'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className={`flex items-center gap-2 px-6 py-3 border-4 font-bold text-sm transition-all active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] ${
                isSeeding
                  ? 'bg-[#4A6844] border-[#E8E8D8]/30 text-[#E8E8D8]/50 cursor-wait'
                  : isAlreadySeeded
                    ? 'bg-[#4A6844] border-[#5A8352] text-[#E8E8D8] hover:bg-[#5A8352]'
                    : 'bg-[#C4A853] border-[#E8E8D8] text-[#1A1A1A] hover:bg-[#D4B863]'
              }`}
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  IMPORTING...
                </>
              ) : isAlreadySeeded ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  REIMPORT
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  IMPORT SMB4 DATA
                </>
              )}
            </button>
          </div>

          {seedResult && (
            <div className="mt-3 pt-3 border-t border-[#E8E8D8]/30 text-xs text-[#4CAF50]">
              ✓ Successfully imported {seedResult.teams} teams and {seedResult.players} players!
            </div>
          )}

          {seedError && (
            <div className="mt-3 pt-3 border-t border-[#E8E8D8]/30 text-xs text-[#F44336] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Import failed: {seedError}</span>
            </div>
          )}
        </div>

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
            description="Fantasy snake draft configuration"
            count="Configure"
            color="#7733DD"
            onClick={() => navigate("/league-builder/draft")}
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