import { Link, useLocation } from 'react-router-dom';
import TeamSelector from './TeamSelector';

export default function NavigationHeader() {
  const location = useLocation();

  // Don't show header on main menu
  if (location.pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 h-12 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="h-full px-4 flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo / Home Link */}
        <Link
          to="/"
          className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          {/* Logo container with diagonal cut */}
          <div className="relative flex items-center">
            {/* Baseball icon */}
            <span className="text-xl mr-1.5 group-hover:scale-110 transition-transform duration-200">
              ⚾
            </span>

            {/* Brand text */}
            <div className="flex items-baseline">
              <span className="font-black text-white tracking-tight">KBL</span>
              <span className="font-bold text-blue-400 text-sm ml-1 tracking-wide">TRACKER</span>
            </div>
          </div>
        </Link>

        {/* Right side - team selector and breadcrumb */}
        <div className="flex items-center gap-4">
          {/* Team Selector */}
          <TeamSelector />

          {/* Current section indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-slate-400 uppercase tracking-wider text-xs font-medium">
              {getPageLabel(location.pathname)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function getPageLabel(pathname: string): string {
  if (pathname.startsWith('/game')) return 'Game';
  if (pathname.startsWith('/season')) return 'Season';
  if (pathname.startsWith('/team')) return 'Teams';
  return 'Menu';
}
