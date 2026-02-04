/**
 * SubstitutionModalBase - Shared base for all substitution modals
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 * Provides consistent styling and structure for all 6 substitution modal types.
 */

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface SubstitutionModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function SubstitutionModalBase({
  isOpen,
  onClose,
  title,
  icon = '🔄',
  children,
  width = 'lg',
}: SubstitutionModalBaseProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className={`bg-[#5A8352] border-[5px] border-[#FFD700] w-full ${WIDTH_CLASSES[width]} max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="bg-[#4A6844] border-b-[3px] border-[#3F5A3A] p-4 flex items-center justify-between">
          <div className="text-sm text-[#E8E8D8] font-bold">
            {icon} {title}
          </div>
          <button
            onClick={onClose}
            className="text-[#E8E8D8] hover:text-[#DD0000] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SHARED SUB-COMPONENTS
// ============================================

interface SectionProps {
  title: string;
  children: ReactNode;
  variant?: 'default' | 'highlight';
}

export function ModalSection({ title, children, variant = 'default' }: SectionProps) {
  const borderColor = variant === 'highlight' ? 'border-[#5599FF]' : 'border-[#3F5A3A]';

  return (
    <div className={`bg-[#4A6844] border-[3px] ${borderColor} p-4 mb-4`}>
      <div className="text-xs text-[#E8E8D8] font-bold mb-3">{title}</div>
      {children}
    </div>
  );
}

interface PlayerSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  players: Array<{ id: string; name: string; position?: string; number?: string }>;
  placeholder?: string;
  disabled?: boolean;
}

export function PlayerSelect({
  label,
  value,
  onChange,
  players,
  placeholder = 'Select player...',
  disabled = false,
}: PlayerSelectProps) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
            {player.position && ` (${player.position})`}
            {player.number && ` #${player.number}`}
          </option>
        ))}
      </select>
    </div>
  );
}

interface PositionSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  positions: string[];
  placeholder?: string;
}

export function PositionSelect({
  label,
  value,
  onChange,
  positions,
  placeholder = 'Select position...',
}: PositionSelectProps) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8]"
      >
        <option value="">{placeholder}</option>
        {positions.map((pos) => (
          <option key={pos} value={pos}>
            {pos}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  placeholder?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  placeholder = '',
}: NumberInputProps) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] text-[#E8E8D8]/80 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '') {
            onChange('');
          } else {
            const num = parseInt(val);
            if (!isNaN(num)) {
              onChange(num);
            }
          }
        }}
        min={min}
        max={max}
        placeholder={placeholder}
        className="w-full bg-[#2A3424] border-[2px] border-[#5599FF] p-2 text-xs text-[#E8E8D8] placeholder:text-[#E8E8D8]/40"
      />
    </div>
  );
}

interface ModalButtonProps {
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function ModalButton({
  onClick,
  variant,
  disabled = false,
  children,
  className = '',
}: ModalButtonProps) {
  const variantClasses = {
    primary: 'bg-[#5599FF] border-[#3366FF] text-[#E8E8D8] hover:bg-[#3366FF]',
    secondary: 'bg-[#4A6844] border-[#3F5A3A] text-[#E8E8D8] hover:bg-[#3F5A3A]',
    danger: 'bg-[#DD0000] border-[#AA0000] text-white hover:bg-[#AA0000]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border-[3px] py-2 px-4 text-xs font-bold active:scale-95 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

interface ModalActionsProps {
  children: ReactNode;
}

export function ModalActions({ children }: ModalActionsProps) {
  return <div className="flex gap-3 justify-end mt-4">{children}</div>;
}

// ============================================
// RUNNER DISPLAY COMPONENT
// ============================================

interface RunnerDisplayProps {
  runners: Array<{
    base: '1B' | '2B' | '3B';
    runnerId: string;
    runnerName: string;
    howReached?: string;
  }>;
  title?: string;
}

export function RunnerDisplay({ runners, title = 'RUNNERS ON BASE' }: RunnerDisplayProps) {
  if (runners.length === 0) {
    return (
      <div className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-4 mb-4">
        <div className="text-xs text-[#E8E8D8]/60 text-center">No runners on base</div>
      </div>
    );
  }

  return (
    <div className="bg-[#4A6844] border-[3px] border-[#FFD700] p-4 mb-4">
      <div className="text-xs text-[#E8E8D8] font-bold mb-3">{title}</div>
      <div className="space-y-2">
        {runners.map((runner) => (
          <div
            key={runner.base}
            className="flex items-center justify-between bg-[#3A5434] p-2 border-[2px] border-[#5599FF]"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FFD700]">{runner.base}</span>
              <span className="text-xs text-[#E8E8D8]">{runner.runnerName}</span>
            </div>
            {runner.howReached && (
              <span className="text-[10px] text-[#E8E8D8]/60">{runner.howReached}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PITCHER LINE DISPLAY
// ============================================

interface PitcherLineDisplayProps {
  label: string;
  stats: {
    ip: number;
    h: number;
    r: number;
    er: number;
    bb: number;
    k: number;
    hr?: number;
  };
}

export function PitcherLineDisplay({ label, stats }: PitcherLineDisplayProps) {
  // Convert outs to IP display (e.g., 6 outs = 2.0 IP, 7 outs = 2.1 IP)
  const fullInnings = Math.floor(stats.ip / 3);
  const partialOuts = stats.ip % 3;
  const ipDisplay = partialOuts === 0 ? `${fullInnings}.0` : `${fullInnings}.${partialOuts}`;

  return (
    <div className="bg-[#3A5434] border-[2px] border-[#5599FF] p-3 mb-3">
      <div className="text-[10px] text-[#E8E8D8]/80 mb-2">{label}</div>
      <div className="grid grid-cols-7 gap-2 text-center">
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60">IP</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{ipDisplay}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60">H</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{stats.h}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60">R</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{stats.r}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60">ER</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{stats.er}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60">BB</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{stats.bb}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60">K</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{stats.k}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60">HR</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{stats.hr ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
