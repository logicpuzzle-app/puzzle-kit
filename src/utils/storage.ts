/**
 * Local Storage Persistence Utilities
 *
 * Handles saving and loading app settings to/from localStorage
 */

import type { ToolSettings, GridConfig, CanvasState } from '../types';
import type { GridTopology } from './topology/types';
import { serializeTopology, deserializeTopology, type SerializedTopology } from './serialization';

const STORAGE_KEYS = {
  TOOL_SETTINGS: 'puzzlekit_tool_settings',
  GRID_CONFIG: 'puzzlekit_grid_config',
  CANVAS_STATE: 'puzzlekit_canvas_state',
  UI_PREFERENCES: 'puzzlekit_ui_preferences',
  RECENT_PUZZLES: 'puzzlekit_recent_puzzles',
  LANGUAGE: 'puzzlekit_language',
  TOPOLOGY: 'puzzlekit_topology',
  CONSTRAINT: 'puzzlekit_constraint',
} as const;

const STORAGE_VERSION = 1;

interface StorageWrapper<T> {
  version: number;
  data: T;
  timestamp: number;
}

/**
 * Safely get item from localStorage
 */
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const wrapper: StorageWrapper<T> = JSON.parse(item);

    // Version check - return default if version mismatch
    if (wrapper.version !== STORAGE_VERSION) {
      console.warn(`Storage version mismatch for ${key}, using defaults`);
      return defaultValue;
    }

    return wrapper.data;
  } catch {
    console.warn(`Failed to parse localStorage item: ${key}`);
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage
 */
function setItem<T>(key: string, value: T): boolean {
  try {
    const wrapper: StorageWrapper<T> = {
      version: STORAGE_VERSION,
      data: value,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(wrapper));
    return true;
  } catch (error) {
    console.warn(`Failed to save to localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 */
function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn(`Failed to remove localStorage item: ${key}`);
  }
}

// ===========================
// Tool Settings Persistence
// ===========================

type PersistedToolSettings = Partial<Omit<ToolSettings, 'currentTool' | 'currentCategory'>>;

const DEFAULT_PERSISTED_TOOL_SETTINGS: PersistedToolSettings = {
  color: '#808080',
  secondaryColor: '#00ff00',
  lineStyle: 'solid',
  lineThickness: 'normal',
  symbolSize: 'medium',
  numberSize: 'medium',
  multicolorSlots: [1, 0, 0, 0],
};

export function saveToolSettings(settings: ToolSettings): boolean {
  // Only persist color/style settings, not current tool
  const { currentTool, currentCategory, ...rest } = settings;
  return setItem(STORAGE_KEYS.TOOL_SETTINGS, rest);
}

export function loadToolSettings(): PersistedToolSettings {
  return getItem(STORAGE_KEYS.TOOL_SETTINGS, DEFAULT_PERSISTED_TOOL_SETTINGS);
}

// ===========================
// Grid Config Persistence
// ===========================

type PersistedGridConfig = Pick<GridConfig, 'rows' | 'cols' | 'cellSize' | 'gridType' | 'gridStyle' | 'frameStyle'>;

const DEFAULT_PERSISTED_GRID_CONFIG: PersistedGridConfig = {
  rows: 9,
  cols: 9,
  cellSize: 40,
  gridType: 'square',
  gridStyle: 'normal',
  frameStyle: 'normal',
};

export function saveGridConfig(config: GridConfig): boolean {
  const { rows, cols, cellSize, gridType, gridStyle, frameStyle } = config;
  return setItem(STORAGE_KEYS.GRID_CONFIG, {
    rows,
    cols,
    cellSize,
    gridType,
    gridStyle,
    frameStyle,
  });
}

export function loadGridConfig(): PersistedGridConfig {
  return getItem(STORAGE_KEYS.GRID_CONFIG, DEFAULT_PERSISTED_GRID_CONFIG);
}

// ===========================
// UI Preferences Persistence
// ===========================

export interface UIPreferences {
  showProblemLayer: boolean;
  showAnswerLayer: boolean;
  language: string;
  theme: 'light' | 'dark' | 'system';
  panelWidths: {
    left?: number;
    right?: number;
  };
}

const DEFAULT_UI_PREFERENCES: UIPreferences = {
  showProblemLayer: true,
  showAnswerLayer: true,
  language: 'ja',
  theme: 'light',
  panelWidths: {},
};

export function saveUIPreferences(prefs: Partial<UIPreferences>): boolean {
  const current = loadUIPreferences();
  return setItem(STORAGE_KEYS.UI_PREFERENCES, { ...current, ...prefs });
}

export function loadUIPreferences(): UIPreferences {
  return getItem(STORAGE_KEYS.UI_PREFERENCES, DEFAULT_UI_PREFERENCES);
}

// ===========================
// Recent Puzzles Persistence
// ===========================

export interface RecentPuzzle {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  lastOpened: number;
}

const MAX_RECENT_PUZZLES = 10;

export function saveRecentPuzzle(puzzle: Omit<RecentPuzzle, 'lastOpened'>): boolean {
  const recent = loadRecentPuzzles();

  // Remove if already exists
  const filtered = recent.filter((p) => p.id !== puzzle.id);

  // Add to front
  const updated = [{ ...puzzle, lastOpened: Date.now() }, ...filtered].slice(
    0,
    MAX_RECENT_PUZZLES
  );

  return setItem(STORAGE_KEYS.RECENT_PUZZLES, updated);
}

export function loadRecentPuzzles(): RecentPuzzle[] {
  return getItem(STORAGE_KEYS.RECENT_PUZZLES, []);
}

export function clearRecentPuzzles(): void {
  removeItem(STORAGE_KEYS.RECENT_PUZZLES);
}

// ===========================
// Canvas State Persistence
// ===========================

type PersistedCanvasState = Pick<CanvasState, 'zoom'>;

const DEFAULT_PERSISTED_CANVAS_STATE: PersistedCanvasState = {
  zoom: 1,
};

export function saveCanvasState(state: CanvasState): boolean {
  // Only persist zoom, not pan position or selection
  return setItem(STORAGE_KEYS.CANVAS_STATE, { zoom: state.zoom });
}

export function loadCanvasState(): PersistedCanvasState {
  return getItem(STORAGE_KEYS.CANVAS_STATE, DEFAULT_PERSISTED_CANVAS_STATE);
}

// ===========================
// Language Persistence
// ===========================

export function saveLanguage(lang: string): boolean {
  return setItem(STORAGE_KEYS.LANGUAGE, lang);
}

export function loadLanguage(): string {
  return getItem(STORAGE_KEYS.LANGUAGE, 'ja');
}

// ===========================
// Clear All Storage
// ===========================

export function clearLocalAppStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeItem(key);
  });
}

// ===========================
// Storage Availability Check
// ===========================

export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// ===========================
// Topology Persistence
// ===========================

export interface PersistedTopologyState {
  topology: SerializedTopology | null;
  useTopology: boolean;
  topologyPreset: string;
  topologyIntensity: number;
}

const DEFAULT_TOPOLOGY_STATE: PersistedTopologyState = {
  topology: null,
  useTopology: true,
  topologyPreset: 'none',
  topologyIntensity: 0,
};

export function saveTopologyState(
  topology: GridTopology | null,
  useTopology: boolean,
  topologyPreset: string,
  topologyIntensity: number
): boolean {
  const data: PersistedTopologyState = {
    topology: topology ? serializeTopology(topology) : null,
    useTopology,
    topologyPreset,
    topologyIntensity,
  };
  return setItem(STORAGE_KEYS.TOPOLOGY, data);
}

export function loadTopologyState(): PersistedTopologyState & { deserializedTopology: GridTopology | null } {
  const state = getItem(STORAGE_KEYS.TOPOLOGY, DEFAULT_TOPOLOGY_STATE);
  return {
    ...state,
    deserializedTopology: state.topology ? deserializeTopology(state.topology) : null,
  };
}

export function clearTopologyState(): void {
  removeItem(STORAGE_KEYS.TOPOLOGY);
}

// ===========================
// Constraint Settings Persistence
// ===========================

export interface PersistedConstraintState {
  currentSchemaId: string | null;
  currentInputMode: string;
  validationOverrides: Record<string, boolean>;
}

const DEFAULT_CONSTRAINT_STATE: PersistedConstraintState = {
  currentSchemaId: null,
  currentInputMode: 'auto',
  validationOverrides: {},
};

export function saveConstraintState(
  currentSchemaId: string | null,
  currentInputMode: string,
  validationOverrides: Record<string, boolean>
): boolean {
  const data: PersistedConstraintState = {
    currentSchemaId,
    currentInputMode,
    validationOverrides,
  };
  return setItem(STORAGE_KEYS.CONSTRAINT, data);
}

export function loadConstraintState(): PersistedConstraintState {
  return getItem(STORAGE_KEYS.CONSTRAINT, DEFAULT_CONSTRAINT_STATE);
}

export function clearConstraintState(): void {
  removeItem(STORAGE_KEYS.CONSTRAINT);
}
