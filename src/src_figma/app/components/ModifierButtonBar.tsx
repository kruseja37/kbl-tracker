/**
 * ModifierButtonBar - Shows modifier buttons after End At-Bat
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * - Visible in MODIFIERS_ACTIVE phase (after End At-Bat tapped)
 * - Modifiers do NOT auto-dismiss - stay until next at-bat
 * - KP/NUT are mutually exclusive
 * - WG applies to FIRST fielder in sequence
 *
 * Button States:
 * - ENABLED: Can tap (bg-[#C4A853] border-white text-black)
 * - DISABLED: Grayed, cannot tap (bg-[#444] border-[#666] text-[#666] opacity-50)
 * - SELECTED: Already tapped (bg-[#4CAF50] border-white text-white with checkmark)
 * - BLOCKED: Mutually exclusive with selected (bg-[#333] border-[#555] text-[#555] opacity-30)
 */

import { useMemo } from 'react';

export type ModifierId = '7+' | 'WG' | 'ROB' | 'KP' | 'NUT' | 'BT' | 'BUNT' | 'TOOTBLAN';

interface ModifierConfig {
  id: ModifierId;
  label: string;
  emoji: string;
  /** Column span in the grid (default 1) */
  colSpan?: number;
}

const MODIFIER_CONFIGS: ModifierConfig[] = [
  { id: '7+', label: '7+', emoji: '7️⃣' },
  { id: 'WG', label: 'WG', emoji: '⭐' },
  { id: 'ROB', label: 'ROB', emoji: '🎭' },
  { id: 'KP', label: 'KP', emoji: '💥' },
  { id: 'NUT', label: 'NUT', emoji: '🥜' },
  { id: 'BT', label: 'BT', emoji: '🏃' },
  { id: 'BUNT', label: 'BUNT', emoji: '🏏' },
  { id: 'TOOTBLAN', label: 'TOOTBLAN', emoji: '🤦', colSpan: 2 },
];

type ButtonState = 'enabled' | 'disabled' | 'selected' | 'blocked';

interface ModifierButtonBarProps {
  /** Which modifiers are available based on play type */
  enabledModifiers: Set<ModifierId>;
  /** Which modifiers have been selected */
  activeModifiers: Set<ModifierId>;
  /** Callback when a modifier is tapped */
  onModifierTap: (id: ModifierId) => void;
}

/**
 * Get the visual state for a modifier button
 */
function getButtonState(
  id: ModifierId,
  enabledModifiers: Set<ModifierId>,
  activeModifiers: Set<ModifierId>
): ButtonState {
  // Already selected
  if (activeModifiers.has(id)) {
    return 'selected';
  }

  // Check mutual exclusivity: KP blocks NUT and vice versa
  if (id === 'KP' && activeModifiers.has('NUT')) {
    return 'blocked';
  }
  if (id === 'NUT' && activeModifiers.has('KP')) {
    return 'blocked';
  }

  // Not enabled for this play type
  if (!enabledModifiers.has(id)) {
    return 'disabled';
  }

  return 'enabled';
}

/**
 * Get button styles based on state
 */
function getButtonStyles(state: ButtonState): string {
  const base = 'flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold transition-all';

  switch (state) {
    case 'enabled':
      return `${base} bg-[#C4A853] border-2 border-white text-black hover:scale-105 active:scale-95 cursor-pointer`;
    case 'disabled':
      return `${base} bg-[#444] border-2 border-[#666] text-[#666] opacity-50 cursor-not-allowed`;
    case 'selected':
      return `${base} bg-[#4CAF50] border-2 border-white text-white`;
    case 'blocked':
      return `${base} bg-[#333] border-2 border-[#555] text-[#555] opacity-30 cursor-not-allowed`;
  }
}

export function ModifierButtonBar({
  enabledModifiers,
  activeModifiers,
  onModifierTap,
}: ModifierButtonBarProps) {
  const buttons = useMemo(() => {
    return MODIFIER_CONFIGS.map((config) => {
      const state = getButtonState(config.id, enabledModifiers, activeModifiers);
      return {
        ...config,
        state,
        canTap: state === 'enabled',
      };
    });
  }, [enabledModifiers, activeModifiers]);

  return (
    <div className="grid grid-cols-3 gap-1 p-2 bg-[#1a1a1a]/90 border-2 border-[#C4A853] rounded-lg">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => btn.canTap && onModifierTap(btn.id)}
          disabled={!btn.canTap}
          className={`${getButtonStyles(btn.state)} ${btn.colSpan === 2 ? 'col-span-2' : ''}`}
          title={btn.label}
        >
          {btn.state === 'selected' && <span>✓</span>}
          <span>{btn.emoji}</span>
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ModifierButtonBar;
