// Grid utilities
export * from './gridUtils';
export * from './hexGridUtils';
export * from './gridIds';

// Grid topology (unified representation for irregular grids)
export {
  // Types
  type TopologyNodeType,
  type TopologyNode,
  type TopologyCell,
  type TopologyVertex,
  type TopologyEdge,
  type GridTopology,
  type TopologyPreset,
  type TopologyPresetParams,
  type CellDefinition,
  type Index,
  // Builder
  GridTopologyBuilder,
  buildTopologyFromCells,
  // Regular tilings
  squareGridToTopology,
  triangularGridToTopology,
  hexagonalGridToTopology,
  // Semi-regular tilings
  snubSquareGridToTopology,
  trihexagonalGridToTopology,
  rhombitrihexagonalGridToTopology,
  truncatedSquareGridToTopology,
  truncatedHexagonalGridToTopology,
  truncatedTrihexagonalGridToTopology,
  snubTrihexagonalGridToTopology,
  elongatedTriangularGridToTopology,
  // Dual tilings
  cairoPentagonalGridToTopology,
  rhombilleGridToTopology,
  deltoidalTrihexagonalGridToTopology,
  tetrakisSquareGridToTopology,
  triakisTriangularGridToTopology,
  kisrhombilleGridToTopology,
  floretPentagonalGridToTopology,
  prismaticPentagonalGridToTopology,
  // Unified converter
  gridConfigToTopology,
  getGridTypeDisplayName,
  getAvailableGridTypes,
  // Presets (deformation effects)
  applyTopologyPreset,
  getTopologyPresetOptions,
  // Query functions
  getAdjacentCells as getAdjacentCellsFromTopology,
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
  // Helpers
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
} from './gridTopology';

// Penpa compatibility
export * from './penpaCompat';
