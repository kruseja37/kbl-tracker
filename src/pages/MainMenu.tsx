import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameSetupModal from '../components/GameSetupModal';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  sublabel: string;
  color: string;
}

const seasonItems: NavItem[] = [
  { path: '/season', icon: '📊', label: 'DASHBOARD', sublabel: 'Season overview', color: 'amber' },
  { path: '/schedule', icon: '📅', label: 'SCHEDULE', sublabel: 'View games', color: 'blue' },
  { path: '/roster', icon: '👥', label: 'ROSTER', sublabel: 'Manage players', color: 'emerald' },
  { path: '/leaders', icon: '🏆', label: 'LEADERS', sublabel: 'League stats', color: 'purple' },
];

const offseasonItems: NavItem[] = [
  { path: '/offseason', icon: '🔄', label: 'OFFSEASON HUB', sublabel: 'Between seasons', color: 'orange' },
  { path: '/offseason/free-agency', icon: '✍️', label: 'FREE AGENCY', sublabel: 'Sign players', color: 'green' },
  { path: '/offseason/draft', icon: '🎯', label: 'DRAFT', sublabel: 'Pick prospects', color: 'cyan' },
  { path: '/offseason/trades', icon: '🔀', label: 'TRADES', sublabel: 'Make deals', color: 'red' },
];

const extraItems: NavItem[] = [
  { path: '/awards', icon: '🏅', label: 'AWARDS', sublabel: 'Ceremonies', color: 'yellow' },
  { path: '/museum', icon: '🏛️', label: 'MUSEUM', sublabel: 'Hall of Fame', color: 'indigo' },
];

export default function MainMenu() {
  const navigate = useNavigate();
  const [showGameSetup, setShowGameSetup] = useState(false);

  const handleGameSetupConfirm = (
    awayTeamId: string,
    homeTeamId: string,
    awayPitcherId?: string,
    homePitcherId?: string
  ) => {
    setShowGameSetup(false);
    let url = `/pregame?away=${awayTeamId}&home=${homeTeamId}`;
    if (awayPitcherId) url += `&awayPitcher=${awayPitcherId}`;
    if (homePitcherId) url += `&homePitcher=${homePitcherId}`;
    navigate(url);
  };

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.path}
      to={item.path}
      className={`group relative block w-full overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 skew-x-[-2deg] scale-x-[1.02] border-l-4 border-${item.color}-400 transition-all duration-300 group-hover:scale-x-[1.04] group-hover:border-l-[6px]`} />
      <div className={`absolute inset-0 bg-gradient-to-r from-${item.color}-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{item.icon}</div>
          <div>
            <div className="font-bold text-white text-base tracking-wide">{item.label}</div>
            <div className="text-slate-400 text-xs">{item.sublabel}</div>
          </div>
        </div>
        <div className={`text-slate-400 text-xl group-hover:translate-x-2 group-hover:text-${item.color}-400 transition-all duration-300`}>
          →
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] -translate-y-1/2" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] -translate-y-1/2" />

      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            white 40px,
            white 41px
          )`
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-8">

        {/* Logo Section - Compact */}
        <div className="mb-8 text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl scale-150" />
            <div className="relative text-5xl drop-shadow-2xl">⚾</div>
          </div>
          <h1 className="font-black text-3xl sm:text-4xl tracking-tight">
            <span className="text-white">KBL</span>
            <span className="text-blue-400 ml-2">TRACKER</span>
          </h1>
        </div>

        {/* Navigation Grid */}
        <div className="w-full max-w-2xl space-y-6 px-4">

          {/* New Game - Primary */}
          <button
            onClick={() => setShowGameSetup(true)}
            className="group relative block w-full overflow-hidden text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 skew-x-[-2deg] scale-x-[1.02] transition-all duration-300 group-hover:scale-x-[1.04] group-hover:skew-x-[-3deg]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <div className="relative flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎮</div>
                <div>
                  <div className="font-bold text-white text-xl tracking-wide">NEW GAME</div>
                  <div className="text-blue-100/70 text-sm">Start tracking a match</div>
                </div>
              </div>
              <div className="text-white/80 text-2xl group-hover:translate-x-2 transition-transform duration-300">→</div>
            </div>
          </button>

          {/* Season Section */}
          <div>
            <h2 className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-3 px-2">Season</h2>
            <div className="space-y-2">
              {seasonItems.map(renderNavItem)}
            </div>
          </div>

          {/* Offseason Section */}
          <div>
            <h2 className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-3 px-2">Offseason</h2>
            <div className="space-y-2">
              {offseasonItems.map(renderNavItem)}
            </div>
          </div>

          {/* Extras Section */}
          <div>
            <h2 className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-3 px-2">Extras</h2>
            <div className="space-y-2">
              {extraItems.map(renderNavItem)}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-slate-700/50 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-slate-500 text-xs font-medium tracking-wide">READY TO PLAY</span>
          </div>
        </div>

      </div>

      <GameSetupModal
        isOpen={showGameSetup}
        onClose={() => setShowGameSetup(false)}
        onConfirm={handleGameSetupConfirm}
      />
    </div>
  );
}
