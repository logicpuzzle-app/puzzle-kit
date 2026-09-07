import React from 'react';

export type SegmentedToggleOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

type SegmentedToggleProps<T extends string> = {
  value: T;
  options: Array<SegmentedToggleOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
};

export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  className = '',
  buttonClassName = '',
  disabled = false,
}: SegmentedToggleProps<T>) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      {options.map((option, index) => {
        const isActive = option.value === value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        const isDisabled = disabled || option.disabled;

        const classes = [
          buttonClassName,
          'border transition-colors',
          isFirst ? 'rounded-l-sm' : '',
          isLast ? 'rounded-r-sm' : '',
          isFirst ? '' : '-ml-px',
          isActive
            ? 'bg-office-accent text-white border-office-accent relative z-10'
            : 'bg-white border-office-border hover:bg-office-ribbon-hover',
          isDisabled ? 'opacity-50 cursor-not-allowed hover:bg-white' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={option.value}
            type="button"
            className={classes}
            onClick={() => !isDisabled && onChange(option.value)}
            title={option.title}
            aria-label={option.ariaLabel ?? option.title}
            aria-pressed={isActive}
            disabled={isDisabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
