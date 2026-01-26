import { useState, useMemo } from 'react';
import { TEAMS } from '../data/playerDatabase';
import {
  saveLeague,
  createLeagueConfig,
  validateLeague,
  type LeagueSettings,
} from '../utils/leagueStorage';

interface LeagueBuilderProps {
  onSuccess?: (leagueId: string) => void;
  onCancel?: () => void;
}

const CHEMISTRY_LABELS: Record<string, { label: string; color: string }> = {
  SPIRITED: { label: 'SPI', color: 'text-rose-400' },
  CRAFTY: { label: 'CRA', color: 'text-violet-400' },
  DISCIPLINED: { label: 'DIS', color: 'text-sky-400' },
  FIERY: { label: 'FIR', color: 'text-orange-400' },
  GRITTY: { label: 'GRI', color: 'text-emerald-400' },
};

const GAMES_OPTIONS = [16, 32, 50, 82, 162];
const PLAYOFF_OPTIONS = [2, 4, 6, 8];

export default function LeagueBuilder({ onSuccess, onCancel }: LeagueBuilderProps) {
  const [leagueName, setLeagueName] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<LeagueSettings>({
    gamesPerSeason: 50,
    useDH: true,
    playoffTeams: 4,
  });
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const teams = useMemo(() => Object.values(TEAMS), []);
  const allSelected = selectedTeams.size === teams.length;
  const noneSelected = selectedTeams.size === 0;

  const toggleTeam = (teamId: string) => {
    setError(null);
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setError(null);
    setSelectedTeams(new Set(teams.map(t => t.id)));
  };

  const deselectAll = () => {
    setError(null);
    setSelectedTeams(new Set());
  };

  const handleCreate = () => {
    const teamIds = Array.from(selectedTeams);
    const validation = validateLeague(teamIds);

    if (!validation.valid) {
      setError(validation.error || 'Invalid configuration');
      return;
    }

    if (!leagueName.trim()) {
      setError('League name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    // Small delay for UX feedback
    setTimeout(() => {
      const league = createLeagueConfig(leagueName.trim(), teamIds, settings);
      saveLeague(league);
      setIsCreating(false);
      onSuccess?.(league.id);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between border-b-2 border-amber-500/60 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              League Builder
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-mono tracking-wide">
              ASSEMBLE YOUR COMPETITION
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-600">TEAMS:</span>
            <span className="text-amber-400 font-bold text-lg tabular-nums">
              {selectedTeams.size}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-500">{teams.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* League Name Input */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 relative overflow-hidden">
          {/* Corner accent */}
          <div className="absolute top-0 left-0 w-1 h-8 bg-amber-500" />
          <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
            League Designation
          </label>
          <input
            type="text"
            value={leagueName}
            onChange={(e) => {
              setLeagueName(e.target.value);
              setError(null);
            }}
            placeholder="Enter league name..."
            className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-500/70 px-4 py-3 text-white text-lg font-bold placeholder:text-slate-600 placeholder:font-normal focus:outline-none transition-colors"
          />
        </div>

        {/* Team Selection Panel */}
        <div className="bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-amber-500" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Available Franchises
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={allSelected}
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors border border-slate-600"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                disabled={noneSelected}
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors border border-slate-600"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Team Grid */}
          <div className="p-4 grid gap-2 sm:grid-cols-2">
            {teams.map((team, index) => {
              const isSelected = selectedTeams.has(team.id);
              const chemInfo = CHEMISTRY_LABELS[team.chemistry] || {
                label: team.chemistry?.slice(0, 3) || '???',
                color: 'text-slate-400',
              };

              return (
                <button
                  key={team.id}
                  onClick={() => toggleTeam(team.id)}
                  className={`group relative flex items-center gap-3 p-3 border-2 transition-all duration-150 text-left ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500/70 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                  style={{
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  {/* Selection Indicator */}
                  <div
                    className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400'
                        : 'border-slate-600 group-hover:border-slate-500'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Team Color Badge */}
                  <div
                    className="w-8 h-8 border-2 border-white/20 shadow-inner flex-shrink-0"
                    style={{ backgroundColor: team.primaryColor }}
                  />

                  {/* Team Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">
                      {team.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {team.homePark}
                    </div>
                  </div>

                  {/* Chemistry Badge */}
                  <div
                    className={`px-2 py-1 text-xs font-mono font-bold border border-current/30 ${chemInfo.color}`}
                  >
                    {chemInfo.label}
                  </div>

                  {/* Selected glow effect */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 opacity-10 pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, ${team.primaryColor}40 0%, transparent 60%)`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Collapsible */}
        <div className="bg-slate-900/80 border border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-1 h-6 transition-colors ${showSettings ? 'bg-amber-500' : 'bg-slate-600'}`} />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                League Settings
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${
                showSettings ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSettings && (
            <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-4">
              {/* Games Per Season */}
              <div>
                <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Games Per Season
                </label>
                <div className="flex gap-2 flex-wrap">
                  {GAMES_OPTIONS.map((num) => (
                    <button
                      key={num}
                      onClick={() => setSettings(s => ({ ...s, gamesPerSeason: num }))}
                      className={`px-4 py-2 text-sm font-mono font-bold border-2 transition-all ${
                        settings.gamesPerSeason === num
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Use DH */}
              <div>
                <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Designated Hitter
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings(s => ({ ...s, useDH: true }))}
                    className={`px-4 py-2 text-sm font-mono font-bold border-2 transition-all ${
                      settings.useDH
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    ENABLED
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, useDH: false }))}
                    className={`px-4 py-2 text-sm font-mono font-bold border-2 transition-all ${
                      !settings.useDH
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    DISABLED
                  </button>
                </div>
              </div>

              {/* Playoff Teams */}
              <div>
                <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Playoff Teams
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PLAYOFF_OPTIONS.map((num) => (
                    <button
                      key={num}
                      onClick={() => setSettings(s => ({ ...s, playoffTeams: num }))}
                      className={`px-4 py-2 text-sm font-mono font-bold border-2 transition-all ${
                        settings.playoffTeams === num
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-950/50 border-2 border-red-500/50 px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-400 font-mono text-sm">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 text-sm font-mono uppercase tracking-wide text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className={`ml-auto px-8 py-3 font-bold text-sm uppercase tracking-wide border-2 transition-all ${
              isCreating
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-500/50 cursor-wait'
                : 'bg-amber-500 border-amber-400 text-slate-900 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20'
            }`}
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </span>
            ) : (
              'Create League'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
