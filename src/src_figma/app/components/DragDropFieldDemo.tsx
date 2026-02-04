/**
 * DragDropFieldDemo - Demo component for the new FieldCanvas system
 *
 * This demonstrates the Phase 1 implementation per GAMETRACKER_DRAGDROP_SPEC.md v4:
 * - Extended coordinate system (0-1.4 for y including stands)
 * - Foul territory auto-detection
 * - Draggable fielders
 * - Click-to-tap sequence building
 * - Ball landing markers
 */

import { useState, useCallback } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  FieldCanvas,
  type FieldCoordinate,
  isFoulTerritory,
  getFoulType,
  getSpraySector,
  classifyHomeRun,
  isInStands,
  FIELDER_POSITIONS,
} from './FieldCanvas';
import {
  FielderIcon,
  PlacedFielder,
  BatterIcon,
  BallLandingMarker,
  ItemTypes,
  type FielderData,
} from './FielderIcon';

// ============================================
// TYPES
// ============================================

interface PlacedFielderState {
  fielder: FielderData;
  position: FieldCoordinate;
  sequenceNumber: number;
}

// ============================================
// DROP ZONE WRAPPER
// ============================================

interface FieldDropZoneProps {
  children: React.ReactNode;
  onFielderDrop: (fielder: FielderData, position: FieldCoordinate) => void;
  onBatterDrop: (position: FieldCoordinate) => void;
}

function FieldDropZone({ children, onFielderDrop, onBatterDrop }: FieldDropZoneProps) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [ItemTypes.FIELDER, ItemTypes.BATTER],
      drop: (item: any, monitor) => {
        const offset = monitor.getClientOffset();
        const element = document.getElementById('field-drop-zone');
        if (offset && element) {
          const rect = element.getBoundingClientRect();
          const relX = offset.x - rect.left;
          const relY = offset.y - rect.top;

          // Convert to normalized coordinates
          const x = relX / rect.width;
          const y = 1.4 - (relY / rect.height) * 1.4;

          const position: FieldCoordinate = { x, y };

          if (item.fielder) {
            onFielderDrop(item.fielder, position);
          } else if (item.type === 'batter') {
            onBatterDrop(position);
          }
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [onFielderDrop, onBatterDrop]
  );

  return (
    <div
      id="field-drop-zone"
      ref={drop as any}
      className="relative"
      style={{
        outline: isOver ? '3px dashed #5599FF' : 'none',
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DragDropFieldDemo() {
  // State
  const [placedFielders, setPlacedFielders] = useState<PlacedFielderState[]>([]);
  const [throwSequence, setThrowSequence] = useState<FielderData[]>([]);
  const [batterPosition, setBatterPosition] = useState<FieldCoordinate | null>(null);
  const [lastClickInfo, setLastClickInfo] = useState<{
    coord: FieldCoordinate;
    isFoul: boolean;
    sector: string;
    isHR: boolean;
    hrType?: string;
  } | null>(null);

  // Default fielders
  const fielders: FielderData[] = Object.values(FIELDER_POSITIONS).map((pos) => ({
    positionNumber: pos.positionNumber,
    name: pos.label,
    playerId: `player-${pos.positionNumber}`,
  }));

  // Handle fielder drop (ball fielded location)
  const handleFielderDrop = useCallback(
    (fielder: FielderData, position: FieldCoordinate) => {
      // Add to placed fielders with sequence number
      const newSequenceNumber = placedFielders.length + 1;
      setPlacedFielders((prev) => [
        ...prev,
        { fielder, position, sequenceNumber: newSequenceNumber },
      ]);
      // Start throw sequence
      setThrowSequence([fielder]);
    },
    [placedFielders.length]
  );

  // Handle batter drop (hit location)
  const handleBatterDrop = useCallback((position: FieldCoordinate) => {
    setBatterPosition(position);

    // Analyze the location
    const isFoul = isFoulTerritory(position.x, position.y);
    const sector = getSpraySector(position.x, position.y);
    const isHR = isInStands(position.y);
    const hrType = isHR ? classifyHomeRun(position.y) : undefined;

    setLastClickInfo({
      coord: position,
      isFoul,
      sector: sector.sector,
      isHR,
      hrType,
    });
  }, []);

  // Handle fielder click (add to throw sequence)
  const handleFielderClick = useCallback(
    (fielder: FielderData) => {
      // Only allow clicking to add to sequence if there's already a placed fielder
      if (placedFielders.length === 0) return;

      // Add to throw sequence
      setThrowSequence((prev) => [...prev, fielder]);
    },
    [placedFielders.length]
  );

  // Handle field click
  const handleFieldClick = useCallback((coord: FieldCoordinate, isFoul: boolean) => {
    const sector = getSpraySector(coord.x, coord.y);
    const isHR = isInStands(coord.y);
    const hrType = isHR ? classifyHomeRun(coord.y) : undefined;

    setLastClickInfo({
      coord,
      isFoul,
      sector: sector.sector,
      isHR,
      hrType,
    });
  }, []);

  // Reset state
  const handleReset = useCallback(() => {
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterPosition(null);
    setLastClickInfo(null);
  }, []);

  // Get sequence number for a fielder in their original position
  const getSequenceNumber = (fielder: FielderData): number | undefined => {
    const index = throwSequence.findIndex(
      (f) => f.positionNumber === fielder.positionNumber
    );
    return index >= 0 ? index + 1 : undefined;
  };

  // Check if fielder is placed
  const isFielderPlaced = (fielder: FielderData): boolean => {
    return placedFielders.some(
      (pf) => pf.fielder.positionNumber === fielder.positionNumber
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 bg-[#1a1a1a] min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-4 text-center">
            <h1 className="text-xl font-bold text-[#E8E8D8]">
              FieldCanvas Demo - Phase 1
            </h1>
            <p className="text-sm text-[#999]">
              Drag fielders to field location, click to add to throw sequence
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Field Canvas */}
            <div className="lg:col-span-2">
              <div className="bg-[#6B9462] border-[6px] border-[#E8E8D8] p-2">
                <FieldDropZone
                  onFielderDrop={handleFielderDrop}
                  onBatterDrop={handleBatterDrop}
                >
                  <FieldCanvas
                    width={500}
                    height={700}
                    showStands={true}
                    shadeFoulTerritory={true}
                    onFieldClick={handleFieldClick}
                  >
                    {/* Fielders at original positions */}
                    {fielders.map((fielder) => (
                      <FielderIcon
                        key={fielder.positionNumber}
                        fielder={fielder}
                        sequenceNumber={getSequenceNumber(fielder)}
                        isPlaced={isFielderPlaced(fielder)}
                        onClick={handleFielderClick}
                        borderColor="#E8E8D8"
                      />
                    ))}

                    {/* Placed fielders */}
                    {placedFielders.map((pf, index) => (
                      <PlacedFielder
                        key={`placed-${index}`}
                        fielder={pf.fielder}
                        placedPosition={pf.position}
                        sequenceNumber={pf.sequenceNumber}
                        onClick={handleFielderClick}
                        borderColor="#C4A853"
                      />
                    ))}

                    {/* Batter at home */}
                    <BatterIcon
                      name="BATTER"
                      isDragged={batterPosition !== null}
                    />

                    {/* Batter landing marker */}
                    {batterPosition && (
                      <BallLandingMarker
                        position={batterPosition}
                        type={isInStands(batterPosition.y) ? 'hr' : 'hit'}
                      />
                    )}
                  </FieldCanvas>
                </FieldDropZone>
              </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-4">
              {/* Throw Sequence */}
              <div className="bg-[#3366FF] border-[4px] border-white p-3">
                <div className="text-[10px] text-white font-bold mb-2">
                  THROW SEQUENCE:
                </div>
                <div className="text-lg text-white font-bold">
                  {throwSequence.length > 0
                    ? throwSequence.map((f) => f.positionNumber).join('-')
                    : '—'}
                </div>
              </div>

              {/* Last Click Info */}
              {lastClickInfo && (
                <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-3">
                  <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">
                    LOCATION INFO:
                  </div>
                  <div className="space-y-1 text-xs text-[#E8E8D8]">
                    <div>
                      <span className="text-[#999]">Coords:</span>{' '}
                      ({lastClickInfo.coord.x.toFixed(2)}, {lastClickInfo.coord.y.toFixed(2)})
                    </div>
                    <div>
                      <span className="text-[#999]">Sector:</span>{' '}
                      {lastClickInfo.sector}
                    </div>
                    <div>
                      <span className="text-[#999]">Foul:</span>{' '}
                      <span className={lastClickInfo.isFoul ? 'text-[#FF6600]' : 'text-[#4CAF50]'}>
                        {lastClickInfo.isFoul ? 'YES' : 'NO'}
                      </span>
                      {lastClickInfo.isFoul && (
                        <span className="text-[#999]">
                          {' '}({getFoulType(lastClickInfo.coord.x, lastClickInfo.coord.y)})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[#999]">Home Run:</span>{' '}
                      <span className={lastClickInfo.isHR ? 'text-[#FFD700]' : 'text-[#E8E8D8]'}>
                        {lastClickInfo.isHR ? `YES (${lastClickInfo.hrType})` : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="space-y-2">
                <button
                  onClick={handleReset}
                  className="w-full bg-[#808080] border-[4px] border-white px-4 py-2 text-white text-sm font-bold hover:bg-[#999999] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  ✕ RESET
                </button>
                {(placedFielders.length > 0 || batterPosition) && (
                  <button
                    className="w-full bg-[#DD0000] border-[4px] border-white px-4 py-2 text-white text-sm font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  >
                    ▶ CLASSIFY PLAY
                  </button>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-[#222] border-[4px] border-[#444] p-3">
                <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">
                  HOW TO USE:
                </div>
                <ul className="text-[9px] text-[#999] space-y-1">
                  <li>• Drag fielder to where ball was fielded</li>
                  <li>• Click fielders to build throw sequence</li>
                  <li>• Drag batter to base or stands (HR)</li>
                  <li>• Click field to see coordinates</li>
                  <li>• Foul territory is shaded</li>
                  <li>• Stands area (y &gt; 1.0) = Home Run zone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

export default DragDropFieldDemo;
