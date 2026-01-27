import { useState, useEffect } from 'react';
import type {
  Position,
  AtBatResult,
  Direction,
  ExitType,
  Bases,
  PlayType,
  ErrorType,
  D3KOutcome,
  DepthType,
  AssistType,
  DPRole,
  ErrorContext,
  AssistChainEntry,
  FieldingData,
  BatterHand,
} from '../../types/game';
import { recordFieldingEvent, type FieldingEvent } from '../../engines/adaptiveLearningEngine';
import FieldZoneInput from './FieldZoneInput';
import { type ZoneTapResult, getDepthFromZone } from '../../data/fieldZones';

// Re-export types for consumers that import from FieldingModal
export type { PlayType, ErrorType, D3KOutcome, DepthType, AssistType, DPRole, ErrorContext, AssistChainEntry, FieldingData };

// ============================================
// ADAPTIVE LEARNING INTEGRATION
// Per adaptiveLearningEngine - record fielding events for inference improvement
// ============================================

/**
 * Build a hitZone string from direction and depth for adaptive learning.
 * Examples: 'CF-deep', 'SS-hole', 'LF-line'
 */
function buildHitZone(direction: Direction | null, depth: DepthType | null, position: Position): string {
  if (!direction) return `${position}-range`;

  const directionMap: Record<Direction, string> = {
    'Left': 'LF',
    'Left-Center': 'LC',
    'Center': 'CF',
    'Right-Center': 'RC',
    'Right': 'RF',
  };

  const depthSuffix = depth ? `-${depth}` : '';
  return `${directionMap[direction]}${depthSuffix}`;
}

/**
 * Record a fielding event for adaptive learning.
 * Call this from the parent component after fielding modal completes.
 */
export function recordFieldingForLearning(
  gameId: string,
  fielderId: string,
  inferredFielder: Position | null,
  actualFielder: Position,
  direction: Direction | null,
  depth: DepthType | null
): void {
  const hitZone = buildHitZone(direction, depth, actualFielder);

  const event: FieldingEvent = {
    eventId: `${gameId}_${Date.now()}`,
    gameId,
    hitZone,
    predictedFielder: inferredFielder || actualFielder,
    actualFielder,
    playerId: fielderId,
    position: actualFielder,
    timestamp: Date.now(),
  };

  recordFieldingEvent(event);
}

// ============================================
// FIELDER INFERENCE MATRICES
// Per FIELDING_SYSTEM_SPEC.md Section 4
// ============================================

type InferenceResult = { primary: Position; secondary?: Position; tertiary?: Position };

const GROUND_BALL_INFERENCE: Record<Direction, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS', tertiary: 'P' },
  'Left-Center': { primary: 'SS', secondary: '3B', tertiary: '2B' },
  'Center': { primary: 'P', secondary: 'SS', tertiary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B', tertiary: 'SS' },
  'Right': { primary: '1B', secondary: '2B', tertiary: 'P' },
};

const FLY_BALL_INFERENCE: Record<Direction, InferenceResult> = {
  'Left': { primary: 'LF', secondary: 'CF', tertiary: '3B' },
  'Left-Center': { primary: 'CF', secondary: 'LF', tertiary: 'SS' },
  'Center': { primary: 'CF' },
  'Right-Center': { primary: 'CF', secondary: 'RF', tertiary: '2B' },
  'Right': { primary: 'RF', secondary: 'CF', tertiary: '1B' },
};

const LINE_DRIVE_INFERENCE: Record<Direction, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'LF' },
  'Left-Center': { primary: 'SS', secondary: 'CF' },
  'Center': { primary: 'P', secondary: 'CF' },
  'Right-Center': { primary: '2B', secondary: 'CF' },
  'Right': { primary: '1B', secondary: 'RF' },
};

const POP_FLY_INFERENCE: Record<Direction, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS' },
  'Left-Center': { primary: 'SS', secondary: '3B' },
  'Center': { primary: 'SS', secondary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B' },
  'Right': { primary: '1B', secondary: '2B' },
};

// DP Chain defaults by direction
const DP_CHAINS: Record<Direction, string> = {
  'Left': '5-4-3',
  'Left-Center': '6-4-3',
  'Center': '6-4-3',
  'Right-Center': '4-6-3',
  'Right': '3-6-3',
};

// ============================================
// INFERENCE FUNCTION
// ============================================

export function inferFielderEnhanced(
  result: AtBatResult,
  direction: Direction | null,
  exitType?: ExitType | null
): Position | null {
  if (!direction) return null;

  // Map result + exit type to batted ball type
  let inference: InferenceResult | null = null;

  // For hits, use exit type first if available
  if (['1B', '2B', '3B'].includes(result) && exitType) {
    if (exitType === 'Ground') {
      inference = GROUND_BALL_INFERENCE[direction];
    } else if (exitType === 'Line Drive') {
      inference = LINE_DRIVE_INFERENCE[direction];
    } else if (exitType === 'Fly Ball') {
      inference = FLY_BALL_INFERENCE[direction];
    } else if (exitType === 'Pop Up') {
      inference = POP_FLY_INFERENCE[direction];
    }
  }
  // Ground balls (by result)
  else if (['GO', 'DP', 'FC', 'SAC'].includes(result) || exitType === 'Ground') {
    inference = GROUND_BALL_INFERENCE[direction];
  }
  // Fly balls (by result)
  else if (['FO', 'SF'].includes(result) || exitType === 'Fly Ball') {
    inference = FLY_BALL_INFERENCE[direction];
  }
  // Line drives (by result)
  else if (result === 'LO' || exitType === 'Line Drive') {
    inference = LINE_DRIVE_INFERENCE[direction];
  }
  // Pop flies (by result)
  else if (result === 'PO' || exitType === 'Pop Up') {
    inference = POP_FLY_INFERENCE[direction];
  }

  return inference?.primary || null;
}

// ============================================
// COMPONENT PROPS
// ============================================

interface FieldingModalProps {
  result: AtBatResult;
  direction: Direction | null;
  exitType: ExitType | null;  // Optional: if not provided, will be inferred or selected in modal
  bases: Bases;
  outs: number;
  batterHand?: BatterHand;  // For zone-based input (defaults to 'R')
  onComplete: (fieldingData: FieldingData, selectedExitType?: ExitType) => void;
  onCancel: () => void;
}

// Infer exit type from result for deterministic cases
function inferExitType(result: AtBatResult): ExitType | null {
  switch (result) {
    case 'GO':
    case 'DP':
    case 'FC':
      return 'Ground';
    case 'FO':
    case 'SF':
      return 'Fly Ball';
    case 'LO':
      return 'Line Drive';
    case 'PO':
      return 'Pop Up';
    default:
      return null; // Hits (1B, 2B, 3B) and errors need user selection
  }
}

const EXIT_TYPES: ExitType[] = ['Ground', 'Line Drive', 'Fly Ball', 'Pop Up'];

// ============================================
// COMPONENT
// ============================================

export default function FieldingModal({
  result,
  direction,
  exitType: propExitType,
  bases,
  outs,
  batterHand = 'R',
  onComplete,
  onCancel,
}: FieldingModalProps) {
  // Exit type: use prop, or infer from result, or let user select
  const inferredExitType = inferExitType(result);
  const initialExitType = propExitType ?? inferredExitType;
  const [selectedExitType, setSelectedExitType] = useState<ExitType | null>(initialExitType);

  // Show exit type selector only for hits (1B, 2B, 3B) where it's not deterministic
  const needsExitTypeSelection = ['1B', '2B', '3B'].includes(result) && !propExitType;

  // Use the effective exit type for fielder inference
  const effectiveExitType = selectedExitType ?? propExitType ?? inferredExitType;

  // Inferred fielder (calculated once)
  const inferredFielder = inferFielderEnhanced(result, direction, effectiveExitType);

  // Zone-based input state (FIELD_ZONE_INPUT_SPEC.md)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // State
  const [primaryFielder, setPrimaryFielder] = useState<Position | null>(inferredFielder);
  const [playType, setPlayType] = useState<PlayType>('routine');
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [dpChain, setDpChain] = useState<string | null>(result === 'DP' && direction ? DP_CHAINS[direction] : null);
  const [savedRun, setSavedRun] = useState(false);

  // New Day 4 fields
  const [depth, setDepth] = useState<DepthType | null>(null);
  const [dpRole, setDpRole] = useState<DPRole | null>(null);
  const [errorContext, setErrorContext] = useState<ErrorContext>({
    allowedRun: false,
    wasRoutine: false,
    wasDifficult: false,
  });

  // Edge cases
  const [infieldFlyRule, setInfieldFlyRule] = useState(false);
  const [ifrBallCaught, setIfrBallCaught] = useState<boolean | null>(null);
  const [groundRuleDouble, setGroundRuleDouble] = useState(false);
  const [badHopEvent, setBadHopEvent] = useState(false);

  // D3K
  const [d3kOutcome, setD3kOutcome] = useState<D3KOutcome | null>(null);

  // SMB4 specific
  const [nutshotEvent, setNutshotEvent] = useState(false);
  const [comebackerInjury, setComebackerInjury] = useState(false);
  const [robberyAttempted, setRobberyAttempted] = useState(false);
  const [robberyFailed, setRobberyFailed] = useState(false);

  // Update inferred fielder when exit type changes
  useEffect(() => {
    const newInferred = inferFielderEnhanced(result, direction, effectiveExitType);
    if (newInferred && !primaryFielder) {
      setPrimaryFielder(newInferred);
    }
  }, [result, direction, effectiveExitType]);

  // Track whether the selected zone is in foul territory
  const [isFoulZone, setIsFoulZone] = useState(false);

  // Handle zone selection from FieldZoneInput
  const handleZoneSelect = (zoneResult: ZoneTapResult, fielder: Position) => {
    setSelectedZoneId(zoneResult.zoneId);
    setPrimaryFielder(fielder);
    setIsFoulZone(zoneResult.isFoul);

    // Map zone depth to FieldingModal DepthType
    const zoneDepthStr = zoneResult.depth;
    const depthMap: Record<string, DepthType> = {
      'infield': 'infield',
      'shallow': 'shallow',
      'medium': 'outfield',
      'deep': 'deep',
      'foul_shallow': 'shallow',
      'foul_medium': 'outfield',
      'foul_deep': 'deep',
      'foul_catcher': 'shallow',
    };
    setDepth(depthMap[zoneDepthStr] || null);
  };

  // ============================================
  // CONTEXTUAL VISIBILITY RULES
  // Per FIELDING_SYSTEM_SPEC.md Section 18
  // ============================================

  // Show IFR toggle when: PO/FO + R1&R2 or bases loaded + < 2 outs
  const showIFRToggle =
    ['PO', 'FO'].includes(result) &&
    outs < 2 &&
    ((!!bases.first && !!bases.second) || (!!bases.first && !!bases.second && !!bases.third));

  // Show GRD toggle when: Result = 2B
  const showGRDToggle = result === '2B';

  // Show Bad Hop toggle when: Result is a hit
  const showBadHopToggle = ['1B', '2B', '3B'].includes(result);

  // Show Nutshot toggle when: Direction = Center + ball in play
  const showNutshotToggle = direction === 'Center' && ['GO', 'LO', '1B'].includes(result);

  // Show Comebacker Injury when: Direction = Center + comebacker scenario
  const showComebackerInjury = direction === 'Center' && ['GO', 'LO'].includes(result);

  // Show Robbery options when: Result = HR
  const showRobberyToggle = result === 'HR';

  // Show D3K options when: Result = D3K
  const showD3KOptions = result === 'D3K';

  // Show DP chain when: Result = DP
  const showDPChain = result === 'DP';

  // Show star play options for outs
  const showPlayType = ['GO', 'FO', 'LO', 'PO'].includes(result);

  // Show error options when: Result = E (error)
  const showErrorOptions = result === 'E';

  // ============================================
  // POSITIONS FOR SELECTION
  // ============================================

  const positions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const dpTypes = ['6-4-3', '4-6-3', '5-4-3', '3-6-3', '6-3', '4-3', '1-6-3', '1-4-3', 'Other'];
  const playTypes: { value: PlayType; label: string }[] = [
    { value: 'routine', label: 'Routine' },
    { value: 'diving', label: 'Diving' },
    { value: 'leaping', label: 'Leaping' },
    { value: 'wall', label: 'Wall Catch' },
    { value: 'charging', label: 'Charging' },
    { value: 'running', label: 'Running' },
    { value: 'sliding', label: 'Sliding' },
    { value: 'over_shoulder', label: 'Over-shoulder' },
  ];
  const depthOptions: { value: DepthType; label: string }[] = [
    { value: 'shallow', label: 'Shallow' },
    { value: 'infield', label: 'Infield' },
    { value: 'outfield', label: 'Outfield' },
    { value: 'deep', label: 'Deep' },
  ];
  const dpRoleOptions: { value: DPRole; label: string }[] = [
    { value: 'started', label: 'Started' },
    { value: 'turned', label: 'Turned' },
    { value: 'completed', label: 'Completed' },
    { value: 'unassisted', label: 'Unassisted' },
  ];
  const errorTypeOptions: { value: ErrorType; label: string }[] = [
    { value: 'fielding', label: 'Fielding' },
    { value: 'throwing', label: 'Throwing' },
    { value: 'mental', label: 'Mental' },
    { value: 'missed_catch', label: 'Missed Catch' },
    { value: 'collision', label: 'Collision' },
  ];

  // ============================================
  // BUILD ASSIST CHAIN FROM DP STRING
  // ============================================

  const buildAssistChain = (dpString: string | null): AssistChainEntry[] => {
    if (!dpString || dpString === 'Other') return [];

    const posMap: Record<string, Position> = {
      '1': 'P', '2': 'C', '3': '1B', '4': '2B', '5': '3B', '6': 'SS', '7': 'LF', '8': 'CF', '9': 'RF'
    };

    // Determine assist type based on position
    const getAssistType = (posNum: string): AssistType => {
      // Outfield positions: 7 (LF), 8 (CF), 9 (RF)
      if (['7', '8', '9'].includes(posNum)) return 'outfield';
      // Infield positions: 1-6
      return 'infield';
    };

    const parts = dpString.split('-');
    // All but last are assists, last is putout
    return parts.slice(0, -1).map(num => ({
      position: posMap[num],
      assistType: getAssistType(num),
    }));
  };

  const getPutoutFromDP = (dpString: string | null): Position => {
    if (!dpString || dpString === 'Other') return '1B'; // Default

    const posMap: Record<string, Position> = {
      '1': 'P', '2': 'C', '3': '1B', '4': '2B', '5': '3B', '6': 'SS', '7': 'LF', '8': 'CF', '9': 'RF'
    };

    const parts = dpString.split('-');
    return posMap[parts[parts.length - 1]] || '1B';
  };

  // ============================================
  // SUBMIT HANDLER
  // ============================================

  const handleSubmit = () => {
    if (!primaryFielder) return;

    const fieldingData: FieldingData = {
      primaryFielder,
      playType,
      errorType: playType === 'error' ? (errorType || 'fielding') : undefined,
      errorContext: playType === 'error' ? errorContext : undefined,

      // Zone-based input (FIELD_ZONE_INPUT_SPEC.md)
      zoneId: selectedZoneId || undefined,
      foulOut: isFoulZone && ['PO', 'FO', 'LO'].includes(result) ? true : undefined,

      // Depth (Day 4)
      depth: depth || undefined,

      assistChain: showDPChain ? buildAssistChain(dpChain) : [],
      putoutPosition: showDPChain ? getPutoutFromDP(dpChain) : primaryFielder,

      // DP Role (Day 4)
      dpRole: showDPChain ? (dpRole || undefined) : undefined,

      inferredFielder: inferredFielder || primaryFielder,
      wasOverridden: primaryFielder !== inferredFielder,

      infieldFlyRule,
      ifrBallCaught: infieldFlyRule ? ifrBallCaught : null,
      groundRuleDouble,
      badHopEvent,

      d3kEvent: result === 'D3K',
      d3kOutcome: showD3KOptions ? d3kOutcome : null,

      nutshotEvent,
      comebackerInjury,
      robberyAttempted,
      robberyFailed: robberyAttempted ? robberyFailed : false,

      savedRun,
    };

    // Pass the selected exit type back if it was selected in the modal
    onComplete(fieldingData, selectedExitType ?? undefined);
  };

  const canSubmit = (): boolean => {
    if (!primaryFielder) return false;
    if (showD3KOptions && !d3kOutcome) return false;
    if (infieldFlyRule && ifrBallCaught === null) return false;
    if (showDPChain && !dpChain) return false;
    // Require exit type selection for hits
    if (needsExitTypeSelection && !selectedExitType) return false;
    return true;
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>Fielding Details</span>
          <button style={styles.cancelBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Zone-Based Field Input (FIELD_ZONE_INPUT_SPEC.md) */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>WHERE DID THE BALL GO?</div>
          <FieldZoneInput
            batterHand={batterHand}
            onZoneSelect={handleZoneSelect}
            selectedZone={selectedZoneId}
          />
        </div>

        {/* Exit Type Selection (for hits only) */}
        {needsExitTypeSelection && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>HOW DID IT LEAVE THE BAT?</div>
            <div style={styles.buttonRow}>
              {EXIT_TYPES.map(type => (
                <button
                  key={type}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: selectedExitType === type ? '#4CAF50' : '#333',
                    color: selectedExitType === type ? '#000' : '#fff',
                  }}
                  onClick={() => setSelectedExitType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Primary Fielder Selection */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>
            FIELDED BY:
            {inferredFielder && primaryFielder === inferredFielder && (
              <span style={styles.inferred}> (inferred)</span>
            )}
          </div>
          <div style={styles.buttonRow}>
            {positions.map(pos => (
              <button
                key={pos}
                style={{
                  ...styles.posButton,
                  backgroundColor: primaryFielder === pos ? '#4CAF50' : '#333',
                  color: primaryFielder === pos ? '#000' : '#fff',
                }}
                onClick={() => setPrimaryFielder(pos)}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Depth Selection (Day 4) */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>DEPTH:</div>
          <div style={styles.buttonRow}>
            {depthOptions.map(d => (
              <button
                key={d.value}
                style={{
                  ...styles.optionButton,
                  backgroundColor: depth === d.value ? '#4CAF50' : '#333',
                  color: depth === d.value ? '#000' : '#fff',
                }}
                onClick={() => setDepth(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* DP Chain Selection */}
        {showDPChain && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>DP TYPE:</div>
            <div style={styles.buttonRow}>
              {dpTypes.map(type => (
                <button
                  key={type}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: dpChain === type ? '#4CAF50' : '#333',
                    color: dpChain === type ? '#000' : '#fff',
                  }}
                  onClick={() => setDpChain(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DP Role Selection (Day 4) */}
        {showDPChain && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>YOUR ROLE IN DP:</div>
            <div style={styles.buttonRow}>
              {dpRoleOptions.map(role => (
                <button
                  key={role.value}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: dpRole === role.value ? '#4CAF50' : '#333',
                    color: dpRole === role.value ? '#000' : '#fff',
                  }}
                  onClick={() => setDpRole(role.value)}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Play Type Selection */}
        {showPlayType && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>PLAY TYPE:</div>
            <div style={styles.buttonRow}>
              {playTypes.map(pt => (
                <button
                  key={pt.value}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: playType === pt.value ? '#4CAF50' : '#333',
                    color: playType === pt.value ? '#000' : '#fff',
                  }}
                  onClick={() => setPlayType(pt.value)}
                >
                  {pt.label}
                </button>
              ))}
            </div>

            {/* Saved Run Toggle for star plays */}
            {['diving', 'wall', 'leaping'].includes(playType) && (
              <div style={styles.checkboxRow}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={savedRun}
                    onChange={e => setSavedRun(e.target.checked)}
                  />
                  Saved a run?
                </label>
              </div>
            )}
          </div>
        )}

        {/* Error Type and Context (Day 4) */}
        {showErrorOptions && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>ERROR TYPE:</div>
            <div style={styles.buttonRow}>
              {errorTypeOptions.map(et => (
                <button
                  key={et.value}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: errorType === et.value ? '#f44336' : '#333',
                    color: errorType === et.value ? '#fff' : '#fff',
                  }}
                  onClick={() => setErrorType(et.value)}
                >
                  {et.label}
                </button>
              ))}
            </div>

            <div style={{ ...styles.sectionLabel, marginTop: '12px' }}>ERROR CONTEXT:</div>
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={errorContext.allowedRun}
                  onChange={e => setErrorContext({ ...errorContext, allowedRun: e.target.checked })}
                />
                Allowed a run to score (1.5x penalty)
              </label>
            </div>
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={errorContext.wasRoutine}
                  onChange={e => setErrorContext({ ...errorContext, wasRoutine: e.target.checked, wasDifficult: e.target.checked ? false : errorContext.wasDifficult })}
                />
                Was a routine play (1.2x penalty)
              </label>
            </div>
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={errorContext.wasDifficult}
                  onChange={e => setErrorContext({ ...errorContext, wasDifficult: e.target.checked, wasRoutine: e.target.checked ? false : errorContext.wasRoutine })}
                />
                Was a difficult play (0.7x reduced penalty)
              </label>
            </div>
          </div>
        )}

        {/* D3K Options */}
        {showD3KOptions && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>D3K OUTCOME:</div>
            <div style={styles.buttonRow}>
              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor: d3kOutcome === 'OUT' ? '#4CAF50' : '#333',
                  color: d3kOutcome === 'OUT' ? '#000' : '#fff',
                }}
                onClick={() => setD3kOutcome('OUT')}
              >
                Thrown Out
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor: d3kOutcome === 'WP' ? '#FF9800' : '#333',
                  color: d3kOutcome === 'WP' ? '#000' : '#fff',
                }}
                onClick={() => setD3kOutcome('WP')}
              >
                Safe (WP)
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor: d3kOutcome === 'PB' ? '#FF9800' : '#333',
                  color: d3kOutcome === 'PB' ? '#000' : '#fff',
                }}
                onClick={() => setD3kOutcome('PB')}
              >
                Safe (PB)
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor: d3kOutcome === 'E_CATCHER' ? '#f44336' : '#333',
                  color: d3kOutcome === 'E_CATCHER' ? '#fff' : '#fff',
                }}
                onClick={() => setD3kOutcome('E_CATCHER')}
              >
                Safe (C Error)
              </button>
              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor: d3kOutcome === 'E_1B' ? '#f44336' : '#333',
                  color: d3kOutcome === 'E_1B' ? '#fff' : '#fff',
                }}
                onClick={() => setD3kOutcome('E_1B')}
              >
                Safe (1B Error)
              </button>
            </div>
          </div>
        )}

        {/* Contextual Edge Case Toggles */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>SPECIAL SITUATIONS:</div>

          {showIFRToggle && (
            <div style={styles.toggleSection}>
              <div style={styles.checkboxRow}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={infieldFlyRule}
                    onChange={e => setInfieldFlyRule(e.target.checked)}
                  />
                  Infield Fly Rule called?
                </label>
              </div>

              {infieldFlyRule && (
                <div style={styles.subOptions}>
                  <span style={styles.subLabel}>Was ball caught?</span>
                  <div style={styles.buttonRow}>
                    <button
                      style={{
                        ...styles.smallButton,
                        backgroundColor: ifrBallCaught === true ? '#4CAF50' : '#333',
                        color: ifrBallCaught === true ? '#000' : '#fff',
                      }}
                      onClick={() => setIfrBallCaught(true)}
                    >
                      Yes
                    </button>
                    <button
                      style={{
                        ...styles.smallButton,
                        backgroundColor: ifrBallCaught === false ? '#FF9800' : '#333',
                        color: ifrBallCaught === false ? '#000' : '#fff',
                      }}
                      onClick={() => setIfrBallCaught(false)}
                    >
                      No (Dropped)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showGRDToggle && (
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={groundRuleDouble}
                  onChange={e => setGroundRuleDouble(e.target.checked)}
                />
                Ground Rule Double?
              </label>
            </div>
          )}

          {showBadHopToggle && (
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={badHopEvent}
                  onChange={e => setBadHopEvent(e.target.checked)}
                />
                Bad Hop? (unlucky bounce)
              </label>
            </div>
          )}

          {showNutshotToggle && (
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={nutshotEvent}
                  onChange={e => setNutshotEvent(e.target.checked)}
                />
                Nutshot? (pitcher hit in groin)
              </label>
            </div>
          )}

          {showComebackerInjury && (
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={comebackerInjury}
                  onChange={e => setComebackerInjury(e.target.checked)}
                />
                Comebacker Injury? (pitcher knocked out)
              </label>
            </div>
          )}

          {showRobberyToggle && (
            <div style={styles.toggleSection}>
              <div style={styles.checkboxRow}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={robberyAttempted}
                    onChange={e => {
                      setRobberyAttempted(e.target.checked);
                      if (!e.target.checked) setRobberyFailed(false);
                    }}
                  />
                  HR Robbery Attempted?
                </label>
              </div>

              {robberyAttempted && (
                <div style={styles.subOptions}>
                  <div style={styles.checkboxRow}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={robberyFailed}
                        onChange={e => setRobberyFailed(e.target.checked)}
                      />
                      Ball bounced off glove over fence? (Failed robbery = -1 Fame)
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No special situations message */}
          {!showIFRToggle && !showGRDToggle && !showBadHopToggle &&
           !showNutshotToggle && !showComebackerInjury && !showRobberyToggle && (
            <div style={styles.noOptions}>No special situations apply to this play.</div>
          )}
        </div>

        {/* Submit */}
        <button
          style={{
            ...styles.submitButton,
            opacity: canSubmit() ? 1 : 0.5,
          }}
          onClick={handleSubmit}
          disabled={!canSubmit()}
        >
          Confirm Fielding
        </button>
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1001,
    overflowY: 'auto',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: '16px',
    width: '100%',
    maxWidth: '700px',
    border: '1px solid #444',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #333',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    fontSize: '11px',
    color: '#888',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  inferred: {
    color: '#4CAF50',
    fontSize: '10px',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  posButton: {
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    minWidth: '40px',
  },
  optionButton: {
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  smallButton: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  checkboxRow: {
    marginTop: '8px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#ccc',
    cursor: 'pointer',
  },
  toggleSection: {
    marginBottom: '12px',
  },
  subOptions: {
    marginTop: '8px',
    marginLeft: '24px',
    padding: '10px',
    backgroundColor: '#252540',
    borderRadius: '6px',
  },
  subLabel: {
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '6px',
    display: 'block',
  },
  noOptions: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
  },
};
