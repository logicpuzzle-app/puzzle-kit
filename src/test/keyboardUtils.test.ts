import { describe, it, expect } from 'vitest';
import {
  isInputElement,
  matchesShortcut,
  getArrowDirection,
  calculateNextPosition,
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

  describe('arrow navigation', () => {
    it.each([
      ['ArrowUp', { row: 0, col: 3 }],
      ['ArrowDown', { row: 2, col: 3 }],
      ['ArrowLeft', { row: 1, col: 2 }],
      ['ARROWRIGHT', { row: 1, col: 4 }],
    ])('moves %s on a rectangular grid', (key, expected) => {
      const direction = getArrowDirection(key);
      expect(direction).not.toBeNull();
      expect(calculateNextPosition({ row: 1, col: 3 }, direction!, 3, 5)).toEqual(expected);
    });

    it('clamps each axis at the rectangular board edges', () => {
      expect(calculateNextPosition({ row: 0, col: 0 }, { dr: -1, dc: -1 }, 3, 5)).toEqual({ row: 0, col: 0 });
      expect(calculateNextPosition({ row: 2, col: 4 }, { dr: 1, dc: 1 }, 3, 5)).toEqual({ row: 2, col: 4 });
    });

    it('ignores non-arrow keys', () => {
      expect(getArrowDirection('a')).toBeNull();
    });
  });

  describe('getMaxDigitsForGrid', () => {
    describe('for direc type (Yajilin)', () => {
      it('returns 1 for small grids', () => {
        expect(getMaxDigitsForGrid(20, 20, true)).toBe(1);
      });

      it('returns 2 for medium grids', () => {
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
