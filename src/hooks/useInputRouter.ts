/**
 * useInputRouter - Data-driven input event routing
 *
 * Routes mouse/touch events to appropriate handlers based on tool type.
 * New tools can be added by extending the toolHandlerMap.
 */

import { useCallback, useMemo } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { screenToSvg } from '../utils/gridUtils';
import type { Point } from '../types';

/**
 * Tool handler function signature
 */
export type ToolHandler = (
  point: Point,
  options: {
    isMouseDown: boolean;
    isMouseMove: boolean;
    isMouseUp: boolean;
    isRightClick: boolean;
    isShiftKey: boolean;
  }
) => void;

/**
 * Tool configuration for routing
 */
export interface ToolConfig {
  /** Handler category - determines which base handler to use */
  category: 'surface' | 'line' | 'edge' | 'wall' | 'symbol' | 'special' | 'number' | 'text' | 'select' | 'grid' | 'pan';
  /** Whether this tool needs drag handling */
  supportsDrag?: boolean;
  /** Whether right-click has special behavior */
  supportsRightClick?: boolean;
  /** Additional tool-specific options */
  options?: Record<string, unknown>;
}

/**
 * Tool configuration map - add new tools here
 */
export const toolConfigMap: Record<string, ToolConfig> = {
  // Surface tools
  'surface-shade': { category: 'surface', supportsDrag: true, supportsRightClick: true },
  'surface-cycle': { category: 'surface', supportsDrag: true, supportsRightClick: true },
  'multicolor-surface': { category: 'surface', supportsDrag: true, supportsRightClick: true },
  'solution-area': { category: 'surface', supportsDrag: true, supportsRightClick: true },

  // Line tools (cell-to-cell)
  'line-normal': { category: 'line', supportsDrag: true, supportsRightClick: true },
  'line-diagonal': { category: 'line', supportsDrag: true, supportsRightClick: true },

  // Edge tools (vertex-to-vertex)
  'edge-normal': { category: 'edge', supportsDrag: true, supportsRightClick: true },
  'edge-cross': { category: 'edge', supportsDrag: true, supportsRightClick: true },

  // Wall tools (cell boundary)
  'wall-normal': { category: 'wall', supportsDrag: true, supportsRightClick: true },

  // Symbol tools
  'symbol-circle': { category: 'symbol', supportsRightClick: true },
  'symbol-circle-filled': { category: 'symbol', supportsRightClick: true },
  'symbol-cross': { category: 'symbol', supportsRightClick: true },
  'symbol-line': { category: 'symbol', supportsRightClick: true },

  // Special tools (multi-cell shapes)
  'special-thermo': { category: 'special', supportsDrag: true, supportsRightClick: true },
  'special-arrow': { category: 'special', supportsDrag: true, supportsRightClick: true },
  'special-cage': { category: 'special', supportsDrag: true, supportsRightClick: true },
  'special-boxline': { category: 'special', supportsDrag: true, supportsRightClick: true },

  // Number tools
  'number-normal': { category: 'number' },
  'number-corner': { category: 'number' },
  'number-side': { category: 'number' },
  'number-candidates': { category: 'number' },
  'number-directional': { category: 'number', supportsRightClick: true },

  // Text tool
  'text': { category: 'text' },

  // Selection
  'select': { category: 'select', supportsDrag: true },

  // Pan/zoom
  'pan': { category: 'pan', supportsDrag: true },
};

/**
 * Get tool config, with fallback for prefix matching
 */
export function getToolConfig(tool: string): ToolConfig | null {
  // Exact match
  if (toolConfigMap[tool]) {
    return toolConfigMap[tool];
  }

  // Prefix match (e.g., 'surface-custom' matches 'surface-*')
  const prefixes = ['surface', 'line', 'edge', 'wall', 'symbol', 'special', 'number', 'text'];
  for (const prefix of prefixes) {
    if (tool.startsWith(prefix)) {
      // Find first matching config
      const matchingKey = Object.keys(toolConfigMap).find(k => k.startsWith(prefix));
      if (matchingKey) {
        return toolConfigMap[matchingKey];
      }
    }
  }

  return null;
}

interface UseInputRouterOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

/**
 * Hook for data-driven input routing
 */
export function useInputRouter({ svgRef }: UseInputRouterOptions) {
  const { canvas, toolSettings, activeLayer } = usePuzzleStore();

  const isGridMode = activeLayer === 'grid';
  const isConstraintMode = activeLayer === 'constraint';

  /**
   * Convert screen coordinates to SVG coordinates
   */
  const getPoint = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      return screenToSvg(
        e.clientX,
        e.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );
    },
    [canvas.zoom, canvas.panX, canvas.panY, svgRef]
  );

  /**
   * Get the current tool's configuration
   */
  const currentToolConfig = useMemo(() => {
    return getToolConfig(toolSettings.currentTool);
  }, [toolSettings.currentTool]);

  /**
   * Check if current tool should be handled by a specific category
   */
  const isCategory = useCallback(
    (category: ToolConfig['category']): boolean => {
      return currentToolConfig?.category === category;
    },
    [currentToolConfig]
  );

  /**
   * Check if editing is allowed in current mode
   */
  const canEdit = useMemo(() => {
    if (isConstraintMode) return false;
    return true;
  }, [isConstraintMode]);

  return {
    getPoint,
    currentToolConfig,
    isCategory,
    canEdit,
    isGridMode,
    isConstraintMode,
  };
}
