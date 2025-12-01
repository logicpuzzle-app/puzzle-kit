/**
 * Grid Config to Topology Converter
 *
 * Unified converter that routes to appropriate tiling function based on grid type.
 */

import type { GridConfig } from '../../types';
import type { GridTopology } from './types';

// Regular tilings
import {
  squareGridToTopology,
  triangularGridToTopology,
  hexagonalGridToTopology,
  pyramidGridToTopology,
  applyIsometricTransform,
  isometricGridToTopology,
} from './regular';

// Semi-regular tilings
import {
  trihexagonalGridToTopology,
  snubSquareGridToTopology,
  truncatedSquareGridToTopology,
  rhombitrihexagonalGridToTopology,
  truncatedHexagonalGridToTopology,
  truncatedTrihexagonalGridToTopology,
  snubTrihexagonalGridToTopology,
  elongatedTriangularGridToTopology,
} from './semiRegular';

// Dual tilings
import {
  cairoPentagonalGridToTopology,
  rhombilleGridToTopology,
  deltoidalTrihexagonalGridToTopology,
  tetrakisSquareGridToTopology,
  triakisTriangularGridToTopology,
  kisrhombilleGridToTopology,
  floretPentagonalGridToTopology,
  prismaticPentagonalGridToTopology,
} from './dual';
import { applyMergedCells, applySplits } from './mergeSplit';
import { applySculptOperations } from './sculpt';

/**
 * Convert any GridConfig to GridTopology based on grid type.
 *
 * @param config Grid configuration
 * @returns GridTopology
 */
export function gridConfigToTopology(config: GridConfig): GridTopology {
  const gridType = config.gridType || 'square';

  const baseTopology = (() => {
    switch (gridType) {
    // ========================================
    // Regular Tilings
    // ========================================
    case 'square':
        return squareGridToTopology(config);

    case 'triangle':
        return triangularGridToTopology(config);

    case 'hex':
        return hexagonalGridToTopology(config);

    // ========================================
    // Semi-Regular Tilings
    // ========================================
    case 'trihexagonal':
        return trihexagonalGridToTopology(config);

    case 'snub-square':
        return snubSquareGridToTopology(config);

    case 'truncated-square':
        return truncatedSquareGridToTopology(config);

    case 'rhombitrihexagonal':
        return rhombitrihexagonalGridToTopology(config);

    case 'truncated-hexagonal':
        return truncatedHexagonalGridToTopology(config);

    case 'truncated-trihexagonal':
        return truncatedTrihexagonalGridToTopology(config);

    case 'snub-trihexagonal':
        return snubTrihexagonalGridToTopology(config);

    case 'elongated-triangular':
        return elongatedTriangularGridToTopology(config);

    // ========================================
    // Dual Tilings
    // ========================================
    case 'cairo':
        return cairoPentagonalGridToTopology(config);

    case 'rhombille':
        return rhombilleGridToTopology(config);

    case 'deltoidal-trihexagonal':
        return deltoidalTrihexagonalGridToTopology(config);

    case 'tetrakis-square':
        return tetrakisSquareGridToTopology(config);

    case 'triakis-triangular':
        return triakisTriangularGridToTopology(config);

    case 'kisrhombille':
        return kisrhombilleGridToTopology(config);

    case 'floret-pentagonal':
        return floretPentagonalGridToTopology(config);

    case 'prismatic-pentagonal':
        return prismaticPentagonalGridToTopology(config);

    // ========================================
    // Special / Fallback
    // ========================================
    case 'pyramid':
        return pyramidGridToTopology(config);
    case 'iso':
        return isometricGridToTopology(config);

    default:
      // Default to square grid
      console.warn(`Unknown grid type: ${gridType}, falling back to square`);
        return squareGridToTopology(config);
  }
  })();

  // Apply merge logic per docs/cell-merge-split.md
  const merged = applyMergedCells(baseTopology, config);
  // Apply splits (vertex-vertex only for now)
  const split = applySplits(merged, config);
  // Apply sculpt operations (vertex rotations in isometric grids)
  const sculpted = applySculptOperations(split, config);
  return sculpted;
}

/**
 * Get display name for grid type
 */
export function getGridTypeDisplayName(gridType: string): string {
  const names: Record<string, string> = {
    // Regular
    'square': 'Square {4,4}',
    'triangle': 'Triangular {3,6}',
    'hex': 'Hexagonal {6,3}',
    // Semi-regular
    'trihexagonal': 'Trihexagonal (3.6.3.6)',
    'snub-square': 'Snub Square (3².4.3.4)',
    'truncated-square': 'Truncated Square (4.8²)',
    'rhombitrihexagonal': 'Rhombitrihexagonal (3.4.6.4)',
    'truncated-hexagonal': 'Truncated Hexagonal (3.12²)',
    'truncated-trihexagonal': 'Truncated Trihexagonal (4.6.12)',
    'snub-trihexagonal': 'Snub Trihexagonal (3⁴.6)',
    'elongated-triangular': 'Elongated Triangular (3³.4²)',
    // Dual
    'cairo': 'Cairo Pentagonal (V3².4.3.4)',
    'rhombille': 'Rhombille (V3.6.3.6)',
    'deltoidal-trihexagonal': 'Deltoidal Trihexagonal (V3.4.6.4)',
    'tetrakis-square': 'Tetrakis Square (V4.8²)',
    'triakis-triangular': 'Triakis Triangular (V3.12²)',
    'kisrhombille': 'Kisrhombille (V4.6.12)',
    'floret-pentagonal': 'Floret Pentagonal (V3⁴.6)',
    'prismatic-pentagonal': 'Prismatic Pentagonal (V3³.4²)',
    // Special
    'pyramid': 'Pyramid',
  };

  return names[gridType] || gridType;
}

/**
 * Get all available grid types grouped by category
 */
export function getAvailableGridTypes(): {
  regular: string[];
  semiRegular: string[];
  dual: string[];
  special: string[];
} {
  return {
    regular: ['square', 'triangle', 'hex'],
    semiRegular: [
      'trihexagonal',
      'snub-square',
      'truncated-square',
      'rhombitrihexagonal',
      'truncated-hexagonal',
      'truncated-trihexagonal',
      'snub-trihexagonal',
      'elongated-triangular',
    ],
    dual: [
      'cairo',
      'rhombille',
      'deltoidal-trihexagonal',
      'tetrakis-square',
      'triakis-triangular',
      'kisrhombille',
      'floret-pentagonal',
      'prismatic-pentagonal',
    ],
    special: ['pyramid', 'iso'],
  };
}
