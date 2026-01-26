import { useState, useRef, useEffect } from 'react';
import { TEAMS } from '../data/playerDatabase';
import { useAppContext } from '../context/AppContext';

export default function TeamSelector() {
  const { selectedTeamId, setSelectedTeam } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const teams = Object.values(TEAMS);
  const selectedTeam = selectedTeamId ? TEAMS[selectedTeamId] : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (teamId: string) => {
    setSelectedTeam(teamId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 rounded-full transition-all duration-200 group"
      >
        {selectedTeam ? (
          <>
            {/* Team color swatch */}
            <div
              className="w-4 h-4 rounded-full border-2 border-white/20 shadow-inner"
              style={{ backgroundColor: selectedTeam.primaryColor }}
            />
            <span className="text-sm font-medium text-white">
              {selectedTeam.name}
            </span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full bg-slate-600 border-2 border-slate-500/50" />
            <span className="text-sm text-slate-400">Select Team</span>
          </>
        )}
        {/* Chevron */}
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[180px] bg-slate-900 border border-slate-700/50 rounded-lg shadow-xl shadow-black/30 overflow-hidden z-50">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-700/50">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Select Team
            </span>
          </div>

          {/* Team List */}
          <div className="py-1">
            {teams.map((team) => {
              const isSelected = team.id === selectedTeamId;
              return (
                <button
                  key={team.id}
                  onClick={() => handleSelect(team.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-colors duration-150 ${
                    isSelected
                      ? 'bg-slate-700/50'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  {/* Team color indicator with glow when selected */}
                  <div className="relative">
                    <div
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                        isSelected ? 'border-white/40 scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    {isSelected && (
                      <div
                        className="absolute inset-0 rounded-full blur-sm opacity-50"
                        style={{ backgroundColor: team.primaryColor }}
                      />
                    )}
                  </div>

                  {/* Team name */}
                  <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {team.name}
                  </span>

                  {/* Check mark for selected */}
                  {isSelected && (
                    <svg className="w-4 h-4 text-emerald-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Clear option */}
          {selectedTeamId && (
            <div className="border-t border-slate-700/50 py-1">
              <button
                onClick={() => {
                  setSelectedTeam(null);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
