import { describe, it, expect, afterEach } from 'vitest';
import { act } from '@testing-library/react';

import { usePuzzleStore } from '../store/puzzleStore';
import { createEmptyState, DEFAULT_TOOL_SETTINGS } from '../store/slices/types';

afterEach(() => {
  act(() => {
    usePuzzleStore.setState({
      puzzle: createEmptyState(),
      activeLayer: 'problem',
      showConstraintLayer: false,
      currentSchemaId: null,
      toolSettings: { ...DEFAULT_TOOL_SETTINGS },
    });
  });
});

describe('tool consistency for multicolor/symbol modes', () => {
  it('keeps symbolSubMode consistent with setTool in symbol category', () => {
    const store = usePuzzleStore.getState();

    act(() => {
      store.setActiveLayer('problem');
      store.setTool('symbol-circle', 'symbol');
    });
    expect(usePuzzleStore.getState().toolSettings.symbolSubMode).toBe('icon');

    act(() => {
      store.setTool('symbol-arrow_N', 'symbol');
    });
    expect(usePuzzleStore.getState().toolSettings.symbolSubMode).toBe('direction');

    act(() => {
      store.setTool('multicolor-surface', 'symbol');
    });
    expect(usePuzzleStore.getState().toolSettings.symbolSubMode).toBe('multicolor');
  });

  it('restores per-layer tool without leaving a stale multicolor UI', () => {
    const store = usePuzzleStore.getState();

    // Problem: multicolor tool
    act(() => {
      store.setActiveLayer('problem');
      store.setTool('multicolor-surface', 'symbol');
    });
    expect(usePuzzleStore.getState().savedNormalToolSettings.problem.tool).toBe('multicolor-surface');
    expect(usePuzzleStore.getState().toolSettings.symbolSubMode).toBe('multicolor');

    // Answer: icon symbol tool
    act(() => {
      store.setActiveLayer('answer');
      store.setTool('symbol-circle', 'symbol');
    });
    expect(usePuzzleStore.getState().savedNormalToolSettings.answer.tool).toBe('symbol-circle');
    expect(usePuzzleStore.getState().toolSettings.symbolSubMode).toBe('icon');

    // Switch back: should restore multicolor tool and multicolor submode.
    act(() => {
      store.setActiveLayer('problem');
    });
    expect(usePuzzleStore.getState().toolSettings.currentTool).toBe('multicolor-surface');
    expect(usePuzzleStore.getState().toolSettings.symbolSubMode).toBe('multicolor');
  });
});

