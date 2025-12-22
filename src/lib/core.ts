// Core entrypoint: pure logic and types (no UI, no store).
export * from '../types';
export * from '../solver';
export * from '../utils/numberEntries';
export * from '../utils/gridIds';
export * from '../constraints/schemas';
export * from '../constraints/testCases';

export {
  inputModeToTool,
  getToolForInputMode,
  isInfoMode,
  isSpecialMode,
  getDefaultInputMode,
  constraintCatalog,
  getConstraintsByScope,
  getDefaultValidationRules,
  registerHighlightProvider,
  getHighlightProvider,
  mergeHighlightOutputs,
} from '../constraints';

export type {
  ConstraintScope,
  HighlightScope,
  ConstraintTarget,
  ToolId,
  ConstraintRule,
  HighlightRule,
  ConstraintSchema,
  ConstraintCatalog,
  ValidationResult,
  ConstraintPreset,
  InputMode,
  InputModes,
  GridStyleType,
  FrameStyleType,
  ToolMapping,
  InputTarget,
  HighlightOutput,
  HighlightContext,
  HighlightFill,
  HighlightTextStyle,
  HighlightOverlaySymbol,
  HighlightLayerHint,
  HighlightProvider,
} from '../constraints';

export {
  getCellIndexById,
  getVertexIndexById,
  getEdgeIndexById,
  getCellIndexMap,
  getVertexIndexMap,
  getEdgeIndexMap,
  generateGridPoints,
  getCellId,
  getVertexId,
  getEdgeHId,
  getEdgeVId,
  screenToSvg,
  svgToScreen,
  findNearestCell,
  findNearestVertex,
  findNearestEdge,
  getCellCenter,
  getVertexPosition,
  getEdgePosition,
  getAdjacentCells as getAdjacentCellsFromGrid,
  getDiagonalCells,
  getCellCorners,
  getGridDimensions,
  isPointInGrid,
  snapToGrid,
} from '../utils/gridUtils';

export {
  normalizeSegmentEndpoints,
  generateLineId,
  parseLineId,
  findLineByEndpoints,
} from '../utils/lineNormalization';
export type { GridPointType as LineGridPointType } from '../utils/lineNormalization';

export * as topology from '../utils/gridTopology';
