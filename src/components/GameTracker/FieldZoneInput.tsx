/**
 * FieldZoneInput - Interactive 25-zone baseball field for batted ball location input
 * Per FIELD_ZONE_INPUT_SPEC.md
 *
 * Landscape-oriented layout: SVG field on left, zone info + fielder on right
 * Designed for horizontal use (iPad-friendly)
 */

import { useState, useRef, useCallback } from 'react';
import type { Position, BatterHand } from '../../types/game';
import {
  FIELD_ZONES,
  ZONE_POLYGONS,
  ZONE_CENTERS,
  AREA_COLORS,
  QUICK_TAP_BUTTONS,
  getZoneData,
  getFielderSuggestions,
  resolveZoneAtPoint,
  type ZoneTapResult,
} from '../../data/fieldZones';

// ============================================
// PROPS
// ============================================

interface FieldZoneInputProps {
  batterHand: BatterHand;
  onZoneSelect: (result: ZoneTapResult, fielder: Position) => void;
  selectedZone?: string | null;
  disabled?: boolean;
}

// ============================================
// POSITION LABELS FOR FIELD MARKERS
// ============================================

const POSITION_MARKERS: { pos: string; x: number; y: number }[] = [
  { pos: 'P', x: 50, y: 63 },
  { pos: 'C', x: 50, y: 85 },
  { pos: '1B', x: 65, y: 65 },
  { pos: '2B', x: 55, y: 51 },
  { pos: 'SS', x: 44, y: 51 },
  { pos: '3B', x: 35, y: 65 },
  { pos: 'LF', x: 22, y: 42 },
  { pos: 'CF', x: 50, y: 30 },
  { pos: 'RF', x: 78, y: 42 },
];

// ============================================
// COMPONENT
// ============================================

export default function FieldZoneInput({
  batterHand,
  onZoneSelect,
  selectedZone: externalSelectedZone,
  disabled = false,
}: FieldZoneInputProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(externalSelectedZone || null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedFielder, setSelectedFielder] = useState<Position | null>(null);
  const [fielderOverridden, setFielderOverridden] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Derive zone data
  const zoneData = selectedZone ? getZoneData(selectedZone, batterHand) : null;
  const suggestions = selectedZone ? getFielderSuggestions(selectedZone) : [];
  const activeFielder = selectedFielder || zoneData?.likelyFielder || null;

  // ============================================
  // SVG TAP HANDLING
  // ============================================

  const getSVGPoint = useCallback((event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in event) {
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y };
  }, []);

  const handleFieldTap = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    event.preventDefault();

    const point = getSVGPoint(event);
    if (!point) return;

    const zoneId = resolveZoneAtPoint(point);
    selectZone(zoneId);
  }, [disabled, getSVGPoint, batterHand]);

  const selectZone = useCallback((zoneId: string) => {
    setSelectedZone(zoneId);
    const zone = FIELD_ZONES[zoneId];
    if (zone) {
      setSelectedFielder(zone.position);
      setFielderOverridden(false);
    }
  }, []);

  const handleFielderOverride = useCallback((pos: Position) => {
    setSelectedFielder(pos);
    setFielderOverridden(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedZone || !activeFielder) return;
    const data = getZoneData(selectedZone, batterHand);
    onZoneSelect(data, activeFielder);
  }, [selectedZone, activeFielder, batterHand, onZoneSelect]);

  const handleQuickTap = useCallback((zoneId: string) => {
    if (disabled) return;
    selectZone(zoneId);
  }, [disabled, selectZone]);

  // ============================================
  // ZONE VISUAL STATE
  // ============================================

  const getZoneFill = (zoneId: string): string => {
    const zone = FIELD_ZONES[zoneId];
    if (!zone) return 'transparent';

    if (selectedZone === zoneId) {
      return 'rgba(255, 200, 50, 0.5)';
    }
    if (hoveredZone === zoneId) {
      return AREA_COLORS[zone.area].highlight + '66';
    }
    return AREA_COLORS[zone.area].base + '44';
  };

  const getZoneStroke = (zoneId: string): string => {
    if (selectedZone === zoneId) return '#ffcc33';
    if (hoveredZone === zoneId) return '#6699ff';
    const zone = FIELD_ZONES[zoneId];
    return zone?.isFoul ? '#555' : '#3a6b35';
  };

  const getZoneStrokeWidth = (zoneId: string): number => {
    if (selectedZone === zoneId) return 2;
    if (hoveredZone === zoneId) return 1.5;
    return 0.5;
  };

  const allPositions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

  // ============================================
  // RENDER - LANDSCAPE LAYOUT
  // ============================================

  return (
    <div className="w-full">
      {/* Main horizontal layout: Field left, Controls right */}
      <div className="flex gap-4 items-start">

        {/* LEFT: SVG Field (takes ~60% width) */}
        <div className="flex-1 min-w-0">
          {/* Instruction */}
          <div className="text-center mb-2">
            <span className="font-pixel text-[0.55rem] text-retro-gold tracking-wider">
              TAP WHERE BALL LANDED
            </span>
          </div>

          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            className="w-full border-2 border-retro-navy shadow-retro rounded-sm"
            style={{
              backgroundColor: '#1a3d1a',
              touchAction: 'none',
              cursor: disabled ? 'not-allowed' : 'crosshair',
            }}
            onClick={handleFieldTap}
            onTouchStart={handleFieldTap}
          >
            {/* Foul lines */}
            <line x1="50" y1="95" x2="0" y2="5" stroke="#fff" strokeWidth="0.3" opacity="0.4" />
            <line x1="50" y1="95" x2="100" y2="5" stroke="#fff" strokeWidth="0.3" opacity="0.4" />

            {/* Zone polygons */}
            {Object.entries(ZONE_POLYGONS).map(([zoneId, path]) => (
              <path
                key={zoneId}
                d={path}
                fill={getZoneFill(zoneId)}
                stroke={getZoneStroke(zoneId)}
                strokeWidth={getZoneStrokeWidth(zoneId)}
                onMouseEnter={() => !disabled && setHoveredZone(zoneId)}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
            ))}

            {/* Home plate diamond */}
            <polygon points="50,78 48,80 50,82 52,80" fill="#fff" stroke="#333" strokeWidth="0.3" />

            {/* Base paths */}
            <line x1="50" y1="78" x2="65" y2="68" stroke="#fff" strokeWidth="0.3" opacity="0.3" />
            <line x1="65" y1="68" x2="50" y2="54" stroke="#fff" strokeWidth="0.3" opacity="0.3" />
            <line x1="50" y1="54" x2="35" y2="68" stroke="#fff" strokeWidth="0.3" opacity="0.3" />
            <line x1="35" y1="68" x2="50" y2="78" stroke="#fff" strokeWidth="0.3" opacity="0.3" />

            {/* Bases */}
            <rect x="64" y="67" width="2.5" height="2.5" fill="#fff" transform="rotate(45 65.25 68.25)" />
            <rect x="49" y="53" width="2.5" height="2.5" fill="#fff" transform="rotate(45 50.25 54.25)" />
            <rect x="34" y="67" width="2.5" height="2.5" fill="#fff" transform="rotate(45 35.25 68.25)" />

            {/* Outfield arc (warning track) */}
            <path d="M 5,32 Q 50,0 95,32" fill="none" stroke="#fff" strokeWidth="0.3" opacity="0.2" />

            {/* Position markers */}
            {POSITION_MARKERS.map(({ pos, x, y }) => (
              <g key={pos}>
                <circle cx={x} cy={y} r="3.5" fill="rgba(0,0,0,0.6)" stroke="#fff" strokeWidth="0.4" />
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="2.8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {pos}
                </text>
              </g>
            ))}

            {/* Selected zone center dot */}
            {selectedZone && ZONE_CENTERS[selectedZone] && (
              <circle
                cx={ZONE_CENTERS[selectedZone].x}
                cy={ZONE_CENTERS[selectedZone].y}
                r="2.5"
                fill="#ffcc33"
                stroke="#fff"
                strokeWidth="0.5"
              >
                <animate attributeName="r" values="2.5;3.5;2.5" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>

          {/* Quick Tap Buttons - below field */}
          <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
            {QUICK_TAP_BUTTONS.map(btn => (
              <button
                key={btn.id}
                className={`px-2 py-1 text-[0.5rem] font-pixel border-2 shadow-retro-sm transition-colors
                  ${selectedZone === btn.zone
                    ? 'bg-retro-gold text-retro-navy border-retro-gold-dark'
                    : 'bg-retro-navy text-white border-retro-blue-dark hover:bg-retro-blue'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => btn.zone && handleQuickTap(btn.zone)}
                disabled={disabled}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Zone Info + Fielder Panel (~40% width) */}
        <div className="w-[180px] flex-shrink-0">
          {selectedZone && zoneData ? (
            <div className="border-2 border-retro-blue bg-white shadow-retro-sm">
              {/* Zone info header */}
              <div className="bg-retro-blue px-2 py-1.5 flex items-center justify-between">
                <span className="font-pixel text-white text-[0.5rem] truncate">
                  {zoneData.zoneName}
                </span>
                {zoneData.isFoul && (
                  <span className="font-pixel text-[0.45rem] bg-retro-red text-white px-1.5 py-0.5 rounded-sm ml-1">
                    FOUL
                  </span>
                )}
              </div>

              <div className="p-2">
                {/* Zone details */}
                <div className="text-[0.6rem] text-gray-500 mb-2 space-y-0.5">
                  <div>Depth: <strong className="text-retro-navy">{zoneData.depth}</strong></div>
                  <div>Area: <strong className="text-retro-navy">{zoneData.area.replace(/_/g, ' ')}</strong></div>
                </div>

                {/* Fielder label */}
                <div className="text-[0.5rem] text-gray-500 uppercase tracking-wider mb-1 font-pixel">
                  FIELDER: <span className="text-retro-blue">{activeFielder}</span>
                  {!fielderOverridden && (
                    <span className="text-retro-green-bright ml-1">(auto)</span>
                  )}
                </div>

                {/* Fielder chips - compact grid */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {allPositions.map(pos => {
                    const isSuggested = suggestions.includes(pos);
                    const isSelected = activeFielder === pos;
                    return (
                      <button
                        key={pos}
                        className={`px-1 py-0.5 text-[0.55rem] font-bold border transition-colors text-center
                          ${isSelected
                            ? 'bg-retro-green text-white border-retro-green-dark'
                            : isSuggested
                              ? 'bg-retro-cream border-retro-blue text-retro-blue hover:bg-retro-blue hover:text-white'
                              : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                          }
                        `}
                        onClick={() => handleFielderOverride(pos)}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>

                {/* Confirm button */}
                <button
                  className="w-full py-2 font-pixel text-[0.5rem] bg-retro-green text-white border-2 border-retro-green-dark shadow-retro-sm hover:bg-retro-green-bright transition-colors"
                  onClick={handleConfirm}
                >
                  CONFIRM ZONE
                </button>
              </div>
            </div>
          ) : (
            /* Empty state - no zone selected */
            <div className="border-2 border-dashed border-gray-600 bg-gray-900/50 p-4 text-center rounded-sm">
              <div className="text-gray-500 text-xs mb-1">No zone selected</div>
              <div className="text-gray-600 text-[0.6rem]">
                Tap the field or use a quick button
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
