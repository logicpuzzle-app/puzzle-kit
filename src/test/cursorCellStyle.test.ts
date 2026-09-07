import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_TOOL_SETTINGS } from '../store/slices/types';
import { saveToolSettings, loadToolSettings } from '../utils/storage';

describe('selection cursor style', () => {
  beforeEach(() => {
    // Isolate persistence from Node's optional global Web Storage implementation.
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('ships a default colour and width', () => {
    expect(DEFAULT_TOOL_SETTINGS.cursorCellColor).toBe('#00A000');
    expect(DEFAULT_TOOL_SETTINGS.cursorCellThickness).toBe(3);
  });

  it('round-trips through tool settings persistence', () => {
    saveToolSettings({
      ...DEFAULT_TOOL_SETTINGS,
      cursorCellColor: '#0000ff',
      cursorCellThickness: 8,
    });
    const loaded = loadToolSettings();
    expect(loaded.cursorCellColor).toBe('#0000ff');
    expect(loaded.cursorCellThickness).toBe(8);
  });

  it('does not persist the current tool', () => {
    saveToolSettings({ ...DEFAULT_TOOL_SETTINGS, currentTool: 'symbol-circle' });
    expect(loadToolSettings()).not.toHaveProperty('currentTool');
  });
});
