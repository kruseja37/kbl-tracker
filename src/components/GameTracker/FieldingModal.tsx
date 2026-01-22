import { useState, useEffect } from 'react';
import type { Position, AtBatResult, Direction, ExitType, Bases } from '../../types/game';

// ============================================
// TYPES - Per FIELDING_SYSTEM_SPEC.md
// ============================================

export type PlayType = 'routine' | 'diving' | 'jumping' | 'wall' | 'charging' |
                       'barehanded' | 'error' | 'robbed_hr' | 'failed_robbery';
export type ErrorType = 'fielding' | 'throwing' | 'missed_catch' | 'collision';
export type D3KOutcome = 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B';

export interface AssistChainEntry {
  position: Position;
  playerId?: string;
}

export interface FieldingData {
  // Primary fielding
  primaryFielder: Position;
  playType: PlayType;
  errorType?: ErrorType;

  // Assist chain (for DPs, relay throws, etc.)
  assistChain: AssistChainEntry[];
  putoutPosition: Position;

  // Inference tracking
  inferredFielder: Position;
  wasOverridden: boolean;

  // Edge cases
  infieldFlyRule: boolean;
  ifrBallCaught: boolean | null;
  groundRuleDouble: boolean;
  badHopEvent: boolean;

  // D3K tracking
  d3kEvent: boolean;
  d3kOutcome: D3KOutcome | null;

  // SMB4 specific
  nutshotEvent: boolean;
  comebackerInjury: boolean;
  robberyAttempted: boolean;
  robberyFailed: boolean;

  // Fame/clutch triggers
  savedRun: boolean;
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
  exitType: ExitType | null;
  bases: Bases;
  outs: number;
  onComplete: (fieldingData: FieldingData) => void;
  onCancel: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function FieldingModal({
  result,
  direction,
  exitType,
  bases,
  outs,
  onComplete,
  onCancel,
}: FieldingModalProps) {
  // Inferred fielder (calculated once)
  const inferredFielder = inferFielderEnhanced(result, direction, exitType);

  // State
  const [primaryFielder, setPrimaryFielder] = useState<Position | null>(inferredFielder);
  const [playType, setPlayType] = useState<PlayType>('routine');
  const [_errorType, _setErrorType] = useState<ErrorType | null>(null); // Reserved for future error type selection
  const [dpChain, setDpChain] = useState<string | null>(result === 'DP' && direction ? DP_CHAINS[direction] : null);
  const [savedRun, setSavedRun] = useState(false);

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

  // Update inferred fielder when inputs change
  useEffect(() => {
    const newInferred = inferFielderEnhanced(result, direction, exitType);
    if (newInferred && !primaryFielder) {
      setPrimaryFielder(newInferred);
    }
  }, [result, direction, exitType]);

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

  // ============================================
  // POSITIONS FOR SELECTION
  // ============================================

  const positions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const dpTypes = ['6-4-3', '4-6-3', '5-4-3', '3-6-3', '6-3', '4-3', '1-6-3', '1-4-3', 'Other'];
  const playTypes: { value: PlayType; label: string }[] = [
    { value: 'routine', label: 'Routine' },
    { value: 'diving', label: 'Diving' },
    { value: 'jumping', label: 'Leaping' },
    { value: 'wall', label: 'Wall Catch' },
    { value: 'charging', label: 'Charging' },
    { value: 'barehanded', label: 'Barehanded' },
  ];

  // ============================================
  // BUILD ASSIST CHAIN FROM DP STRING
  // ============================================

  const buildAssistChain = (dpString: string | null): AssistChainEntry[] => {
    if (!dpString || dpString === 'Other') return [];

    const posMap: Record<string, Position> = {
      '1': 'P', '2': 'C', '3': '1B', '4': '2B', '5': '3B', '6': 'SS', '7': 'LF', '8': 'CF', '9': 'RF'
    };

    const parts = dpString.split('-');
    // All but last are assists, last is putout
    return parts.slice(0, -1).map(num => ({ position: posMap[num] }));
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
      errorType: playType === 'error' ? (_errorType || 'fielding') : undefined,

      assistChain: showDPChain ? buildAssistChain(dpChain) : [],
      putoutPosition: showDPChain ? getPutoutFromDP(dpChain) : primaryFielder,

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

    onComplete(fieldingData);
  };

  const canSubmit = (): boolean => {
    if (!primaryFielder) return false;
    if (showD3KOptions && !d3kOutcome) return false;
    if (infieldFlyRule && ifrBallCaught === null) return false;
    if (showDPChain && !dpChain) return false;
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
            {['diving', 'wall', 'jumping'].includes(playType) && (
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
    maxWidth: '500px',
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
