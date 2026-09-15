import { afterEach, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { layoutCellText } from '../utils/textSymbols';
import { useTextSymbolDialog } from '../hooks/useTextSymbolDialog';

afterEach(cleanup);

it('edits literal free text through another tool, preserving identity, styling and atomic history', () => {
  const store = createPuzzleStore().useStore;
  store.getState().setActiveLayer('problem');
  const text = ' :A:B\n日本語:🙂 ';
  const element = { cellId: 'cell-0-0', symbolType: `text-free:${text}`,
    size: 1.75, rotation: 30, color: '#123456', fillColor: '#abcdef', objectKey: 'keep', layer: 'problem' as const };
  const circleId = store.getState().addSymbol({ ...element, symbolType: 'circle' });
  const id = store.getState().addSymbol(element);
  const before = store.getState().puzzle.problem.symbols;
  store.getState().historyManager.clear();
  const { result } = renderHook(() => useTextSymbolDialog(store.getState()));
  act(() => result.current.handleTextClick({ cellId: element.cellId, textType: 'alphabet', existingText: before[id] }));
  expect(result.current.dialogProps).toMatchObject({ initialValue: text, textType: 'free' });
  act(() => result.current.dialogProps.onSubmit({ value: text, textType: result.current.dialogProps.textType }));
  expect(store.getState().puzzle.problem.symbols).toEqual(before);
  expect(store.getState().canUndo()).toBe(false);

  act(() => result.current.dialogProps.onSubmit({ value: '編集:済\n長文', textType: 'free' }));
  const edited = { ...before, [id]: { ...before[id], symbolType: 'text-free:編集:済\n長文' } };
  expect(store.getState().puzzle.problem.symbols).toEqual(edited);
  store.getState().setActiveLayer('answer');
  store.getState().undo();
  expect(store.getState().puzzle.problem.symbols).toEqual(before);
  expect(store.getState().canUndo()).toBe(false);
  store.getState().redo();
  expect(store.getState().puzzle.problem.symbols).toEqual(edited);

  store.getState().setActiveLayer('problem');
  act(() => result.current.handleTextClick({ cellId: element.cellId, textType: 'free', existingText: edited[id] }));
  act(() => result.current.dialogProps.onSubmit({ value: '', textType: 'free' }));
  expect(store.getState().puzzle.problem.symbols).toEqual({ [circleId]: before[circleId] });
  store.getState().undo();
  expect(store.getState().puzzle.problem.symbols).toEqual(edited);

  act(() => result.current.handleTextClick({ cellId: 'cell-1-1', textType: 'hiragana' }));
  expect(result.current.dialogProps).toMatchObject({ initialValue: '', textType: 'hiragana' });
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

it('restores layer metadata on a text-only board and keeps post-load editing undoable', () => {
  const store=createPuzzleStore().useStore;
  store.getState().setActiveLayer('problem');
  const element={cellId:'cell-0-0',symbolType:'text-free:A:B',size:'large' as const,rotation:0,color:'#000',layer:'problem' as const};
  const id=store.getState().addSymbol(element);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().puzzle.problem.symbols[id].layer).toBe('problem');
  store.getState().addSymbol({...element,symbolType:'text-free:edited'});
  store.getState().undo();expect(store.getState().puzzle.problem.symbols[id].symbolType).toBe('text-free:A:B');
});
