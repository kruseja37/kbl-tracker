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
 */

import { useState, useEffect, useRef } from 'react';
import { type Trait as TraitData, getWeightedTraitPool } from '../../data/traitPools';

// Re-export helper function for consumers who want to generate trait pools
export { getWeightedTraitPool };

// Local trait interface (subset of TraitData for component use)
interface Trait {
  id: string;
  name: string;
  description: string;
  tier: 'S' | 'A' | 'B' | 'C';
}

/**
 * Helper to get traits for a player based on position type
 * Uses weighted trait pool from traitPools.ts
 */
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

  const tierColors: Record<string, string> = {
    S: '#fbbf24',
    A: '#a855f7',
    B: '#3b82f6',
    C: '#64748b',
  };

  const startSpin = () => {
    if (isSpinning || availableTraits.length === 0) return;

    setIsSpinning(true);
    setShowResult(false);
    setSelectedTrait(null);

    // Random selection
    const randomIndex = Math.floor(Math.random() * availableTraits.length);
    const selected = availableTraits[randomIndex];

    // Calculate spin (multiple full rotations + land on segment)
    const segmentAngle = 360 / availableTraits.length;
    const targetAngle = randomIndex * segmentAngle;
    const spins = 5 + Math.random() * 3; // 5-8 full spins
    const finalRotation = spins * 360 + (360 - targetAngle);

    let currentRotation = rotation;
    const startTime = Date.now();
    const duration = 4000; // 4 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out cubic)
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

  // Generate wheel segments
  const segmentAngle = 360 / availableTraits.length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Trait Lottery</h2>
        <p style={styles.playerName}>for {playerName}</p>
      </div>

      {/* Wheel Container */}
      <div style={styles.wheelContainer}>
        {/* Pointer */}
        <div style={styles.pointer}>▼</div>

        {/* Wheel */}
        <div
          style={{
            ...styles.wheel,
            transform: `rotate(${rotation}deg)`,
          }}
        >
          {availableTraits.map((trait, index) => {
            const angle = index * segmentAngle;
            return (
              <div
                key={trait.id}
                style={{
                  ...styles.segment,
                  transform: `rotate(${angle}deg)`,
                  backgroundColor: tierColors[trait.tier],
                }}
              >
                <span
                  style={{
                    ...styles.segmentLabel,
                    transform: `rotate(${segmentAngle / 2}deg)`,
                  }}
                >
                  {trait.name.substring(0, 8)}
                </span>
              </div>
            );
          })}
          <div style={styles.wheelCenter} />
        </div>
      </div>

      {/* Spin Button or Result */}
      {!showResult ? (
        <button
          style={{
            ...styles.spinButton,
            opacity: isSpinning ? 0.5 : 1,
            cursor: isSpinning ? 'not-allowed' : 'pointer',
          }}
          onClick={startSpin}
          disabled={isSpinning}
        >
          {isSpinning ? 'Spinning...' : 'SPIN!'}
        </button>
      ) : (
        <div style={styles.resultCard}>
          <div
            style={{
              ...styles.resultTier,
              color: tierColors[selectedTrait?.tier || 'C'],
            }}
          >
            {selectedTrait?.tier}-Tier Trait
          </div>
          <div style={styles.resultName}>{selectedTrait?.name}</div>
          <div style={styles.resultDescription}>
            {selectedTrait?.description}
          </div>

          <div style={styles.resultButtons}>
            <button style={styles.applyButton} onClick={handleApply}>
              Apply Trait
            </button>
            <button style={styles.rerollButton} onClick={startSpin}>
              Re-roll
            </button>
          </div>
        </div>
      )}

      {/* Trait Pool Legend */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>Trait Pool</div>
        <div style={styles.legendItems}>
          {Object.entries(tierColors).map(([tier, color]) => {
            const count = availableTraits.filter((t) => t.tier === tier).length;
            return (
              <div key={tier} style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: color }} />
                <span>
                  {tier}: {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel Button */}
      <button style={styles.cancelButton} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  playerName: {
    margin: 0,
    fontSize: '1.125rem',
    color: '#94a3b8',
  },
  wheelContainer: {
    position: 'relative',
    width: '300px',
    height: '300px',
    marginBottom: '32px',
  },
  pointer: {
    position: 'absolute',
    top: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '2rem',
    color: '#ef4444',
    zIndex: 10,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
  },
  wheel: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '4px solid #334155',
    boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
    transition: 'none',
  },
  segment: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    left: '50%',
    top: '0',
    transformOrigin: '0% 100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '10px',
    clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%)',
  },
  segmentLabel: {
    fontSize: '0.625rem',
    fontWeight: 700,
    color: '#000',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  wheelCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    border: '3px solid #334155',
  },
  spinButton: {
    padding: '16px 64px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    border: 'none',
    borderRadius: '100px',
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 900,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '32px',
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #334155',
    textAlign: 'center',
    marginBottom: '32px',
    maxWidth: '320px',
    width: '100%',
  },
  resultTier: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  resultName: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#fff',
    marginBottom: '12px',
  },
  resultDescription: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  resultButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  applyButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  rerollButton: {
    padding: '12px 24px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  legend: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px 24px',
    border: '1px solid #334155',
    marginBottom: '24px',
  },
  legendTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '12px',
    textAlign: 'center',
  },
  legendItems: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
