/**
 * Penpa-edit Compatible Color Palette
 *
 * Colors extracted from penpa-edit (https://github.com/swaroopg92/penpa-edit)
 * These colors are used for surfaces, lines, symbols, and UI elements.
 */

// ========================================
// Named Color Constants (from style.js)
// ========================================

export const PenpaColors = {
  // Black/Grey scale
  BLACK: '#000000',
  BLACK_LIGHT: '#232323',
  GREY_DARK_VERY: '#444444',
  GREY_DARK: '#777777',
  GREY: '#999999',
  GREY_DARK_LIGHT: '#b3b3b3',
  GREY_LIGHT: '#cccccc',
  GREY_LIGHT_VERY: '#f0f0f0',
  WHITE: '#ffffff',

  // Primary colors
  RED: '#ff0000',
  RED_LIGHT: '#ffa3a3',
  GREEN: '#208020',
  GREEN_LIGHT: '#4c9900',
  GREEN_LIGHT_VERY: '#b3ffb3',
  BLUE: '#0000ff',
  BLUE_DARK_VERY: '#00008b',
  BLUE_LIGHT: '#187bcd',
  BLUE_LIGHT_VERY: '#c0e0ff',
  BLUE_SKY: '#3085d6',

  // Secondary colors
  YELLOW: '#ffffa3',
  ORANGE_LIGHT: '#ffcc80',
  PINK_LIGHT: '#ffb3ff',
  PURPLE_LIGHT: '#cc99ff',
  BROWN_LIGHT: '#eecab1',

  // Transparent colors
  TRANSPARENT_BLACK: 'rgba(0, 0, 0, 0)',
  TRANSPARENT_WHITE: 'rgba(255, 255, 255, 0)',
  RED_TRANSPARENT: 'rgba(255, 0, 0, 0.7)',
  BLUE_TRANSPARENT: 'rgba(40, 90, 255, 0.7)',
  ORANGE_TRANSPARENT: 'rgba(255, 103, 0, 0.6)',
} as const;

export type PenpaColorName = keyof typeof PenpaColors;

// ========================================
// Surface Color Palette (Style Indices)
// ========================================

/**
 * Surface color palette indexed by style number (0-12)
 * Used for cell shading/coloring
 *
 * Style abbreviations in Penpa UI:
 * 0: Transparent (none)
 * 1: DG (Dark Grey)
 * 2: GR (Grey)
 * 3: LG (Light Grey)
 * 4: BL (Black)
 * 5: GR (Green Light Very)
 * 6: BL (Blue Light Very)
 * 7: RE (Red Light)
 * 8: YE (Yellow)
 * 9: PI (Pink Light)
 * 10: OR (Orange Light)
 * 11: PU (Purple Light)
 * 12: BR (Brown Light)
 */
export const SurfaceColorPalette: Record<number, string> = {
  0: 'transparent',
  1: PenpaColors.GREY_DARK_VERY,    // #444444 - Dark Grey
  2: PenpaColors.GREY,               // #999999 - Grey
  3: PenpaColors.GREY_LIGHT,         // #cccccc - Light Grey
  4: PenpaColors.BLACK,              // #000000 - Black
  5: PenpaColors.GREEN_LIGHT_VERY,   // #b3ffb3 - Light Green
  6: PenpaColors.BLUE_LIGHT_VERY,    // #c0e0ff - Light Blue
  7: PenpaColors.RED_LIGHT,          // #ffa3a3 - Light Red
  8: PenpaColors.YELLOW,             // #ffffa3 - Yellow
  9: PenpaColors.PINK_LIGHT,         // #ffb3ff - Pink
  10: PenpaColors.ORANGE_LIGHT,      // #ffcc80 - Orange
  11: PenpaColors.PURPLE_LIGHT,      // #cc99ff - Purple
  12: PenpaColors.BROWN_LIGHT,       // #eecab1 - Brown
  13: PenpaColors.WHITE,             // #ffffff - White
};

// ========================================
// Line Color Palette (Style Indices)
// ========================================

/**
 * Line/Edge color palette indexed by style number
 * Used for lines, edges, and walls
 */
export const LineColorPalette: Record<number, string> = {
  0: 'transparent',
  1: PenpaColors.BLACK,              // #000000 - Black (default)
  2: PenpaColors.GREY_DARK_VERY,     // #444444 - Dark Grey
  3: PenpaColors.GREEN,              // #208020 - Green
  4: PenpaColors.GREY,               // #999999 - Grey
  5: PenpaColors.RED,                // #ff0000 - Red
  6: PenpaColors.BLUE_LIGHT,         // #187bcd - Blue
  7: PenpaColors.GREY_DARK,          // #777777 - Dark Grey
  8: PenpaColors.GREY_LIGHT,         // #cccccc - Light Grey
};

// ========================================
// Symbol Color Palette
// ========================================

/**
 * Symbol color palette
 * Used for symbols, numbers, and text
 */
export const SymbolColorPalette: Record<number, string> = {
  0: PenpaColors.WHITE,              // #ffffff - White
  1: PenpaColors.GREY_DARK,          // #777777 - Dark Grey
  2: PenpaColors.GREY,               // #999999 - Grey
  3: PenpaColors.GREY_LIGHT,         // #cccccc - Light Grey
  4: PenpaColors.BLACK,              // #000000 - Black (default)
  5: PenpaColors.GREEN,              // #208020 - Green
  6: PenpaColors.BLUE,               // #0000ff - Blue
  7: PenpaColors.RED,                // #ff0000 - Red
  8: PenpaColors.YELLOW,             // #ffffa3 - Yellow
};

// ========================================
// Legacy Color Index Map (for compatibility)
// ========================================

/**
 * Legacy Penpa color indices
 * Maps numeric indices to hex colors for backward compatibility
 */
export const PENPA_COLOR_INDEX: Record<number, string> = {
  0: 'transparent',
  1: '#cfcfcf',    // Light gray (legacy)
  2: '#a0a0a0',    // Gray (legacy)
  3: '#000000',    // Black
  4: '#ff0000',    // Red
  5: '#0000ff',    // Blue
  6: '#00ff00',    // Green
  7: '#ffff00',    // Yellow
  8: '#ff8000',    // Orange
  9: '#800080',    // Purple
  10: '#00ffff',   // Cyan
  11: '#ff00ff',   // Magenta
  12: '#ffffff',   // White
  13: '#c0c0c0',   // Silver
};

// ========================================
// Utility Functions
// ========================================

/**
 * Get surface color from style index
 */
export function getSurfaceColor(styleIndex: number): string {
  return SurfaceColorPalette[styleIndex] ?? PenpaColors.GREY_LIGHT;
}

/**
 * Get line color from style index
 */
export function getLineColor(styleIndex: number): string {
  return LineColorPalette[styleIndex] ?? PenpaColors.BLACK;
}

/**
 * Get symbol color from style index
 */
export function getSymbolColor(styleIndex: number): string {
  return SymbolColorPalette[styleIndex] ?? PenpaColors.BLACK;
}

/**
 * Convert hex color to nearest Penpa surface style index
 */
export function hexToSurfaceIndex(hex: string): number {
  const normalized = hex.toLowerCase();
  for (const [index, color] of Object.entries(SurfaceColorPalette)) {
    if (color.toLowerCase() === normalized) {
      return parseInt(index);
    }
  }
  // Default to light grey if not found
  return 3;
}

/**
 * Convert hex color to nearest Penpa line style index
 */
export function hexToLineIndex(hex: string): number {
  const normalized = hex.toLowerCase();
  for (const [index, color] of Object.entries(LineColorPalette)) {
    if (color.toLowerCase() === normalized) {
      return parseInt(index);
    }
  }
  // Default to black if not found
  return 1;
}

/**
 * Check if a color is transparent
 */
export function isTransparent(color: string): boolean {
  return (
    color === 'transparent' ||
    color === PenpaColors.TRANSPARENT_BLACK ||
    color === PenpaColors.TRANSPARENT_WHITE ||
    color === 'rgba(0, 0, 0, 0)' ||
    color === 'rgba(255, 255, 255, 0)'
  );
}

// ========================================
// Color Presets for UI
// ========================================

/**
 * Preset colors for the color picker UI
 */
export const ColorPickerPresets = {
  surfaces: [
    'transparent',
    PenpaColors.GREY_DARK_VERY,
    PenpaColors.GREY,
    PenpaColors.GREY_LIGHT,
    PenpaColors.BLACK,
    PenpaColors.GREEN_LIGHT_VERY,
    PenpaColors.BLUE_LIGHT_VERY,
    PenpaColors.RED_LIGHT,
    PenpaColors.YELLOW,
    PenpaColors.PINK_LIGHT,
    PenpaColors.ORANGE_LIGHT,
    PenpaColors.PURPLE_LIGHT,
    PenpaColors.BROWN_LIGHT,
    PenpaColors.WHITE,
  ],
  lines: [
    PenpaColors.BLACK,
    PenpaColors.GREY_DARK_VERY,
    PenpaColors.GREEN,
    PenpaColors.GREY,
    PenpaColors.RED,
    PenpaColors.BLUE_LIGHT,
    PenpaColors.GREY_DARK,
    PenpaColors.GREY_LIGHT,
  ],
  symbols: [
    PenpaColors.BLACK,
    PenpaColors.GREY_DARK,
    PenpaColors.GREY,
    PenpaColors.GREY_LIGHT,
    PenpaColors.WHITE,
    PenpaColors.GREEN,
    PenpaColors.BLUE,
    PenpaColors.RED,
    PenpaColors.YELLOW,
  ],
} as const;

// ========================================
// Export default palette
// ========================================

export default PenpaColors;
