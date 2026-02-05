/**
 * StarPlaySubtypePopup - Shows after WG (Web Gem) modifier is tapped
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * - WG applies to FIRST fielder in sequence
 * - Subtypes: DIVING, SLIDING, LEAPING, OVER_SHOULDER, RUNNING, WALL
 *
 * Fame values:
 * - WG (Web Gem): +1.0 Fame to fielder
 * - ROB (Robbery): +1.5 Fame to fielder (if also a HR denial at wall)
 */

export type StarPlaySubtype =
  | 'DIVING'
  | 'SLIDING'
  | 'LEAPING'
  | 'OVER_SHOULDER'
  | 'RUNNING'
  | 'WALL';

interface StarPlaySubtypePopupProps {
  fielderName: string;
  fielderPosition: number;
  /** Is this also a robbery (HR denial at wall)? */
  isRobbery?: boolean;
  onSelect: (subtype: StarPlaySubtype) => void;
  onCancel: () => void;
}

interface SubtypeConfig {
  id: StarPlaySubtype;
  label: string;
  emoji: string;
  description: string;
}

const SUBTYPES: SubtypeConfig[] = [
  { id: 'DIVING', label: 'DIVING', emoji: '🏊', description: 'Dove to make the catch' },
  { id: 'SLIDING', label: 'SLIDING', emoji: '⛷️', description: 'Slid to make the catch' },
  { id: 'LEAPING', label: 'LEAPING', emoji: '🦘', description: 'Leaped high for the catch' },
  { id: 'OVER_SHOULDER', label: 'OVER SHOULDER', emoji: '🔄', description: 'Caught over the shoulder' },
  { id: 'RUNNING', label: 'RUNNING', emoji: '🏃', description: 'Full sprint catch' },
  { id: 'WALL', label: 'WALL', emoji: '🧱', description: 'Catch at/against the wall' },
];

export function StarPlaySubtypePopup({
  fielderName,
  fielderPosition,
  isRobbery = false,
  onSelect,
  onCancel,
}: StarPlaySubtypePopupProps) {
  const fameValue = isRobbery ? '+1.0' : '+0.75'; // CRIT-06: Spec v3.3 values
  const title = isRobbery ? 'HR ROBBERY' : 'WEB GEM';
  const emoji = isRobbery ? '🎭' : '⭐';
  const borderColor = isRobbery ? '#9C27B0' : '#C4A853';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
      <div
        className="bg-[#333] border-4 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-sm"
        style={{ borderColor }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">{emoji}</div>
          <div className="text-lg text-white font-bold">{title}</div>
          <div className="text-sm text-[#4CAF50] font-bold mt-1">{fameValue} Fame to fielder</div>
        </div>

        {/* Fielder info */}
        <div className="text-center text-white text-sm mb-4">
          Credit to <span className="text-[#FFD700] font-bold">{fielderName}</span>
          <span className="text-[#888] ml-1">(#{fielderPosition})</span>
        </div>

        {/* Subtype label */}
        <div className="text-[10px] text-[#888] font-bold mb-2 uppercase">
          What type of catch?
        </div>

        {/* Subtype options - 2 column grid */}
        <div className="grid grid-cols-2 gap-2">
          {SUBTYPES.map((subtype) => (
            <button
              key={subtype.id}
              onClick={() => onSelect(subtype.id)}
              className="flex flex-col items-center justify-center p-3
                         bg-[#4169E1] border-2 border-white
                         text-white text-xs font-bold
                         hover:bg-[#5179F1] active:scale-95 transition-all
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              <span className="text-xl mb-1">{subtype.emoji}</span>
              <span>{subtype.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="mt-4 w-full bg-[#666] border-2 border-white py-2
                     text-white text-xs font-bold hover:bg-[#777]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

export default StarPlaySubtypePopup;
