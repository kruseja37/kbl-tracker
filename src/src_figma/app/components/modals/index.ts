/**
 * Substitution Modals Index
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Exports all 6 substitution modal components
 */

// Base components
export {
  SubstitutionModalBase,
  ModalSection,
  PlayerSelect,
  PositionSelect,
  NumberInput,
  ModalButton,
  ModalActions,
  RunnerDisplay,
  PitcherLineDisplay,
} from './SubstitutionModalBase';

// Substitution modals
export { PitchingChangeModal } from './PitchingChangeModal';
export { PinchHitterModal } from './PinchHitterModal';
export { PinchRunnerModal } from './PinchRunnerModal';
export { DefensiveSubModal } from './DefensiveSubModal';
export { DoubleSwitchModal } from './DoubleSwitchModal';
export { PositionSwitchModal } from './PositionSwitchModal';
