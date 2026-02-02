/**
 * ErrorTypePopup - Shows after fielder is tapped for error attribution
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * Error Flow:
 * 1. User selects "E" in BatterReachedPopup
 * 2. User taps ball location
 * 3. User taps fielder who made the error
 * 4. ErrorTypePopup shows (this component)
 * 5. User selects error type → RUNNER_OUTCOMES
 *
 * Error Types:
 * - FIELDING: Bobbled the ball, missed the catch, etc.
 * - THROWING: Bad throw (wide, in dirt, over target's head)
 * - MENTAL: Threw to wrong base, didn't cover base, etc.
 */

export type ErrorType = 'FIELDING' | 'THROWING' | 'MENTAL';

interface ErrorTypePopupProps {
  fielderName: string;
  fielderPosition: number;
  onSelect: (errorType: ErrorType) => void;
  onCancel: () => void;
}

interface ErrorTypeConfig {
  id: ErrorType;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

const ERROR_TYPES: ErrorTypeConfig[] = [
  {
    id: 'FIELDING',
    label: 'FIELDING',
    emoji: '🧤',
    description: 'Bobbled, dropped, or missed the ball',
    color: '#FF9800',
  },
  {
    id: 'THROWING',
    label: 'THROWING',
    emoji: '💨',
    description: 'Bad throw (wide, in dirt, overthrow)',
    color: '#F44336',
  },
  {
    id: 'MENTAL',
    label: 'MENTAL',
    emoji: '🧠',
    description: 'Wrong base, didn\'t cover, miscommunication',
    color: '#9C27B0',
  },
];

export function ErrorTypePopup({
  fielderName,
  fielderPosition,
  onSelect,
  onCancel,
}: ErrorTypePopupProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-[#333] border-4 border-[#FF9800] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-sm">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-lg text-white font-bold">ERROR</div>
          <div className="text-sm text-[#888] mt-1">Batter reached on error</div>
        </div>

        {/* Fielder info */}
        <div className="text-center text-white text-sm mb-4">
          Error by <span className="text-[#FF9800] font-bold">{fielderName}</span>
          <span className="text-[#888] ml-1">(#{fielderPosition})</span>
        </div>

        {/* Error type label */}
        <div className="text-[10px] text-[#888] font-bold mb-2 uppercase">
          What type of error?
        </div>

        {/* Error type options */}
        <div className="space-y-2">
          {ERROR_TYPES.map((errorType) => (
            <button
              key={errorType.id}
              onClick={() => onSelect(errorType.id)}
              className="w-full flex items-center gap-3 p-3
                         border-2 border-white
                         text-white text-sm font-bold text-left
                         hover:scale-[1.02] active:scale-[0.98] transition-all
                         shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              style={{ backgroundColor: errorType.color }}
            >
              <span className="text-2xl">{errorType.emoji}</span>
              <div>
                <div>{errorType.label}</div>
                <div className="text-xs opacity-75 font-normal">{errorType.description}</div>
              </div>
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

export default ErrorTypePopup;
