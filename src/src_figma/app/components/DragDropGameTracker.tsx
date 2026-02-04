import { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any; // React-dnd connector refs are not fully compatible with React 19 ref types

const ItemTypes = {
  FIELDER: 'fielder',
  BATTER: 'batter',
};

interface FieldPosition {
  name: string;
  position: string;
  number: string;
  svgX: number;
  svgY: number;
}

interface GameSituation {
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
  inning: number;
  isTop: boolean;
}

interface InteractiveFieldProps {
  gameSituation: GameSituation;
  fieldPositions: FieldPosition[];
  onPlayComplete: (playData: any) => void;
  fielderBorderColors?: [string, string]; // Tuple of two colors for alternating
}

interface PlacedFielder {
  fieldPosition: FieldPosition;
  x: number;
  y: number;
  sequenceNumber?: number;
}

interface DraggableFielderProps {
  fieldPosition: FieldPosition;
  isPlaced: boolean;
  onClick: () => void;
  sequenceNumber?: number;
  borderColor?: string; // Add borderColor prop
}

// Component for placed fielders that look like the draggable ones
interface PlacedFielderDisplayProps {
  placedFielder: PlacedFielder;
  onClick: () => void;
  borderColor?: string; // Add borderColor prop
}

function PlacedFielderDisplay({ placedFielder, onClick, borderColor }: PlacedFielderDisplayProps) {
  const leftPercent = (placedFielder.x / 400) * 100;
  const topPercent = (placedFielder.y / 300) * 100;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: 40,
      }}
    >
      <div 
        className="border-[4px] p-1.5 transition-all hover:scale-110 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
        style={{
          backgroundColor: placedFielder.sequenceNumber ? '#DD0000' : '#6B9462',
          borderColor: borderColor ? borderColor + 'B0' : '#E8E8D8',
        }}
      >
        <div 
          className="text-[10px] font-bold leading-tight text-center"
          style={{ 
            color: placedFielder.sequenceNumber ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)'
          }}
        >
          {placedFielder.fieldPosition.name}
        </div>
        <div 
          className="text-[8px] font-bold leading-tight text-center"
          style={{ 
            color: placedFielder.sequenceNumber ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)'
          }}
        >
          {placedFielder.fieldPosition.position} • {placedFielder.fieldPosition.number}
        </div>
        {/* Sequence badge */}
        {placedFielder.sequenceNumber && (
          <div 
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C4A853] border-2 border-black flex items-center justify-center"
          >
            <span className="text-[8px] font-bold text-black">{placedFielder.sequenceNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableFielder({ fieldPosition, isPlaced, onClick, sequenceNumber, borderColor }: DraggableFielderProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.FIELDER,
    item: { fieldPosition },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [fieldPosition]);

  // Convert SVG coords to percentage
  const leftPercent = (fieldPosition.svgX / 400) * 100;
  const topPercent = (fieldPosition.svgY / 300) * 100;

  return (
    <div
      ref={drag as DndRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isPlaced ? 0.3 : 1,
        zIndex: 35,
      }}
    >
      <div 
        className="border-[4px] p-1.5 transition-all hover:scale-105 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
        style={{
          backgroundColor: sequenceNumber ? '#DD0000' : '#6B9462',
          borderColor: borderColor || '#E8E8D8',
        }}
      >
        <div 
          className="text-[10px] font-bold leading-tight text-center"
          style={{ 
            color: sequenceNumber ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)'
          }}
        >
          {fieldPosition.name}
        </div>
        <div 
          className="text-[8px] font-bold leading-tight text-center"
          style={{ 
            color: sequenceNumber ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)'
          }}
        >
          {fieldPosition.position} • {fieldPosition.number}
        </div>
        {/* Sequence badge for original position fielders too */}
        {sequenceNumber && (
          <div 
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C4A853] border-2 border-black flex items-center justify-center"
          >
            <span className="text-[8px] font-bold text-black">{sequenceNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableBatter() {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BATTER,
    item: { type: 'batter' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag as DndRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: '79%',
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontSize: '24px',
        zIndex: 35,
      }}
    >
      🏏
    </div>
  );
}

export function InteractiveField({ gameSituation, fieldPositions, onPlayComplete, fielderBorderColors }: InteractiveFieldProps) {
  const [placedFielders, setPlacedFielders] = useState<PlacedFielder[]>([]);
  const [throwSequence, setThrowSequence] = useState<FieldPosition[]>([]);
  const [batterDraggedTo, setBatterDraggedTo] = useState<{ x: number; y: number } | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'hit-or-out' | 'hit-type' | 'out-type' | 'foul-outcome'>('hit-or-out');

  // HR mode state
  const [hrMode, setHrMode] = useState(false);
  const [hrLocation, setHrLocation] = useState<{ x: number; y: number } | null>(null);
  const [showHrDistanceModal, setShowHrDistanceModal] = useState(false);
  const [hrDistanceInput, setHrDistanceInput] = useState('');

  // Foul territory detection
  const isInFoulTerritory = (x: number, y: number): boolean => {
    // Home plate coordinates (center bottom of field)
    const homeX = 200;
    const homeY = 240;
    
    // First base (right side)
    const firstX = 260;
    const firstY = 180;
    
    // Third base (left side)
    const thirdX = 140;
    const thirdY = 180;
    
    // Calculate if point is to the left of the left foul line (home to third)
    const leftFoulLineCross = (x - homeX) * (thirdY - homeY) - (y - homeY) * (thirdX - homeX);
    const isLeftFoul = leftFoulLineCross < 0;
    
    // Calculate if point is to the right of the right foul line (home to first)
    const rightFoulLineCross = (x - homeX) * (firstY - homeY) - (y - homeY) * (firstX - homeX);
    const isRightFoul = rightFoulLineCross > 0;
    
    return isLeftFoul || isRightFoul;
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.FIELDER, ItemTypes.BATTER],
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset();
      const fieldElement = document.getElementById('interactive-field-container');
      if (offset && fieldElement) {
        const fieldRect = fieldElement.getBoundingClientRect();
        const svgX = ((offset.x - fieldRect.left) / fieldRect.width) * 400;
        const svgY = ((offset.y - fieldRect.top) / fieldRect.height) * 300;

        if (item.type === 'batter') {
          // Batter dragged - hit outcome
          setBatterDraggedTo({ x: svgX, y: svgY });
        } else if (item.fieldPosition) {
          // Fielder dragged - place on field and add to throw sequence as first fielder
          const newPlacedFielder: PlacedFielder = {
            fieldPosition: item.fieldPosition,
            x: svgX,
            y: svgY,
            sequenceNumber: 1, // First fielder placed gets sequence number 1
          };
          setPlacedFielders([...placedFielders, newPlacedFielder]);
          
          // Add this fielder as the first in the throw sequence
          setThrowSequence([item.fieldPosition]);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleFielderClick = (fieldPosition: FieldPosition) => {
    // Only allow clicking to add to sequence if there's already at least one placed fielder
    if (placedFielders.length === 0) return;
    
    // Add to throw sequence
    const updatedSequence = [...throwSequence, fieldPosition];
    setThrowSequence(updatedSequence);

    // Update placed fielder with sequence number if this fielder was placed
    setPlacedFielders(placedFielders.map(pf => 
      pf.fieldPosition.number === fieldPosition.number
        ? { ...pf, sequenceNumber: updatedSequence.length }
        : pf
    ));
  };

  const handlePlacedFielderClick = (placedFielder: PlacedFielder) => {
    handleFielderClick(placedFielder.fieldPosition);
  };

  const handleReadyToClassify = () => {
    // Check if play was in foul territory
    const playLocation = placedFielders.length > 0 
      ? { x: placedFielders[0].x, y: placedFielders[0].y }
      : batterDraggedTo;
    
    if (playLocation && isInFoulTerritory(playLocation.x, playLocation.y)) {
      // Show foul outcome modal
      setShowModal(true);
      setModalStep('foul-outcome');
    } else {
      // Show regular hit-or-out modal
      setShowModal(true);
      setModalStep('hit-or-out');
    }
  };

  const handleHitOrOut = (type: 'hit' | 'out') => {
    if (type === 'hit') {
      setModalStep('hit-type');
    } else {
      setModalStep('out-type');
    }
  };

  const handleOutcomeSelect = (outcome: string) => {
    // Complete the play with the selected outcome
    onPlayComplete({
      outcome,
      location: batterDraggedTo || (placedFielders[0] ? { x: placedFielders[0].x, y: placedFielders[0].y } : null),
      fielders: placedFielders,
      throwSequence: throwSequence.map(fp => fp.number).join('-'),
    });

    // Reset everything
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterDraggedTo(null);
    setShowModal(false);
    setModalStep('hit-or-out');
    setHrMode(false);
    setHrLocation(null);
    setShowHrDistanceModal(false);
    setHrDistanceInput('');
  };

  const handleReset = () => {
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterDraggedTo(null);
    setShowModal(false);
    setModalStep('hit-or-out');
    setHrMode(false);
    setHrLocation(null);
    setShowHrDistanceModal(false);
    setHrDistanceInput('');
  };

  // HR mode handlers
  const handleHrButtonClick = () => {
    // Clear any existing state and enter HR mode
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterDraggedTo(null);
    setHrMode(true);
    setHrLocation(null);
  };

  const handleFieldClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hrMode) return;
    
    const fieldElement = document.getElementById('interactive-field-container');
    if (fieldElement) {
      const fieldRect = fieldElement.getBoundingClientRect();
      const svgX = ((e.clientX - fieldRect.left) / fieldRect.width) * 400;
      const svgY = ((e.clientY - fieldRect.top) / fieldRect.height) * 300;
      
      setHrLocation({ x: svgX, y: svgY });
      setShowHrDistanceModal(true);
    }
  };

  const handleHrDistanceSelect = (distance: string) => {
    // Validate that the input is a valid number
    const distanceValue = parseInt(hrDistanceInput);
    if (isNaN(distanceValue) || distanceValue <= 0) {
      // Don't submit if invalid
      return;
    }

    onPlayComplete({
      outcome: 'HR',
      location: hrLocation,
      distance: hrDistanceInput,
      fielders: [],
      throwSequence: '',
    });

    // Reset everything
    setHrMode(false);
    setHrLocation(null);
    setShowHrDistanceModal(false);
    setHrDistanceInput('');
  };

  // Get sequence number for a fielder in their original position
  const getOriginalPositionSequenceNumber = (fieldPosition: FieldPosition): number | undefined => {
    const index = throwSequence.findIndex(fp => fp.number === fieldPosition.number);
    return index >= 0 ? index + 1 : undefined;
  };

  return (
    <>
      {/* Drop zone overlay */}
      <div
        ref={drop as DndRef}
        className="absolute inset-0"
        style={{
          zIndex: 30,
          backgroundColor: isOver ? 'rgba(85, 153, 255, 0.1)' : 'transparent',
        }}
        onClick={handleFieldClick}
      >
        {/* Draggable Fielders at original positions */}
        {!hrMode && fieldPositions.map((fp) => {
          const isPlaced = placedFielders.some(pf => pf.fieldPosition.number === fp.number);
          const sequenceNumber = getOriginalPositionSequenceNumber(fp);
          
          return (
            <DraggableFielder
              key={fp.number}
              fieldPosition={fp}
              isPlaced={isPlaced}
              onClick={() => handleFielderClick(fp)}
              sequenceNumber={sequenceNumber}
              borderColor={fielderBorderColors ? fielderBorderColors[0] : undefined}
            />
          );
        })}

        {/* Batter icon at home plate */}
        {!batterDraggedTo && !hrMode && <DraggableBatter />}
      </div>

      {/* Placed fielders that look like originals */}
      {placedFielders.map((pf, index) => (
        <PlacedFielderDisplay
          key={index}
          placedFielder={pf}
          onClick={() => handlePlacedFielderClick(pf)}
          borderColor={fielderBorderColors ? fielderBorderColors[1] : undefined}
        />
      ))}

      {/* Batter dragged location marker */}
      {batterDraggedTo && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 400 300"
          style={{ zIndex: 40 }}
        >
          <circle
            cx={batterDraggedTo.x}
            cy={batterDraggedTo.y}
            r="10"
            fill="#CC44CC"
            stroke="white"
            strokeWidth="3"
            opacity="0.9"
          />
        </svg>
      )}

      {/* Control buttons - now shows "CLASSIFY PLAY" instead of CONFIRM */}
      {(placedFielders.length > 0 || batterDraggedTo) && !showModal && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2" style={{ zIndex: 50 }}>
          <button
            onClick={handleReset}
            className="bg-[#808080] border-[4px] border-white px-4 py-2 text-white text-sm font-bold hover:bg-[#999999] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            ✕ RESET
          </button>
          <button
            onClick={handleReadyToClassify}
            className="bg-[#DD0000] border-[4px] border-white px-4 py-2 text-white text-sm font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            ▶ CLASSIFY PLAY
          </button>
        </div>
      )}

      {/* Throw sequence display */}
      {throwSequence.length > 0 && (
        <div className="absolute top-4 left-4 bg-[#3366FF] border-[4px] border-white px-3 py-2" style={{ zIndex: 50 }}>
          <div className="text-[8px] text-white font-bold mb-1">THROW SEQUENCE:</div>
          <div className="text-sm text-white font-bold">
            {throwSequence.map(fp => fp.number).join('-')}
          </div>
        </div>
      )}

      {/* Modal in foul territory (right side) */}
      {showModal && (
        <div 
          className="absolute right-2 top-[75%] transform -translate-y-1/2 bg-white border-[4px] border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]"
          style={{ zIndex: 60, maxWidth: '200px' }}
        >
          {modalStep === 'hit-or-out' && (
            <>
              <div className="text-[10px] text-black font-bold mb-2 text-center">WAS IT A HIT OR OUT?</div>
              <div className="space-y-2">
                <button
                  onClick={() => handleHitOrOut('hit')}
                  className="w-full bg-[#5599FF] border-[3px] border-[#3366CC] px-3 py-2 text-black text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
                >
                  HIT
                </button>
                <button
                  onClick={() => handleHitOrOut('out')}
                  className="w-full bg-[#DD0000] border-[3px] border-[#AA0000] px-3 py-2 text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
                >
                  OUT
                </button>
              </div>
            </>
          )}

          {modalStep === 'hit-type' && (
            <>
              <div className="text-[10px] text-black font-bold mb-2 text-center">SELECT HIT TYPE:</div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => handleOutcomeSelect('1B')} className="bg-[#5599FF] border-[2px] border-[#3366CC] px-2 py-1 text-black text-[9px] font-bold hover:scale-105">1B</button>
                <button onClick={() => handleOutcomeSelect('2B')} className="bg-[#5599FF] border-[2px] border-[#3366CC] px-2 py-1 text-black text-[9px] font-bold hover:scale-105">2B</button>
                <button onClick={() => handleOutcomeSelect('3B')} className="bg-[#5599FF] border-[2px] border-[#3366CC] px-2 py-1 text-black text-[9px] font-bold hover:scale-105">3B</button>
                <button onClick={() => handleOutcomeSelect('HR')} className="bg-[#CC44CC] border-[2px] border-[#992299] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">HR</button>
              </div>
              <button 
                onClick={() => setModalStep('hit-or-out')}
                className="w-full mt-2 bg-[#808080] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105"
              >
                ← BACK
              </button>
            </>
          )}

          {modalStep === 'out-type' && (
            <>
              <div className="text-[10px] text-black font-bold mb-2 text-center">SELECT OUT TYPE:</div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => handleOutcomeSelect('K')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">K</button>
                <button onClick={() => handleOutcomeSelect('KL')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">KL</button>
                <button onClick={() => handleOutcomeSelect('GO')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">GO</button>
                <button onClick={() => handleOutcomeSelect('FO')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">FO</button>
                <button onClick={() => handleOutcomeSelect('LO')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">LO</button>
                <button onClick={() => handleOutcomeSelect('DP')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">DP</button>
              </div>
              <button 
                onClick={() => setModalStep('hit-or-out')}
                className="w-full mt-2 bg-[#808080] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105"
              >
                ← BACK
              </button>
            </>
          )}

          {modalStep === 'foul-outcome' && (
            <>
              <div className="text-[10px] text-black font-bold mb-2 text-center">SELECT FOUL OUTCOME:</div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => handleOutcomeSelect('FO')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">FO</button>
                <button onClick={() => handleOutcomeSelect('LO')} className="bg-[#DD0000] border-[2px] border-[#AA0000] px-2 py-1 text-white text-[9px] font-bold hover:scale-105">LO</button>
              </div>
              <button 
                onClick={() => setModalStep('hit-or-out')}
                className="w-full mt-2 bg-[#808080] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105"
              >
                ← BACK
              </button>
            </>
          )}
        </div>
      )}

      {/* HR mode button */}
      {!hrMode && !showModal && placedFielders.length === 0 && !batterDraggedTo && (
        <button
          onClick={handleHrButtonClick}
          className="absolute bottom-4 right-4 bg-[#E8C547] border-[4px] border-white px-4 py-2 text-black text-sm font-bold active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          style={{ zIndex: 50 }}
        >
          HR
        </button>
      )}

      {/* HR mode cancel button */}
      {hrMode && !showHrDistanceModal && (
        <button
          onClick={handleReset}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#808080] border-[4px] border-white px-4 py-2 text-white text-sm font-bold hover:bg-[#999999] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          style={{ zIndex: 50 }}
        >
          ✕ CANCEL
        </button>
      )}

      {/* HR location marker - baseball style */}
      {hrLocation && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 400 300"
          style={{ zIndex: 40 }}
        >
          {/* Baseball circle - white with red stitching */}
          <circle
            cx={hrLocation.x}
            cy={hrLocation.y}
            r="6"
            fill="white"
            stroke="#DD0000"
            strokeWidth="1"
          />
          {/* Red stitching pattern - curved lines */}
          <path
            d={`M ${hrLocation.x - 4} ${hrLocation.y - 2} Q ${hrLocation.x} ${hrLocation.y - 3} ${hrLocation.x + 4} ${hrLocation.y - 2}`}
            stroke="#DD0000"
            strokeWidth="0.5"
            fill="none"
          />
          <path
            d={`M ${hrLocation.x - 4} ${hrLocation.y + 2} Q ${hrLocation.x} ${hrLocation.y + 3} ${hrLocation.x + 4} ${hrLocation.y + 2}`}
            stroke="#DD0000"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      )}

      {/* HR distance selection modal */}
      {showHrDistanceModal && (
        <div 
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white border-[4px] border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]"
          style={{ zIndex: 60, maxWidth: '200px' }}
        >
          <div className="text-[10px] text-black font-bold mb-3 text-center">ENTER HR DISTANCE (FT):</div>
          <input
            type="number"
            inputMode="numeric"
            value={hrDistanceInput}
            onChange={(e) => setHrDistanceInput(e.target.value)}
            placeholder="350"
            autoFocus
            className="w-full bg-white border-[3px] border-[#3366CC] px-3 py-2 text-black text-base font-bold text-center mb-2 focus:outline-none focus:border-[#5599FF]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleHrDistanceSelect('');
              }
            }}
          />
          <div className="space-y-1">
            <button
              onClick={() => handleHrDistanceSelect(hrDistanceInput)}
              className="w-full bg-[#DD0000] border-[3px] border-[#AA0000] px-3 py-2 text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
            >
              ✓ CONFIRM
            </button>
            <button 
              onClick={() => {
                setShowHrDistanceModal(false);
                setHrDistanceInput('');
              }}
              className="w-full bg-[#808080] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105"
            >
              ← BACK
            </button>
          </div>
        </div>
      )}
    </>
  );
}