import { describe, expect, it } from 'vitest';
import { toArrowDirection, toPenpaDirection } from '../utils/directionalClue';

describe('directionalClue direction conversion', () => {
  it('maps arrowDirection to penpa direction', () => {
    expect(toPenpaDirection(-1)).toBe(0);
    expect(toPenpaDirection(0)).toBe(1);
    expect(toPenpaDirection(1)).toBe(3);
    expect(toPenpaDirection(2)).toBe(4);
    expect(toPenpaDirection(3)).toBe(2);
  });

  it('maps penpa direction to arrowDirection', () => {
    expect(toArrowDirection(0)).toBe(-1);
    expect(toArrowDirection(1)).toBe(0);
    expect(toArrowDirection(2)).toBe(3);
    expect(toArrowDirection(3)).toBe(1);
    expect(toArrowDirection(4)).toBe(2);
  });

  it('falls back for unknown directions', () => {
    expect(toPenpaDirection(99)).toBe(0);
    expect(toArrowDirection(99)).toBe(-1);
  });
});
