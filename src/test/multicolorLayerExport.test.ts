import { describe, it, expect } from 'vitest';

import { createEmptyState } from '../store/slices/types';
import { optimizePuzzleStateForExport, restorePuzzleStateFromExport } from '../utils/puzzleExport';

describe('multicolorSurfaces layer handling (export/import)', () => {
  it('preserves per-element layer on export/import', () => {
    const puzzle = createEmptyState();
    puzzle.multicolorSurfaces = {
      m1: { id: 'm1', cellId: 'cell-0-0', colors: [3], pattern: 'cross', layer: 'problem' },
      m2: { id: 'm2', cellId: 'cell-0-1', colors: [4], pattern: 'cross', layer: 'answer' },
    };

    const exported = optimizePuzzleStateForExport(puzzle);
    expect(exported.multicolorSurfaces.m1.layer).toBe('problem');
    expect(exported.multicolorSurfaces.m2.layer).toBe('answer');

    const restored = restorePuzzleStateFromExport(exported);
    expect(restored.multicolorSurfaces?.m1.layer).toBe('problem');
    expect(restored.multicolorSurfaces?.m2.layer).toBe('answer');
  });

  it('normalizes missing/invalid layers to problem', () => {
    const exported = optimizePuzzleStateForExport(createEmptyState());
    exported.multicolorSurfaces = {
      m1: { id: 'm1', cellId: 'cell-0-0', colors: [3], pattern: 'cross' }, // missing
      m2: { id: 'm2', cellId: 'cell-0-1', colors: [4], pattern: 'cross', layer: 'grid' }, // invalid
    };

    const restored = restorePuzzleStateFromExport(exported);
    expect(restored.multicolorSurfaces?.m1.layer).toBe('problem');
    expect(restored.multicolorSurfaces?.m2.layer).toBe('problem');
  });
});

