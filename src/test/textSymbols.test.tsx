import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { getTextSymbolValue, layoutCellText } from '../utils/textSymbols';
import { useTextSymbolDialog } from '../hooks/useTextSymbolDialog';

describe('text editing', () => {
  it.each(['A:B', ':日本語:🙂', ' first last ', 'a\nb', ''])('preserves literal text %j', text => {
    expect(getTextSymbolValue(`text-free:${text}`)).toBe(text);
  });
  it('replaces text with the same ID in one undo action and preserves other symbols and layers', () => {
    const store = createPuzzleStore().useStore;
    store.getState().setActiveLayer('problem');
    const element = { cellId: 'cell-0-0', symbolType: 'text-free:ABC', size: 'large' as const, rotation: 30, color: '#f00', layer: 'problem' as const };
    store.getState().addSymbol({ ...element, symbolType: 'circle' });
    const id = store.getState().addSymbol(element);
    const before = store.getState().puzzle.problem.symbols;
    expect(store.getState().addSymbol({ ...element, symbolType: 'text-free:DEF' })).toBe(id);
    const after = store.getState().puzzle.problem.symbols;
    expect(Object.values(after)).toHaveLength(2);
    expect(after[id].symbolType).toBe('text-free:DEF');
    store.getState().setActiveLayer('answer');
    store.getState().undo();expect(store.getState().puzzle.problem.symbols).toEqual(before);
    store.getState().redo();expect(store.getState().puzzle.problem.symbols).toEqual(after);
  });
  it('reopens colons literally, preserves styling, and clears existing text with undo', () => {
    const store = createPuzzleStore().useStore;
    store.getState().setActiveLayer('problem');
    const id = store.getState().addSymbol({ cellId: 'cell-0-0', symbolType: 'text-free:A:B', size: 'largest', rotation: 30, color: '#123456', layer: 'problem' });
    const original = store.getState().puzzle.problem.symbols[id];
    const { result } = renderHook(() => useTextSymbolDialog(store.getState()));
    act(() => result.current.handleTextClick({ cellId: 'cell-0-0', textType: 'free', existingText: original }));
    expect(result.current.dialogProps.initialValue).toBe('A:B');
    act(() => result.current.dialogProps.onSubmit({ value: '日本語:🙂', textType: 'free' }));
    expect(store.getState().puzzle.problem.symbols[id]).toEqual({ ...original, symbolType: 'text-free:日本語:🙂' });
    act(() => result.current.dialogProps.onSubmit({ value: '', textType: 'free' }));
    expect(store.getState().puzzle.problem.symbols[id]).toBeUndefined();
    store.getState().undo();expect(store.getState().puzzle.problem.symbols[id].symbolType).toBe('text-free:日本語:🙂');
  });
});

it('wraps long text without splitting emoji graphemes and honors explicit newlines', () => {
  const text = 'ABCDEFGHIJKLMNOPQRST';
  const layout = layoutCellText(text, 28);
  expect(layout.lines.length).toBeGreaterThan(1);
  expect(layout.lines.join('')).toBe(text);
  expect(layout.lineHeight * layout.lines.length).toBeLessThanOrEqual(28);
  const emoji = '👨‍👩‍👧‍👦';
  expect(layoutCellText(emoji.repeat(5), 28).lines).toEqual([emoji.repeat(4), emoji]);
  expect(layoutCellText('A:B\n日本語', 28).lines).toEqual(['A:B', '日本語']);
});
