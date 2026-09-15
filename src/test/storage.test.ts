import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveToolSettings, loadToolSettings, saveGridConfig, loadGridConfig,
  saveUIPreferences, loadUIPreferences, saveRecentPuzzle, loadRecentPuzzles,
  clearRecentPuzzles, saveLanguage, loadLanguage, clearLocalAppStorage,
} from '../utils/storage';
import { DEFAULT_TOOL_SETTINGS } from '../store/slices/types';
import type { GridConfig } from '../types';

const grid: GridConfig = {
  rows: 10, cols: 12, cellSize: 50, gridType: 'hex', gridStyle: 'thick',
  frameStyle: 'double', outerPadding: 40, showGrid: true,
  marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  frameColor: '#000000', gridColor: '#888888', backgroundColor: '#ffffff',
};

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('storage persistence', () => {
  it('restores custom styles, including the cursor, without restoring the active tool', () => {
    saveToolSettings({
      ...DEFAULT_TOOL_SETTINGS, currentTool: 'symbol-circle',
      color: '#ff0000', secondaryColor: '#00ff00', multicolorSlots: [1, 2, 3, 4],
      cursorCellColor: '#0000ff', cursorCellThickness: 8,
    });
    const loaded = loadToolSettings();
    expect(loaded).toMatchObject({
      color: '#ff0000', secondaryColor: '#00ff00', multicolorSlots: [1, 2, 3, 4],
      cursorCellColor: '#0000ff', cursorCellThickness: 8,
    });
    expect(loaded).not.toHaveProperty('currentTool');
  });

  it('restores a rectangular non-square grid and its styles', () => {
    saveGridConfig(grid);
    expect(loadGridConfig()).toMatchObject({
      rows: 10, cols: 12, cellSize: 50, gridType: 'hex', gridStyle: 'thick', frameStyle: 'double',
    });
  });

  it('preserves previous preferences when saving a partial update', () => {
    saveUIPreferences({ showProblemLayer: false, showAnswerLayer: false, language: 'en' });
    saveUIPreferences({ theme: 'dark' });
    expect(loadUIPreferences()).toMatchObject({
      showProblemLayer: false, showAnswerLayer: false, language: 'en', theme: 'dark',
    });
  });

  it('reopening a recent puzzle updates its data and timestamp and moves it to the front once', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    saveRecentPuzzle({ id: 'puzzle-1', title: 'First', url: 'https://example.com/old' });
    vi.setSystemTime(2000);
    saveRecentPuzzle({ id: 'puzzle-2', title: 'Second' });
    vi.setSystemTime(3000);
    saveRecentPuzzle({ id: 'puzzle-1', title: 'First Updated', url: 'https://example.com/new' });
    expect(loadRecentPuzzles()).toEqual([
      { id: 'puzzle-1', title: 'First Updated', url: 'https://example.com/new', lastOpened: 3000 },
      { id: 'puzzle-2', title: 'Second', lastOpened: 2000 },
    ]);
  });

  it('clears the recent puzzle list', () => {
    saveRecentPuzzle({ id: 'puzzle-1', title: 'First' });
    clearRecentPuzzles();
    expect(loadRecentPuzzles()).toEqual([]);
  });

  it('saves the selected language', () => {
    saveLanguage('en');
    expect(loadLanguage()).toBe('en');
    saveLanguage('ja');
    expect(loadLanguage()).toBe('ja');
  });

  it('clearing app storage restores defaults for previously saved settings', () => {
    saveToolSettings({ ...DEFAULT_TOOL_SETTINGS, color: '#ff0000' });
    saveGridConfig(grid);
    saveLanguage('en');
    clearLocalAppStorage();
    expect(loadToolSettings()).toMatchObject({ color: '#808080', secondaryColor: '#00ff00' });
    expect(loadGridConfig()).toMatchObject({ rows: 9, cols: 9, cellSize: 40 });
    expect(loadLanguage()).toBe('ja');
  });
});
