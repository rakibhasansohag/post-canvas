'use client';
import type { LucideIcon } from 'lucide-react';

/** Props of `ToolButton`. */
export interface ToolButtonProps {
  icon: LucideIcon;
  /** Already translated. Used as the accessible name and the tooltip. */
  label: string;
  onClick: () => void;
  /** Set for toggles: `true` or `false`. Leave out for plain buttons. */
  pressed?: boolean;
  disabled?: boolean;
}

/** A small round icon button, for a block's overlay toolbar. */
export function ToolButton({ icon: Icon, label, onClick, pressed, disabled }: ToolButtonProps) {
  return (
    <button
      type="button"
      className="pc-tool-button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
