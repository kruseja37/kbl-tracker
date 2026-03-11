import { useState } from 'react';

import {
  type FieldCoordinate,
  isInStands,
  svgToNormalized,
  SVG_HEIGHT,
  SVG_WIDTH,
} from './FieldCanvas';
import type { SpecialEventPrompt } from './playClassifier';
import type { HitType, OutType } from '../utils/gameTrackerFieldTypes';

interface BallLandingPromptProps {
  onLocationTap: (position: FieldCoordinate) => void;
  onCancel: () => void;
  destinationBase: '1B' | '2B' | '3B';
}

export function BallLandingPromptOverlay({ onLocationTap, onCancel, destinationBase }: BallLandingPromptProps) {
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    setTapPosition({ x: relX, y: relY });

    const svgX = (relX / rect.width) * SVG_WIDTH;
    const svgY = (relY / rect.height) * SVG_HEIGHT;
    const position = svgToNormalized(svgX, svgY);

    if (isInStands(position.y)) {
      setTimeout(() => setTapPosition(null), 300);
      return;
    }

    onLocationTap(position);
  };

  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      onClick={handleClick}
      style={{ background: 'rgba(0, 0, 0, 0.3)' }}
    >
      {tapPosition && (
        <div
          className="absolute pointer-events-none animate-ping"
          style={{
            left: tapPosition.x - 10,
            top: tapPosition.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 215, 0, 0.6)',
            border: '2px solid #FFD700',
          }}
        />
      )}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="bg-[#3366FF] border-[4px] border-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] text-center">
          <div className="text-[14px] font-bold text-white mb-2">
            {destinationBase} HIT
          </div>
          <div className="text-[11px] font-bold text-[#FFD700] animate-pulse">
            👆 TAP WHERE THE BALL LANDED
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="bg-[#666] border-[3px] border-white px-4 py-2 text-white text-[10px] font-bold hover:bg-[#888] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

interface HRLocationPromptProps {
  onLocationTap: (position: FieldCoordinate) => void;
  onCancel: () => void;
}

export function HRLocationPromptOverlay({ onLocationTap, onCancel }: HRLocationPromptProps) {
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);
  const [showInfieldWarning, setShowInfieldWarning] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    setTapPosition({ x: relX, y: relY });

    const svgX = (relX / rect.width) * SVG_WIDTH;
    const svgY = (relY / rect.height) * SVG_HEIGHT;
    const position = svgToNormalized(svgX, svgY);

    if (position.y < 0.6) {
      setShowInfieldWarning(true);
      setTimeout(() => {
        setShowInfieldWarning(false);
        setTapPosition(null);
      }, 1000);
      console.log('[HRLocationPrompt] Tap too close to infield, ignoring');
      return;
    }

    onLocationTap(position);
  };

  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      onClick={handleClick}
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
    >
      {tapPosition && (
        <div
          className="absolute pointer-events-none animate-ping"
          style={{
            left: tapPosition.x - 10,
            top: tapPosition.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: showInfieldWarning ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 215, 0, 0.6)',
            border: showInfieldWarning ? '2px solid #FF0000' : '2px solid #FFD700',
          }}
        />
      )}

      {showInfieldWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
          <div className="bg-[#DD0000] border-[2px] border-white px-3 py-1 text-white text-[10px] font-bold animate-pulse">
            TAP IN OUTFIELD OR STANDS
          </div>
        </div>
      )}

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="bg-[#FFD700] border-[4px] border-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] text-center">
          <div className="text-[14px] font-bold text-black mb-2">
            ⚾ HOME RUN
          </div>
          <div className="text-[11px] font-bold text-[#333] animate-pulse">
            👆 TAP WHERE BALL LEFT THE YARD
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="bg-[#666] border-[3px] border-white px-4 py-2 text-white text-[10px] font-bold hover:bg-[#888] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

interface PlayTypeModalProps {
  onSelect: (type: 'hit' | 'out' | 'foul_out' | 'foul_ball') => void;
  isFoul: boolean;
  isInStands: boolean;
  onClose: () => void;
}

export function PlayTypeModal({ onSelect, isFoul, isInStands: inStands, onClose }: PlayTypeModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-3">
          {isFoul ? 'FOUL TERRITORY' : inStands ? 'HOME RUN' : 'PLAY TYPE'}
        </div>
        <div className="flex flex-col gap-2">
          {isFoul ? (
            <>
              <button
                onClick={() => onSelect('foul_out')}
                className="bg-[#4CAF50] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                FOUL OUT (Caught)
              </button>
              <button
                onClick={() => onSelect('foul_ball')}
                className="bg-[#FF9800] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                FOUL BALL (Strike)
              </button>
            </>
          ) : inStands ? (
            <button
              onClick={() => onSelect('hit')}
              className="bg-[#FFD700] border-[3px] border-white px-4 py-2 text-black text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              HOME RUN
            </button>
          ) : (
            <>
              <button
                onClick={() => onSelect('hit')}
                className="bg-[#4CAF50] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                HIT (Batter Reached)
              </button>
              <button
                onClick={() => onSelect('out')}
                className="bg-[#DD0000] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                OUT
              </button>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full bg-[#666] border-[2px] border-white px-3 py-1 text-white text-[10px] font-bold hover:bg-[#888]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

interface HRDistanceModalProps {
  onSubmit: (distance: number) => void;
  onClose: () => void;
  hrType: string;
}

export function HRDistanceModal({ onSubmit, onClose, hrType }: HRDistanceModalProps) {
  const [distance, setDistance] = useState('');

  const handleSubmit = () => {
    const d = parseInt(distance);
    if (d > 0) {
      onSubmit(d);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">HOME RUN DISTANCE</div>
        <div className="text-[8px] text-[#C4A853] mb-3">Type: {hrType.toUpperCase()}</div>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="feet"
            min="300"
            max="550"
            className="w-20 px-2 py-1 bg-[#1a1a1a] border-2 border-[#E8E8D8] text-[#E8E8D8] text-sm"
          />
          <span className="text-[#E8E8D8] text-sm self-center">ft</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!distance || parseInt(distance) < 300}
            className="flex-1 bg-[#FFD700] border-[2px] border-white px-3 py-1 text-black text-xs font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CONFIRM
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#666] border-[2px] border-white px-3 py-1 text-white text-xs font-bold hover:bg-[#888]"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

export type HitTrajectory = 'ground' | 'line' | 'fly';

interface HitTypeModalProps {
  onSelect: (hitType: HitType, trajectory?: HitTrajectory) => void;
  onClose: () => void;
  spraySector?: string;
  inferredBase?: '1B' | '2B' | '3B';
}

export function HitTypeModal({ onSelect, onClose, spraySector, inferredBase }: HitTypeModalProps) {
  const handleTrajectorySelect = (trajectory: HitTrajectory) => {
    const base = inferredBase || '1B';
    onSelect(base as HitType, trajectory);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">HIT TRAJECTORY</div>
        <div className="text-[8px] text-[#C4A853] mb-3">
          Base: {inferredBase || '?'} {spraySector && `• Location: ${spraySector}`}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleTrajectorySelect('ground')}
            className="bg-[#8B4513] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
          >
            GROUND
          </button>
          <button
            onClick={() => handleTrajectorySelect('line')}
            className="bg-[#2196F3] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
          >
            LINE
          </button>
          <button
            onClick={() => handleTrajectorySelect('fly')}
            className="bg-[#4CAF50] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
          >
            FLY
          </button>
        </div>
        <div className="text-[7px] text-[#888] mt-3 mb-1">OR CHANGE BASE:</div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onSelect('1B')}
            className="bg-[#4CAF50] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105 transition-transform"
          >
            1B
          </button>
          <button
            onClick={() => onSelect('2B')}
            className="bg-[#2196F3] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105 transition-transform"
          >
            2B
          </button>
          <button
            onClick={() => onSelect('3B')}
            className="bg-[#9C27B0] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105 transition-transform"
          >
            3B
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full bg-[#666] border-[2px] border-white px-3 py-1 text-white text-[10px] font-bold hover:bg-[#888]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

interface OutTypeModalProps {
  onSelect: (outType: OutType) => void;
  onClose: () => void;
  throwSequence: number[];
  spraySector?: string;
}

export function OutTypeModal({ onSelect, onClose, throwSequence, spraySector }: OutTypeModalProps) {
  const sequenceLength = throwSequence.length;
  const hasInfielder = throwSequence.some(pos => [3, 4, 5, 6].includes(pos));
  const hasOutfielder = throwSequence.some(pos => [7, 8, 9].includes(pos));

  const suggestedTypes: OutType[] = [];

  if (sequenceLength === 1) {
    if (hasOutfielder) {
      suggestedTypes.push('FO', 'LO');
    } else if (hasInfielder) {
      suggestedTypes.push('LO', 'GO');
    }
  } else if (sequenceLength === 2) {
    suggestedTypes.push('GO', 'FC');
  } else if (sequenceLength >= 3) {
    if (sequenceLength === 3) {
      suggestedTypes.push('DP', 'GO');
    } else {
      suggestedTypes.push('TP', 'DP');
    }
  }

  const allTypes: OutType[] = ['GO', 'FO', 'LO', 'DP', 'FC', 'SAC'];
  const otherTypes = allTypes.filter(t => !suggestedTypes.includes(t));

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">OUT TYPE</div>
        <div className="text-[8px] text-[#C4A853] mb-3">
          Sequence: {throwSequence.join('-') || 'None'}
          {spraySector && ` • ${spraySector}`}
        </div>

        {suggestedTypes.length > 0 && (
          <div className="mb-2">
            <div className="text-[7px] text-[#888] mb-1">SUGGESTED</div>
            <div className="grid grid-cols-3 gap-2">
              {suggestedTypes.map(type => (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className="bg-[#DD0000] border-[3px] border-[#FFD700] px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-[7px] text-[#888] mb-1">OTHER</div>
        <div className="grid grid-cols-3 gap-2">
          {otherTypes.map(type => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="bg-[#8B0000] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full bg-[#666] border-[2px] border-white px-3 py-1 text-white text-[10px] font-bold hover:bg-[#888]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

interface SpecialEventPromptModalProps {
  prompt: SpecialEventPrompt;
  onAnswer: (confirmed: boolean) => void;
}

export function SpecialEventPromptModal({ prompt, onAnswer }: SpecialEventPromptModalProps) {
  const eventEmojis: Record<string, string> = {
    WEB_GEM: '⭐',
    ROBBERY: '🎭',
    TOOTBLAN: '🤦',
    KILLED_PITCHER: '💥',
    NUT_SHOT: '🥜',
    DIVING_CATCH: '🏊',
    INSIDE_PARK_HR: '🏠',
  };

  const emoji = eventEmojis[prompt.eventType] || '❓';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#C4A853] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
        <div className="text-center mb-3">
          <span className="text-3xl">{emoji}</span>
        </div>
        <div className="text-[12px] text-[#E8E8D8] font-bold mb-2 text-center">
          {prompt.question}
        </div>
        <div className="text-[8px] text-[#C4A853] mb-4 text-center">
          {prompt.fameImpact}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAnswer(true)}
            className={`flex-1 border-[3px] px-3 py-2 text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${
              prompt.defaultAnswer
                ? 'bg-[#4CAF50] border-[#FFD700] text-white'
                : 'bg-[#4CAF50] border-white text-white'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => onAnswer(false)}
            className={`flex-1 border-[3px] px-3 py-2 text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${
              !prompt.defaultAnswer
                ? 'bg-[#DD0000] border-[#FFD700] text-white'
                : 'bg-[#DD0000] border-white text-white'
            }`}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}
