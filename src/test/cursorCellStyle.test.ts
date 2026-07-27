import { describe, it, expect } from 'vitest';
import { DEFAULT_TOOL_SETTINGS } from '../store/slices/types';
import { saveToolSettings, loadToolSettings } from '../utils/storage';

describe('selection cursor style', () => {
  it('ships a default colour and width', () => {
    expect(DEFAULT_TOOL_SETTINGS.cursorCellColor).toBe('#ff8c00');
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
