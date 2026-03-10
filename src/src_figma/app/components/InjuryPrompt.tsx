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
import type { FitnessState } from '../../../engines/fitnessEngine';

export type InjuryFitness = Extract<FitnessState, 'STRAINED' | 'WEAK' | 'HURT'>;
export type MojoImpact = 'TENSE' | 'RATTLED';

export interface InjuryResult {
  stayedIn: boolean;
  newFitness: InjuryFitness;
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
  const [step, setStep] = useState<'fitness' | 'stayed_in'>('fitness');
  const [selectedFitness, setSelectedFitness] = useState<InjuryFitness>('STRAINED');

  // KP Flow
  if (type === 'KP') {
    if (step === 'fitness') {
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
              Set new fitness for <span className="text-[#FFD700] font-bold">{pitcherName}</span>.
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedFitness('STRAINED');
                  setStep('stayed_in');
                }}
                className="w-full bg-[#FFD54F] border-3 border-white py-3 px-4
                           text-black text-sm font-bold
                           hover:bg-[#FBC02D] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                STRAINED <span className="text-xs opacity-75">(minor drop)</span>
              </button>
              <button
                onClick={() => {
                  setSelectedFitness('WEAK');
                  setStep('stayed_in');
                }}
                className="w-full bg-[#FF9800] border-3 border-white py-3 px-4
                           text-black text-sm font-bold
                           hover:bg-[#F57C00] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                WEAK <span className="text-xs opacity-75">(serious drop)</span>
              </button>
              <button
                onClick={() => {
                  setSelectedFitness('HURT');
                  setStep('stayed_in');
                }}
                className="w-full bg-[#DD0000] border-3 border-white py-3 px-4
                           text-white text-sm font-bold
                           hover:bg-[#CC0000] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                HURT <span className="text-xs opacity-75">(worst current fitness)</span>
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

    if (step === 'stayed_in') {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-[#333] border-4 border-[#DD0000] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🏥</div>
              <div className="text-lg text-white font-bold">STAYED IN?</div>
              <div className="text-sm text-[#888] mt-1">
                {pitcherName} now at <span className="text-[#FFD700] font-bold">{selectedFitness}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onComplete({ stayedIn: true, newFitness: selectedFitness })}
                className="flex-1 bg-[#4CAF50] border-3 border-white py-3 px-4
                           text-white text-sm font-bold
                           hover:bg-[#45a049] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                STAYED IN
              </button>
              <button
                onClick={() => onComplete({ stayedIn: false, newFitness: selectedFitness })}
                className="flex-1 bg-[#DD0000] border-3 border-white py-3 px-4
                           text-white text-sm font-bold
                           hover:bg-[#CC0000] active:scale-95 transition-all
                           shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                LEFT GAME
              </button>
            </div>

            {/* Back button */}
            <button
              onClick={() => setStep('fitness')}
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
