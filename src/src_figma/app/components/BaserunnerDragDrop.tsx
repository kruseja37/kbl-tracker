export interface RunnerMoveData {
  from: 'first' | 'second' | 'third';
  to: 'second' | 'third' | 'home' | 'first';
  outcome: 'safe' | 'out';
  playType: 'SB' | 'CS' | 'WP' | 'PB' | 'PICK' | 'STRETCH' | 'ERROR';
  fielderPosition?: string;
  fielderName?: string;
}

interface BaserunnerDragDropProps {
  bases: { first: boolean; second: boolean; third: boolean };
  onRunnerMove: (data: RunnerMoveData) => void;
  isAtBatInProgress: boolean;
}

export function BaserunnerDragDrop({ bases, onRunnerMove, isAtBatInProgress }: BaserunnerDragDropProps) {
  // Component placeholder - no visual elements
  return null;
}
