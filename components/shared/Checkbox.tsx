import React, { memo } from 'react';
import { CheckIcon } from '../icons/CheckIcon';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

const CheckboxComponent: React.FC<CheckboxProps> = ({ checked, onChange, disabled = false, 'aria-label': ariaLabel }) => {
  const baseClasses = 'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface';
  
  const stateClasses = checked
    ? 'bg-primary border-primary'
    : 'bg-surface border-border';

  const disabledClasses = disabled
    ? 'cursor-not-allowed opacity-50'
    : 'cursor-pointer hover:border-primary';

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
      className={`${baseClasses} ${stateClasses} ${disabledClasses}`}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if (!disabled && e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      {checked && <CheckIcon className="w-4 h-4 text-white" />}
    </div>
  );
};

export const Checkbox = memo(CheckboxComponent);