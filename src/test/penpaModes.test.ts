import { describe, it, expect } from 'vitest';
import {
  getSubmodes,
  supportsDiagonal,
  operatesOnVertices,
  operatesOnCells,
  operatesOnEdges,
  getModeShortcut,
  type PenpaEditMode,
} from '../types/penpaModes';

describe('Penpa mode contracts', () => {
  it('offers surface submodes and returns none for an unknown mode', () => {
    expect(getSubmodes('surface')).toEqual(
      expect.arrayContaining(['surface', 'dot', 'multicolor'])
    );
    expect(getSubmodes('unknown' as PenpaEditMode)).toEqual([]);
  });

  it('supports diagonal line and edge-line input but not cell shading', () => {
    expect(supportsDiagonal('line')).toBe(true);
    expect(supportsDiagonal('lineE')).toBe(true);
    expect(supportsDiagonal('surface')).toBe(false);
  });

  it('distinguishes vertex, edge and cell targets', () => {
    expect(operatesOnVertices('lineE')).toBe(true);
    expect(operatesOnVertices('line')).toBe(false);
    expect(operatesOnEdges('wall')).toBe(true);
    expect(operatesOnEdges('lineE')).toBe(false);
    const modes: PenpaEditMode[] = ['surface', 'number', 'symbol', 'cage', 'line', 'wall'];
    expect(modes.filter(operatesOnCells)).toEqual(['surface', 'number', 'symbol', 'cage']);
  });

  it('returns the surface shortcut and no shortcut for an unknown mode', () => {
    expect(getModeShortcut('surface')).toBe('S');
    expect(getModeShortcut('unknown' as PenpaEditMode)).toBeNull();
  });
});
