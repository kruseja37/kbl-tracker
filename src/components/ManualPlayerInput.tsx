import { useState, useRef, useMemo, useEffect } from 'react';
import { getAllPlayers, type PlayerData, type Gender, type PlayerRole, type PitcherRole, type PlayerTraits, TEAMS } from '../data/playerDatabase';
import type { Position, BatterHand } from '../types/game';
import {
  saveCustomPlayer,
  generatePlayerId,
  validatePlayer,
  type ThrowHand,
  type CustomPlayer,
} from '../utils/customPlayerStorage';
import {
  calculateSalary,
  type PlayerForSalary,
} from '../engines/salaryCalculator';

interface ManualPlayerInputProps {
  onSuccess?: (player: CustomPlayer) => void;
  onCancel?: () => void;
}

const POSITIONS: { value: Position; label: string; isPitcher: boolean }[] = [
  { value: 'C', label: 'C', isPitcher: false },
  { value: '1B', label: '1B', isPitcher: false },
  { value: '2B', label: '2B', isPitcher: false },
  { value: '3B', label: '3B', isPitcher: false },
  { value: 'SS', label: 'SS', isPitcher: false },
  { value: 'LF', label: 'LF', isPitcher: false },
  { value: 'CF', label: 'CF', isPitcher: false },
  { value: 'RF', label: 'RF', isPitcher: false },
  { value: 'DH', label: 'DH', isPitcher: false },
  { value: 'P', label: 'SP', isPitcher: true },
  { value: 'P', label: 'RP', isPitcher: true },
];

const BATS_OPTIONS: { value: BatterHand; label: string }[] = [
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
  { value: 'S', label: 'Switch' },
];

const THROWS_OPTIONS: { value: ThrowHand; label: string }[] = [
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
];

const DEFAULT_BATTER_RATINGS = {
  power: 50,
  contact: 50,
  speed: 50,
  fielding: 50,
  arm: 50,
};

const DEFAULT_PITCHER_RATINGS = {
  velocity: 50,
  junk: 50,
  accuracy: 50,
};

// Format salary for display
function formatSalary(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

// Map game Position type to salary calculator PlayerPosition type
function mapToSalaryPosition(position: Position, isPitcher: boolean): 'SP' | 'RP' | 'C' | 'SS' | 'CF' | '2B' | '3B' | 'RF' | 'LF' | '1B' | 'DH' {
  if (isPitcher) return 'SP';
  // Position 'P' shouldn't appear for non-pitchers, but handle it just in case
  if (position === 'P') return 'SP';
  return position as 'C' | 'SS' | 'CF' | '2B' | '3B' | 'RF' | 'LF' | '1B' | 'DH';
}

// Calculate salary from player data
function computeSalary(
  isPitcher: boolean,
  batterRatings: typeof DEFAULT_BATTER_RATINGS,
  pitcherRatings: typeof DEFAULT_PITCHER_RATINGS | undefined,
  age: number,
  position: Position
): number {
  const playerForSalary: PlayerForSalary = {
    id: 'temp',
    name: 'temp',
    isPitcher,
    primaryPosition: mapToSalaryPosition(position, isPitcher),
    ratings: isPitcher
      ? { velocity: pitcherRatings?.velocity || 50, junk: pitcherRatings?.junk || 50, accuracy: pitcherRatings?.accuracy || 50 }
      : batterRatings,
    battingRatings: isPitcher ? batterRatings : undefined,
    age,
    fame: 0,
  };
  return calculateSalary(playerForSalary);
}

export default function ManualPlayerInput({ onSuccess, onCancel }: ManualPlayerInputProps) {
  // All players from database for autocomplete
  const allPlayers = useMemo(() => getAllPlayers(), []);

  // Form state - basic info
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('SS');
  const [secondaryPosition, setSecondaryPosition] = useState<Position | undefined>();
  const [isPitcher, setIsPitcher] = useState(false);
  const [bats, setBats] = useState<BatterHand>('R');
  const [throws_, setThrows] = useState<ThrowHand>('R');
  const [age, setAge] = useState(25);
  const [overall, setOverall] = useState<string>('B');
  const [batterRatings, setBatterRatings] = useState(DEFAULT_BATTER_RATINGS);
  const [pitcherRatings, setPitcherRatings] = useState(DEFAULT_PITCHER_RATINGS);

  // Form state - additional fields from database
  const [gender, setGender] = useState<Gender>('M');
  const [role, setRole] = useState<PlayerRole>('STARTER');
  const [pitcherRole, setPitcherRole] = useState<PitcherRole | undefined>();
  const [chemistry, setChemistry] = useState<string>('DIS');
  const [traits, setTraits] = useState<PlayerTraits>({});
  const [arsenal, setArsenal] = useState<string[] | undefined>();

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter players based on input
  const suggestions = useMemo(() => {
    if (!name || name.length < 2) return [];
    const lowerName = name.toLowerCase();
    return allPlayers
      .filter(p => p.name.toLowerCase().includes(lowerName))
      .slice(0, 8); // Limit to 8 suggestions
  }, [name, allPlayers]);

  // Calculate salary in real-time
  const calculatedSalary = useMemo(() => {
    return computeSalary(isPitcher, batterRatings, isPitcher ? pitcherRatings : undefined, age, position);
  }, [isPitcher, batterRatings, pitcherRatings, age, position]);

  // Show suggestions when typing and there are matches
  useEffect(() => {
    if (suggestions.length > 0 && !selectedPlayer) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions, selectedPlayer]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select a player from suggestions (import from database)
  const handleSelectPlayer = (player: PlayerData) => {
    setSelectedPlayer(player);
    setName(player.name);
    setPosition(player.primaryPosition);
    setSecondaryPosition(player.secondaryPosition);
    setIsPitcher(player.isPitcher);
    setBats(player.bats);
    setThrows(player.throws);
    setAge(player.age);
    setOverall(player.overall);

    // Ratings
    if (player.batterRatings) {
      setBatterRatings(player.batterRatings);
    }
    if (player.pitcherRatings) {
      setPitcherRatings(player.pitcherRatings);
    }

    // Additional fields from database
    setGender(player.gender);
    setRole(player.role);
    setPitcherRole(player.pitcherRole);
    setChemistry(player.chemistry);
    setTraits(player.traits);
    setArsenal(player.arsenal);

    setShowSuggestions(false);
    setError(null);
  };

  // Clear selected player and allow manual entry
  const handleClearSelection = () => {
    setSelectedPlayer(null);
    // Keep the name but allow editing
  };

  const handlePositionChange = (pos: Position, pitcher: boolean) => {
    setPosition(pos);
    setIsPitcher(pitcher);
  };

  const handleBatterRatingChange = (field: keyof typeof batterRatings, value: string) => {
    const numValue = Math.min(99, Math.max(0, parseInt(value, 10) || 0));
    setBatterRatings(prev => ({ ...prev, [field]: numValue }));
  };

  const handlePitcherRatingChange = (field: keyof typeof pitcherRatings, value: string) => {
    const numValue = Math.min(99, Math.max(0, parseInt(value, 10) || 0));
    setPitcherRatings(prev => ({ ...prev, [field]: numValue }));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setError(null);
    // If they change the name after selecting, clear the selection
    if (selectedPlayer && value !== selectedPlayer.name) {
      setSelectedPlayer(null);
    }
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectPlayer(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = () => {
    const playerData: Partial<CustomPlayer> = {
      name: name.trim(),
      position,
      age,
    };

    const validation = validatePlayer(playerData);
    if (!validation.valid) {
      setError(validation.error || 'Invalid player data');
      nameInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setError(null);

    const player: CustomPlayer = {
      id: generatePlayerId(),
      name: name.trim(),
      teamId: selectedPlayer?.teamId || 'my-team', // Keep original team if imported

      // Demographics
      age,
      gender,
      bats,
      throws: throws_,

      // Position info
      position,
      secondaryPosition,
      isPitcher,
      pitcherRole: isPitcher ? pitcherRole : undefined,
      role,

      // Ratings
      overall,
      batterRatings,
      pitcherRatings: isPitcher ? pitcherRatings : undefined,

      // Chemistry and traits
      chemistry,
      traits,

      // Arsenal
      arsenal: isPitcher ? arsenal : undefined,

      // Salary
      salary: calculatedSalary,

      // Source tracking
      sourcePlayerId: selectedPlayer?.id,
      originalTeamId: selectedPlayer?.teamId,

      createdAt: Date.now(),
    };

    // Small delay for feedback
    setTimeout(() => {
      saveCustomPlayer(player);
      setIsSaving(false);
      setShowSuccess(true);

      setTimeout(() => {
        onSuccess?.(player);
      }, 800);
    }, 300);
  };

  if (showSuccess) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-950 p-8">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Player Added!</h3>
          <p className="text-slate-400">{name} has been added to your roster</p>
          <p className="text-amber-400 font-bold mt-2">{formatSalary(calculatedSalary)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 p-4 sm:p-6">
      {/* Card Frame */}
      <div className="max-w-2xl mx-auto border-4 border-amber-600/80 bg-slate-900 shadow-2xl shadow-black/50">
        {/* Card Header - Like top of baseball card */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wide drop-shadow-md">
              {selectedPlayer ? 'Import Player' : 'New Player Card'}
            </h2>
            <p className="text-xs text-amber-200/80 font-medium">
              {selectedPlayer ? `From ${selectedPlayer.teamId}` : 'Search database or create new'}
            </p>
          </div>
          {/* Salary Display */}
          <div className="text-right">
            <div className="text-xs text-amber-200/60 uppercase tracking-wide">Salary</div>
            <div className="text-lg font-black text-white">{formatSalary(calculatedSalary)}</div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* SECTION: Player Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-amber-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Player Identity
              </span>
            </div>

            {/* Name Input with Autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Player Name *
              </label>
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && !selectedPlayer && setShowSuggestions(true)}
                  placeholder="Start typing to search players..."
                  className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-500 px-4 py-3 text-white text-lg font-bold placeholder:text-slate-600 placeholder:font-normal focus:outline-none transition-colors"
                />
                {selectedPlayer && (
                  <button
                    onClick={handleClearSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    title="Clear selection"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border-2 border-amber-500/50 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {suggestions.map((player, idx) => (
                    <button
                      key={player.id}
                      onClick={() => handleSelectPlayer(player)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-700 transition-colors ${
                        idx === highlightedIndex ? 'bg-slate-700' : ''
                      }`}
                    >
                      <div>
                        <div className="text-white font-bold">{player.name}</div>
                        <div className="text-xs text-slate-400">
                          {player.primaryPosition} · {player.teamId} · Age {player.age}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 text-sm font-bold">{player.overall}</div>
                        {player.batterRatings && !player.isPitcher && (
                          <div className="text-xs text-slate-500">
                            POW {player.batterRatings.power} · CON {player.batterRatings.contact}
                          </div>
                        )}
                        {player.pitcherRatings && (
                          <div className="text-xs text-slate-500">
                            VEL {player.pitcherRatings.velocity} · JNK {player.pitcherRatings.junk}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Player Badge */}
            {selectedPlayer && (
              <div className="bg-emerald-900/30 border border-emerald-500/50 rounded px-3 py-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-emerald-400">Importing from database - all attributes loaded</span>
              </div>
            )}

            {/* Age Input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Age
              </label>
              <input
                type="number"
                min={18}
                max={50}
                value={age}
                onChange={(e) => setAge(Math.min(50, Math.max(18, parseInt(e.target.value, 10) || 25)))}
                className="w-24 bg-slate-800 border-2 border-slate-700 focus:border-amber-500 px-4 py-2 text-white font-bold focus:outline-none transition-colors"
              />
            </div>

            {/* Position Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Position *
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                {POSITIONS.map((pos) => {
                  const isSelected = position === pos.value && isPitcher === pos.isPitcher;
                  return (
                    <button
                      key={`${pos.label}`}
                      onClick={() => handlePositionChange(pos.value, pos.isPitcher)}
                      className={`px-2 py-2 text-sm font-bold border-2 transition-all ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-slate-900'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Handedness Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Bats */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Bats
                </label>
                <div className="flex gap-1.5">
                  {BATS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setBats(opt.value)}
                      className={`flex-1 px-3 py-2 text-sm font-bold border-2 transition-all ${
                        bats === opt.value
                          ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Throws */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Throws
                </label>
                <div className="flex gap-1.5">
                  {THROWS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setThrows(opt.value)}
                      className={`flex-1 px-3 py-2 text-sm font-bold border-2 transition-all ${
                        throws_ === opt.value
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-slate-700/50" />

          {/* SECTION: Batter Ratings */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-blue-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Batting Ratings
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'power', label: 'POW', color: 'red' },
                { key: 'contact', label: 'CON', color: 'blue' },
                { key: 'speed', label: 'SPD', color: 'green' },
                { key: 'fielding', label: 'FLD', color: 'yellow' },
                { key: 'arm', label: 'ARM', color: 'purple' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 uppercase text-center mb-1">
                    {label}
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 bg-${color}-500 rounded-l`}
                    />
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={batterRatings[key as keyof typeof batterRatings]}
                      onChange={(e) =>
                        handleBatterRatingChange(key as keyof typeof batterRatings, e.target.value)
                      }
                      className="w-full pl-3 pr-1 py-2 bg-slate-800 border border-slate-700 text-white text-center text-lg font-bold tabular-nums focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: Pitcher Ratings (conditional) */}
          {isPitcher && (
            <>
              <div className="border-t-2 border-dashed border-slate-700/50" />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-orange-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Pitching Ratings
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'velocity', label: 'VEL', color: 'orange' },
                    { key: 'junk', label: 'JNK', color: 'cyan' },
                    { key: 'accuracy', label: 'ACC', color: 'emerald' },
                  ].map(({ key, label, color }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-500 uppercase text-center mb-1">
                        {label}
                      </label>
                      <div className="relative">
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 bg-${color}-500 rounded-l`}
                        />
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={pitcherRatings[key as keyof typeof pitcherRatings]}
                          onChange={(e) =>
                            handlePitcherRatingChange(
                              key as keyof typeof pitcherRatings,
                              e.target.value
                            )
                          }
                          className="w-full pl-3 pr-1 py-2 bg-slate-800 border border-slate-700 text-white text-center text-lg font-bold tabular-nums focus:outline-none focus:border-slate-500 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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
              <span className="text-red-400 font-medium text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Card Footer - Action buttons */}
        <div className="bg-slate-800/50 border-t border-slate-700 px-4 sm:px-6 py-4 flex items-center justify-between">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className={`ml-auto px-6 py-2.5 font-bold text-sm uppercase tracking-wide border-2 transition-all ${
              isSaving
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-500/50 cursor-wait'
                : 'bg-amber-500 border-amber-400 text-slate-900 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20'
            }`}
          >
            {isSaving ? (
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
                Saving...
              </span>
            ) : (
              `Add to Roster • ${formatSalary(calculatedSalary)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
