/**
 * NumericInput - A user-friendly numeric input component
 *
 * Features:
 * - type="text" with inputMode="numeric" for mobile keyboard
 * - Value is committed on Enter or blur (not on every keystroke)
 * - Invalid input reverts to previous value
 * - Optional min/max validation
 * - Optional normalization function (e.g., for angle wrapping)
 * - Optional nullable mode for optional values
 */

import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  /** Current value (null for empty/unset) */
  value: number | null;
  /** Callback when value is committed */
  onChange: (value: number | null) => void;
  /** Minimum value (optional) */
  min?: number;
  /** Maximum value (optional) */
  max?: number;
  /** Custom normalization function (e.g., angle wrapping) */
  normalize?: (value: number) => number;
  /** Additional CSS classes */
  className?: string;
  /** Suffix text (e.g., "°", "px") */
  suffix?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Allow null/empty value (default: false - empty reverts to previous) */
  allowNull?: boolean;
  /** Title/tooltip text */
  title?: string;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min,
  max,
  normalize,
  className = '',
  suffix,
  placeholder,
  disabled = false,
  allowNull = false,
  title,
}) => {
  const [inputValue, setInputValue] = useState<string>(value !== null ? String(value) : '');

  // Sync input with external changes
  useEffect(() => {
    setInputValue(value !== null ? String(value) : '');
  }, [value]);

  // Commit the input value
  const commit = () => {
    const trimmed = inputValue.trim();

    // Handle empty input
    if (trimmed === '') {
      if (allowNull) {
        if (value !== null) {
          onChange(null);
        }
        return;
      } else {
        // Revert to current value if empty not allowed
        setInputValue(value !== null ? String(value) : '');
        return;
      }
    }

    const parsed = parseFloat(trimmed);

    if (isNaN(parsed)) {
      // Revert to current value if invalid
      setInputValue(value !== null ? String(value) : '');
      return;
    }

    let finalValue = parsed;

    // Apply normalization if provided
    if (normalize) {
      finalValue = normalize(finalValue);
    } else {
      // Apply min/max clamp if no custom normalize
      if (min !== undefined && finalValue < min) {
        finalValue = min;
      }
      if (max !== undefined && finalValue > max) {
        finalValue = max;
      }
    }

    // Only call onChange if value actually changed
    if (finalValue !== value) {
      onChange(finalValue);
    }
    setInputValue(String(finalValue));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      // Revert on escape
      setInputValue(value !== null ? String(value) : '');
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center">
      <input
        type="text"
        inputMode="numeric"
        className={`px-1 py-0.5 text-xs text-center border border-office-border rounded focus:border-office-accent focus:outline-none ${
          disabled ? 'bg-gray-100 text-gray-400' : ''
        } ${className}`}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        title={title}
      />
      {suffix && (
        <span className="text-xs text-office-text-secondary ml-0.5">{suffix}</span>
      )}
    </div>
  );
};

export default NumericInput;
