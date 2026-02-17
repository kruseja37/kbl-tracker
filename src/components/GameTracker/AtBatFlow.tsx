import { useReducer, useState } from 'react';
import type {
  AtBatResult,
  Direction,
  ExitType,
  Position,
  Bases,
  Runner,
  RunnerOutcome,
  SpecialPlayType,
  AtBatFlowState,
  ExtraEvent,
  ExtraEventType,
  FieldingData,
} from '../../types/game';
import { inferFielder, requiresBallInPlayData, isOut } from '../../types/game';
import { getMinFenceDistance, getParkByName } from '../../data/parkLookup';
import type { RunnerOutcomes, BaseKey } from './atBatLogic';
import {
  isRunnerForced as evaluateRunnerForced,
  getMinimumAdvancement as evaluateMinimumAdvancement,
  isExtraAdvancement as evaluateExtraAdvancement,
  outcomeToDestination as mapOutcomeToDestination,
  getDefaultOutcome as evaluateDefaultOutcome,
  calculateRBIs as evaluateRBIs,
} from './atBatLogic';
import FieldingModal from './FieldingModal';
import { mapPlayTypeToSpecialPlay } from './fieldingLogic';


interface AtBatFlowProps {
  result: AtBatResult;
  bases: Bases;
  batterName: string;
  batterHand?: 'L' | 'R' | 'S';
  outs: number;
  onComplete: (flowState: AtBatFlowState) => void;
  onCancel: () => void;
  stadiumName?: string | null;
}

const directions: Direction[] = ['Left', 'Left-Center', 'Center', 'Right-Center', 'Right'];
// Exit type selection moved to FieldingModal (GAP-031)
const positions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

// Special plays for outs (fielder made the play)
const specialPlaysForOuts: SpecialPlayType[] = ['Routine', 'Diving', 'Wall Catch', 'Running', 'Leaping'];

// Special plays for hits - "Clean" means no fielding attempt, others indicate an attempt was made
const specialPlaysForHits: SpecialPlayType[] = ['Clean', 'Diving', 'Leaping', 'Robbery Attempt'];

// Special plays for HRs - ball cleared the fence (BUG-015 fix)
// "Over Fence" = ball went over the wall cleanly (default for HRs)
// "Robbery Attempt" = fielder tried to catch it at the wall but failed
// "Wall Scraper" = ball barely cleared the wall
const specialPlaysForHR: SpecialPlayType[] = ['Over Fence', 'Robbery Attempt', 'Wall Scraper'];

// DP Types
const dpTypes = [
  '6-4-3',
  '4-6-3',
  '5-4-3',
  '3-6-3',
  '6-3',
  '4-3',
  '1-6-3',
  'Other',
  'Flyout DP',
  'Lineout DP',
];
const flyDpTypes = new Set(['Flyout DP', 'Lineout DP']);

type FenceDirection = 'lf' | 'cf' | 'rf';

const mapDirectionToFence = (direction: Direction | null): FenceDirection | null => {
  if (!direction) return null;
  if (direction === 'Left') return 'lf';
  if (direction === 'Right') return 'rf';
  if (direction.includes('Center')) return 'cf';
  if (direction.includes('Left')) return 'lf';
  if (direction.includes('Right')) return 'rf';
  return 'cf';
};

type BooleanField = 'savedRun' | 'is7PlusPitchAB' | 'beatOutSingle' | 'batterOutAdvancing';

interface PendingExtraEvent {
  base: BaseKey;
  outcome: RunnerOutcome;
}

interface AtBatState {
  initialResult: AtBatResult;
  result: AtBatResult;
  direction: Direction | null;
  fielder: Position | null;
  hrDistance: string;
  specialPlay: SpecialPlayType | null;
  runnerOutcomes: RunnerOutcomes;
  extraEvents: ExtraEvent[];
  is7PlusPitchAB: boolean;
  beatOutSingle: boolean;
  savedRun: boolean;
  batterOutAdvancing: boolean;
  outAdvancingPutout: Position | null;
  outAdvancingAssists: Position[];
  autoCorrection: string | null;
  pendingExtraEvent: PendingExtraEvent | null;
  dpType: string | null;
  dpForcePlay: boolean;
  fieldingData: FieldingData | null;
}

type AtBatAction =
  | { type: 'SET_RESULT'; payload: { result: AtBatResult; bases: Bases; outs: number } }
  | { type: 'SET_DIRECTION'; payload: Direction | null }
  | { type: 'SET_FIELDER'; payload: Position | null }
  | { type: 'SET_HR_DISTANCE'; payload: string }
  | { type: 'SET_SPECIAL_PLAY'; payload: SpecialPlayType | null }
  | {
      type: 'SET_RUNNER_OUTCOME';
      payload: { base: BaseKey; outcome: RunnerOutcome; runnerName?: string; bases: Bases; outs: number };
    }
  | {
      type: 'SET_RUNNER_OUTCOMES';
      payload: { outcomes: RunnerOutcomes; bases: Bases; outs: number };
    }
  | { type: 'ADD_EXTRA_EVENT'; payload: ExtraEvent }
  | { type: 'REMOVE_EXTRA_EVENT'; payload: { runner: string } }
  | { type: 'TOGGLE_BOOLEAN'; payload: { field: BooleanField; value?: boolean } }
  | { type: 'SET_OUT_ADVANCING_PUTOUT'; payload: Position | null }
  | { type: 'TOGGLE_OUT_ADVANCING_ASSIST'; payload: Position }
  | { type: 'SET_DP_TYPE'; payload: { dpType: string | null; bases: Bases; outs: number } }
  | { type: 'UPDATE_FIELDING_DATA'; payload: FieldingData | null };

const countRunnerOuts = (outcomes: RunnerOutcomes): number => {
  let count = 0;
  if (outcomes.first && outcomes.first.startsWith('OUT_')) count++;
  if (outcomes.second && outcomes.second.startsWith('OUT_')) count++;
  if (outcomes.third && outcomes.third.startsWith('OUT_')) count++;
  return count;
};

const hasRunnerAdvanced = (bases: Bases, outcomes: RunnerOutcomes): boolean => {
  const firstAdvanced =
    outcomes.first === 'TO_2B' ||
    outcomes.first === 'TO_3B' ||
    outcomes.first === 'SCORED';
  const secondAdvanced =
    outcomes.second === 'TO_3B' ||
    outcomes.second === 'SCORED';

  return (
    (!!bases.first && firstAdvanced) ||
    (!!bases.second && secondAdvanced) ||
    (!!bases.third && outcomes.third === 'SCORED')
  );
};

const applyAutoCorrection = (
  state: AtBatState,
  outcomes: RunnerOutcomes,
  bases: Bases,
  outs: number
): { result: AtBatResult; autoCorrection: string | null } => {
  const prevResult = state.result;
  let nextResult = prevResult;
  let autoCorrection = state.autoCorrection;

  if (state.initialResult === 'FO' && outs < 2 && bases.third && outcomes.third === 'SCORED') {
    nextResult = 'SF';
    autoCorrection = 'Auto-corrected to Sac Fly (runner scored from 3rd on fly out)';
  } else if (state.initialResult === 'FO' && prevResult === 'SF' && outcomes.third !== 'SCORED') {
    nextResult = 'FO';
    autoCorrection = null;
  } else if (state.initialResult === 'GO' && outs < 2) {
    const runnerOutsCount = countRunnerOuts(outcomes);
    if (runnerOutsCount >= 1) {
      nextResult = 'DP';
      autoCorrection = 'Auto-corrected to Double Play (2 outs recorded: batter + runner)';
    } else {
      const runnerAdvance = hasRunnerAdvanced(bases, outcomes);
      if (runnerAdvance && prevResult !== 'SAC') {
        autoCorrection = 'Tip: If this was an intentional sacrifice bunt, use SAC instead';
      } else if (!runnerAdvance) {
        autoCorrection = null;
      }
    }
  } else if (state.initialResult === 'GO' && prevResult === 'DP') {
    if (countRunnerOuts(outcomes) === 0) {
      nextResult = 'GO';
      autoCorrection = null;
    }
  }

  return { result: nextResult, autoCorrection };
};

const getDefaultSpecialPlay = (result: AtBatResult): SpecialPlayType | null => {
  if (result === 'HR') return 'Over Fence';
  if (['1B', '2B', '3B'].includes(result)) return 'Clean';
  if (['FO', 'LO', 'GO', 'PO'].includes(result)) return 'Routine';
  return null;
};

const getDefaultRunnerOutcomes = (result: AtBatResult, bases: Bases, outs: number): RunnerOutcomes => ({
  first: bases.first ? evaluateDefaultOutcome('first', result, bases, outs) : null,
  second: bases.second ? evaluateDefaultOutcome('second', result, bases, outs) : null,
  third: bases.third ? evaluateDefaultOutcome('third', result, bases, outs) : null,
});

const initialAtBatState = (initialResult: AtBatResult, bases: Bases, outs: number): AtBatState => ({
  initialResult,
  result: initialResult,
  direction: null,
  fielder: null,
  hrDistance: '',
  specialPlay: getDefaultSpecialPlay(initialResult),
  runnerOutcomes: getDefaultRunnerOutcomes(initialResult, bases, outs),
  extraEvents: [],
  is7PlusPitchAB: false,
  beatOutSingle: false,
  savedRun: false,
  batterOutAdvancing: false,
  outAdvancingPutout: null,
  outAdvancingAssists: [],
  autoCorrection: null,
  pendingExtraEvent: null,
  dpType: null,
  dpForcePlay: initialResult === 'DP',
  fieldingData: null,
});

const reducer = (state: AtBatState, action: AtBatAction): AtBatState => {
  switch (action.type) {
    case 'SET_DIRECTION': {
      const direction = action.payload;
      const needsFielder = isOut(state.result) && !['K', 'KL'].includes(state.result);
      return {
        ...state,
        direction,
        fielder: needsFielder && direction ? inferFielder(state.result, direction) : state.fielder,
      };
    }
    case 'SET_FIELDER':
      return { ...state, fielder: action.payload };
    case 'SET_HR_DISTANCE':
      return { ...state, hrDistance: action.payload };
    case 'SET_SPECIAL_PLAY':
      return { ...state, specialPlay: action.payload };
    case 'SET_RESULT': {
      const { result, bases, outs } = action.payload;
      const defaultOutcomes = getDefaultRunnerOutcomes(result, bases, outs);
      const nextDpType = result === 'DP' ? state.dpType : null;
      const nextDpForcePlay = result === 'DP' ? true : state.dpForcePlay;
      return {
        ...state,
        result,
        specialPlay: getDefaultSpecialPlay(result),
        runnerOutcomes: defaultOutcomes,
        extraEvents: [],
        pendingExtraEvent: null,
        autoCorrection: null,
        dpType: nextDpType,
        dpForcePlay: nextDpForcePlay,
      };
    }
    case 'SET_RUNNER_OUTCOMES': {
      const auto = applyAutoCorrection(state, action.payload.outcomes, action.payload.bases, action.payload.outs);
      return {
        ...state,
        runnerOutcomes: action.payload.outcomes,
        extraEvents: [],
        pendingExtraEvent: null,
        result: auto.result,
        autoCorrection: auto.autoCorrection,
      };
    }
    case 'SET_RUNNER_OUTCOME': {
      const { base, outcome, runnerName, bases, outs } = action.payload;
      const updatedOutcomes: RunnerOutcomes = { ...state.runnerOutcomes, [base]: outcome };
      const auto = applyAutoCorrection(state, updatedOutcomes, bases, outs);
      const filteredEvents = runnerName
        ? state.extraEvents.filter(ev => ev.runner !== runnerName)
        : state.extraEvents;
      const needsExtra = evaluateExtraAdvancement(base, outcome, auto.result, bases, outs);
      return {
        ...state,
        runnerOutcomes: updatedOutcomes,
        extraEvents: filteredEvents,
        pendingExtraEvent: needsExtra ? { base, outcome } : null,
        result: auto.result,
        autoCorrection: auto.autoCorrection,
      };
    }
    case 'ADD_EXTRA_EVENT':
      return {
        ...state,
        extraEvents: [...state.extraEvents, action.payload],
        pendingExtraEvent: null,
      };
    case 'REMOVE_EXTRA_EVENT':
      return {
        ...state,
        extraEvents: state.extraEvents.filter(ev => ev.runner !== action.payload.runner),
        pendingExtraEvent: null,
      };
    case 'TOGGLE_BOOLEAN': {
      const { field, value } = action.payload;
      const nextValue = value !== undefined ? value : !state[field];
      if (field === 'batterOutAdvancing' && !nextValue) {
        return {
          ...state,
          [field]: nextValue,
          outAdvancingPutout: null,
          outAdvancingAssists: [],
        };
      }
      return { ...state, [field]: nextValue };
    }
    case 'SET_OUT_ADVANCING_PUTOUT':
      return { ...state, outAdvancingPutout: action.payload };
    case 'TOGGLE_OUT_ADVANCING_ASSIST': {
      const alreadySelected = state.outAdvancingAssists.includes(action.payload);
      const assists = alreadySelected
        ? state.outAdvancingAssists.filter(p => p !== action.payload)
        : [...state.outAdvancingAssists, action.payload];
      return { ...state, outAdvancingAssists: assists };
    }
    case 'SET_DP_TYPE': {
      const { dpType, bases, outs } = action.payload;
      let dpForcePlay = state.dpForcePlay;

      if (dpType === null) {
        dpForcePlay = true;
      } else if (flyDpTypes.has(dpType)) {
        dpForcePlay = false;
      } else if (dpType === 'Other') {
        dpForcePlay = evaluateRunnerForced('third', 'DP', bases, outs);
      } else {
        dpForcePlay = true;
      }

      return { ...state, dpType, dpForcePlay };
    }
    case 'UPDATE_FIELDING_DATA':
      return {
        ...state,
        fieldingData: action.payload,
        fielder: action.payload?.primaryFielder ?? state.fielder,
      };
    default:
      return state;
  }
};

export default function AtBatFlow({
  result: initialResult,
  bases,
  batterName,
  batterHand = 'R',
  outs,
  onComplete,
  onCancel,
  stadiumName,
}: AtBatFlowProps) {
  const [state, dispatch] = useReducer(
    reducer,
    { initialResult, bases, outs },
    ({ initialResult, bases, outs }) => initialAtBatState(initialResult, bases, outs)
  );
  const {
    result,
    direction,
    fielder,
    hrDistance,
    specialPlay,
    runnerOutcomes,
    extraEvents,
    is7PlusPitchAB,
    beatOutSingle,
    savedRun,
    batterOutAdvancing,
    outAdvancingPutout,
    outAdvancingAssists,
    autoCorrection,
    pendingExtraEvent,
    dpType,
    dpForcePlay,
    fieldingData,
  } = state;
  const exitType: ExitType | null = null;
  const fenceDirection = mapDirectionToFence(direction);
  const park = stadiumName ? getParkByName(stadiumName) : undefined;
  const hrMinDistance = fenceDirection && park ? getMinFenceDistance(park, fenceDirection) : 250;
  const parkLabel = stadiumName || 'selected stadium';

  // Fielding modal state
  const [showFieldingModal, setShowFieldingModal] = useState(false);

  // ============================================
  // FORCE PLAY LOGIC
  // ============================================
  const isRunnerForced = (base: 'first' | 'second' | 'third'): boolean =>
    evaluateRunnerForced(base, result, bases, outs);

  const getMinimumAdvancement = (base: 'first' | 'second' | 'third'): 'second' | 'third' | 'home' | null =>
    evaluateMinimumAdvancement(base, result, bases, outs);

  // ============================================
  // EXTRA ADVANCEMENT DETECTION
  // ============================================
  const isExtraAdvancement = (
    base: 'first' | 'second' | 'third',
    outcome: RunnerOutcome
  ): boolean => evaluateExtraAdvancement(base, outcome, result, bases, outs);

  const outcomeToDestination = mapOutcomeToDestination;

  // Convert base to display string
  const baseToString = (base: 'first' | 'second' | 'third'): '1B' | '2B' | '3B' => {
    return base === 'first' ? '1B' : base === 'second' ? '2B' : '3B';
  };

  // Get possible extra events that could explain the advancement
  const getPossibleExtraEvents = (): ExtraEventType[] => {
    // Most common scenarios
    return ['SB', 'WP', 'PB', 'E'];
  };

  // Handle selection of extra event explanation
  const handleExtraEventSelect = (eventType: ExtraEventType) => {
    if (!pendingExtraEvent) return;

    const runner = bases[pendingExtraEvent.base];
    if (!runner) return;

    const destination = outcomeToDestination(pendingExtraEvent.outcome);
    if (!destination) return;

    const newExtraEvent: ExtraEvent = {
      runner: runner.playerName,
      from: baseToString(pendingExtraEvent.base),
      to: destination,
      event: eventType,
    };

    dispatch({ type: 'ADD_EXTRA_EVENT', payload: newExtraEvent });
  };

  // Enhanced runner outcome handler that checks for extra advancement
  // FIX: Clear existing extra events for this runner when selection changes
  const handleRunnerOutcomeWithInference = (base: BaseKey, outcome: RunnerOutcome) => {
    const runner = bases[base];
    const runnerName = runner?.playerName;

    if (runnerName) {
      dispatch({ type: 'REMOVE_EXTRA_EVENT', payload: { runner: runnerName } });
    }

    dispatch({
      type: 'SET_RUNNER_OUTCOME',
      payload: { base, outcome, runnerName, bases, outs },
    });
  };

  // Determine what step we're on based on what's filled in
  const needsDirection = requiresBallInPlayData(result);
  // Exit type is now handled in FieldingModal for hits, and auto-inferred for outs
  // So we no longer require it in the AtBatFlow for outs
  const needsExitType = false; // Exit type moved to FieldingModal (S-A022)
  const needsFielder = isOut(result) && !['K', 'KL'].includes(result);
  const needsHRDistance = result === 'HR';
  const needsDPType = result === 'DP';
  const needsRunnerConfirmation = (bases.first || bases.second || bases.third) && result !== 'HR';

  // Hits and outs both show special play options, but with different choices
  const isHitResult = ['1B', '2B', '3B', 'HR'].includes(result);
  const isOutWithFielding = ['FO', 'LO', 'GO', 'PO'].includes(result);
  const needsSpecialPlay = isHitResult || isOutWithFielding;

  // Fielding confirmation logic:
  // - OUTS/ERRORS: Always need fielding confirmation (someone made a play)
  // - HITS: Only need fielding confirmation if a fielding attempt was made (diving, leaping, robbery)
  const isOutOrErrorResult = isOut(result) || result === 'E' || result === 'D3K';
  const hitWithFieldingAttempt = isHitResult && specialPlay !== null && specialPlay !== 'Clean';
  const needsFieldingConfirmation =
    (isOutOrErrorResult && !['K', 'KL'].includes(result)) || hitWithFieldingAttempt;

  // Auto-infer fielder when direction is selected
  const handleDirectionSelect = (dir: Direction) => {
    dispatch({ type: 'SET_DIRECTION', payload: dir });
  };

  // Get runner outcome options based on which base they're on, the result, and force rules
  const getRunnerOptions = (base: BaseKey): { value: RunnerOutcome; label: string; isExtra?: boolean }[] => {
    const options: { value: RunnerOutcome; label: string; isExtra?: boolean }[] = [];
    const forced = isRunnerForced(base);
    const minAdvance = getMinimumAdvancement(base);

    // Helper to check if an option meets minimum advancement
    const meetsMinimum = (outcome: RunnerOutcome): boolean => {
      if (!minAdvance) return true; // Not forced, all options valid
      const dest = outcomeToDestination(outcome);
      if (!dest) return outcome.startsWith('OUT'); // Out options are always valid

      // Check if destination meets or exceeds minimum
      const order = ['2B', '3B', 'HOME'];
      const minIndex = order.indexOf(minAdvance === 'second' ? '2B' : minAdvance === 'third' ? '3B' : 'HOME');
      const destIndex = order.indexOf(dest);
      return destIndex >= minIndex;
    };

    if (base === 'third') {
      options.push({ value: 'SCORED', label: 'Scored' });
      // R3 can only hold if NOT forced
      if (!forced) {
        options.push({ value: 'HELD', label: 'Held 3B' });
      }
      options.push({ value: 'OUT_HOME', label: 'Out at Home' });
    } else if (base === 'second') {
      options.push({ value: 'SCORED', label: 'Scored' });
      // R2 can only go to 3B if it meets minimum (on double, must go further)
      if (meetsMinimum('TO_3B')) {
        options.push({ value: 'TO_3B', label: 'To 3B' });
      }
      // R2 can only hold if NOT forced
      if (!forced) {
        options.push({ value: 'HELD', label: 'Held 2B' });
      }
      options.push({ value: 'OUT_HOME', label: 'Out at Home' });
      options.push({ value: 'OUT_3B', label: 'Out at 3B' });
    } else {
      // first base
      options.push({ value: 'SCORED', label: 'Scored', isExtra: isExtraAdvancement('first', 'SCORED') });

      // R1 → 3B: allowed on most hits, mark as extra if on walk
      if (meetsMinimum('TO_3B')) {
        options.push({ value: 'TO_3B', label: 'To 3B', isExtra: isExtraAdvancement('first', 'TO_3B') });
      }

      // R1 → 2B: only if it meets minimum (on double, must go to 3B)
      if (meetsMinimum('TO_2B')) {
        options.push({ value: 'TO_2B', label: 'To 2B' });
      }

      // R1 can only hold if NOT forced
      if (!forced) {
        options.push({ value: 'HELD', label: 'Held 1B' });
      }

      options.push({ value: 'OUT_HOME', label: 'Out at Home' });
      options.push({ value: 'OUT_3B', label: 'Out at 3B' });
      if (meetsMinimum('OUT_2B')) {
        options.push({ value: 'OUT_2B', label: 'Out at 2B' });
      }
    }

    return options;
  };

  const calculateRBIs = (): number =>
    evaluateRBIs({
      result,
      bases,
      runnerOutcomes,
      forceDoublePlay: result === 'DP' ? dpForcePlay : undefined,
    });

  // Check if basic inputs are ready (before fielding modal)
  const canProceedToFielding = (): boolean => {
    if (needsDirection && !direction) return false;
    // Exit type is now collected in FieldingModal, not here
    if (needsHRDistance) {
      const parsedValue = parseInt(hrDistance);
      if (!hrDistance || Number.isNaN(parsedValue) || parsedValue < hrMinDistance || parsedValue > 550) {
        return false;
      }
    }
    if (needsDPType && !dpType) return false;

    // Can't proceed while waiting for extra event explanation
    if (pendingExtraEvent) return false;

    // Check runner confirmations
    if (needsRunnerConfirmation) {
      if (bases.first && !runnerOutcomes.first) return false;
      if (bases.second && !runnerOutcomes.second) return false;
      if (bases.third && !runnerOutcomes.third) return false;
    }

    return true;
  };

  // Check if we can submit (after fielding confirmation)
  const canSubmit = (): boolean => {
    if (!canProceedToFielding()) return false;

    // Fielding data required for ball-in-play outcomes
    if (needsFieldingConfirmation && !fieldingData) return false;

    // If batter out advancing is checked, must select who made the putout
    if (batterOutAdvancing && !outAdvancingPutout) return false;

    return true;
  };

  const handleSubmit = () => {
    // Determine batter out advancing data if applicable
    // Include putout/assist fielders for stat tracking
    const batterOutData = batterOutAdvancing && ['1B', '2B', '3B'].includes(result) && outAdvancingPutout
      ? {
          hitType: result as '1B' | '2B' | '3B',
          outAtBase: result === '1B' ? '2B' as const :
                     result === '2B' ? '3B' as const :
                     'HOME' as const,
          putoutBy: outAdvancingPutout,
          assistBy: outAdvancingAssists,
        }
      : undefined;

    const fieldingFromModal = fieldingData;
    const primaryFielded = fieldingFromModal?.primaryFielder || fielder;
    const specialFromFielding = fieldingFromModal
      ? mapPlayTypeToSpecialPlay(fieldingFromModal.playType, result)
      : null;

    const flowState: AtBatFlowState = {
      step: 'CONFIRM',
      result,
      direction,
      exitType,
      fielder: fieldingData?.primaryFielder || fielder,
      hrDistance: hrDistance ? parseInt(hrDistance) : null,
      specialPlay: specialFromFielding ?? specialPlay,
      savedRun: fieldingData?.savedRun || savedRun,
      is7PlusPitchAB,
      beatOutSingle,
      runnerOutcomes,
      rbiCount: calculateRBIs(),
      extraEvents, // Include inferred extra events
      fieldingData: fieldingData || undefined, // Include comprehensive fielding data
      batterOutAdvancing: batterOutData, // Batter thrown out stretching
    };
    onComplete(flowState);
  };

  // Handler for fielding modal completion
  const handleFieldingComplete = (data: FieldingData) => {
    dispatch({ type: 'UPDATE_FIELDING_DATA', payload: data });
    setShowFieldingModal(false);
  };

  // Handler for proceeding to fielding confirmation
  const handleProceedToFielding = () => {
    if (needsFieldingConfirmation) {
      setShowFieldingModal(true);
    } else {
      handleSubmit();
    }
  };

  const readyForFielding = canProceedToFielding();

  const getRunnerName = (runner: Runner | null) => {
    if (!runner) return '';
    const parts = runner.playerName.split(' ');
    return parts[parts.length - 1];
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={{
            ...styles.resultBadge,
            backgroundColor: result !== initialResult ? '#FF9800' : '#4CAF50',
          }}>{result}</span>
          <span style={styles.batterName}>{batterName}</span>
          <button style={styles.cancelBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Auto-correction feedback */}
        {autoCorrection && (
          <div style={{
            ...styles.autoCorrection,
            backgroundColor: result !== initialResult ? '#2d2d0a' : '#1a2d1a',
            borderColor: result !== initialResult ? '#FF9800' : '#4CAF50',
          }}>
            {autoCorrection}
          </div>
        )}

        {/* Direction Selection */}
        {needsDirection && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>DIRECTION:</div>
            <div style={styles.buttonRow}>
              {directions.map(dir => (
                <button
                  key={dir}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: direction === dir ? '#4CAF50' : '#333',
                    color: direction === dir ? '#000' : '#fff',
                  }}
                  onClick={() => handleDirectionSelect(dir)}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exit Type Selection - Removed: now handled in FieldingModal (GAP-031) */}

        {/* HR Distance */}
        {needsHRDistance && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>DISTANCE (ft):</div>
            <input
              type="number"
              value={hrDistance}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 550)) {
                  dispatch({ type: 'SET_HR_DISTANCE', payload: val });
                }
              }}
              min={250}
              max={550}
              placeholder="e.g., 420"
              style={{
                ...styles.input,
                ...(hrDistance && (parseInt(hrDistance) < 250 || parseInt(hrDistance) > 550)
                  ? { borderColor: '#ef4444', color: '#ef4444' }
                  : {}),
              }}
            />
            {needsHRDistance && direction && hrDistance && parseInt(hrDistance) < hrMinDistance && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                HR to {direction} must be at least {hrMinDistance} ft ({parkLabel} {direction} fence)
              </div>
            )}
            {hrDistance && parseInt(hrDistance) > 550 && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                Max HR distance: 550 ft
              </div>
            )}
          </div>
        )}

        {/* Fielder Selection */}
        {needsFielder && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>
              FIELDED BY: {fielder && <span style={styles.inferred}>(inferred - tap to change)</span>}
            </div>
            <div style={styles.buttonRow}>
              {positions.map(pos => (
                <button
                  key={pos}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: fielder === pos ? '#4CAF50' : '#333',
                    color: fielder === pos ? '#000' : '#fff',
                    minWidth: '36px',
                  }}
                  onClick={() => dispatch({ type: 'SET_FIELDER', payload: pos })}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DP Type */}
        {needsDPType && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>DP TYPE:</div>
            <div style={styles.buttonRow}>
              {dpTypes.map(type => (
                <button
                  key={type}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: dpType === type ? '#4CAF50' : '#333',
                    color: dpType === type ? '#000' : '#fff',
                  }}
                  onClick={() =>
                    dispatch({ type: 'SET_DP_TYPE', payload: { dpType: type, bases, outs } })
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Special Play - different options for hits vs outs vs HRs */}
        {needsSpecialPlay && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>
              {result === 'HR' ? 'HOW DID IT CLEAR?' : isHitResult ? 'FIELDING ATTEMPT?' : 'SPECIAL PLAY?'}
            </div>
            <div style={styles.buttonRow}>
              {/* Use HR-specific options for home runs (BUG-015 fix) */}
              {(result === 'HR' ? specialPlaysForHR : isHitResult ? specialPlaysForHits : specialPlaysForOuts).map(play => (
                <button
                  key={play}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: specialPlay === play ? '#4CAF50' : '#333',
                    color: specialPlay === play ? '#000' : '#fff',
                  }}
                  onClick={() => dispatch({ type: 'SET_SPECIAL_PLAY', payload: play })}
                >
                  {play}
                </button>
              ))}
            </div>
            {/* Show "saved run" for star defensive plays on outs */}
            {!isHitResult && (specialPlay === 'Diving' || specialPlay === 'Wall Catch') && (
              <div style={styles.checkboxRow}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={savedRun}
                onChange={e =>
                  dispatch({ type: 'TOGGLE_BOOLEAN', payload: { field: 'savedRun', value: e.target.checked } })
                }
              />
              Did this save a run?
            </label>
              </div>
            )}
            {/* Hint for hits when fielding attempt is selected (not HRs) */}
            {isHitResult && result !== 'HR' && specialPlay && specialPlay !== 'Clean' && (
              <div style={styles.fieldingHint}>
                Fielder will be credited with a fielding chance
              </div>
            )}
            {/* Hint for HRs when robbery attempt is selected */}
            {result === 'HR' && specialPlay === 'Robbery Attempt' && (
              <div style={styles.fieldingHint}>
                Fielder attempted to rob the home run at the wall
              </div>
            )}
          </div>
        )}

        {/* Runner Advancement */}
        {needsRunnerConfirmation && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>RUNNER ADVANCEMENT:</div>

            {bases.third && (
              <div style={styles.runnerRow}>
                <span style={styles.runnerLabel}>{getRunnerName(bases.third)} (was on 3B):</span>
                <div style={styles.runnerButtons}>
                  {getRunnerOptions('third').map(opt => (
                    <button
                      key={opt.value}
                      style={{
                        ...styles.runnerButton,
                        backgroundColor: runnerOutcomes.third === opt.value ? '#4CAF50' : '#333',
                        color: runnerOutcomes.third === opt.value ? '#000' : '#fff',
                        border: opt.isExtra ? '2px solid #FF9800' : 'none',
                      }}
                      onClick={() => handleRunnerOutcomeWithInference('third', opt.value)}
                    >
                      {opt.label}
                      {opt.isExtra && ' ⚡'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bases.second && (
              <div style={styles.runnerRow}>
                <span style={styles.runnerLabel}>{getRunnerName(bases.second)} (was on 2B):</span>
                <div style={styles.runnerButtons}>
                  {getRunnerOptions('second').map(opt => (
                    <button
                      key={opt.value}
                      style={{
                        ...styles.runnerButton,
                        backgroundColor: runnerOutcomes.second === opt.value ? '#4CAF50' : '#333',
                        color: runnerOutcomes.second === opt.value ? '#000' : '#fff',
                        border: opt.isExtra ? '2px solid #FF9800' : 'none',
                      }}
                      onClick={() => handleRunnerOutcomeWithInference('second', opt.value)}
                    >
                      {opt.label}
                      {opt.isExtra && ' ⚡'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bases.first && (
              <div style={styles.runnerRow}>
                <span style={styles.runnerLabel}>{getRunnerName(bases.first)} (was on 1B):</span>
                <div style={styles.runnerButtons}>
                  {getRunnerOptions('first').map(opt => (
                    <button
                      key={opt.value}
                      style={{
                        ...styles.runnerButton,
                        backgroundColor: runnerOutcomes.first === opt.value ? '#4CAF50' : '#333',
                        color: runnerOutcomes.first === opt.value ? '#000' : '#fff',
                        border: opt.isExtra ? '2px solid #FF9800' : 'none',
                      }}
                      onClick={() => handleRunnerOutcomeWithInference('first', opt.value)}
                    >
                      {opt.label}
                      {opt.isExtra && ' ⚡'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Event Prompt */}
            {pendingExtraEvent && bases[pendingExtraEvent.base] && (
              <div style={styles.extraEventPrompt}>
                <div style={styles.extraEventTitle}>
                  ⚡ Extra Advancement Detected
                </div>
                <div style={styles.extraEventDescription}>
                  {getRunnerName(bases[pendingExtraEvent.base])} advanced beyond standard.
                  <br />
                  What caused this extra advancement?
                </div>
                <div style={styles.extraEventButtons}>
                  {getPossibleExtraEvents().map(eventType => (
                    <button
                      key={eventType}
                      style={styles.extraEventButton}
                      onClick={() => handleExtraEventSelect(eventType)}
                    >
                      {eventType === 'SB' && 'Stolen Base'}
                      {eventType === 'WP' && 'Wild Pitch'}
                      {eventType === 'PB' && 'Passed Ball'}
                      {eventType === 'E' && 'Error'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show recorded extra events */}
            {extraEvents.length > 0 && (
              <div style={styles.extraEventsList}>
                <div style={styles.extraEventsTitle}>Additional Events:</div>
                {extraEvents.map((ev, idx) => (
                  <div key={idx} style={styles.extraEventItem}>
                    {ev.event === 'SB' && `${ev.runner}: Steals ${ev.to === 'HOME' ? 'Home' : ev.to}`}
                    {ev.event === 'WP' && `Wild Pitch: ${ev.runner} advances to ${ev.to === 'HOME' ? 'Home' : ev.to}`}
                    {ev.event === 'PB' && `Passed Ball: ${ev.runner} advances to ${ev.to === 'HOME' ? 'Home' : ev.to}`}
                    {ev.event === 'E' && `Error: ${ev.runner} advances to ${ev.to === 'HOME' ? 'Home' : ev.to}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RBI Display */}
        <div style={styles.rbiDisplay}>
          RBIs: <strong>{calculateRBIs()}</strong>
        </div>

        {/* 7+ Pitch AB Toggle */}
        <div style={styles.checkboxRow}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={is7PlusPitchAB}
              onChange={e =>
                dispatch({ type: 'TOGGLE_BOOLEAN', payload: { field: 'is7PlusPitchAB', value: e.target.checked } })
              }
            />
            7+ Pitch At-Bat?
          </label>
        </div>

        {/* Beat-out Single (for 1B only) */}
        {result === '1B' && (
          <div style={styles.checkboxRow}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={beatOutSingle}
                onChange={e =>
                  dispatch({ type: 'TOGGLE_BOOLEAN', payload: { field: 'beatOutSingle', value: e.target.checked } })
                }
              />
              Beat Throw (close play)?
            </label>
          </div>
        )}

        {/* Batter Out Advancing - for 1B, 2B, 3B */}
        {['1B', '2B', '3B'].includes(result) && (
          <div style={styles.checkboxRow}>
            <label style={{
              ...styles.checkbox,
              color: batterOutAdvancing ? '#f44336' : '#aaa',
            }}>
              <input
                type="checkbox"
                checked={batterOutAdvancing}
                onChange={e =>
                  dispatch({ type: 'TOGGLE_BOOLEAN', payload: { field: 'batterOutAdvancing', value: e.target.checked } })
                }
              />
              {result === '1B' && 'Out stretching to 2B?'}
              {result === '2B' && 'Out stretching to 3B?'}
              {result === '3B' && 'Out stretching for inside-the-park HR?'}
            </label>
            {batterOutAdvancing && (
              <>
                <div style={styles.outAdvancingWarning}>
                  ⚠️ Batter credited with {result}, but OUT recorded (not on base)
                </div>

                {/* Fielding credit for the out */}
                <div style={styles.outAdvancingFielding}>
                  <div style={styles.fieldingRow}>
                    <span style={styles.fieldingLabel}>Putout by:</span>
                    <div style={styles.positionMiniGrid}>
                      {(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as Position[]).map(pos => (
                        <button
                          key={pos}
                          style={{
                            ...styles.positionMiniButton,
                            backgroundColor: outAdvancingPutout === pos ? '#f44336' : '#333',
                          }}
                      onClick={() => dispatch({ type: 'SET_OUT_ADVANCING_PUTOUT', payload: pos })}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.fieldingRow}>
                    <span style={styles.fieldingLabel}>Assist(s):</span>
                    <div style={styles.positionMiniGrid}>
                      {(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as Position[]).map(pos => (
                        <button
                          key={pos}
                          style={{
                            ...styles.positionMiniButton,
                            backgroundColor: outAdvancingAssists.includes(pos) ? '#FF9800' : '#333',
                          }}
                          onClick={() =>
                            dispatch({ type: 'TOGGLE_OUT_ADVANCING_ASSIST', payload: pos })
                          }
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                    <span style={styles.fieldingHintSmall}>(tap multiple for relay)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Fielding Status Indicator */}
        {needsFieldingConfirmation && (
          <div style={{
            ...styles.fieldingStatus,
            backgroundColor: fieldingData ? '#1a2d1a' : '#2d2d0a',
            borderColor: fieldingData ? '#4CAF50' : '#FF9800',
          }}>
            {fieldingData ? (
              <>
                <span style={{ color: '#4CAF50' }}>✓ Fielding Confirmed: </span>
                <span>{fieldingData.primaryFielder}</span>
                {fieldingData.wasOverridden && <span style={{ color: '#888' }}> (overridden)</span>}
                {fieldingData.playType !== 'routine' && <span> - {fieldingData.playType}</span>}
                <button
                  style={styles.editFieldingBtn}
                  onClick={() => setShowFieldingModal(true)}
                >
                  Edit
                </button>
              </>
            ) : (
              <span style={{ color: '#FF9800' }}>⚠ Fielding confirmation needed</span>
            )}
          </div>
        )}

        {/* Submit/Continue Button */}
        {fieldingData || !needsFieldingConfirmation ? (
          <button
            style={{
              ...styles.submitButton,
              opacity: canSubmit() ? 1 : 0.5,
            }}
            onClick={handleSubmit}
            disabled={!canSubmit()}
          >
            Confirm At-Bat
          </button>
        ) : (
          !showFieldingModal && (
            <button
              style={{
                ...styles.submitButton,
                opacity: readyForFielding ? 1 : 0.5,
                backgroundColor: '#2196F3',
              }}
              onClick={handleProceedToFielding}
              disabled={!readyForFielding}
              aria-label="Continue to fielding phase"
            >
              Continue to Fielding →
            </button>
          )
        )}
      </div>

      {/* Fielding Modal */}
      {showFieldingModal && (
        <FieldingModal
          result={result}
          direction={direction}
          exitType={exitType}
          bases={bases}
          outs={outs}
          batterHand={batterHand}
          onComplete={handleFieldingComplete}
          onCancel={() => setShowFieldingModal(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1000,
    overflowY: 'auto',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: '16px',
    width: '100%',
    maxWidth: '500px',
    border: '1px solid #333',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #333',
  },
  resultBadge: {
    backgroundColor: '#4CAF50',
    color: '#000',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  batterName: {
    flex: 1,
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
  optionButton: {
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#333',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#fff',
  },
  runnerRow: {
    marginBottom: '12px',
  },
  runnerLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#aaa',
    marginBottom: '6px',
  },
  runnerButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  runnerButton: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  rbiDisplay: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#4CAF50',
    padding: '12px',
    backgroundColor: '#16213e',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  checkboxRow: {
    marginBottom: '12px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#aaa',
    cursor: 'pointer',
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
  },
  autoCorrection: {
    padding: '10px 12px',
    marginBottom: '16px',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#fff',
    border: '1px solid',
    textAlign: 'center' as const,
  },
  extraEventPrompt: {
    backgroundColor: '#2d2a0a',
    border: '2px solid #FF9800',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  extraEventTitle: {
    color: '#FF9800',
    fontWeight: 'bold',
    fontSize: '14px',
    marginBottom: '8px',
  },
  extraEventDescription: {
    color: '#ccc',
    fontSize: '13px',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  extraEventButtons: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  extraEventButton: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    backgroundColor: '#FF9800',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  extraEventsList: {
    backgroundColor: '#1a2d1a',
    border: '1px solid #4CAF50',
    borderRadius: '6px',
    padding: '10px',
    marginTop: '12px',
  },
  extraEventsTitle: {
    color: '#4CAF50',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '6px',
  },
  extraEventItem: {
    color: '#aaa',
    fontSize: '12px',
    padding: '4px 0',
  },
  fieldingStatus: {
    padding: '12px',
    marginBottom: '12px',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#fff',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  editFieldingBtn: {
    marginLeft: 'auto',
    padding: '4px 12px',
    fontSize: '12px',
    backgroundColor: 'transparent',
    color: '#4CAF50',
    border: '1px solid #4CAF50',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  fieldingHint: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#FF9800',
    fontStyle: 'italic',
  },
  outAdvancingWarning: {
    marginTop: '6px',
    marginLeft: '24px',
    padding: '8px 12px',
    backgroundColor: '#3d1414',
    border: '1px solid #f44336',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#f44336',
  },
  outAdvancingFielding: {
    marginTop: '10px',
    marginLeft: '24px',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #444',
    borderRadius: '8px',
  },
  fieldingRow: {
    marginBottom: '10px',
  },
  fieldingLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#888',
    marginBottom: '6px',
    letterSpacing: '0.5px',
  },
  positionMiniGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
  },
  positionMiniButton: {
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#fff',
    minWidth: '32px',
  },
  fieldingHintSmall: {
    display: 'block',
    marginTop: '4px',
    fontSize: '10px',
    color: '#666',
    fontStyle: 'italic',
  },
};
