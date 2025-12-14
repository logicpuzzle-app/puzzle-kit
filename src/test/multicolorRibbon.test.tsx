import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';

import '../i18n';
import { usePuzzleStore } from '../store/puzzleStore';
import { createEmptyState, DEFAULT_TOOL_SETTINGS } from '../store/slices/types';
import { Ribbon } from '../components/toolbar/Ribbon';

afterEach(() => {
  act(() => {
    usePuzzleStore.setState({
      puzzle: createEmptyState(),
      activeLayer: 'problem',
      showProblemLayer: true,
      showAnswerLayer: true,
      showConstraintLayer: false,
      currentSchemaId: null,
      currentInputMode: 'auto',
      toolSettings: { ...DEFAULT_TOOL_SETTINGS },
    });
  });
});

describe('Ribbon multicolor toggle', () => {
  it('initializes a visible multicolor slot when all slots are transparent', () => {
    act(() => {
      usePuzzleStore.setState({
        puzzle: createEmptyState(),
        activeLayer: 'problem',
        showProblemLayer: true,
        showAnswerLayer: true,
        showConstraintLayer: false,
        currentSchemaId: null,
        currentInputMode: 'auto',
        toolSettings: {
          ...DEFAULT_TOOL_SETTINGS,
          currentCategory: 'symbol',
          currentTool: 'symbol-circle',
          symbolSubMode: 'icon',
          color: '#ff0000',
          multicolorSlots: [0, 0, 0, 0],
        },
      });
    });

    const { getByTitle } = render(<Ribbon />);
    fireEvent.click(getByTitle('Multicolor Surface'));

    const { toolSettings } = usePuzzleStore.getState();
    expect(toolSettings.currentTool).toBe('multicolor-surface');
    expect(toolSettings.symbolSubMode).toBe('multicolor');
    expect(toolSettings.multicolorSlots[0]).toBe(4); // legacy Penpa red
  });
});

