import { describe, it, expect } from 'vitest';
import {
  isInputElement,
  shouldIgnoreKeyEvent,
  normalizeKey,
  getModifiers,
  matchesShortcut,
  isArrowKey,
  getArrowDirection,
  calculateNextPosition,
  isDigit,
  isSingleChar,
  isDeleteKey,
  getMaxDigitsForGrid,
  appendDigit,
  removeLastChar,
  type KeyboardShortcut,
  type KeyModifiers,
} from '../hooks/keyboardUtils';

describe('keyboardUtils', () => {
  describe('isInputElement', () => {
    it('returns false for null', () => {
      expect(isInputElement(null)).toBe(false);
    });

    it('returns false for non-element targets', () => {
      expect(isInputElement({} as EventTarget)).toBe(false);
    });
  });

  describe('normalizeKey', () => {
    it('converts to lowercase', () => {
      expect(normalizeKey('A')).toBe('a');
      expect(normalizeKey('ArrowUp')).toBe('arrowup');
    });

    it('preserves already lowercase', () => {
      expect(normalizeKey('a')).toBe('a');
      expect(normalizeKey('1')).toBe('1');
    });
  });

  describe('isArrowKey', () => {
    it('returns true for arrow keys', () => {
      expect(isArrowKey('ArrowUp')).toBe(true);
      expect(isArrowKey('arrowdown')).toBe(true);
      expect(isArrowKey('ArrowLeft')).toBe(true);
      expect(isArrowKey('ARROWRIGHT')).toBe(true);
    });

    it('returns false for non-arrow keys', () => {
      expect(isArrowKey('a')).toBe(false);
      expect(isArrowKey('Enter')).toBe(false);
      expect(isArrowKey('Up')).toBe(false);
    });
  });

  describe('getArrowDirection', () => {
    it('returns correct delta for up', () => {
      expect(getArrowDirection('ArrowUp')).toEqual({ dr: -1, dc: 0 });
    });

    it('returns correct delta for down', () => {
      expect(getArrowDirection('ArrowDown')).toEqual({ dr: 1, dc: 0 });
    });

    it('returns correct delta for left', () => {
      expect(getArrowDirection('ArrowLeft')).toEqual({ dr: 0, dc: -1 });
    });

    it('returns correct delta for right', () => {
      expect(getArrowDirection('ArrowRight')).toEqual({ dr: 0, dc: 1 });
    });

    it('returns null for non-arrow keys', () => {
      expect(getArrowDirection('a')).toBe(null);
    });
  });

  describe('calculateNextPosition', () => {
    it('moves within bounds', () => {
      const current = { row: 5, col: 5 };
      expect(calculateNextPosition(current, { dr: -1, dc: 0 }, 10, 10)).toEqual({ row: 4, col: 5 });
      expect(calculateNextPosition(current, { dr: 1, dc: 0 }, 10, 10)).toEqual({ row: 6, col: 5 });
      expect(calculateNextPosition(current, { dr: 0, dc: -1 }, 10, 10)).toEqual({ row: 5, col: 4 });
      expect(calculateNextPosition(current, { dr: 0, dc: 1 }, 10, 10)).toEqual({ row: 5, col: 6 });
    });

    it('clamps to upper bounds', () => {
      const current = { row: 9, col: 9 };
      expect(calculateNextPosition(current, { dr: 1, dc: 0 }, 10, 10)).toEqual({ row: 9, col: 9 });
      expect(calculateNextPosition(current, { dr: 0, dc: 1 }, 10, 10)).toEqual({ row: 9, col: 9 });
    });

    it('clamps to lower bounds', () => {
      const current = { row: 0, col: 0 };
      expect(calculateNextPosition(current, { dr: -1, dc: 0 }, 10, 10)).toEqual({ row: 0, col: 0 });
      expect(calculateNextPosition(current, { dr: 0, dc: -1 }, 10, 10)).toEqual({ row: 0, col: 0 });
    });
  });

  describe('isDigit', () => {
    it('returns true for digits', () => {
      for (let i = 0; i <= 9; i++) {
        expect(isDigit(String(i))).toBe(true);
      }
    });

    it('returns false for non-digits', () => {
      expect(isDigit('a')).toBe(false);
      expect(isDigit('')).toBe(false);
      expect(isDigit('10')).toBe(false);
    });
  });

  describe('isSingleChar', () => {
    it('returns true for single non-digit characters', () => {
      expect(isSingleChar('a')).toBe(true);
      expect(isSingleChar('Z')).toBe(true);
      expect(isSingleChar('!')).toBe(true);
    });

    it('returns false for digits', () => {
      expect(isSingleChar('5')).toBe(false);
    });

    it('returns false for multi-character strings', () => {
      expect(isSingleChar('ab')).toBe(false);
      expect(isSingleChar('Enter')).toBe(false);
    });
  });

  describe('isDeleteKey', () => {
    it('returns true for delete keys', () => {
      expect(isDeleteKey('Backspace')).toBe(true);
      expect(isDeleteKey('Delete')).toBe(true);
    });

    it('returns false for other keys', () => {
      expect(isDeleteKey('a')).toBe(false);
      expect(isDeleteKey('Enter')).toBe(false);
    });
  });

  describe('getMaxDigitsForGrid', () => {
    describe('for direc type (Yajilin)', () => {
      it('returns 1 for small grids', () => {
        expect(getMaxDigitsForGrid(10, 10, true)).toBe(1);
        expect(getMaxDigitsForGrid(20, 20, true)).toBe(1);
      });

      it('returns 2 for medium grids', () => {
        expect(getMaxDigitsForGrid(50, 50, true)).toBe(2);
        expect(getMaxDigitsForGrid(200, 200, true)).toBe(2);
      });

      it('returns 3 for large grids', () => {
        expect(getMaxDigitsForGrid(300, 300, true)).toBe(3);
      });

      it('returns 4 for huge grids', () => {
        expect(getMaxDigitsForGrid(3000, 3000, true)).toBe(4);
      });
    });

    describe('for regular puzzles', () => {
      it('returns 2 for small grids', () => {
        expect(getMaxDigitsForGrid(10, 10, false)).toBe(2); // 100 cells
      });

      it('returns 3 for medium grids', () => {
        expect(getMaxDigitsForGrid(20, 20, false)).toBe(3); // 400 cells
      });

      it('returns 4 for large grids', () => {
        expect(getMaxDigitsForGrid(60, 60, false)).toBe(4); // 3600 cells
      });
    });
  });

  describe('appendDigit', () => {
    it('starts with digit when no current value', () => {
      expect(appendDigit(null, '5', 3)).toBe('5');
    });

    it('appends digit when under max', () => {
      expect(appendDigit('1', '2', 3)).toBe('12');
      expect(appendDigit('12', '3', 3)).toBe('123');
    });

    it('replaces when at max digits', () => {
      expect(appendDigit('123', '4', 3)).toBe('4');
    });
  });

  describe('removeLastChar', () => {
    it('returns null for null input', () => {
      expect(removeLastChar(null)).toBe(null);
    });

    it('returns null for single character', () => {
      expect(removeLastChar('5')).toBe(null);
    });

    it('removes last character', () => {
      expect(removeLastChar('123')).toBe('12');
      expect(removeLastChar('12')).toBe('1');
    });
  });

  describe('matchesShortcut', () => {
    it('matches key without modifiers', () => {
      const shortcut: KeyboardShortcut<void> = {
        keys: ['a'],
        run: () => {},
      };
      const modifiers: KeyModifiers = { ctrl: false, shift: false, alt: false };
      expect(matchesShortcut(shortcut, 'a', modifiers, undefined)).toBe(true);
      expect(matchesShortcut(shortcut, 'A', modifiers, undefined)).toBe(true);
      expect(matchesShortcut(shortcut, 'b', modifiers, undefined)).toBe(false);
    });

    it('matches with ctrl modifier', () => {
      const shortcut: KeyboardShortcut<void> = {
        keys: ['z'],
        ctrl: true,
        run: () => {},
      };
      expect(matchesShortcut(shortcut, 'z', { ctrl: true, shift: false, alt: false }, undefined)).toBe(true);
      expect(matchesShortcut(shortcut, 'z', { ctrl: false, shift: false, alt: false }, undefined)).toBe(false);
    });

    it('matches with when guard', () => {
      const shortcut: KeyboardShortcut<{ enabled: boolean }> = {
        keys: ['a'],
        when: (ctx) => ctx.enabled,
        run: () => {},
      };
      const modifiers: KeyModifiers = { ctrl: false, shift: false, alt: false };
      expect(matchesShortcut(shortcut, 'a', modifiers, { enabled: true })).toBe(true);
      expect(matchesShortcut(shortcut, 'a', modifiers, { enabled: false })).toBe(false);
    });

    it('matches multiple keys', () => {
      const shortcut: KeyboardShortcut<void> = {
        keys: ['=', '+'],
        run: () => {},
      };
      const modifiers: KeyModifiers = { ctrl: false, shift: false, alt: false };
      expect(matchesShortcut(shortcut, '=', modifiers, undefined)).toBe(true);
      expect(matchesShortcut(shortcut, '+', modifiers, undefined)).toBe(true);
      expect(matchesShortcut(shortcut, '-', modifiers, undefined)).toBe(false);
    });
  });
});
