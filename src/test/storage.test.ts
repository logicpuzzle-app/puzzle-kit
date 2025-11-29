/**
 * Storage Persistence Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveToolSettings,
  loadToolSettings,
  saveGridConfig,
  loadGridConfig,
  saveUIPreferences,
  loadUIPreferences,
  saveRecentPuzzle,
  loadRecentPuzzles,
  clearRecentPuzzles,
  saveLanguage,
  loadLanguage,
  clearAllStorage,
  isStorageAvailable,
} from '../utils/storage';
import type { ToolSettings, GridConfig } from '../types';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Storage Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('isStorageAvailable', () => {
    it('returns true when localStorage works', () => {
      expect(isStorageAvailable()).toBe(true);
    });
  });

  describe('Tool Settings', () => {
    it('saves and loads tool settings', () => {
      const settings = {
        currentTool: 'surface-fill',
        currentCategory: 'surface',
        color: '#ff0000',
        secondaryColor: '#00ff00',
        lineStyle: 'solid',
        lineThickness: 'normal',
        symbolSize: 'medium',
        numberSize: 'medium',
        numberPosition: 'center',
        cornerIndex: 0,
        sideIndex: 0,
        selectedCandidates: [],
        multicolorSlots: [1, 2, 3, 4],
      } as ToolSettings;

      saveToolSettings(settings);
      const loaded = loadToolSettings();

      expect(loaded.color).toBe('#ff0000');
      expect(loaded.secondaryColor).toBe('#00ff00');
      expect(loaded.multicolorSlots).toEqual([1, 2, 3, 4]);
    });

    it('returns defaults when no saved settings', () => {
      const loaded = loadToolSettings();

      expect(loaded.color).toBe('#808080');
      expect(loaded.secondaryColor).toBe('#00ff00');
    });
  });

  describe('Grid Config', () => {
    it('saves and loads grid config', () => {
      const config = {
        rows: 10,
        cols: 12,
        cellSize: 50,
        gridType: 'hex',
        gridStyle: 'thick',
        frameStyle: 'double',
        outerPadding: 40,
      } as GridConfig;

      saveGridConfig(config);
      const loaded = loadGridConfig();

      expect(loaded.rows).toBe(10);
      expect(loaded.cols).toBe(12);
      expect(loaded.cellSize).toBe(50);
      expect(loaded.gridType).toBe('hex');
    });

    it('returns defaults when no saved config', () => {
      const loaded = loadGridConfig();

      expect(loaded.rows).toBe(9);
      expect(loaded.cols).toBe(9);
      expect(loaded.cellSize).toBe(40);
    });
  });

  describe('UI Preferences', () => {
    it('saves and loads UI preferences', () => {
      saveUIPreferences({
        showProblemLayer: false,
        showAnswerLayer: true,
        language: 'en',
        theme: 'dark',
      });

      const loaded = loadUIPreferences();

      expect(loaded.showProblemLayer).toBe(false);
      expect(loaded.showAnswerLayer).toBe(true);
      expect(loaded.language).toBe('en');
      expect(loaded.theme).toBe('dark');
    });

    it('merges partial updates', () => {
      saveUIPreferences({ language: 'en' });
      saveUIPreferences({ theme: 'dark' });

      const loaded = loadUIPreferences();

      expect(loaded.language).toBe('en');
      expect(loaded.theme).toBe('dark');
    });
  });

  describe('Recent Puzzles', () => {
    it('saves and loads recent puzzles', () => {
      saveRecentPuzzle({
        id: 'puzzle-1',
        title: 'My Puzzle',
        url: 'https://example.com/puzzle-1',
      });

      const puzzles = loadRecentPuzzles();

      expect(puzzles).toHaveLength(1);
      expect(puzzles[0].id).toBe('puzzle-1');
      expect(puzzles[0].title).toBe('My Puzzle');
      expect(puzzles[0].lastOpened).toBeDefined();
    });

    it('maintains order with most recent first', () => {
      saveRecentPuzzle({ id: 'puzzle-1', title: 'First' });
      saveRecentPuzzle({ id: 'puzzle-2', title: 'Second' });
      saveRecentPuzzle({ id: 'puzzle-3', title: 'Third' });

      const puzzles = loadRecentPuzzles();

      expect(puzzles[0].id).toBe('puzzle-3');
      expect(puzzles[1].id).toBe('puzzle-2');
      expect(puzzles[2].id).toBe('puzzle-1');
    });

    it('removes duplicates and moves to front', () => {
      saveRecentPuzzle({ id: 'puzzle-1', title: 'First' });
      saveRecentPuzzle({ id: 'puzzle-2', title: 'Second' });
      saveRecentPuzzle({ id: 'puzzle-1', title: 'First Updated' });

      const puzzles = loadRecentPuzzles();

      expect(puzzles).toHaveLength(2);
      expect(puzzles[0].id).toBe('puzzle-1');
      expect(puzzles[0].title).toBe('First Updated');
    });

    it('clears recent puzzles', () => {
      saveRecentPuzzle({ id: 'puzzle-1', title: 'First' });
      clearRecentPuzzles();

      const puzzles = loadRecentPuzzles();
      expect(puzzles).toHaveLength(0);
    });
  });

  describe('Language', () => {
    it('saves and loads language', () => {
      saveLanguage('en');
      expect(loadLanguage()).toBe('en');

      saveLanguage('ja');
      expect(loadLanguage()).toBe('ja');
    });

    it('returns default language when not set', () => {
      expect(loadLanguage()).toBe('ja');
    });
  });

  describe('clearAllStorage', () => {
    it('clears all stored data', () => {
      saveToolSettings({
        currentTool: 'surface-fill',
        currentCategory: 'surface',
        color: '#ff0000',
      } as ToolSettings);
      saveLanguage('en');

      clearAllStorage();

      expect(loadToolSettings().color).toBe('#808080');
      expect(loadLanguage()).toBe('ja');
    });
  });
});
