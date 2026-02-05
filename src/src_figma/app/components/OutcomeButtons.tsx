/**
 * OutcomeButtons - Step 3 of the redesigned GameTracker flow
 *
 * Shows outcome buttons based on whether HIT or OUT was selected in Step 1.
 * Supports multi-select for modifiers and special events.
 *
 * HIT outcomes: 1B, 2B, 3B, HR + modifiers (BUNT, IS, 7+) + special (KP, NUT)
 * OUT outcomes: GO, FO, LO, PO, FLO, K, KL, DP, FC + modifiers (SF, SAC, IFR, RD, E) + special (WEB, 7+)
 *
 * Per GAMETRACKER_UI_DESIGN.md - positioned in right foul corner, can expand over outfield
 */

import { useState, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export type HitType = '1B' | '2B' | '3B' | 'HR';
export type OutType = 'GO' | 'FO' | 'LO' | 'PO' | 'FLO' | 'K' | 'KL' | 'DP' | 'TP' | 'FC' | 'E';
export type HitModifier = 'BUNT' | 'IS' | '7+';
export type OutModifier = 'SF' | 'SAC' | 'IFR' | 'RD' | 'E' | '7+';
export type SpecialEvent = 'KP' | 'NUT' | 'WEB';

export interface HitOutcome {
  type: HitType;
  modifiers: HitModifier[];
  specialEvents: SpecialEvent[];
}

export interface OutOutcome {
  type: OutType;
  modifiers: OutModifier[];
  specialEvents: SpecialEvent[];
}

export interface OutcomeButtonsProps {
  /** Whether showing HIT or OUT outcomes */
  mode: 'HIT' | 'OUT';
  /** Called when user clicks ADVANCE with selections */
  onAdvance: (outcome: HitOutcome | OutOutcome) => void;
  /** Called when user wants to go back */
  onBack: () => void;
  /** Pre-selected type (e.g., from auto-inference) */
  suggestedType?: HitType | OutType;
  /** Whether fielding sequence suggests special cases */
  fieldingContext?: {
    isPitcherInvolved?: boolean;  // Show KP/NUT options
    isDeepOutfield?: boolean;     // Show WEB option
    isDoublePlay?: boolean;       // Pre-select DP
  };
  /** Current game situation for situational button disabling */
  gameContext?: {
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
  };
}

// ============================================
// BUTTON STYLES
// ============================================

const typeBtnBase = `
  px-4 py-3 rounded-lg
  border-2 border-[#C4A853]
  text-base font-bold uppercase
  hover:scale-105 active:scale-95 transition-all
  shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
  min-w-[52px]
`;

const modifierBtnBase = `
  px-3 py-2 rounded-md
  border-2
  text-sm font-bold uppercase
  hover:scale-105 active:scale-95 transition-all
  shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]
  min-w-[48px]
`;

const advanceBtnStyle = `
  w-full py-3 rounded-lg
  border-2 border-[#C4A853]
  text-lg font-bold uppercase
  bg-gradient-to-b from-[#2E7D32] to-[#1B5E20]
  text-white
  hover:scale-[1.02] active:scale-98 transition-all
  shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
  disabled:opacity-50 disabled:cursor-not-allowed
`;

// ============================================
// HIT OUTCOMES CONFIG
// ============================================

const HIT_TYPES: { type: HitType; label: string }[] = [
  { type: '1B', label: '1B' },
  { type: '2B', label: '2B' },
  { type: '3B', label: '3B' },
  { type: 'HR', label: 'HR' },
];

const HIT_MODIFIERS: { mod: HitModifier; label: string; title: string }[] = [
  { mod: 'BUNT', label: 'BUNT', title: 'Bunt Single' },
  { mod: 'IS', label: 'IS', title: 'Infield Single' },
  { mod: '7+', label: '7+', title: '7+ Pitch At-Bat' },
];

const HIT_SPECIALS: { event: SpecialEvent; label: string; title: string }[] = [
  { event: 'KP', label: 'KP', title: 'Killed Pitcher (+3 Fame)' },
  { event: 'NUT', label: 'NUT', title: 'Nut Shot (+1 Fame)' },
];

// ============================================
// OUT OUTCOMES CONFIG
// ============================================

const OUT_TYPES_ROW1: { type: OutType; label: string }[] = [
  { type: 'GO', label: 'GO' },
  { type: 'FO', label: 'FO' },
  { type: 'LO', label: 'LO' },
  { type: 'PO', label: 'PO' },
  { type: 'FLO', label: 'FLO' },
];

const OUT_TYPES_ROW2: { type: OutType; label: string }[] = [
  { type: 'K', label: 'K' },
  { type: 'KL', label: 'KL' },
  { type: 'DP', label: 'DP' },
  { type: 'TP', label: 'TP' },
  { type: 'FC', label: 'FC' },
  { type: 'E', label: 'E' },
];

const OUT_MODIFIERS: { mod: OutModifier; label: string; title: string }[] = [
  { mod: 'SF', label: 'SF', title: 'Sacrifice Fly' },
  { mod: 'SAC', label: 'SAC', title: 'Sacrifice Bunt' },
  { mod: 'IFR', label: 'IFR', title: 'Infield Fly Rule' },
  { mod: 'RD', label: 'RD', title: 'Rundown' },
  { mod: 'E', label: 'E', title: 'Error on Play' },
  { mod: '7+', label: '7+', title: '7+ Pitch At-Bat' },
];

const OUT_SPECIALS: { event: SpecialEvent; label: string; title: string }[] = [
  { event: 'WEB', label: 'WEB', title: 'Web Gem (+1 Fame)' },
];

// ============================================
// COMPONENT
// ============================================

export function OutcomeButtons({
  mode,
  onAdvance,
  onBack,
  suggestedType,
  fieldingContext,
  gameContext,
}: OutcomeButtonsProps) {
  // Selected primary type
  const [selectedType, setSelectedType] = useState<HitType | OutType | null>(
    suggestedType || null
  );

  // Selected modifiers (multi-select)
  const [selectedModifiers, setSelectedModifiers] = useState<Set<string>>(new Set());

  // Selected special events (multi-select)
  const [selectedSpecials, setSelectedSpecials] = useState<Set<SpecialEvent>>(new Set());

  // Pre-select based on context
  useEffect(() => {
    if (fieldingContext?.isDoublePlay && mode === 'OUT') {
      setSelectedType('DP');
    }
  }, [fieldingContext, mode]);

  // Situational disable logic per MAJ-10
  const isOutTypeDisabled = (type: OutType): boolean => {
    if (!gameContext) return false;
    const { outs, bases } = gameContext;
    const hasRunners = bases.first || bases.second || bases.third;

    switch (type) {
      case 'DP':
      case 'TP':
        // DP/TP impossible with no runners on base
        return !hasRunners;
      default:
        return false;
    }
  };

  const isModifierDisabled = (mod: string): boolean => {
    if (!gameContext) return false;
    const { outs, bases } = gameContext;

    switch (mod) {
      case 'SAC':
        // Sacrifice bunt not possible with 2 outs
        return outs >= 2;
      case 'SF':
        // Sacrifice fly requires runner on third
        return !bases.third;
      default:
        return false;
    }
  };

  const toggleModifier = (mod: string) => {
    setSelectedModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const toggleSpecial = (event: SpecialEvent) => {
    setSelectedSpecials((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
      } else {
        next.add(event);
      }
      return next;
    });
  };

  const handleAdvance = () => {
    if (!selectedType) return;

    if (mode === 'HIT') {
      const outcome: HitOutcome = {
        type: selectedType as HitType,
        modifiers: Array.from(selectedModifiers) as HitModifier[],
        specialEvents: Array.from(selectedSpecials),
      };
      onAdvance(outcome);
    } else {
      const outcome: OutOutcome = {
        type: selectedType as OutType,
        modifiers: Array.from(selectedModifiers) as OutModifier[],
        specialEvents: Array.from(selectedSpecials),
      };
      onAdvance(outcome);
    }
  };

  const canAdvance = selectedType !== null;

  // ============================================
  // RENDER HIT OUTCOMES
  // ============================================

  if (mode === 'HIT') {
    return (
      <div className="p-3 bg-[#1a1a1a]/95 rounded-lg border-2 border-[#C4A853]/50 min-w-[280px]">
        <div className="text-xs text-[#888] uppercase tracking-wider mb-2">
          Hit Outcome
        </div>

        {/* Hit Type Selection */}
        <div className="flex gap-2 mb-3">
          {HIT_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`${typeBtnBase} ${
                selectedType === type
                  ? 'bg-[#2E7D32] text-white border-white'
                  : 'bg-[#2F4F2F] text-[#A5D6A7] border-[#C4A853]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Modifiers */}
        <div className="text-[10px] text-[#666] uppercase tracking-wider mb-1.5">
          Modifiers
        </div>
        <div className="flex gap-1.5 mb-3">
          {HIT_MODIFIERS.map(({ mod, label, title }) => (
            <button
              key={mod}
              onClick={() => toggleModifier(mod)}
              className={`${modifierBtnBase} ${
                selectedModifiers.has(mod)
                  ? 'bg-[#C4A853] text-black border-white'
                  : 'bg-[#333] text-[#888] border-[#555]'
              }`}
              title={title}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Special Events - show KP/NUT if pitcher involved */}
        {(fieldingContext?.isPitcherInvolved || true) && (
          <>
            <div className="text-[10px] text-[#666] uppercase tracking-wider mb-1.5">
              Special
            </div>
            <div className="flex gap-1.5 mb-3">
              {HIT_SPECIALS.map(({ event, label, title }) => (
                <button
                  key={event}
                  onClick={() => toggleSpecial(event)}
                  className={`${modifierBtnBase} ${
                    selectedSpecials.has(event)
                      ? 'bg-[#FF6F00] text-white border-white'
                      : 'bg-[#333] text-[#888] border-[#555]'
                  }`}
                  title={title}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md border-2 border-[#555] bg-[#333] text-[#888] text-sm font-bold uppercase"
          >
            Back
          </button>
          <button
            onClick={handleAdvance}
            disabled={!canAdvance}
            className={advanceBtnStyle}
          >
            Advance
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER OUT OUTCOMES
  // ============================================

  return (
    <div className="p-3 bg-[#1a1a1a]/95 rounded-lg border-2 border-[#C4A853]/50 min-w-[320px]">
      <div className="text-xs text-[#888] uppercase tracking-wider mb-2">
        Out Outcome
      </div>

      {/* Out Type Selection - Row 1 */}
      <div className="flex gap-1.5 mb-1.5">
        {OUT_TYPES_ROW1.map(({ type, label }) => {
          const disabled = isOutTypeDisabled(type);
          return (
            <button
              key={type}
              onClick={() => !disabled && setSelectedType(type)}
              disabled={disabled}
              className={`${typeBtnBase} text-sm px-3 py-2 ${
                disabled
                  ? 'bg-[#2a2a2a] text-[#555] border-[#444] cursor-not-allowed opacity-50'
                  : selectedType === type
                    ? 'bg-[#C62828] text-white border-white'
                    : 'bg-[#4A2020] text-[#FFCDD2] border-[#C4A853]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Out Type Selection - Row 2 */}
      <div className="flex gap-1.5 mb-3">
        {OUT_TYPES_ROW2.map(({ type, label }) => {
          const disabled = isOutTypeDisabled(type);
          return (
            <button
              key={type}
              onClick={() => !disabled && setSelectedType(type)}
              disabled={disabled}
              className={`${typeBtnBase} text-sm px-3 py-2 ${
                disabled
                  ? 'bg-[#2a2a2a] text-[#555] border-[#444] cursor-not-allowed opacity-50'
                  : selectedType === type
                    ? 'bg-[#C62828] text-white border-white'
                    : 'bg-[#4A2020] text-[#FFCDD2] border-[#C4A853]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Modifiers */}
      <div className="text-[10px] text-[#666] uppercase tracking-wider mb-1.5">
        Modifiers
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {OUT_MODIFIERS.map(({ mod, label, title }) => {
          const disabled = isModifierDisabled(mod);
          return (
            <button
              key={mod}
              onClick={() => !disabled && toggleModifier(mod)}
              disabled={disabled}
              className={`${modifierBtnBase} ${
                disabled
                  ? 'bg-[#2a2a2a] text-[#555] border-[#444] cursor-not-allowed opacity-50'
                  : selectedModifiers.has(mod)
                    ? 'bg-[#C4A853] text-black border-white'
                    : 'bg-[#333] text-[#888] border-[#555]'
              }`}
              title={disabled ? `${title} (not available in current situation)` : title}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Special Events */}
      <div className="text-[10px] text-[#666] uppercase tracking-wider mb-1.5">
        Special
      </div>
      <div className="flex gap-1.5 mb-3">
        {OUT_SPECIALS.map(({ event, label, title }) => (
          <button
            key={event}
            onClick={() => toggleSpecial(event)}
            className={`${modifierBtnBase} ${
              selectedSpecials.has(event)
                ? 'bg-[#1565C0] text-white border-white'
                : 'bg-[#333] text-[#888] border-[#555]'
            }`}
            title={title}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md border-2 border-[#555] bg-[#333] text-[#888] text-sm font-bold uppercase"
        >
          Back
        </button>
        <button
          onClick={handleAdvance}
          disabled={!canAdvance}
          className={advanceBtnStyle}
        >
          Advance
        </button>
      </div>
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default OutcomeButtons;
