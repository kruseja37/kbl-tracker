import { useState, useEffect } from 'react';
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
import FieldingModal from './FieldingModal';


interface AtBatFlowProps {
  result: AtBatResult;
  bases: Bases;
  batterName: string;
  outs: number;
  onComplete: (flowState: AtBatFlowState) => void;
  onCancel: () => void;
}

const directions: Direction[] = ['Left', 'Left-Center', 'Center', 'Right-Center', 'Right'];
const exitTypes: ExitType[] = ['Ground', 'Line Drive', 'Fly Ball', 'Pop Up'];
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
const dpTypes = ['6-4-3', '4-6-3', '5-4-3', '3-6-3', '6-3', '4-3', '1-6-3', 'Other'];

export default function AtBatFlow({ result: initialResult, bases, batterName, outs, onComplete, onCancel }: AtBatFlowProps) {
  // Track the current result (can be auto-corrected based on runner outcomes)
  const [result, setResult] = useState<AtBatResult>(initialResult);
  const [autoCorrection, setAutoCorrection] = useState<string | null>(null);

  const [direction, setDirection] = useState<Direction | null>(null);
  const [exitType, setExitType] = useState<ExitType | null>(null);
  const [fielder, setFielder] = useState<Position | null>(null);
  const [hrDistance, setHrDistance] = useState<string>('');
  const [specialPlay, setSpecialPlay] = useState<SpecialPlayType | null>(null);
  const [savedRun, setSavedRun] = useState(false);
  const [is7PlusPitchAB, setIs7PlusPitchAB] = useState(false);
  const [beatOutSingle, setBeatOutSingle] = useState(false);
  const [dpType, setDpType] = useState<string | null>(null);

  // Batter thrown out advancing (e.g., double but out stretching to 3B)
  const [batterOutAdvancing, setBatterOutAdvancing] = useState(false);
  const [outAdvancingPutout, setOutAdvancingPutout] = useState<Position | null>(null);
  const [outAdvancingAssists, setOutAdvancingAssists] = useState<Position[]>([]);

  // Runner outcomes - what happened to each runner
  const [runnerOutcomes, setRunnerOutcomes] = useState<{
    first: RunnerOutcome | null;
    second: RunnerOutcome | null;
    third: RunnerOutcome | null;
  }>({ first: null, second: null, third: null });

  // Extra events inferred from non-standard advancement
  const [extraEvents, setExtraEvents] = useState<ExtraEvent[]>([]);

  // Which runner needs extra event explanation (null if none)
  const [pendingExtraEvent, setPendingExtraEvent] = useState<{
    base: 'first' | 'second' | 'third';
    outcome: RunnerOutcome;
  } | null>(null);

  // Fielding modal state
  const [showFieldingModal, setShowFieldingModal] = useState(false);
  const [fieldingData, setFieldingData] = useState<FieldingData | null>(null);

  // Helper to count runner outs from outcomes
  const countRunnerOuts = (outcomes: typeof runnerOutcomes): number => {
    let count = 0;
    if (outcomes.first && outcomes.first.startsWith('OUT_')) count++;
    if (outcomes.second && outcomes.second.startsWith('OUT_')) count++;
    if (outcomes.third && outcomes.third.startsWith('OUT_')) count++;
    return count;
  };

  // Auto-correction logic
  const checkAutoCorrection = (newOutcomes: typeof runnerOutcomes) => {
    // FO → SF: If runner from 3rd scores on a fly out with less than 2 outs, it's a sac fly
    if (initialResult === 'FO' && outs < 2 && bases.third && newOutcomes.third === 'SCORED') {
      setResult('SF');
      setAutoCorrection('Auto-corrected to Sac Fly (runner scored from 3rd on fly out)');
    }
    // If they change their mind and the runner didn't score, revert to FO
    else if (initialResult === 'FO' && result === 'SF' && newOutcomes.third !== 'SCORED') {
      setResult('FO');
      setAutoCorrection(null);
    }
    // GO → DP: If GO with a runner out, and total outs = 2, it's a double play (BUG-003 fix)
    else if (initialResult === 'GO' && outs < 2) {
      const runnerOutsCount = countRunnerOuts(newOutcomes);

      // If a runner is out, and we'd record 2 total outs (batter + runner), auto-correct to DP
      if (runnerOutsCount >= 1) {
        // GO = batter out (1) + runner out (1) = 2 outs recorded = DP
        setResult('DP');
        setAutoCorrection('Auto-corrected to Double Play (2 outs recorded: batter + runner)');
      }
      // If no runner outs but runner advances, suggest SAC (but don't auto-correct)
      else {
        const runnerAdvanced =
          (bases.first && (newOutcomes.first === 'TO_2B' || newOutcomes.first === 'TO_3B' || newOutcomes.first === 'SCORED')) ||
          (bases.second && (newOutcomes.second === 'TO_3B' || newOutcomes.second === 'SCORED')) ||
          (bases.third && newOutcomes.third === 'SCORED');

        if (runnerAdvanced && result !== 'SAC') {
          // Don't auto-correct GO to SAC, but show a hint
          setAutoCorrection('Tip: If this was an intentional sacrifice bunt, use SAC instead');
        } else if (!runnerAdvanced) {
          setAutoCorrection(null);
        }
      }
    }
    // If user selected GO but it was auto-corrected to DP, and they remove runner outs, revert to GO
    else if (initialResult === 'GO' && result === 'DP') {
      const runnerOutsCount = countRunnerOuts(newOutcomes);
      if (runnerOutsCount === 0) {
        setResult('GO');
        setAutoCorrection(null);
      }
    }
  };

  // Wrapper for setting runner outcomes that also checks for auto-corrections
  const handleRunnerOutcomeChange = (newOutcomes: typeof runnerOutcomes) => {
    setRunnerOutcomes(newOutcomes);
    checkAutoCorrection(newOutcomes);
  };

  // ============================================
  // FORCE PLAY LOGIC
  // ============================================

  // Check if a runner is forced to advance based on result and base state
  const isRunnerForced = (base: 'first' | 'second' | 'third'): boolean => {
    // On walks/HBP, only runners with occupied bases behind them are forced
    if (['BB', 'IBB', 'HBP'].includes(result)) {
      if (base === 'first') return true; // R1 always forced (batter takes 1B)
      if (base === 'second') return !!bases.first; // R2 forced only if R1 exists
      if (base === 'third') return !!bases.first && !!bases.second; // R3 forced only if bases loaded
    }

    // On singles, batter takes 1B so R1 is forced
    if (result === '1B') {
      if (base === 'first') return true;
      return false;
    }

    // On doubles, batter takes 2B so R1 and R2 are forced
    if (result === '2B') {
      if (base === 'first') return true;
      if (base === 'second') return true;
      return false;
    }

    // On triples, batter takes 3B so all runners must vacate
    if (result === '3B') {
      return true;
    }

    // FC where batter reaches 1B
    if (result === 'FC') {
      if (base === 'first') return true;
      return false;
    }

    // On outs (GO, FO, LO, PO, K, etc.), batter doesn't reach - no forces
    return false;
  };

  // Get minimum base a runner must advance to (null if not forced)
  const getMinimumAdvancement = (base: 'first' | 'second' | 'third'): 'second' | 'third' | 'home' | null => {
    if (!isRunnerForced(base)) return null;

    // On doubles, R1 must go to at least 3B (batter takes 2B)
    if (result === '2B') {
      if (base === 'first') return 'third';
      if (base === 'second') return 'third'; // R2 must vacate for batter
    }

    // On triples, all must score
    if (result === '3B') {
      return 'home';
    }

    // Default: advance one base
    if (base === 'first') return 'second';
    if (base === 'second') return 'third';
    if (base === 'third') return 'home';

    return null;
  };

  // ============================================
  // EXTRA ADVANCEMENT DETECTION
  // ============================================

  // Check if a runner advancement exceeds what's standard for the result
  // Extra advancement requires an additional event (SB, WP, PB, E, BALK)
  const isExtraAdvancement = (
    base: 'first' | 'second' | 'third',
    outcome: RunnerOutcome
  ): boolean => {
    // Map outcome to destination
    const destination = outcomeToDestination(outcome);
    if (!destination) return false; // HELD or OUT doesn't need extra event

    // ============================================
    // WALKS (BB, IBB, HBP)
    // Standard: forced runners advance exactly 1 base
    // Extra: any advancement beyond +1 base
    // ============================================
    if (['BB', 'IBB', 'HBP'].includes(result)) {
      // R1: Standard is TO_2B, anything beyond is extra
      if (base === 'first') {
        return destination !== '2B'; // TO_3B or HOME = extra
      }
      // R2: If forced (R1 exists), standard is TO_3B. If not forced, any advance is extra
      if (base === 'second') {
        if (isRunnerForced('second')) {
          return destination === 'HOME'; // Forced R2 scoring = extra
        } else {
          return true; // Non-forced R2 advancing at all = extra
        }
      }
      // R3: If forced (bases loaded), scoring is standard. Otherwise any advance is extra
      if (base === 'third') {
        if (isRunnerForced('third')) {
          return false; // Forced R3 scoring = standard
        } else {
          return destination === 'HOME'; // Non-forced R3 scoring = extra
        }
      }
    }

    // ============================================
    // STRIKEOUTS (K, KL)
    // Standard: runners hold
    // Extra: any advancement requires WP, PB, or SB
    // ============================================
    if (['K', 'KL'].includes(result)) {
      return true; // Any advancement on K requires extra event
    }

    // ============================================
    // SINGLES (1B)
    // R1 scoring on a single is rare - likely error
    // ============================================
    if (result === '1B') {
      if (base === 'first' && destination === 'HOME') return true;
    }

    return false;
  };

  // Convert outcome to destination base
  const outcomeToDestination = (outcome: RunnerOutcome): '2B' | '3B' | 'HOME' | null => {
    switch (outcome) {
      case 'TO_2B': return '2B';
      case 'TO_3B': return '3B';
      case 'SCORED': return 'HOME';
      default: return null;
    }
  };

  // Convert base to display string
  const baseToString = (base: 'first' | 'second' | 'third'): '1B' | '2B' | '3B' => {
    return base === 'first' ? '1B' : base === 'second' ? '2B' : '3B';
  };

  // Get possible extra events that could explain the advancement
  const getPossibleExtraEvents = (): ExtraEventType[] => {
    // Most common scenarios
    return ['SB', 'WP', 'PB', 'E', 'BALK'];
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

    setExtraEvents([...extraEvents, newExtraEvent]);
    setPendingExtraEvent(null);
  };

  // Enhanced runner outcome handler that checks for extra advancement
  // FIX: Clear existing extra events for this runner when selection changes
  const handleRunnerOutcomeWithInference = (
    base: 'first' | 'second' | 'third',
    outcome: RunnerOutcome
  ) => {
    const newOutcomes = { ...runnerOutcomes, [base]: outcome };
    const runner = bases[base];
    const runnerName = runner?.playerName || '';

    // CRITICAL FIX: Clear any pending extra event for this runner
    if (pendingExtraEvent && pendingExtraEvent.base === base) {
      setPendingExtraEvent(null);
    }

    // CRITICAL FIX: Remove any existing extra events for this runner
    // This prevents stacking when user changes their selection
    const filteredExtraEvents = extraEvents.filter(ev => ev.runner !== runnerName);
    if (filteredExtraEvents.length !== extraEvents.length) {
      setExtraEvents(filteredExtraEvents);
    }

    // Check if this is extra advancement that needs explanation
    const isExtra = isExtraAdvancement(base, outcome);

    if (isExtra) {
      setPendingExtraEvent({ base, outcome });
    }

    handleRunnerOutcomeChange(newOutcomes);
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
    setDirection(dir);
    if (needsFielder) {
      const inferred = inferFielder(result, dir);
      if (inferred) setFielder(inferred);
    }
  };

  // Get runner outcome options based on which base they're on, the result, and force rules
  const getRunnerOptions = (base: 'first' | 'second' | 'third'): { value: RunnerOutcome; label: string; isExtra?: boolean }[] => {
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

  // Get default/standard outcome for a runner based on result type
  // NOTE: This returns the EXPECTED/STANDARD outcome, not just the minimum required
  const getDefaultOutcome = (base: 'first' | 'second' | 'third'): RunnerOutcome | null => {
    const minAdvance = getMinimumAdvancement(base);
    const forced = isRunnerForced(base);

    // ============================================
    // HITS - Handle based on hit type
    // ============================================
    
    // DOUBLE (2B): R2 scores, R1 goes to 3B (not just minimum)
    if (result === '2B') {
      if (base === 'third') return 'SCORED';
      if (base === 'second') return 'SCORED'; // R2 typically scores on double
      if (base === 'first') return 'TO_3B';   // R1 to 3B
    }

    // TRIPLE (3B): All runners score
    if (result === '3B') {
      return 'SCORED';
    }

    // SINGLE (1B): Standard advancement
    if (result === '1B') {
      if (base === 'third') return 'SCORED';
      if (base === 'second') return 'TO_3B';
      if (base === 'first') return 'TO_2B';
    }

    // HR: All score (handled automatically, but just in case)
    if (result === 'HR') {
      return 'SCORED';
    }

    // ============================================
    // WALKS/HBP - Forced runners advance one base, others hold
    // ============================================
    if (['BB', 'IBB', 'HBP'].includes(result)) {
      if (forced && minAdvance) {
        if (minAdvance === 'home') return 'SCORED';
        if (minAdvance === 'third') return 'TO_3B';
        if (minAdvance === 'second') return 'TO_2B';
      }
      return 'HELD'; // Non-forced runners hold
    }

    // ============================================
    // OUTS - Most runners hold
    // ============================================

    // STRIKEOUTS (K, KL): Runners almost always hold
    if (['K', 'KL', 'D3K'].includes(result)) {
      return 'HELD';
    }

    // GROUND OUTS (GO): Runners typically hold unless advancing
    if (result === 'GO') {
      return 'HELD';
    }

    // FLY OUTS (FO, LO, PO): Runners typically hold
    // Exception: R3 can tag up on FO with < 2 outs
    if (['FO', 'LO', 'PO'].includes(result)) {
      if (base === 'third' && result === 'FO' && outs < 2) {
        return 'SCORED'; // Tag up opportunity
      }
      return 'HELD';
    }

    // DOUBLE PLAY (DP): R1 is typically out, others hold
    if (result === 'DP') {
      if (base === 'first') return 'OUT_2B';
      return 'HELD';
    }

    // SACRIFICE FLY (SF): R3 scores (that's what makes it a SF)
    if (result === 'SF') {
      if (base === 'third') return 'SCORED';
      return 'HELD';
    }

    // SACRIFICE BUNT (SAC): Runners typically advance one base
    if (result === 'SAC') {
      if (base === 'first') return 'TO_2B';
      if (base === 'second') return 'TO_3B';
      return 'HELD';
    }

    // FIELDER'S CHOICE (FC): R1 typically out, batter reaches
    if (result === 'FC') {
      if (base === 'first') return 'OUT_2B';
      return 'HELD';
    }

    // ERROR (E): Runners can advance, default to +1 base
    if (result === 'E') {
      if (base === 'third') return 'SCORED';
      if (base === 'second') return 'TO_3B';
      if (base === 'first') return 'TO_2B';
    }

    // For any other outs, default to held
    if (isOut(result)) {
      return 'HELD';
    }

    return null;
  };

  // ============================================
  // AUTO-DEFAULT RUNNER OUTCOMES ON MOUNT
  // ============================================
  useEffect(() => {
    // Only auto-default if we have runners and no outcomes set yet
    const hasRunners = bases.first || bases.second || bases.third;
    const hasOutcomes = runnerOutcomes.first || runnerOutcomes.second || runnerOutcomes.third;
    
    if (hasRunners && !hasOutcomes) {
      const defaults: typeof runnerOutcomes = {
        first: bases.first ? getDefaultOutcome('first') : null,
        second: bases.second ? getDefaultOutcome('second') : null,
        third: bases.third ? getDefaultOutcome('third') : null,
      };
      
      // Only set if we have actual defaults
      if (defaults.first || defaults.second || defaults.third) {
        // Use handleRunnerOutcomeChange to trigger auto-correction check
        handleRunnerOutcomeChange(defaults);
      }
    }
  }, [result, bases.first, bases.second, bases.third]); // Re-run if result or bases change

  // ============================================
  // AUTO-DEFAULT SPECIAL PLAY FOR HITS
  // ============================================
  useEffect(() => {
    // For HRs, default to "Over Fence" (ball cleared the wall - BUG-015 fix)
    // For other hits, default to "Clean" (no fielding attempt)
    // For outs, default to "Routine"
    if (result === 'HR' && specialPlay === null) {
      setSpecialPlay('Over Fence');
    } else if (['1B', '2B', '3B'].includes(result) && specialPlay === null) {
      setSpecialPlay('Clean');
    } else if (['FO', 'LO', 'GO', 'PO'].includes(result) && specialPlay === null) {
      setSpecialPlay('Routine');
    }
  }, [result]); // Only run when result changes

  // Calculate RBIs from runner outcomes
  const calculateRBIs = (): number => {
    let rbis = 0;

    // Count runners who scored
    if (runnerOutcomes.first === 'SCORED') rbis++;
    if (runnerOutcomes.second === 'SCORED') rbis++;
    if (runnerOutcomes.third === 'SCORED') rbis++;

    // HR adds batter's run as RBI
    if (result === 'HR') {
      rbis = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0) + 1;
    }

    // Errors don't give RBIs
    if (result === 'E') {
      rbis = 0;
    }

    // DP doesn't give RBIs even if run scores
    if (result === 'DP') {
      rbis = 0;
    }

    return rbis;
  };

  // Check if basic inputs are ready (before fielding modal)
  const canProceedToFielding = (): boolean => {
    if (needsDirection && !direction) return false;
    // Exit type is now collected in FieldingModal, not here
    if (needsHRDistance && !hrDistance) return false;
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

    const flowState: AtBatFlowState = {
      step: 'CONFIRM',
      result,
      direction,
      exitType,
      fielder: fieldingData?.primaryFielder || fielder,
      hrDistance: hrDistance ? parseInt(hrDistance) : null,
      specialPlay: fieldingData?.playType === 'diving' ? 'Diving' :
                   fieldingData?.playType === 'wall' ? 'Wall Catch' :
                   fieldingData?.playType === 'leaping' ? 'Leaping' :
                   fieldingData?.playType === 'charging' ? 'Running' :
                   specialPlay,
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
    setFieldingData(data);
    setFielder(data.primaryFielder);
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

        {/* Exit Type Selection */}
        {needsExitType && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>EXIT TYPE:</div>
            <div style={styles.buttonRow}>
              {exitTypes.map(type => (
                <button
                  key={type}
                  style={{
                    ...styles.optionButton,
                    backgroundColor: exitType === type ? '#4CAF50' : '#333',
                    color: exitType === type ? '#000' : '#fff',
                  }}
                  onClick={() => setExitType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HR Distance */}
        {needsHRDistance && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>DISTANCE (ft):</div>
            <input
              type="number"
              value={hrDistance}
              onChange={e => setHrDistance(e.target.value)}
              placeholder="e.g., 420"
              style={styles.input}
            />
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
                  onClick={() => setFielder(pos)}
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
                  onClick={() => setDpType(type)}
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
                  onClick={() => setSpecialPlay(play)}
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
                    onChange={e => setSavedRun(e.target.checked)}
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
                      {eventType === 'BALK' && 'Balk'}
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
                    {ev.event === 'BALK' && `Balk: ${ev.runner} advances to ${ev.to === 'HOME' ? 'Home' : ev.to}`}
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
              onChange={e => setIs7PlusPitchAB(e.target.checked)}
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
                onChange={e => setBeatOutSingle(e.target.checked)}
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
                onChange={e => {
                  setBatterOutAdvancing(e.target.checked);
                  if (!e.target.checked) {
                    setOutAdvancingPutout(null);
                    setOutAdvancingAssists([]);
                  }
                }}
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
                          onClick={() => setOutAdvancingPutout(pos)}
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
                          onClick={() => {
                            if (outAdvancingAssists.includes(pos)) {
                              setOutAdvancingAssists(outAdvancingAssists.filter(p => p !== pos));
                            } else {
                              setOutAdvancingAssists([...outAdvancingAssists, pos]);
                            }
                          }}
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
          <button
            style={{
              ...styles.submitButton,
              opacity: canProceedToFielding() ? 1 : 0.5,
              backgroundColor: '#2196F3',
            }}
            onClick={handleProceedToFielding}
            disabled={!canProceedToFielding()}
          >
            Continue to Fielding →
          </button>
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
