import { useState, useEffect } from 'react';
import {
  getPlayerRatings,
  savePlayerRatings,
  isValidRating,
} from '../utils/playerRatingsStorage';
import type { BatterRatings, PitcherRatings } from '../utils/playerRatingsStorage';

interface PlayerRatingsFormProps {
  playerId: string;
  playerName: string;
  isPitcher: boolean;
  // Initial values from database (optional)
  defaultBatterRatings?: BatterRatings;
  defaultPitcherRatings?: PitcherRatings;
  onSave?: () => void;
  onCancel?: () => void;
}

const DEFAULT_BATTER: BatterRatings = {
  power: 50,
  contact: 50,
  speed: 50,
  fielding: 50,
  arm: 50,
};

const DEFAULT_PITCHER: PitcherRatings = {
  velocity: 50,
  junk: 50,
  accuracy: 50,
};

export default function PlayerRatingsForm({
  playerId,
  playerName,
  isPitcher,
  defaultBatterRatings,
  defaultPitcherRatings,
  onSave,
  onCancel,
}: PlayerRatingsFormProps) {
  const [batterRatings, setBatterRatings] = useState<BatterRatings>(
    defaultBatterRatings ?? DEFAULT_BATTER
  );
  const [pitcherRatings, setPitcherRatings] = useState<PitcherRatings>(
    defaultPitcherRatings ?? DEFAULT_PITCHER
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Load existing custom ratings on mount
  useEffect(() => {
    const existing = getPlayerRatings(playerId);
    if (existing) {
      if (existing.batterRatings) {
        setBatterRatings(existing.batterRatings);
      }
      if (existing.pitcherRatings) {
        setPitcherRatings(existing.pitcherRatings);
      }
    }
  }, [playerId]);

  const handleBatterChange = (field: keyof BatterRatings, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setBatterRatings(prev => ({ ...prev, [field]: numValue }));
    setSaved(false);
  };

  const handlePitcherChange = (field: keyof PitcherRatings, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setPitcherRatings(prev => ({ ...prev, [field]: numValue }));
    setSaved(false);
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    // Validate batter ratings
    for (const [key, value] of Object.entries(batterRatings)) {
      if (!isValidRating(value)) {
        newErrors.push(`${key} must be 0-99`);
      }
    }

    // Validate pitcher ratings if pitcher
    if (isPitcher) {
      for (const [key, value] of Object.entries(pitcherRatings)) {
        if (!isValidRating(value)) {
          newErrors.push(`${key} must be 0-99`);
        }
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    savePlayerRatings({
      playerId,
      batterRatings,
      pitcherRatings: isPitcher ? pitcherRatings : undefined,
      updatedAt: Date.now(),
    });

    setSaved(true);
    onSave?.();
  };

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700/50 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{playerName}</h3>
        <p className="text-sm text-slate-400">
          {isPitcher ? 'Pitcher' : 'Position Player'} Ratings
        </p>
      </div>

      {/* Error display */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <ul className="text-sm text-red-400 list-disc list-inside">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Batter Ratings (always shown) */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-3">
          Batting Ratings
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <RatingInput
            label="Power"
            value={batterRatings.power}
            onChange={(v) => handleBatterChange('power', v)}
            color="red"
          />
          <RatingInput
            label="Contact"
            value={batterRatings.contact}
            onChange={(v) => handleBatterChange('contact', v)}
            color="blue"
          />
          <RatingInput
            label="Speed"
            value={batterRatings.speed}
            onChange={(v) => handleBatterChange('speed', v)}
            color="green"
          />
          <RatingInput
            label="Fielding"
            value={batterRatings.fielding}
            onChange={(v) => handleBatterChange('fielding', v)}
            color="yellow"
          />
          <RatingInput
            label="Arm"
            value={batterRatings.arm}
            onChange={(v) => handleBatterChange('arm', v)}
            color="purple"
          />
        </div>
      </div>

      {/* Pitcher Ratings (only for pitchers) */}
      {isPitcher && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-3">
            Pitching Ratings
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <RatingInput
              label="Velocity"
              value={pitcherRatings.velocity}
              onChange={(v) => handlePitcherChange('velocity', v)}
              color="orange"
            />
            <RatingInput
              label="Junk"
              value={pitcherRatings.junk}
              onChange={(v) => handlePitcherChange('junk', v)}
              color="cyan"
            />
            <RatingInput
              label="Accuracy"
              value={pitcherRatings.accuracy}
              onChange={(v) => handlePitcherChange('accuracy', v)}
              color="emerald"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <div>
          {saved && (
            <span className="text-sm text-emerald-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save Ratings
          </button>
        </div>
      </div>
    </div>
  );
}

// Rating input component
interface RatingInputProps {
  label: string;
  value: number;
  onChange: (value: string) => void;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'emerald';
}

function RatingInput({ label, value, onChange, color }: RatingInputProps) {
  const colorClasses = {
    red: 'focus:ring-red-500/30 focus:border-red-500',
    blue: 'focus:ring-blue-500/30 focus:border-blue-500',
    green: 'focus:ring-green-500/30 focus:border-green-500',
    yellow: 'focus:ring-yellow-500/30 focus:border-yellow-500',
    purple: 'focus:ring-purple-500/30 focus:border-purple-500',
    orange: 'focus:ring-orange-500/30 focus:border-orange-500',
    cyan: 'focus:ring-cyan-500/30 focus:border-cyan-500',
    emerald: 'focus:ring-emerald-500/30 focus:border-emerald-500',
  };

  const accentColor = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
    emerald: 'bg-emerald-500',
  };

  return (
    <div className="relative">
      <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor[color]} rounded-l`} />
        <input
          type="number"
          min={0}
          max={99}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-4 pr-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-lg font-bold tabular-nums focus:outline-none focus:ring-2 ${colorClasses[color]} transition-all`}
        />
      </div>
    </div>
  );
}
