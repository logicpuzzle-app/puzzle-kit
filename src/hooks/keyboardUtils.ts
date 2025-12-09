/**
 * Pure utility functions for keyboard handling
 *
 * These functions have no side effects and can be easily unit tested.
 */

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcut<TContext = void> {
  /** Key or keys that trigger this shortcut */
  keys: string[];
  /** Require Ctrl/Cmd key */
  ctrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Guard function to check if shortcut should be active */
  when?: (context: TContext) => boolean;
  /** Action to execute when shortcut matches */
  run: (context: TContext, key: string, event: KeyboardEvent) => void;
}

export interface KeyModifiers {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

// ============================================================================
// Input Detection
// ============================================================================

/**
 * Check if event target is an input element (input, textarea, select)
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

/**
 * Check if event target is contenteditable
 */
export function isContentEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable;
}

/**
 * Check if event should be ignored (target is text input)
 */
export function shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
  return isInputElement(event.target) || isContentEditable(event.target);
}

// ============================================================================
// Key Normalization
// ============================================================================

/**
 * Normalize key string for comparison
 */
export function normalizeKey(key: string): string {
  return key.toLowerCase();
}

/**
 * Extract modifiers from keyboard event
 */
export function getModifiers(event: KeyboardEvent): KeyModifiers {
  return {
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
  };
}

// ============================================================================
// Shortcut Matching
// ============================================================================

/**
 * Check if a shortcut matches the given key and modifiers
 */
export function matchesShortcut<TContext>(
  shortcut: KeyboardShortcut<TContext>,
  key: string,
  modifiers: KeyModifiers,
  context: TContext
): boolean {
  // Check if key matches
  const normalizedKey = normalizeKey(key);
  if (!shortcut.keys.map(normalizeKey).includes(normalizedKey)) {
    return false;
  }

  // Check modifiers (undefined means "don't care")
  if (shortcut.ctrl !== undefined && shortcut.ctrl !== modifiers.ctrl) {
    return false;
  }
  if (shortcut.shift !== undefined && shortcut.shift !== modifiers.shift) {
    return false;
  }
  if (shortcut.alt !== undefined && shortcut.alt !== modifiers.alt) {
    return false;
  }

  // Check guard function
  if (shortcut.when && !shortcut.when(context)) {
    return false;
  }

  return true;
}

/**
 * Find and execute matching shortcut from list (first match wins)
 */
export function executeMatchingShortcut<TContext>(
  shortcuts: KeyboardShortcut<TContext>[],
  event: KeyboardEvent,
  context: TContext
): boolean {
  const key = event.key;
  const modifiers = getModifiers(event);

  for (const shortcut of shortcuts) {
    if (matchesShortcut(shortcut, key, modifiers, context)) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      shortcut.run(context, normalizeKey(key), event);
      return true;
    }
  }

  return false;
}

// ============================================================================
// Arrow Key Helpers
// ============================================================================

export interface DirectionDelta {
  dr: number;  // row delta
  dc: number;  // col delta
}

export const ARROW_DIRECTIONS: Record<string, DirectionDelta> = {
  arrowup: { dr: -1, dc: 0 },
  arrowdown: { dr: 1, dc: 0 },
  arrowleft: { dr: 0, dc: -1 },
  arrowright: { dr: 0, dc: 1 },
};

/**
 * Check if key is an arrow key
 */
export function isArrowKey(key: string): boolean {
  return normalizeKey(key) in ARROW_DIRECTIONS;
}

/**
 * Get direction delta for arrow key
 */
export function getArrowDirection(key: string): DirectionDelta | null {
  return ARROW_DIRECTIONS[normalizeKey(key)] ?? null;
}

/**
 * Calculate next position within grid bounds
 */
export function calculateNextPosition(
  current: { row: number; col: number },
  delta: DirectionDelta,
  maxRows: number,
  maxCols: number
): { row: number; col: number } {
  return {
    row: Math.max(0, Math.min(maxRows - 1, current.row + delta.dr)),
    col: Math.max(0, Math.min(maxCols - 1, current.col + delta.dc)),
  };
}

// ============================================================================
// Digit/Character Detection
// ============================================================================

/**
 * Check if key is a digit (0-9)
 */
export function isDigit(key: string): boolean {
  return /^[0-9]$/.test(key);
}

/**
 * Check if key is a single character (non-digit)
 */
export function isSingleChar(key: string): boolean {
  return key.length === 1 && !isDigit(key);
}

/**
 * Check if key is delete or backspace
 */
export function isDeleteKey(key: string): boolean {
  return key === 'Backspace' || key === 'Delete';
}

// ============================================================================
// Multi-digit Number Input
// ============================================================================

/**
 * Calculate max digits based on grid dimensions
 */
export function getMaxDigitsForGrid(
  rows: number,
  cols: number,
  isDirecType: boolean = false
): number {
  if (isDirecType) {
    // Yajilin arrow numbers: max is about half the dimension
    const maxDimension = Math.max(rows, cols);
    if (maxDimension <= 20) return 1;
    if (maxDimension <= 200) return 2;
    return 3;
  }

  // Other puzzles: based on total cells
  const totalCells = rows * cols;
  if (totalCells >= 3000) return 4;
  if (totalCells >= 300) return 3;
  return 2;
}

/**
 * Append digit to current value respecting max digits
 */
export function appendDigit(
  currentValue: string | null,
  digit: string,
  maxDigits: number
): string {
  if (!currentValue || currentValue.length >= maxDigits) {
    return digit;
  }
  return currentValue + digit;
}

/**
 * Remove last character from value (backspace behavior)
 */
export function removeLastChar(value: string | null): string | null {
  if (!value || value.length <= 1) {
    return null;
  }
  return value.slice(0, -1);
}
