/**
 * InjuryPrompt - Shows after KP (Killed Pitcher) or NUT (Nut Shot) modifier is tapped
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * - KP prompt appears IMMEDIATELY when tapped
 * - KP flow: "Did pitcher leave?" → If yes, show injury severity
 * - NUT flow: Just asks about mojo impact (NONE/TENSE/RATTLED)
 *
 * Fame values:
 * - KP: +3.0 Fame to batter
 * - NUT: +1.0 Fame to batter
 */

import { useState } from 'react';

export type InjurySeverity = 'HURT' | 'INJURED' | 'WOUNDED';
export type MojoImpact = 'NONE' | 'TENSE' | 'RATTLED';

export interface InjuryResult {
  stayedIn: boolean;
  severity?: InjurySeverity;  // Only if left game (KP)
}

export interface MojoResult {
  mojoImpact: MojoImpact;
}

interface InjuryPromptProps {
  type: 'KP' | 'NUT';
  pitcherName: string;
  onComplete: (result: InjuryResult | MojoResult) => void;
  onCancel: () => void;
}

export function InjuryPrompt({
  type,
  pitcherName,
  onComplete,
  onCancel,
}: InjuryPromptProps) {
  const [step, setStep] = useState<'left_game' | 'severity'>('left_game');

  // KP Flow
  if (type === 'KP') {
    // Step 1: Did pitcher leave the game?
    if (step === 'left_game') {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-[#333] border-4 border-[#FF5722] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">💥</div>
              <div className="text-lg text-white font-bold">KILLED PITCHER</div>
              <div className="text-sm text-[#4CAF50] font-bold mt-1">+3.0 Fame to batter</div>
            </div>

            {/* Question */}
            <div className="text-center text-white text-sm mb-4">
              Did <span className="text-[#FFD700] font-bold">{pitcherName}</span> leave the game?
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => onComplete({ stayedIn: true })}
                className="flex-1 bg-[#4CAF50] border-3 border-white py-3 px-4
                           text-white text-sm font-bold
                           hover:bg-[#45a049] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                STAYED IN
              </button>
              <button
                onClick={() => setStep('severity')}
                className="flex-1 bg-[#DD0000] border-3 border-white py-3 px-4
                           text-white text-sm font-bold
                           hover:bg-[#CC0000] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                LEFT GAME
              </button>
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

    // Step 2: Injury severity (only if left game)
    if (step === 'severity') {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-[#333] border-4 border-[#DD0000] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🏥</div>
              <div className="text-lg text-white font-bold">INJURY SEVERITY</div>
              <div className="text-sm text-[#888] mt-1">{pitcherName} left the game</div>
            </div>

            {/* Severity options */}
            <div className="space-y-2">
              <button
                onClick={() => onComplete({ stayedIn: false, severity: 'HURT' })}
                className="w-full bg-[#FF9800] border-3 border-white py-3 px-4
                           text-black text-sm font-bold
                           hover:bg-[#F57C00] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                HURT <span className="text-xs opacity-75">(minor - 1-2 games)</span>
              </button>
              <button
                onClick={() => onComplete({ stayedIn: false, severity: 'INJURED' })}
                className="w-full bg-[#F44336] border-3 border-white py-3 px-4
                           text-white text-sm font-bold
                           hover:bg-[#E53935] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                INJURED <span className="text-xs opacity-75">(moderate - 3-5 games)</span>
              </button>
              <button
                onClick={() => onComplete({ stayedIn: false, severity: 'WOUNDED' })}
                className="w-full bg-[#B71C1C] border-3 border-white py-3 px-4
                           text-white text-sm font-bold
                           hover:bg-[#9A0007] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                WOUNDED <span className="text-xs opacity-75">(severe - 6+ games)</span>
              </button>
            </div>

            {/* Back button */}
            <button
              onClick={() => setStep('left_game')}
              className="mt-4 w-full bg-[#666] border-2 border-white py-2
                         text-white text-xs font-bold hover:bg-[#777]"
            >
              ← BACK
            </button>
          </div>
        </div>
      );
    }
  }

  // NUT Flow - Just mojo impact
  if (type === 'NUT') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="bg-[#333] border-4 border-[#795548] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🥜</div>
            <div className="text-lg text-white font-bold">NUT SHOT</div>
            <div className="text-sm text-[#4CAF50] font-bold mt-1">+1.0 Fame to batter</div>
          </div>

          {/* Question */}
          <div className="text-center text-white text-sm mb-4">
            Mojo impact on <span className="text-[#FFD700] font-bold">{pitcherName}</span>?
          </div>

          {/* Mojo options */}
          <div className="space-y-2">
            <button
              onClick={() => onComplete({ mojoImpact: 'NONE' })}
              className="w-full bg-[#4CAF50] border-3 border-white py-3 px-4
                         text-white text-sm font-bold
                         hover:bg-[#45a049] active:scale-95 transition-all
                         shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              NONE <span className="text-xs opacity-75">(shook it off)</span>
            </button>
            <button
              onClick={() => onComplete({ mojoImpact: 'TENSE' })}
              className="w-full bg-[#FF9800] border-3 border-white py-3 px-4
                         text-black text-sm font-bold
                         hover:bg-[#F57C00] active:scale-95 transition-all
                         shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              TENSE <span className="text-xs opacity-75">(-1 Mojo)</span>
            </button>
            <button
              onClick={() => onComplete({ mojoImpact: 'RATTLED' })}
              className="w-full bg-[#DD0000] border-3 border-white py-3 px-4
                         text-white text-sm font-bold
                         hover:bg-[#CC0000] active:scale-95 transition-all
                         shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              RATTLED <span className="text-xs opacity-75">(-2 Mojo)</span>
            </button>
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

  return null;
}

export default InjuryPrompt;
