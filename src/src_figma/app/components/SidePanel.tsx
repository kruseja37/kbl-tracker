import React from 'react';
import { X } from 'lucide-react';

/**
 * SidePanel - Modal container that appears in foul territory (left or right side of field)
 *
 * Per the GameTracker Holistic UI Redesign Plan:
 * - Left Panel (LF foul territory): HitTypeModal, BallLandingPrompt
 * - Right Panel (RF foul territory): OutTypeModal, HRDistanceModal
 *
 * This keeps the field visible while showing classification options.
 */

interface SidePanelProps {
  side: 'left' | 'right';
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function SidePanel({ side, isOpen, onClose, title, children }: SidePanelProps) {
  if (!isOpen) return null;

  const positionClasses = side === 'left'
    ? 'left-0 border-r-4'
    : 'right-0 border-l-4';

  return (
    <div
      className={`absolute top-0 ${positionClasses} h-full w-[200px] bg-[#333]/95 border-[#C4A853] z-40 flex flex-col shadow-[4px_0_12px_rgba(0,0,0,0.5)]`}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a3020] border-b-2 border-[#C4A853]">
        <span className="text-[#E8E8D8] text-[11px] font-bold tracking-wide">{title}</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#3d5240] rounded transition-colors"
          title="Close"
        >
          <X className="w-4 h-4 text-[#E8E8D8]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  );
}

/**
 * HitTypeContent - Content for hit type selection (to be used in SidePanel)
 */
interface HitTypeContentProps {
  onSelect: (hitType: '1B' | '2B' | '3B' | 'HR') => void;
  spraySector?: string;
  inferredBase?: '1B' | '2B' | '3B';
}

export function HitTypeContent({ onSelect, spraySector, inferredBase }: HitTypeContentProps) {
  const hitTypes: Array<{ type: '1B' | '2B' | '3B' | 'HR'; label: string; color: string }> = [
    { type: '1B', label: 'SINGLE', color: '#4CAF50' },
    { type: '2B', label: 'DOUBLE', color: '#2196F3' },
    { type: '3B', label: 'TRIPLE', color: '#9C27B0' },
    { type: 'HR', label: 'HOME RUN', color: '#FFD700' },
  ];

  return (
    <div className="space-y-2">
      {spraySector && (
        <div className="text-[9px] text-[#C4A853] mb-2">
          Sector: {spraySector}
        </div>
      )}
      {inferredBase && (
        <div className="text-[9px] text-[#4CAF50] mb-2">
          Suggested: {inferredBase}
        </div>
      )}
      <div className="space-y-2">
        {hitTypes.map(({ type, label, color }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`w-full py-2 px-3 border-2 border-white text-white text-[11px] font-bold hover:scale-[1.02] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] ${
              inferredBase === type ? 'ring-2 ring-[#FFD700] ring-offset-1 ring-offset-transparent' : ''
            }`}
            style={{ backgroundColor: color }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * OutTypeContent - Content for out type selection (to be used in SidePanel)
 */
interface OutTypeContentProps {
  onSelect: (outType: 'GO' | 'FO' | 'LO' | 'DP' | 'TP' | 'K' | 'FC' | 'SAC') => void;
  fieldingSequence?: number[];
}

export function OutTypeContent({ onSelect, fieldingSequence }: OutTypeContentProps) {
  const outTypes: Array<{ type: 'GO' | 'FO' | 'LO' | 'DP' | 'TP' | 'K' | 'FC' | 'SAC'; label: string }> = [
    { type: 'GO', label: 'GROUND OUT' },
    { type: 'FO', label: 'FLY OUT' },
    { type: 'LO', label: 'LINE OUT' },
    { type: 'DP', label: 'DOUBLE PLAY' },
    { type: 'TP', label: 'TRIPLE PLAY' },
    { type: 'K', label: 'STRIKEOUT' },
    { type: 'FC', label: 'FIELDER\'S CHOICE' },
    { type: 'SAC', label: 'SACRIFICE' },
  ];

  return (
    <div className="space-y-2">
      {fieldingSequence && fieldingSequence.length > 0 && (
        <div className="text-[9px] text-[#C4A853] mb-2">
          Sequence: {fieldingSequence.join('-')}
        </div>
      )}
      <div className="space-y-1.5">
        {outTypes.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full py-1.5 px-3 bg-[#DD0000] border-2 border-white text-white text-[10px] font-bold hover:bg-[#FF0000] active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * HRDistanceContent - Content for HR distance input (to be used in SidePanel)
 */
interface HRDistanceContentProps {
  onSubmit: (distance: number) => void;
  onCancel: () => void;
  hrType: string;
}

export function HRDistanceContent({ onSubmit, onCancel, hrType }: HRDistanceContentProps) {
  const [distance, setDistance] = React.useState('');

  const handleSubmit = () => {
    const d = parseInt(distance);
    if (d >= 300 && d <= 550) {
      onSubmit(d);
    }
  };

  // Quick distance buttons for common values
  const quickDistances = [350, 380, 400, 420, 450];

  return (
    <div className="space-y-3">
      <div className="text-[9px] text-[#C4A853]">
        Type: {hrType.toUpperCase()}
      </div>

      {/* Quick buttons */}
      <div className="grid grid-cols-3 gap-1">
        {quickDistances.map((d) => (
          <button
            key={d}
            onClick={() => setDistance(String(d))}
            className={`py-1 px-2 text-[9px] font-bold border-2 transition-colors ${
              distance === String(d)
                ? 'bg-[#FFD700] border-[#FFD700] text-black'
                : 'bg-[#1a1a1a] border-[#666] text-[#E8E8D8] hover:border-[#C4A853]'
            }`}
          >
            {d}ft
          </button>
        ))}
      </div>

      {/* Manual input */}
      <div className="flex gap-2">
        <input
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="feet"
          min="300"
          max="550"
          className="flex-1 px-2 py-1.5 bg-[#1a1a1a] border-2 border-[#666] text-[#E8E8D8] text-sm focus:border-[#C4A853] outline-none"
        />
        <span className="text-[#E8E8D8] text-sm self-center">ft</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!distance || parseInt(distance) < 300 || parseInt(distance) > 550}
          className="flex-1 py-1.5 bg-[#FFD700] border-2 border-white text-black text-[10px] font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CONFIRM
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-[#666] border-2 border-white text-white text-[10px] font-bold hover:bg-[#888] transition-colors"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

export default SidePanel;
