/**
 * TraitLotteryWheel - Spinning wheel for trait assignments
 * Per Ralph Framework S-D012
 *
 * Features:
 * - Visual spinning animation
 * - Trait pool by tier (S/A/B/C)
 * - Result reveal with description
 * - Apply button to confirm
 * - Wired to traitPools.ts for trait data (WIRE-022)
 *
 * Styled with SNES retro aesthetic (SMB4 colors)
 */

import { useState, useEffect, useRef } from 'react';
import { type Trait as TraitData, getWeightedTraitPool } from '../../data/traitPools';

export { getWeightedTraitPool };

interface Trait {
  id: string;
  name: string;
  description: string;
  tier: 'S' | 'A' | 'B' | 'C';
}

export function getTraitsForLottery(isPitcher: boolean, poolSize: number = 12): Trait[] {
  return getWeightedTraitPool(isPitcher, poolSize).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    tier: t.tier,
  }));
}

interface TraitLotteryWheelProps {
  availableTraits: Trait[];
  playerName: string;
  onResult: (trait: Trait) => void;
  onCancel: () => void;
}

export default function TraitLotteryWheel({
  availableTraits,
  playerName,
  onResult,
  onCancel,
}: TraitLotteryWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<Trait | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const spinRef = useRef<number | null>(null);

  const tierColors: Record<string, { bg: string; text: string }> = {
    S: { bg: '#d4a017', text: '#0a1628' },
    A: { bg: '#a855f7', text: '#fff' },
    B: { bg: '#1a4b8c', text: '#fff' },
    C: { bg: '#64748b', text: '#fff' },
  };

  const startSpin = () => {
    if (isSpinning || availableTraits.length === 0) return;

    setIsSpinning(true);
    setShowResult(false);
    setSelectedTrait(null);

    const randomIndex = Math.floor(Math.random() * availableTraits.length);
    const selected = availableTraits[randomIndex];

    const segmentAngle = 360 / availableTraits.length;
    const targetAngle = randomIndex * segmentAngle;
    const spins = 5 + Math.random() * 3;
    const finalRotation = spins * 360 + (360 - targetAngle);

    let currentRotation = rotation;
    const startTime = Date.now();
    const duration = 4000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      currentRotation = rotation + finalRotation * eased;
      setRotation(currentRotation);

      if (progress < 1) {
        spinRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setSelectedTrait(selected);
        setShowResult(true);
      }
    };

    spinRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (spinRef.current) {
        cancelAnimationFrame(spinRef.current);
      }
    };
  }, []);

  const handleApply = () => {
    if (selectedTrait) {
      onResult(selectedTrait);
    }
  };

  const segmentAngle = 360 / availableTraits.length;

  return (
    <div className="min-h-screen bg-retro-green relative overflow-hidden">
      {/* Background layers */}
      <div className="bg-field-stripes absolute inset-0" />
      <div className="bg-scanlines absolute inset-0 pointer-events-none z-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-4 py-8">
        {/* Header Card */}
        <div className="retro-card mb-8 max-w-md w-full">
          <div className="retro-header-gold">
            <span className="font-pixel text-retro-navy text-xs">🎰 TRAIT LOTTERY</span>
          </div>
          <div className="retro-body p-4 text-center">
            <h2 className="font-pixel text-retro-blue text-lg mb-2" style={{ textShadow: '2px 2px 0 #c41e3a' }}>
              Spin to Win!
            </h2>
            <p className="text-gray-600">for <span className="font-bold text-retro-navy">{playerName}</span></p>
          </div>
        </div>

        {/* Wheel Container */}
        <div className="relative w-[300px] h-[300px] mb-8">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="text-3xl text-retro-red drop-shadow-lg">▼</div>
          </div>

          {/* Wheel */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden border-4 border-retro-navy shadow-retro-lg"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {availableTraits.map((trait, index) => {
              const angle = index * segmentAngle;
              return (
                <div
                  key={trait.id}
                  className="absolute w-1/2 h-1/2 left-1/2 top-0 origin-bottom-left flex items-center justify-end pr-2"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    backgroundColor: tierColors[trait.tier].bg,
                    clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%)',
                  }}
                >
                  <span
                    className="text-[0.5rem] font-bold uppercase whitespace-nowrap"
                    style={{
                      transform: `rotate(${segmentAngle / 2}deg)`,
                      color: tierColors[trait.tier].text,
                    }}
                  >
                    {trait.name.substring(0, 8)}
                  </span>
                </div>
              );
            })}
            {/* Center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-retro-navy border-3 border-retro-gold" />
          </div>
        </div>

        {/* Spin Button or Result */}
        {!showResult ? (
          <button
            className={`retro-btn retro-btn-red py-4 px-16 mb-8 ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={startSpin}
            disabled={isSpinning}
          >
            <span className="font-pixel text-lg">
              {isSpinning ? 'SPINNING...' : 'SPIN!'}
            </span>
          </button>
        ) : (
          <div className="retro-card max-w-sm w-full mb-8" style={{ border: `3px solid ${tierColors[selectedTrait?.tier || 'C'].bg}` }}>
            <div
              className="px-4 py-2 text-center font-pixel text-xs"
              style={{
                backgroundColor: tierColors[selectedTrait?.tier || 'C'].bg,
                color: tierColors[selectedTrait?.tier || 'C'].text,
              }}
            >
              {selectedTrait?.tier}-TIER TRAIT
            </div>
            <div className="retro-body p-4 text-center">
              <div className="font-pixel text-retro-blue text-lg mb-3" style={{ textShadow: '1px 1px 0 #d4a017' }}>
                {selectedTrait?.name}
              </div>
              <div className="text-gray-600 text-sm mb-4 leading-relaxed">
                {selectedTrait?.description}
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  className="retro-btn bg-retro-green text-white border-2 border-retro-green-bright py-2 px-6"
                  onClick={handleApply}
                >
                  <span className="font-pixel text-xs">APPLY TRAIT</span>
                </button>
                <button
                  className="retro-btn bg-gray-500 text-white py-2 px-6"
                  onClick={startSpin}
                >
                  <span className="font-pixel text-xs">RE-ROLL</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trait Pool Legend */}
        <div className="retro-card max-w-md w-full mb-6">
          <div className="retro-header-blue">
            <span className="font-pixel text-white text-xs">TRAIT POOL</span>
          </div>
          <div className="retro-body p-3">
            <div className="flex gap-4 justify-center flex-wrap">
              {Object.entries(tierColors).map(([tier, colors]) => {
                const count = availableTraits.filter((t) => t.tier === tier).length;
                return (
                  <div key={tier} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-retro-navy"
                      style={{ backgroundColor: colors.bg }}
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-bold">{tier}:</span> {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          className="retro-btn bg-transparent border-2 border-gray-400 text-gray-600 hover:border-retro-red hover:text-retro-red py-2 px-6"
          onClick={onCancel}
        >
          <span className="font-pixel text-xs">CANCEL</span>
        </button>
      </div>
    </div>
  );
}
