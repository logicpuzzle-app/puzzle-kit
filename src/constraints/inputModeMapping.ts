/**
 * InputMode Mapping - Maps pzprjs inputModes to puzzle-kit tools
 *
 * This module provides the bridge between pzprjs's inputModes system
 * and puzzle-kit's tool/category system.
 */

import type { InputMode, ConstraintSchema, AutoModeType } from './types';
import type { ToolType, ToolCategory } from '../types';

/**
 * Input target - where the input is placed
 */
export type InputTarget = 'cell' | 'edge' | 'vertex' | 'cross';

/**
 * Input constraint for shading tools
 */
export type InputConstraint = 'none' | 'noAdjacent';

/**
 * Mapping from pzprjs inputMode to puzzle-kit tool configuration
 */
export interface ToolMapping {
  /** puzzle-kit tool type */
  tool: ToolType;
  /** puzzle-kit tool category */
  category: ToolCategory;
  /** Where the input is placed (cell, edge, vertex, cross) */
  target: InputTarget;
  /** Override symbol type (e.g., 'circle-filled' instead of 'circle') */
  symbolType?: string;
  /** Input constraint for shading (e.g., 'noAdjacent' prevents shading adjacent cells) */
  inputConstraint?: InputConstraint;
  /** Additional tool settings to apply */
  settings?: Partial<{
    color: string;
    secondaryColor: string;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    lineThickness: 'thinnest' | 'thin' | 'normal' | 'thick' | 'thickest';
    symbolSize: 'largest' | 'large' | 'medium' | 'small';
    symbolGridPoints: ('cell' | 'vertex' | 'edge')[];
    lineGridPoints: ('cell' | 'vertex' | 'edge')[];
  }>;
}

/**
 * Map pzprjs inputModes to puzzle-kit tools
 */
export const inputModeToTool: Record<InputMode, ToolMapping | null> = {
  // Auto mode - behavior depends on autoModePlay/autoModeEdit in schema
  // Default: cycle through states (none -> shade -> unshade -> none) for black cell puzzles
  // This is overridden by getToolForInputMode() based on schema.autoModePlay/autoModeEdit
  'auto': {
    tool: 'surface-cycle',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#444444', // Shade color
      secondaryColor: '#A0FFA0', // Unshade color
    },
  },

  // Number input modes - problem mode uses black
  'number': {
    tool: 'number-normal',
    category: 'number',
    target: 'cell',
    settings: {
      color: '#000000', // Black for problem mode numbers
    },
  },
  'number-': {
    tool: 'number-normal',
    category: 'number',
    target: 'cell',
    settings: {
      color: '#000000', // Black for problem mode numbers
    },
    // Note: number- means mouse buttons are inverted (handled separately)
  },

  // Clear mode
  'clear': null, // Clear is handled as an action, not a tool

  // Line drawing modes (pzprjs: rgb(0, 160, 0))
  // Note: for edge-based puzzles like Slitherlink, lineGridPoints should be set to ['vertex']
  'line': {
    tool: 'edge-normal',
    category: 'edge',
    target: 'edge',
    settings: {
      color: '#00A000', // pzprjs linecolor
      lineStyle: 'solid',
      lineThickness: 'normal',
      lineGridPoints: ['vertex'], // Edge lines connect vertices
    },
  },

  // X mark on edges (peke = バツ) (pzprjs: rgb(0, 127, 0))
  'peke': {
    tool: 'symbol-cross',
    category: 'symbol',
    target: 'edge',
    settings: {
      color: '#007F00', // pzprjs pekecolor
      symbolSize: 'small',
      symbolGridPoints: ['edge'], // Place on edge centers
    },
  },

  // Cell shading modes (penpa-edit style: #444444)
  'shade': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#444444', // penpa-edit shadecolor (pzprjs uses #000000)
    },
  },
  // unshade uses qsubcolor1 (light green) in pzprjs
  'unshade': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#A0FFA0', // pzprjs qsubcolor1: rgb(160,255,160)
    },
  },

  // Border drawing (thick edge for room boundaries) - problem mode uses black
  'border': {
    tool: 'edge-normal',
    category: 'edge',
    target: 'edge',
    settings: {
      color: '#000000', // Black for problem mode borders
      lineThickness: 'normal',
      lineGridPoints: ['vertex'], // Edge lines connect vertices
    },
  },

  // Auxiliary line
  'subline': {
    tool: 'edge-normal',
    category: 'edge',
    target: 'edge',
    settings: {
      lineStyle: 'dotted',
      lineThickness: 'thin',
      color: '#888888',
    },
  },

  // Background color modes (pzprjs qsubcolor)
  'bgcolor': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#C0C0C0', // pzprjs qsubcolor3: rgb(192,192,192) gray
    },
  },
  'bgcolor1': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#A0FFA0', // pzprjs qsubcolor1: rgb(160,255,160) light green
    },
  },
  'bgcolor2': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#FFFF7F', // pzprjs qsubcolor2: rgb(255,255,127) light yellow
    },
  },

  // Auxiliary mark modes (pzprjs: subcolor = rgb(127, 127, 255))
  'subcircle': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cell',
    settings: {
      symbolSize: 'small',
      color: '#7F7FFF', // pzprjs subcolor
    },
  },
  'subcross': {
    tool: 'symbol-cross',
    category: 'symbol',
    target: 'cell',
    settings: {
      symbolSize: 'small',
      color: '#7F7FFF', // pzprjs subcolor
    },
  },

  // Circle placement (for Mashu, etc.)
  // Both use black color - the difference is filled vs outlined
  'circle-unshade': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cell',
    symbolType: 'circle', // Outlined circle (white pearl)
    settings: {
      color: '#000000',
      symbolSize: 'large',
    },
  },
  'circle-shade': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cell',
    symbolType: 'circle-filled', // Filled circle (black pearl)
    settings: {
      color: '#000000',
      symbolSize: 'large',
    },
  },

  // Arrow and direction modes
  'arrow': {
    tool: 'symbol-arrow',
    category: 'symbol',
    target: 'cell',
  },
  'direc': {
    tool: 'number-directional',
    category: 'number',
    target: 'cell',
  },

  // Bar placement (tateyoko)
  'bar': {
    tool: 'symbol-line',
    category: 'symbol',
    target: 'cell',
  },

  // Empty cell marking
  'empty': {
    tool: 'surface-dot',
    category: 'surface',
    target: 'cell',
  },

  // Ice cell (pzprjs: icecolor = rgb(192, 224, 255))
  'ice': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#C0E0FF', // pzprjs icecolor
    },
  },

  // Cross dot at intersections
  'crossdot': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cross',
    settings: {
      symbolSize: 'small',
    },
  },

  // Object blank marker
  'objblank': {
    tool: 'surface-dot',
    category: 'surface',
    target: 'cell',
  },

  // Info modes (display only, not input tools)
  'info-line': null,
  'info-blk': null,
  'info-ublk': null,
  'info-room': null,
};

/**
 * Get the puzzle-kit tool configuration for a given inputMode
 * @param mode - The input mode
 * @param schema - Optional constraint schema to customize tool mapping
 */
export function getToolForInputMode(mode: InputMode, schema?: ConstraintSchema | null): ToolMapping | null {
  const baseMapping = inputModeToTool[mode];
  if (!baseMapping) return null;

  // If schema has lineTarget='cell' and mode is 'line', use line-normal instead of edge-normal
  // Lines connect cell centers (Mashu, Yajilin, etc.)
  if (mode === 'line' && schema?.lineTarget === 'cell') {
    return {
      tool: 'line-normal',
      category: 'line',
      target: 'cell',
      settings: {
        ...baseMapping.settings,
        lineGridPoints: ['cell'], // Lines connect cell centers
      },
    };
  }

  // Note: 'peke' (X mark) is always placed on edges, even for cell-line puzzles like Mashu

  // If schema has noAdjacentShade=true and mode is 'shade', add input constraint
  // This prevents shading cells that are orthogonally adjacent to already shaded cells
  if (mode === 'shade' && schema?.noAdjacentShade) {
    console.log('[getToolForInputMode] shade mode with noAdjacent:', { mode, noAdjacentShade: schema.noAdjacentShade });
    return {
      ...baseMapping,
      inputConstraint: 'noAdjacent',
    };
  }

  // If schema has noAdjacentShade=true and mode is 'auto', add input constraint
  if (mode === 'auto' && schema?.noAdjacentShade) {
    console.log('[getToolForInputMode] auto mode with noAdjacent:', { mode, noAdjacentShade: schema.noAdjacentShade });
    return {
      ...baseMapping,
      inputConstraint: 'noAdjacent',
    };
  }

  return baseMapping;
}

/**
 * Auto mode configuration - defines left/right button behaviors
 */
export interface AutoModeConfig {
  /** Auto mode type identifier */
  type: AutoModeType;
  /** Tool mapping for left button */
  leftButton: ToolMapping;
  /** Tool mapping for right button */
  rightButton: ToolMapping;
  /** Whether noAdjacent constraint applies to shading */
  noAdjacentShade?: boolean;
}

/**
 * Get auto mode configuration based on schema
 * @param schema - The constraint schema
 * @param isEditMode - Whether we're in edit mode (vs play mode)
 */
export function getAutoModeConfig(schema: ConstraintSchema | null | undefined, isEditMode: boolean = false): AutoModeConfig {
  const autoModeType = isEditMode
    ? (schema?.autoModeEdit ?? 'cell')
    : (schema?.autoModePlay ?? 'cell');

  const noAdjacentShade = schema?.noAdjacentShade ?? false;

  switch (autoModeType) {
    // ===== Play mode types =====
    case 'line':
      // Loop puzzles: left=line, right=peke (Slitherlink)
      return {
        type: 'line',
        leftButton: {
          tool: schema?.lineTarget === 'cell' ? 'line-normal' : 'edge-normal',
          category: schema?.lineTarget === 'cell' ? 'line' : 'edge',
          target: 'edge',
          settings: {
            color: '#00A000',
            lineStyle: 'solid',
            lineThickness: 'normal',
            lineGridPoints: schema?.lineTarget === 'cell' ? ['cell'] : ['vertex'],
          },
        },
        rightButton: {
          tool: 'symbol-cross',
          category: 'symbol',
          target: 'edge',
          settings: {
            color: '#007F00',
            symbolSize: 'small',
            symbolGridPoints: ['edge'],
          },
        },
      };

    case 'line-cell':
      // Loop + black cell puzzles: left=line, right=shade/unshade (Yajilin)
      return {
        type: 'line-cell',
        leftButton: {
          tool: schema?.lineTarget === 'cell' ? 'line-normal' : 'edge-normal',
          category: schema?.lineTarget === 'cell' ? 'line' : 'edge',
          target: 'edge',
          settings: {
            color: '#00A000',
            lineStyle: 'solid',
            lineThickness: 'normal',
            lineGridPoints: schema?.lineTarget === 'cell' ? ['cell'] : ['vertex'],
          },
        },
        rightButton: {
          tool: 'surface-cycle',
          category: 'surface',
          target: 'cell',
          inputConstraint: noAdjacentShade ? 'noAdjacent' : undefined,
          settings: {
            color: '#444444',
            secondaryColor: '#A0FFA0',
          },
        },
        noAdjacentShade,
      };

    case 'cell':
      // Black cell puzzles: cycle through shade/unshade/none (Nurikabe, Heyawake)
      return {
        type: 'cell',
        leftButton: {
          tool: 'surface-cycle',
          category: 'surface',
          target: 'cell',
          inputConstraint: noAdjacentShade ? 'noAdjacent' : undefined,
          settings: {
            color: '#444444',
            secondaryColor: '#A0FFA0',
          },
        },
        rightButton: {
          tool: 'surface-cycle',
          category: 'surface',
          target: 'cell',
          inputConstraint: noAdjacentShade ? 'noAdjacent' : undefined,
          settings: {
            color: '#444444',
            secondaryColor: '#A0FFA0',
          },
        },
        noAdjacentShade,
      };

    // ===== Edit mode types =====
    case 'number':
      // Number input puzzles: enter numbers in cells (Nurikabe, Slitherlink)
      return {
        type: 'number',
        leftButton: {
          tool: 'number-normal',
          category: 'number',
          target: 'cell',
          settings: {
            color: '#000000',
          },
        },
        rightButton: {
          tool: 'number-normal',
          category: 'number',
          target: 'cell',
          settings: {
            color: '#000000',
          },
        },
      };

    case 'border-number':
      // Room puzzles: drag=border, click=number (Heyawake)
      return {
        type: 'border-number',
        leftButton: {
          tool: 'edge-normal',
          category: 'edge',
          target: 'edge',
          settings: {
            color: '#000000',
            lineThickness: 'normal',
            lineGridPoints: ['vertex'],
          },
        },
        rightButton: {
          tool: 'number-normal',
          category: 'number',
          target: 'cell',
          settings: {
            color: '#000000',
          },
        },
      };

    case 'direc':
      // Directional number puzzles: enter direction+number (Yajilin)
      return {
        type: 'direc',
        leftButton: {
          tool: 'number-directional',
          category: 'number',
          target: 'cell',
          settings: {
            color: '#000000',
          },
        },
        rightButton: {
          tool: 'number-directional',
          category: 'number',
          target: 'cell',
          settings: {
            color: '#000000',
          },
        },
      };

    default:
      // Fallback to cell mode
      return {
        type: 'cell',
        leftButton: {
          tool: 'surface-cycle',
          category: 'surface',
          target: 'cell',
          inputConstraint: noAdjacentShade ? 'noAdjacent' : undefined,
          settings: {
            color: '#444444',
            secondaryColor: '#A0FFA0',
          },
        },
        rightButton: {
          tool: 'surface-cycle',
          category: 'surface',
          target: 'cell',
          inputConstraint: noAdjacentShade ? 'noAdjacent' : undefined,
          settings: {
            color: '#444444',
            secondaryColor: '#A0FFA0',
          },
        },
        noAdjacentShade,
      };
  }
}

/**
 * Check if an inputMode is an info/display mode (not an input tool)
 */
export function isInfoMode(mode: InputMode): boolean {
  return mode.startsWith('info-');
}

/**
 * Check if an inputMode requires special handling
 */
export function isSpecialMode(mode: InputMode): boolean {
  return mode === 'auto' || mode === 'clear' || isInfoMode(mode);
}

/**
 * Get the default inputMode for a puzzle in edit or play mode
 */
export function getDefaultInputMode(modes: InputMode[], preferAuto: boolean = true): InputMode {
  if (preferAuto && modes.includes('auto')) {
    return 'auto';
  }
  // Return the first non-info, non-clear mode
  const primaryModes = modes.filter(m => !isInfoMode(m) && m !== 'clear');
  return primaryModes[0] || 'auto';
}
