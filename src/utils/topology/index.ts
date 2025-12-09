/**
 * Topology Module - Unified Grid Topology System
 *
 * This module provides a unified representation for irregular/deformed grids
 * supporting various planar tilings:
 *
 * Regular Tilings:
 * - Square {4,4}
 * - Triangular {3,6}
 * - Hexagonal {6,3}
 *
 * Semi-Regular (Archimedean) Tilings:
 * - Trihexagonal (3.6.3.6) - Kagome lattice
 * - Snub Square (3².4.3.4)
 * - Truncated Square (4.8²)
 * - Rhombitrihexagonal (3.4.6.4)
 * - Truncated Hexagonal (3.12²)
 * - Truncated Trihexagonal (4.6.12)
 * - Snub Trihexagonal (3⁴.6)
 * - Elongated Triangular (3³.4²)
 *
 * Dual (Laves/Catalan) Tilings:
 * - Cairo Pentagonal (V3².4.3.4)
 * - Rhombille (V3.6.3.6)
 * - Deltoidal Trihexagonal (V3.4.6.4)
 * - Tetrakis Square (V4.8²)
 * - Triakis Triangular (V3.12²)
 * - Kisrhombille (V4.6.12)
 * - Floret Pentagonal (V3⁴.6)
 * - Prismatic Pentagonal (V3³.4²)
 */

// ========================================
// Types
// ========================================
export type {
  TopologyNodeType,
  TopologyNode,
  TopologyCell,
  TopologyVertex,
  TopologyEdge,
  GridTopology,
  CellDefinition,
  TopologyPreset,
  TopologyPresetParams,
  Index,
} from './types';

// ========================================
// Builder
// ========================================
export { GridTopologyBuilder, buildTopologyFromCells } from './builder';

// ========================================
// Helpers
// ========================================
export {
  SQRT3,
  TRI_HEIGHT_FACTOR,
  calculateCentroid,
  regularPolygonVertices,
  isUpwardTriangle,
  rotatePoint,
  scalePoint,
  translatePoints,
  isPointInPolygon,
  distance,
  midpoint,
  equilateralTriangleVertices,
  hexagonVertices,
  squareVertices,
  octagonVertices,
  dodecagonVertices,
} from './helpers';

// ========================================
// Regular Tilings
// ========================================
export {
  squareGridToTopology,
  triangularGridToTopology,
  hexagonalGridToTopology,
} from './regular';

// ========================================
// Semi-Regular Tilings
// ========================================
export {
  trihexagonalGridToTopology,
  snubSquareGridToTopology,
  truncatedSquareGridToTopology,
  rhombitrihexagonalGridToTopology,
  truncatedHexagonalGridToTopology,
  truncatedTrihexagonalGridToTopology,
  snubTrihexagonalGridToTopology,
  elongatedTriangularGridToTopology,
} from './semiRegular';

// ========================================
// Dual Tilings
// ========================================
export {
  cairoPentagonalGridToTopology,
  rhombilleGridToTopology,
  deltoidalTrihexagonalGridToTopology,
  tetrakisSquareGridToTopology,
  triakisTriangularGridToTopology,
  kisrhombilleGridToTopology,
  floretPentagonalGridToTopology,
  prismaticPentagonalGridToTopology,
} from './dual';

// ========================================
// Converter
// ========================================
export {
  gridConfigToTopology,
  getGridTypeDisplayName,
  getAvailableGridTypes,
} from './converter';

// ========================================
// Presets
// ========================================
export { applyTopologyPreset, getTopologyPresetOptions } from './presets';

// ========================================
// Queries
// ========================================
export {
  getAdjacentCells,
  getCellVertices,
  getCellEdges,
  getSharedEdge,
  getBoundaryEdges,
  getBoundaryVertices,
  findNearestCellInTopology,
  findNearestVertexInTopology,
  findNearestEdgeInTopology,
  areCellsAdjacent,
  getConnectedRegion,
  topologyCellIdToStandard,
  getCellCenterFromTopology,
  getVertexPositionFromTopology,
  getEdgeMidpointFromTopology,
  getCellsAtVertex,
  getEdgesAtVertex,
  getCellPolygon,
  getOrthogonallyAdjacentCells,
  getDiagonallyAdjacentCells,
  areCellsDiagonallyAdjacent,
  // Index query functions
  getCellIndex,
  getVertexIndex,
  getEdgeIndex,
  isValidIndex,
  findCellByIndex,
  findVertexByIndex,
  // Edge-based line drawing
  type EdgeLineDrawInfo,
  getEdgeLineDrawInfo,
  getEdgeBetweenVertices,
  getEdgeBetweenCells,
  vertexPairToEdgeId,
  cellPairToEdgeId,
} from './queries';
export { applyMergedCells } from './mergeSplit';
export { applySculptOperations } from './sculpt';

// ========================================
// Resize
// ========================================
export {
  type ResizeDirection,
  type ResizeResult,
  resizeTopology,
  expandTopology,
  shrinkTopology,
  getCellsInRowOrCol,
  getBoundaryCells,
  remapPuzzleElements,
} from './resize';
