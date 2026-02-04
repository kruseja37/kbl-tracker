import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { X } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any; // React-dnd connector refs are not fully compatible with React 19 ref types

interface PlayLocationData {
  x: number;
  y: number;
  fielderPosition?: string;
  fielderName?: string;
  isWebGem?: boolean;
  isFailedWebGem?: boolean;
  isFoulTerritory?: boolean;
  isHomeRun?: boolean;
  homeRunDistance?: number;
}

interface PlayLocationOverlayProps {
  playType: 'hit' | 'out';
  outcomeType: string; // '1B', '2B', 'GO', 'FO', etc.
  onComplete: (data: PlayLocationData) => void;
  onSkip: () => void;
  onClose: () => void;
  fieldPositions: Array<{ name: string; position: string; number: string }>;
}

interface DraggableFielderProps {
  name: string;
  position: string;
  number: string;
  onPositionSelect: (position: string, name: string) => void;
}

const ItemTypes = {
  FIELDER: 'fielder',
  BASEBALL: 'baseball',
};

// Helper function to check if coordinates are in foul territory
function isInFoulTerritory(x: number, y: number): boolean {
  // Convert percentage coordinates to SVG coordinates (viewBox="0 0 400 300")
  const svgX = (x / 100) * 400;
  const svgY = (y / 100) * 300;
  
  // Foul lines go from home plate (200, 237) outward
  // Left foul line: to (0, 60)
  // Right foul line: to (400, 60)
  
  // Use cross product to determine which side of each line the point is on
  // For left foul line: Point A = (200, 237), Point B = (0, 60)
  // Cross product = (B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x)
  const leftLineCross = (0 - 200) * (svgY - 237) - (60 - 237) * (svgX - 200);
  // leftLineCross = -200 * (svgY - 237) - (-177) * (svgX - 200)
  // leftLineCross = 177 * (svgX - 200) - 200 * (svgY - 237)
  // Point is in fair territory if leftLineCross > 0 (to the right of left line)
  // Point is in foul territory if leftLineCross < 0 (to the left of left line)
  
  // For right foul line: Point A = (200, 237), Point B = (400, 60)
  const rightLineCross = (400 - 200) * (svgY - 237) - (60 - 237) * (svgX - 200);
  // rightLineCross = 200 * (svgY - 237) - (-177) * (svgX - 200)
  // rightLineCross = 177 * (svgX - 200) + 200 * (svgY - 237)
  // Point is in fair territory if rightLineCross < 0 (to the left of right line)
  // Point is in foul territory if rightLineCross > 0 (to the right of right line)
  
  // Point is in FOUL territory if it's outside either foul line
  return leftLineCross < 0 || rightLineCross > 0;
}

// Helper function to check if ball cleared the outfield fence
function isBeyondFence(x: number, y: number): boolean {
  // Convert percentage coordinates to SVG coordinates (viewBox="0 0 400 300")
  const svgX = (x / 100) * 400;
  const svgY = (y / 100) * 300;
  
  // Outfield fence: M 0 60 Q 200 9.72 400 60
  // The fence is a quadratic curve from (0, 60) to (400, 60) with peak at (200, 9.72)
  // Using parabolic approximation centered at x=200
  // Parabola: y = a(x - 200)^2 + 9.72
  // When x=0: 60 = a(0 - 200)^2 + 9.72 => 60 = a(40000) + 9.72 => a = 50.28/40000 ≈ 0.001257
  
  const a = 0.001257;
  const fenceYAtX = a * Math.pow(svgX - 200, 2) + 9.72;
  
  // Ball cleared fence if its y is less than the fence y at that x position
  // Check if x is within the fence bounds (between 0 and 400)
  if (svgX < 0 || svgX > 400) {
    return false; // Outside fence boundaries
  }
  
  return svgY < fenceYAtX;
}

function DraggableFielder({ name, position, number, onPositionSelect }: DraggableFielderProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.FIELDER,
    item: { name, position, number },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag as DndRef}
      onClick={() => onPositionSelect(position, name)}
      className={`bg-[#3366FF] border-[3px] border-white px-2 py-1 cursor-pointer hover:bg-[#5599FF] active:scale-95 transition-transform ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="text-[8px] text-white">{number}</div>
      <div className="text-[10px] text-white font-bold">{position}</div>
      <div className="text-[8px] text-white">{name}</div>
    </div>
  );
}

export function PlayLocationOverlay({
  playType,
  outcomeType,
  onComplete,
  onSkip,
  onClose,
  fieldPositions,
}: PlayLocationOverlayProps) {
  const [locationSelected, setLocationSelected] = useState(false);
  const [playLocation, setPlayLocation] = useState<{ x: number; y: number } | null>(null);
  const [selectedFielder, setSelectedFielder] = useState<{ position: string; name: string } | null>(null);
  const [showWebGemPrompt, setShowWebGemPrompt] = useState(false);
  const [showFailedWebGemPrompt, setShowFailedWebGemPrompt] = useState(false);
  const [showHomeRunPrompt, setShowHomeRunPrompt] = useState(false);
  const [homeRunDistance, setHomeRunDistance] = useState<string>('');

  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.FIELDER, ItemTypes.BASEBALL],
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset();
      const fieldElement = document.getElementById('play-location-field');
      if (offset && fieldElement) {
        const fieldRect = fieldElement.getBoundingClientRect();
        const x = ((offset.x - fieldRect.left) / fieldRect.width) * 100;
        const y = ((offset.y - fieldRect.top) / fieldRect.height) * 100;
        
        if (item.type === 'baseball') {
          // Baseball dropped for hit location
          setPlayLocation({ x, y });
          setLocationSelected(true);
          
          // Check if it's a home run (beyond fence)
          if (isBeyondFence(x, y) && !isInFoulTerritory(x, y)) {
            setShowHomeRunPrompt(true);
          } else {
            setShowFailedWebGemPrompt(true);
          }
        } else {
          // Fielder dropped for out location
          setPlayLocation({ x, y });
          setSelectedFielder({ position: item.position, name: item.name });
          setLocationSelected(true);
          setShowWebGemPrompt(true);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleFieldClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (locationSelected) return;

    const fieldElement = e.currentTarget;
    const rect = fieldElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPlayLocation({ x, y });

    if (playType === 'hit') {
      setLocationSelected(true);
      
      // Check if it's a home run (beyond fence)
      if (isBeyondFence(x, y) && !isInFoulTerritory(x, y)) {
        setShowHomeRunPrompt(true);
      } else {
        setShowFailedWebGemPrompt(true);
      }
    }
  };

  const handleFielderSelect = (position: string, name: string) => {
    if (!playLocation) return;
    setSelectedFielder({ position, name });
    setLocationSelected(true);
    setShowWebGemPrompt(true);
  };

  const handleWebGemResponse = (isWebGem: boolean) => {
    if (!playLocation) return;

    onComplete({
      x: playLocation.x,
      y: playLocation.y,
      fielderPosition: selectedFielder?.position,
      fielderName: selectedFielder?.name,
      isWebGem,
      isFoulTerritory: isInFoulTerritory(playLocation.x, playLocation.y),
    });
  };

  const handleFailedWebGemResponse = (fielderPosition?: string, fielderName?: string) => {
    if (!playLocation) return;

    onComplete({
      x: playLocation.x,
      y: playLocation.y,
      fielderPosition,
      fielderName,
      isFailedWebGem: !!fielderPosition,
      isFoulTerritory: isInFoulTerritory(playLocation.x, playLocation.y),
    });
  };

  const handleHomeRunDistanceSubmit = () => {
    if (!playLocation) return;
    
    const distance = parseInt(homeRunDistance);
    if (isNaN(distance) || distance < 250 || distance > 600) {
      alert('Please enter a valid distance between 250-600 feet');
      return;
    }

    onComplete({
      x: playLocation.x,
      y: playLocation.y,
      isHomeRun: true,
      homeRunDistance: distance,
      isFoulTerritory: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 overflow-y-auto py-4">
      <div className="w-full max-w-4xl mx-4">
        {/* Header */}
        <div className="bg-[#DD0000] border-[4px] border-white p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white font-bold">
              {playType === 'hit' ? '⚾ WHERE DID THE BALL LAND?' : '🥎 WHERE WAS THE OUT MADE?'}
            </div>
            <button
              onClick={onSkip}
              className="bg-white text-[#DD0000] px-3 py-1 text-xs font-bold hover:bg-gray-200 active:scale-95 transition-transform"
            >
              SKIP ✕
            </button>
          </div>
        </div>

        {/* Field */}
        <div
          ref={drop as DndRef}
          id="play-location-field"
          className={`bg-[#3366FF] border-[6px] border-white p-2 relative ${
            isOver ? 'border-[#FF0000]' : ''
          }`}
          style={{ aspectRatio: "4/3" }}
        >
          <div
            className={`bg-[#0066FF] relative w-full h-full ${locationSelected ? 'cursor-default' : 'cursor-crosshair'}`}
            onClick={handleFieldClick}
          >
            {/* Baseball diamond - same SVG as main field */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300">
              {/* Outfield grass */}
              <rect x="0" y="0" width="400" height="300" fill="#0a8030" />
              
              {/* Warning track / stands area beyond fence - retro brown */}
              <path
                d="M 0 0 L 0 60 Q 200 9.72 400 60 L 400 0 Z"
                fill="#5C3A2E"
              />
              
              {/* Infield dirt - simple diamond, hugging foul lines */}
              <path
                d="M 200 237 L 267 178 L 200 119 L 133 178 Z"
                fill="#A86432"
                stroke="#654321"
                strokeWidth="2"
              />
              
              {/* Foul lines - closer to home plate */}
              <line x1="200" y1="237" x2="0" y2="60" stroke="white" strokeWidth="2" opacity="0.5" />
              <line x1="200" y1="237" x2="400" y2="60" stroke="white" strokeWidth="2" opacity="0.5" />
              
              {/* Outfield fence - center 10% deeper, corners 5% shorter, extending into foul territory */}
              <path
                d="M 0 60 Q 200 9.72 400 60"
                stroke="#C4A853"
                strokeWidth="3"
                fill="none"
                opacity="0.9"
              />
              
              {/* Bases - 33% smaller positions */}
              <rect x="195" y="232" width="10" height="10" fill="white" transform="rotate(45 200 237)" />
              <rect x="262" y="173" width="8" height="8" fill="white" transform="rotate(45 267 178)" />
              <rect x="195" y="114" width="8" height="8" fill="white" transform="rotate(45 200 119)" />
              <rect x="128" y="173" width="8" height="8" fill="white" transform="rotate(45 133 178)" />
              
              {/* Pitcher's mound - equidistant between 1st and 3rd */}
              <circle cx="200" cy="178" r="10" fill="#654321" stroke="#4a3219" strokeWidth="2" />
              <circle cx="200" cy="178" r="5" fill="#A86432" />
              
              {/* Pitcher's rubber */}
              <rect x="194" y="177" width="12" height="2" fill="white" />
            </svg>

            {/* Show draggable baseball for hits */}
            {/* Removed baseball drag icon */}

            {/* Show play location marker */}
            {playLocation && (
              <>
                <div
                  className="absolute w-6 h-6 -ml-3 -mt-3 pointer-events-none z-50"
                  style={{
                    left: `${playLocation.x}%`,
                    top: `${playLocation.y}%`,
                  }}
                >
                  <div className="relative">
                    <div className={`absolute inset-0 ${
                      isBeyondFence(playLocation.x, playLocation.y) && !isInFoulTerritory(playLocation.x, playLocation.y)
                        ? 'bg-[#00AA00]'
                        : isInFoulTerritory(playLocation.x, playLocation.y)
                        ? 'bg-[#CC44CC]'
                        : 'bg-[#FF0000]'
                    } rounded-full animate-ping opacity-75`}></div>
                    <div className={`relative ${
                      isBeyondFence(playLocation.x, playLocation.y) && !isInFoulTerritory(playLocation.x, playLocation.y)
                        ? 'bg-[#00AA00]'
                        : isInFoulTerritory(playLocation.x, playLocation.y)
                        ? 'bg-[#CC44CC]'
                        : 'bg-[#FF0000]'
                    } border-[3px] border-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg`}>
                      <div className="text-xs">{isBeyondFence(playLocation.x, playLocation.y) && !isInFoulTerritory(playLocation.x, playLocation.y) ? '💥' : '✓'}</div>
                    </div>
                  </div>
                </div>
                
                {/* Home Run indicator */}
                {isBeyondFence(playLocation.x, playLocation.y) && !isInFoulTerritory(playLocation.x, playLocation.y) && (
                  <div
                    className="absolute pointer-events-none z-50"
                    style={{
                      left: `${playLocation.x}%`,
                      top: `${playLocation.y}%`,
                      transform: 'translate(-50%, -200%)',
                    }}
                  >
                    <div className="bg-[#00AA00] border-[3px] border-white px-2 py-1 shadow-lg">
                      <div className="text-[9px] text-white font-bold whitespace-nowrap">
                        🎆 HOME RUN! 🎆
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Foul territory indicator */}
                {isInFoulTerritory(playLocation.x, playLocation.y) && (
                  <div
                    className="absolute pointer-events-none z-50"
                    style={{
                      left: `${playLocation.x}%`,
                      top: `${playLocation.y}%`,
                      transform: 'translate(-50%, -200%)',
                    }}
                  >
                    <div className="bg-[#CC44CC] border-[3px] border-white px-2 py-1 shadow-lg">
                      <div className="text-[9px] text-white font-bold whitespace-nowrap">
                        FOUL TERRITORY
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Instruction text */}
            {!locationSelected && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 border-[3px] border-white px-4 py-2 pointer-events-none">
                <div className="text-[10px] text-white text-center">
                  {playType === 'hit' ? 'DRAG BALL OR CLICK LOCATION' : 'CLICK LOCATION OR SELECT FIELDER BELOW'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fielder selection for outs */}
        {playType === 'out' && !locationSelected && (
          <div className="bg-[#3366FF] border-[4px] border-white p-3 mt-2">
            <div className="text-[8px] text-white font-bold mb-2">SELECT FIELDER WHO MADE THE PLAY:</div>
            <div className="grid grid-cols-9 gap-1">
              {fieldPositions.map((fp) => (
                <DraggableFielder
                  key={fp.number}
                  name={fp.name}
                  position={fp.position}
                  number={fp.number}
                  onPositionSelect={handleFielderSelect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Web Gem Prompt (for outs) */}
        {showWebGemPrompt && selectedFielder && (
          <div className="bg-[#7733DD] border-[4px] border-white p-4 mt-2">
            <div className="text-xs text-white font-bold mb-3 text-center">
              WAS THIS A WEB GEM? (EXCITING DEFENSIVE PLAY)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleWebGemResponse(true)}
                className="bg-[#00AA00] border-[4px] border-white text-white text-sm py-3 font-bold hover:bg-[#00CC00] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                ✓ YES - WEB GEM!
              </button>
              <button
                onClick={() => handleWebGemResponse(false)}
                className="bg-[#DD0000] border-[4px] border-white text-white text-sm py-3 font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                ✕ NO - ROUTINE
              </button>
            </div>
          </div>
        )}

        {/* Home Run Distance Prompt */}
        {showHomeRunPrompt && (
          <div className="bg-[#00AA00] border-[4px] border-white p-4 mt-2">
            <div className="text-sm text-white font-bold mb-3 text-center">
              🎆 HOME RUN! 🎆
            </div>
            <div className="text-xs text-white font-bold mb-3 text-center">
              HOW FAR DID IT GO?
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={homeRunDistance}
                  onChange={(e) => setHomeRunDistance(e.target.value)}
                  placeholder="Enter distance"
                  min="250"
                  max="600"
                  className="flex-1 bg-white border-[3px] border-[#DD0000] px-3 py-2 text-black text-sm font-bold text-center"
                  autoFocus
                />
                <div className="text-white font-bold text-sm">FEET</div>
              </div>
              
              {/* Quick distance buttons */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => setHomeRunDistance('320')}
                  className="bg-[#3366FF] border-[3px] border-white text-white text-xs py-2 font-bold hover:bg-[#5599FF] active:scale-95 transition-transform"
                >
                  320'
                </button>
                <button
                  onClick={() => setHomeRunDistance('360')}
                  className="bg-[#3366FF] border-[3px] border-white text-white text-xs py-2 font-bold hover:bg-[#5599FF] active:scale-95 transition-transform"
                >
                  360'
                </button>
                <button
                  onClick={() => setHomeRunDistance('400')}
                  className="bg-[#3366FF] border-[3px] border-white text-white text-xs py-2 font-bold hover:bg-[#5599FF] active:scale-95 transition-transform"
                >
                  400'
                </button>
                <button
                  onClick={() => setHomeRunDistance('450')}
                  className="bg-[#3366FF] border-[3px] border-white text-white text-xs py-2 font-bold hover:bg-[#5599FF] active:scale-95 transition-transform"
                >
                  450'
                </button>
              </div>
              
              <button
                onClick={handleHomeRunDistanceSubmit}
                disabled={!homeRunDistance}
                className="w-full bg-[#DD0000] border-[4px] border-white text-white text-sm py-3 font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ CONFIRM HOME RUN
              </button>
            </div>
          </div>
        )}

        {/* Failed Web Gem Prompt (for hits) */}
        {showFailedWebGemPrompt && (
          <div className="bg-[#7733DD] border-[4px] border-white p-4 mt-2">
            <div className="text-xs text-white font-bold mb-3 text-center">
              DID A FIELDER MAKE A FAILED WEB GEM ATTEMPT?
            </div>
            
            {!selectedFielder ? (
              <>
                <div className="grid grid-cols-9 gap-1 mb-2">
                  {fieldPositions.map((fp) => (
                    <button
                      key={fp.number}
                      onClick={() => {
                        setSelectedFielder({ position: fp.position, name: fp.name });
                      }}
                      className="bg-[#3366FF] border-[3px] border-white px-2 py-1 hover:bg-[#5599FF] active:scale-95 transition-transform"
                    >
                      <div className="text-[8px] text-white">{fp.number}</div>
                      <div className="text-[10px] text-white font-bold">{fp.position}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleFailedWebGemResponse()}
                  className="w-full bg-[#DD0000] border-[4px] border-white text-white text-sm py-3 font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  NO FAILED WEB GEM
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="bg-[#3366FF] border-[3px] border-white p-2 text-center">
                  <div className="text-sm text-white font-bold">
                    {selectedFielder.position} - {selectedFielder.name}
                  </div>
                  <div className="text-[8px] text-white">FAILED WEB GEM ATTEMPT</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleFailedWebGemResponse(selectedFielder.position, selectedFielder.name)}
                    className="bg-[#00AA00] border-[4px] border-white text-white text-sm py-3 font-bold hover:bg-[#00CC00] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  >
                    ✓ CONFIRM
                  </button>
                  <button
                    onClick={() => setSelectedFielder(null)}
                    className="bg-[#DD0000] border-[4px] border-white text-white text-sm py-3 font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  >
                    ✕ CHANGE
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}