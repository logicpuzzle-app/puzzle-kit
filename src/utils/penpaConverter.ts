/**
 * Penpa Data Converter
 *
 * Converts between PuzzleKit data structures and Penpa-edit format.
 * Enables bidirectional compatibility for import/export.
 */

import {
  getCellIndexById,
  getEdgeIndexById,
  getVertexIndexById,
} from './gridUtils';
import type {
  GridConfig,
  PuzzleState,
  PuzzleElements,
  LayerType,
  SurfaceElement,
  NumberElement,
  SymbolElement,
  CageElement,
  SpecialElement,
} from '../types';

import type {
  PenpaExportData,
  PenpaPuzzleData,
  PenpaModeConfig,
  PenpaModeState,
  PenpaGridType,
  PenpaEditMode,
} from './penpaSerializer';

// ========================================
// Color Mapping
// ========================================

/**
 * Penpa color ID to hex color mapping
 */
export const PENPA_COLORS: Record<number, string> = {
  1: '#cfcfcf', // Light gray
  2: '#a0a0a0', // Gray
  3: '#000000', // Black
  4: '#00ff00', // Green
  5: '#0000ff', // Blue
  6: '#ff0000', // Red
  7: '#ffff00', // Yellow
  8: '#ff8000', // Orange
  9: '#800080', // Purple
  10: '#00ffff', // Cyan
  11: '#ff00ff', // Magenta
  12: '#ffffff', // White
  13: '#c0c0c0', // Silver
};

/**
 * Reverse mapping: hex color to Penpa color ID
 */
export const COLOR_TO_PENPA: Record<string, number> = Object.fromEntries(
  Object.entries(PENPA_COLORS).map(([id, hex]) => [hex.toLowerCase(), parseInt(id)])
);

/**
 * Get Penpa color ID from hex color
 */
export function hexToPenpaColor(hex: string): number {
  const normalized = hex.toLowerCase();
  if (COLOR_TO_PENPA[normalized]) {
    return COLOR_TO_PENPA[normalized];
  }
  // Default to gray if no match
  return 1;
}

/**
 * Get hex color from Penpa color ID
 */
export function penpaColorToHex(colorId: number): string {
  return PENPA_COLORS[colorId] || '#808080';
}

// ========================================
// Line Style Mapping
// ========================================

/**
 * Penpa line style ID mapping
 * 1: solid thin, 2: dashed, 3: dotted, 4: thick solid, 5: x mark
 */
export const PENPA_LINE_STYLES: Record<number, { style: string; thickness: string }> = {
  1: { style: 'solid', thickness: 'normal' },
  2: { style: 'dashed', thickness: 'normal' },
  3: { style: 'dotted', thickness: 'normal' },
  4: { style: 'solid', thickness: 'thick' },
  5: { style: 'x', thickness: 'normal' },
};

// ========================================
// Point Index Calculation
// ========================================

/**
 * Calculate Penpa point index from row/col for square grid
 * Penpa uses a flat index system based on extended grid with borders
 */
export function toPenpaPointIndex(
  row: number,
  col: number,
  gridRows: number,
  gridCols: number,
  pointType: 'cell' | 'vertex' | 'edge-h' | 'edge-v' = 'cell'
): number {
  // Extended grid includes 2 border cells on each side
  const nx0 = gridCols + 4;
  const ny0 = gridRows + 4;

  // Offset for border
  const r = row + 2;
  const c = col + 2;

  switch (pointType) {
    case 'cell':
      // Type 0: cell centers
      return r * nx0 + c;
    case 'vertex':
      // Type 1: vertices (offset by nx0 * ny0)
      return nx0 * ny0 + r * (nx0 - 1) + c;
    case 'edge-h':
      // Type 2: horizontal edges
      return 2 * nx0 * ny0 + r * nx0 + c;
    case 'edge-v':
      // Type 3: vertical edges
      return 3 * nx0 * ny0 + r * (nx0 - 1) + c;
  }
}

/**
 * Convert Penpa point index to row/col
 */
export function fromPenpaPointIndex(
  index: number,
  gridRows: number,
  gridCols: number
): { row: number; col: number; type: 'cell' | 'vertex' | 'edge-h' | 'edge-v' } | null {
  const nx0 = gridCols + 4;
  const ny0 = gridRows + 4;

  // These offsets must match toPenpaPointIndex exactly:
  // cell: 0 to nx0*ny0 - 1
  // vertex: nx0*ny0 to 2*nx0*ny0 - 1
  // edge-h: 2*nx0*ny0 to 3*nx0*ny0 - 1
  // edge-v: 3*nx0*ny0 and above
  const cellOffset = 0;
  const vertexOffset = nx0 * ny0;
  const edgeHOffset = 2 * nx0 * ny0;
  const edgeVOffset = 3 * nx0 * ny0;

  let type: 'cell' | 'vertex' | 'edge-h' | 'edge-v';
  let r: number;
  let c: number;

  if (index < vertexOffset) {
    // Cell center
    type = 'cell';
    const localIndex = index - cellOffset;
    r = Math.floor(localIndex / nx0);
    c = localIndex % nx0;
  } else if (index < edgeHOffset) {
    // Vertex
    type = 'vertex';
    const localIndex = index - vertexOffset;
    r = Math.floor(localIndex / (nx0 - 1));
    c = localIndex % (nx0 - 1);
  } else if (index < edgeVOffset) {
    // Horizontal edge
    type = 'edge-h';
    const localIndex = index - edgeHOffset;
    r = Math.floor(localIndex / nx0);
    c = localIndex % nx0;
  } else {
    // Vertical edge
    type = 'edge-v';
    const localIndex = index - edgeVOffset;
    r = Math.floor(localIndex / (nx0 - 1));
    c = localIndex % (nx0 - 1);
  }

  // Remove border offset
  const row = r - 2;
  const col = c - 2;

  // Check bounds based on type
  // Cell centers: must be strictly within grid
  // Vertices: can be on or inside the boundary (0 to gridRows inclusive for row, 0 to gridCols inclusive for col)
  // Edges: horizontal edges can span 0 to gridRows for row, vertical edges can span 0 to gridCols for col
  if (type === 'cell') {
    if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) {
      return null;
    }
  } else if (type === 'vertex') {
    // Vertices can be at corners of cells, so they range from 0 to gridRows/gridCols (inclusive)
    if (row < 0 || row > gridRows || col < 0 || col > gridCols) {
      return null;
    }
  } else if (type === 'edge-h') {
    // Horizontal edges: row can be 0 to gridRows (top of first row to bottom of last row)
    if (row < 0 || row > gridRows || col < 0 || col >= gridCols) {
      return null;
    }
  } else if (type === 'edge-v') {
    // Vertical edges: col can be 0 to gridCols (left of first col to right of last col)
    if (row < 0 || row >= gridRows || col < 0 || col > gridCols) {
      return null;
    }
  }

  return { row, col, type };
}

/**
 * Convert vertex index to cell + corner information
 * Vertices are at the corners of cells, so a vertex can belong to up to 4 cells.
 *
 * For proper round-trip, we must match how toPenpaPointIndex exports corners:
 * - cornerIndex 0 (TL) -> vertex at (row, col) of cell
 * - cornerIndex 1 (TR) -> vertex at (row, col+1) of cell
 * - cornerIndex 2 (BL) -> vertex at (row+1, col) of cell
 * - cornerIndex 3 (BR) -> vertex at (row+1, col+1) of cell
 *
 * So when importing, vertex at (vr, vc):
 * - Is TL corner (0) of cell (vr, vc)
 * - Is TR corner (1) of cell (vr, vc-1)
 * - Is BL corner (2) of cell (vr-1, vc)
 * - Is BR corner (3) of cell (vr-1, vc-1)
 *
 * We prefer the cell where this vertex is NOT on the grid boundary,
 * to properly restore interior corners.
 */
export function vertexToCorner(
  row: number,
  col: number,
  gridRows: number,
  gridCols: number
): { cellRow: number; cellCol: number; cornerIndex: number } | null {
  // Priority: Try BR first (vertex is BR corner of cell above-left)
  // Then BL, TR, and finally TL
  // This ensures interior corners are restored correctly

  // Try BR corner: cell at (row-1, col-1)
  if (row > 0 && row <= gridRows && col > 0 && col <= gridCols) {
    const cellRow = row - 1;
    const cellCol = col - 1;
    if (cellRow >= 0 && cellRow < gridRows && cellCol >= 0 && cellCol < gridCols) {
      return { cellRow, cellCol, cornerIndex: 3 }; // BR
    }
  }
  // Try BL corner: cell at (row-1, col)
  if (row > 0 && row <= gridRows && col >= 0 && col < gridCols) {
    const cellRow = row - 1;
    const cellCol = col;
    if (cellRow >= 0 && cellRow < gridRows && cellCol >= 0 && cellCol < gridCols) {
      return { cellRow, cellCol, cornerIndex: 2 }; // BL
    }
  }
  // Try TR corner: cell at (row, col-1)
  if (row >= 0 && row < gridRows && col > 0 && col <= gridCols) {
    const cellRow = row;
    const cellCol = col - 1;
    if (cellRow >= 0 && cellRow < gridRows && cellCol >= 0 && cellCol < gridCols) {
      return { cellRow, cellCol, cornerIndex: 1 }; // TR
    }
  }
  // Try TL corner: cell at (row, col)
  if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
    return { cellRow: row, cellCol: col, cornerIndex: 0 }; // TL
  }

  return null;
}

/**
 * Convert horizontal edge index to cell + side information
 * Horizontal edges are at the top/bottom of cells.
 *
 * For proper round-trip, we must match how toPenpaPointIndex exports sides:
 * - sideIndex 0 (Top) -> edge-h at (row, col) of cell
 * - sideIndex 2 (Bottom) -> edge-h at (row+1, col) of cell
 *
 * So when importing, edge-h at (er, ec):
 * - Is Top side (0) of cell (er, ec)
 * - Is Bottom side (2) of cell (er-1, ec)
 *
 * Priority: Bottom first, then Top (to prefer interior edges)
 */
export function edgeHToSide(
  row: number,
  col: number,
  gridRows: number,
  gridCols: number
): { cellRow: number; cellCol: number; sideIndex: number } | null {
  // Side indices: 0=Top, 1=Right, 2=Bottom, 3=Left

  // Try as bottom edge of cell (row-1, col) first
  if (row > 0 && row <= gridRows && col >= 0 && col < gridCols) {
    const cellRow = row - 1;
    if (cellRow >= 0 && cellRow < gridRows) {
      return { cellRow, cellCol: col, sideIndex: 2 }; // Bottom
    }
  }
  // Try as top edge of cell (row, col)
  if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
    return { cellRow: row, cellCol: col, sideIndex: 0 }; // Top
  }

  return null;
}

/**
 * Convert vertical edge index to cell + side information
 * Vertical edges are at the left/right of cells.
 *
 * For proper round-trip, we must match how toPenpaPointIndex exports sides:
 * - sideIndex 1 (Right) -> edge-v at (row, col+1) of cell
 * - sideIndex 3 (Left) -> edge-v at (row, col) of cell
 *
 * So when importing, edge-v at (er, ec):
 * - Is Left side (3) of cell (er, ec)
 * - Is Right side (1) of cell (er, ec-1)
 *
 * Priority: Right first, then Left (to prefer interior edges)
 */
export function edgeVToSide(
  row: number,
  col: number,
  gridRows: number,
  gridCols: number
): { cellRow: number; cellCol: number; sideIndex: number } | null {
  // Side indices: 0=Top, 1=Right, 2=Bottom, 3=Left

  // Try as right edge of cell (row, col-1) first
  if (row >= 0 && row < gridRows && col > 0 && col <= gridCols) {
    const cellCol = col - 1;
    if (cellCol >= 0 && cellCol < gridCols) {
      return { cellRow: row, cellCol, sideIndex: 1 }; // Right
    }
  }
  // Try as left edge of cell (row, col)
  if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
    return { cellRow: row, cellCol: col, sideIndex: 3 }; // Left
  }

  return null;
}

/**
 * Create Penpa line key from two point indices
 */
export function toPenpaLineKey(index1: number, index2: number): string {
  // Penpa uses sorted indices for line keys
  return index1 < index2 ? `${index1},${index2}` : `${index2},${index1}`;
}

/**
 * Parse Penpa line key to two indices
 */
export function fromPenpaLineKey(key: string): [number, number] {
  const parts = key.split(',');
  return [parseInt(parts[0]), parseInt(parts[1])];
}

// ========================================
// PuzzleKit → Penpa Conversion
// ========================================

/**
 * Convert PuzzleKit state to Penpa export format
 */
export function puzzleKitToPenpa(
  grid: GridConfig,
  puzzle: PuzzleState,
  activeLayer: LayerType = 'problem'
): PenpaExportData {
  const gridtype = gridTypeToPenpa(grid.gridType);

  // Convert puzzle elements
  const pu_q = convertElementsToPenpa(puzzle.problem, grid);
  const pu_a = convertElementsToPenpa(puzzle.answer, grid);

  // Create mode config
  const mode = createDefaultModeConfig(activeLayer);

  return {
    gridtype,
    nx: grid.cols,
    ny: grid.rows,
    size: grid.cellSize,
    space: [
      grid.marginTop,
      grid.marginRight,
      grid.marginBottom,
      grid.marginLeft,
    ],
    mode,
    pu_q: Object.keys(pu_q).length > 0 ? pu_q : undefined,
    pu_a: Object.keys(pu_a).length > 0 ? pu_a : undefined,
    version: [3, 2, 1],
  };
}

/**
 * Convert PuzzleKit elements to Penpa puzzle data
 */
function convertElementsToPenpa(
  elements: PuzzleElements,
  grid: GridConfig
): Partial<PenpaPuzzleData> {
  const result: Partial<PenpaPuzzleData> = {};

  // Convert surfaces
  if (Object.keys(elements.surfaces).length > 0) {
    result.surface = {};
    for (const surface of Object.values(elements.surfaces)) {
      const cell = getCellIndexById(surface.cellId, grid);
      if (!cell) continue;
      const index = toPenpaPointIndex(cell.row, cell.col, grid.rows, grid.cols, 'cell');
      result.surface[index.toString()] = hexToPenpaColor(surface.color);
    }
  }

  // Convert lines (cell-to-cell)
  const cellLines = Object.values(elements.lines).filter(
    (line) => (line.lineTarget ?? 'cell') === 'cell'
  );
  if (cellLines.length > 0) {
    result.line = {};
    for (const line of cellLines) {
      if (!line.from || !line.to) continue;
      const from = getCellIndexById(line.from, grid);
      const to = getCellIndexById(line.to, grid);
      if (!from || !to) continue;
      const idx1 = toPenpaPointIndex(from.row, from.col, grid.rows, grid.cols, 'cell');
      const idx2 = toPenpaPointIndex(to.row, to.col, grid.rows, grid.cols, 'cell');
      const key = toPenpaLineKey(idx1, idx2);
      result.line[key] = 1; // Line style (simplified)
    }
  }

  // Convert edges (lineE in Penpa)
  const edgeLines = [
    ...Object.values(elements.lines).filter((line) => line.lineTarget === 'edge'),
    ...Object.values(elements.edges),
  ];
  if (edgeLines.length > 0) {
    result.lineE = {};
    for (const edge of edgeLines) {
      let idx1: number | null = null;
      let idx2: number | null = null;

      if (edge.from && edge.to) {
        const from = getVertexIndexById(edge.from, grid);
        const to = getVertexIndexById(edge.to, grid);
        if (!from || !to) continue;
        idx1 = toPenpaPointIndex(from.row, from.col, grid.rows, grid.cols, 'vertex');
        idx2 = toPenpaPointIndex(to.row, to.col, grid.rows, grid.cols, 'vertex');
      } else if (edge.edgeId) {
        const edgeIndex = getEdgeIndexById(edge.edgeId, grid);
        if (!edgeIndex) continue;
        const v1 = { row: edgeIndex.row, col: edgeIndex.col };
        const v2 =
          edgeIndex.type === 'h'
            ? { row: edgeIndex.row, col: edgeIndex.col + 1 }
            : { row: edgeIndex.row + 1, col: edgeIndex.col };
        idx1 = toPenpaPointIndex(v1.row, v1.col, grid.rows, grid.cols, 'vertex');
        idx2 = toPenpaPointIndex(v2.row, v2.col, grid.rows, grid.cols, 'vertex');
      }

      if (idx1 === null || idx2 === null) continue;
      const key = toPenpaLineKey(idx1, idx2);
      if (result.lineE[key] !== undefined) continue;
      result.lineE[key] = 1;
    }
  }

  // Convert walls
  const wallLines = [
    ...Object.values(elements.lines).filter((line) => line.lineTarget === 'wall'),
    ...Object.values(elements.walls),
  ];
  if (wallLines.length > 0) {
    result.wall = {};
    for (const wall of wallLines) {
      const edgeId = wall.edgeId || wall.position;
      if (!edgeId) continue;
      const edge = getEdgeIndexById(edgeId, grid);
      if (!edge) continue;
      const v1 = { row: edge.row, col: edge.col };
      const v2 = edge.type === 'h'
        ? { row: edge.row, col: edge.col + 1 }
        : { row: edge.row + 1, col: edge.col };
      const idx1 = toPenpaPointIndex(v1.row, v1.col, grid.rows, grid.cols, 'vertex');
      const idx2 = toPenpaPointIndex(v2.row, v2.col, grid.rows, grid.cols, 'vertex');
      const key = toPenpaLineKey(idx1, idx2);
      if (result.wall[key] !== undefined) continue;
      result.wall[key] = 1; // style simplified
    }
  }

  // Convert numbers
  if (Object.keys(elements.numbers).length > 0) {
    result.number = {};
    for (const num of Object.values(elements.numbers)) {
      const cell = getCellIndexById(num.cellId, grid);
      if (!cell) continue;

      let index: number;

      if (num.position === 'corner' && num.cornerIndex !== undefined) {
        // Corner numbers use vertex indices
        // cornerIndex: 0=TL, 1=TR, 2=BL, 3=BR
        let vertexRow = cell.row;
        let vertexCol = cell.col;
        switch (num.cornerIndex) {
          case 0: // TL - vertex at cell's top-left
            break;
          case 1: // TR - vertex at cell's top-right
            vertexCol = cell.col + 1;
            break;
          case 2: // BL - vertex at cell's bottom-left
            vertexRow = cell.row + 1;
            break;
          case 3: // BR - vertex at cell's bottom-right
            vertexRow = cell.row + 1;
            vertexCol = cell.col + 1;
            break;
        }
        index = toPenpaPointIndex(vertexRow, vertexCol, grid.rows, grid.cols, 'vertex');
      } else if (num.position === 'side' && num.sideIndex !== undefined) {
        // Side numbers use edge indices
        // sideIndex: 0=Top, 1=Right, 2=Bottom, 3=Left
        let edgeRow = cell.row;
        let edgeCol = cell.col;
        let edgeType: 'edge-h' | 'edge-v' = 'edge-h';
        switch (num.sideIndex) {
          case 0: // Top - horizontal edge at top
            edgeType = 'edge-h';
            break;
          case 1: // Right - vertical edge at right
            edgeType = 'edge-v';
            edgeCol = cell.col + 1;
            break;
          case 2: // Bottom - horizontal edge at bottom
            edgeType = 'edge-h';
            edgeRow = cell.row + 1;
            break;
          case 3: // Left - vertical edge at left
            edgeType = 'edge-v';
            break;
        }
        index = toPenpaPointIndex(edgeRow, edgeCol, grid.rows, grid.cols, edgeType);
      } else {
        // Center numbers use cell indices
        index = toPenpaPointIndex(cell.row, cell.col, grid.rows, grid.cols, 'cell');
      }

      // Penpa number format: [value, style, size]
      result.number[index.toString()] = [num.value, 1, '1'];
    }
  }

  // Convert symbols
  if (Object.keys(elements.symbols).length > 0) {
    result.symbol = {};
    for (const symbol of Object.values(elements.symbols)) {
      const cell = getCellIndexById(symbol.cellId, grid);
      if (!cell) continue;
      const index = toPenpaPointIndex(cell.row, cell.col, grid.rows, grid.cols, 'cell');
      // Penpa symbol format: [type, style, size]
      result.symbol[index.toString()] = [symbol.symbolType, 1, 2];
    }
  }

  return result;
}

// ========================================
// Penpa → PuzzleKit Conversion
// ========================================

/**
 * Convert Penpa export data to PuzzleKit format
 */
export function penpaToPuzzleKit(data: PenpaExportData): {
  grid: GridConfig;
  puzzle: PuzzleState;
} {
  const grid: GridConfig = {
    rows: data.ny,
    cols: data.nx,
    cellSize: data.size ?? 40,
    outerPadding: 20,
    showGrid: true,
    gridStyle: 'normal',
    gridType: penpaToGridType(data.gridtype),
    marginTop: data.space?.[0] ?? 0,
    marginRight: data.space?.[1] ?? 0,
    marginBottom: data.space?.[2] ?? 0,
    marginLeft: data.space?.[3] ?? 0,
    frameStyle: 'normal',
    frameColor: '#000000',
    gridColor: '#000000',
    backgroundColor: '#ffffff',
  };

  const puzzle: PuzzleState = {
    problem: convertPenpaToElements(data.pu_q, grid, 'problem'),
    answer: convertPenpaToElements(data.pu_a, grid, 'answer'),
  };

  return { grid, puzzle };
}

/**
 * Convert Penpa puzzle data to PuzzleKit elements
 */
function convertPenpaToElements(
  data: Partial<PenpaPuzzleData> | undefined,
  grid: GridConfig,
  layer: LayerType
): PuzzleElements {
  const elements: PuzzleElements = {
    surfaces: {},
    lines: {},
    edges: {},
    walls: {},
    numbers: {},
    symbols: {},
    cages: {},
    specials: {},
  };

  if (!data) return elements;

  // Convert surfaces
  if (data.surface) {
    for (const [indexStr, colorValue] of Object.entries(data.surface)) {
      const index = parseInt(indexStr);
      const pos = fromPenpaPointIndex(index, grid.rows, grid.cols);
      if (pos && pos.type === 'cell') {
        const cellId = `cell-${pos.row}-${pos.col}`;
        const id = `surface_${pos.row}_${pos.col}`;
        const colorId = Array.isArray(colorValue) ? colorValue[0] : colorValue;
        elements.surfaces[id] = {
          id,
          layer,
          cellId,
          color: penpaColorToHex(colorId),
        };
      }
    }
  }

  // Convert lines
  if (data.line) {
    let lineIndex = 0;
    for (const [key, _style] of Object.entries(data.line)) {
      const [idx1, idx2] = fromPenpaLineKey(key);
      const pos1 = fromPenpaPointIndex(idx1, grid.rows, grid.cols);
      const pos2 = fromPenpaPointIndex(idx2, grid.rows, grid.cols);

      if (pos1 && pos2) {
        const id = `line_${lineIndex++}`;
        elements.lines[id] = {
          id,
          layer,
          from: `cell-${pos1.row}-${pos1.col}`,
          to: `cell-${pos2.row}-${pos2.col}`,
          style: 'solid',
          thickness: 'normal',
          color: '#000000',
        };
      }
    }
  }

  // Convert lineE (edges)
  if (data.lineE) {
    let edgeIndex = 0;
    for (const [key, _style] of Object.entries(data.lineE)) {
      const [idx1, idx2] = fromPenpaLineKey(key);
      const pos1 = fromPenpaPointIndex(idx1, grid.rows, grid.cols);
      const pos2 = fromPenpaPointIndex(idx2, grid.rows, grid.cols);

      if (pos1 && pos2) {
        const isHorizontal = pos1.row === pos2.row;
        const isVertical = pos1.col === pos2.col;
        let edgeId: string | undefined;
        if (isHorizontal && Math.abs(pos1.col - pos2.col) === 1) {
          edgeId = `edge-h-${pos1.row}-${Math.min(pos1.col, pos2.col)}`;
        } else if (isVertical && Math.abs(pos1.row - pos2.row) === 1) {
          edgeId = `edge-v-${Math.min(pos1.row, pos2.row)}-${pos1.col}`;
        }
        const id = edgeId ? `edge-${edgeId}` : `edge_${edgeIndex++}`;
        elements.lines[id] = {
          id,
          layer,
          from: `vertex-${pos1.row}-${pos1.col}`,
          to: `vertex-${pos2.row}-${pos2.col}`,
          edgeId,
          lineTarget: 'edge',
          style: 'solid',
          color: '#000000',
          thickness: 'normal',
        };
      }
    }
  }

  // Convert walls
  if (data.wall) {
    let wallIndex = 0;
    for (const [key, _style] of Object.entries(data.wall)) {
      const [idx1, idx2] = fromPenpaLineKey(key);
      const pos1 = fromPenpaPointIndex(idx1, grid.rows, grid.cols);
      const pos2 = fromPenpaPointIndex(idx2, grid.rows, grid.cols);

      if (pos1 && pos2) {
        const isHorizontal = pos1.row === pos2.row;
        const edgeId = isHorizontal
          ? `edge-h-${pos1.row}-${Math.min(pos1.col, pos2.col)}`
          : `edge-v-${Math.min(pos1.row, pos2.row)}-${pos1.col}`;
        const id = `wall-${edgeId ?? wallIndex++}`;
        elements.lines[id] = {
          id,
          layer,
          edgeId,
          lineTarget: 'wall',
          thickness: 'thick',
          color: '#000000',
          style: 'solid',
        };
      }
    }
  }

  // Convert numbers
  if (data.number) {
    for (const [indexStr, numData] of Object.entries(data.number)) {
      const index = parseInt(indexStr);
      const pos = fromPenpaPointIndex(index, grid.rows, grid.cols);
      if (!pos) continue;

      // Penpa number format: [value, style, size] or just value
      const value = Array.isArray(numData) ? String(numData[0]) : String(numData);

      if (pos.type === 'cell') {
        // Center number
        const id = `number_${pos.row}_${pos.col}_center`;
        const cellId = `cell-${pos.row}-${pos.col}`;
        elements.numbers[id] = {
          id,
          layer,
          cellId,
          value,
          size: 'medium',
          position: 'center',
          color: '#000000',
        };
      } else if (pos.type === 'vertex') {
        // Corner number
        const corner = vertexToCorner(pos.row, pos.col, grid.rows, grid.cols);
        if (corner) {
          const id = `number_${corner.cellRow}_${corner.cellCol}_corner_${corner.cornerIndex}`;
          const cellId = `cell-${corner.cellRow}-${corner.cellCol}`;
          elements.numbers[id] = {
            id,
            layer,
            cellId,
            value,
            size: 'small',
            position: 'corner',
            cornerIndex: corner.cornerIndex,
            color: '#000000',
          };
        }
      } else if (pos.type === 'edge-h') {
        // Side number (top/bottom)
        const side = edgeHToSide(pos.row, pos.col, grid.rows, grid.cols);
        if (side) {
          const id = `number_${side.cellRow}_${side.cellCol}_side_${side.sideIndex}`;
          const cellId = `cell-${side.cellRow}-${side.cellCol}`;
          elements.numbers[id] = {
            id,
            layer,
            cellId,
            value,
            size: 'small',
            position: 'side',
            sideIndex: side.sideIndex,
            color: '#000000',
          };
        }
      } else if (pos.type === 'edge-v') {
        // Side number (left/right)
        const side = edgeVToSide(pos.row, pos.col, grid.rows, grid.cols);
        if (side) {
          const id = `number_${side.cellRow}_${side.cellCol}_side_${side.sideIndex}`;
          const cellId = `cell-${side.cellRow}-${side.cellCol}`;
          elements.numbers[id] = {
            id,
            layer,
            cellId,
            value,
            size: 'small',
            position: 'side',
            sideIndex: side.sideIndex,
            color: '#000000',
          };
        }
      }
    }
  }

  // Convert symbols
  if (data.symbol) {
    for (const [indexStr, symData] of Object.entries(data.symbol)) {
      const index = parseInt(indexStr);
      const pos = fromPenpaPointIndex(index, grid.rows, grid.cols);
      if (pos && pos.type === 'cell') {
        const id = `symbol_${pos.row}_${pos.col}`;
        const cellId = `cell-${pos.row}-${pos.col}`;
        // Penpa symbol format: [type, style, size]
        const symbolType = Array.isArray(symData) ? String(symData[0]) : 'circle';
        elements.symbols[id] = {
          id,
          layer,
          cellId,
          symbolType,
          size: 'medium',
          color: '#000000',
        };
      }
    }
  }

  return elements;
}

// ========================================
// Grid Type Conversion
// ========================================

/**
 * Convert PuzzleKit grid type to Penpa grid type
 */
function gridTypeToPenpa(gridType: string): PenpaGridType {
  switch (gridType) {
    case 'square':
      return 'square';
    case 'hex':
      return 'hex';
    case 'tri':
      return 'tri';
    case 'pyramid':
      return 'pyramid';
    case 'iso':
      return 'iso';
    default:
      return 'square';
  }
}

/**
 * Convert Penpa grid type to PuzzleKit grid type
 */
function penpaToGridType(gridtype: PenpaGridType): 'square' | 'hex' | 'tri' | 'pyramid' | 'iso' {
  switch (gridtype) {
    case 'square':
    case 'sudoku':
    case 'kakuro':
      return 'square';
    case 'hex':
      return 'hex';
    case 'tri':
      return 'tri';
    case 'pyramid':
      return 'pyramid';
    case 'iso':
      return 'iso';
    default:
      return 'square';
  }
}

// ========================================
// Mode Configuration
// ========================================

/**
 * Create default Penpa mode configuration
 */
function createDefaultModeConfig(activeLayer: LayerType): PenpaModeConfig {
  const defaultModeState: PenpaModeState = {
    edit_mode: 'surface',
    surface: ['1', 1],
    multicolor: ['1', 1],
    line: ['1', 1],
    lineE: ['1', 1],
    wall: ['1', 1],
    cage: ['1', 1],
    number: ['1', 1],
    symbol: ['1', 1],
    special: ['thermo', ''],
    board: ['1', ''],
    move: ['1', ''],
    combi: ['battleship', 1],
    sudoku: ['1', 1],
  };

  return {
    qa: activeLayer === 'problem' ? 'pu_q' : 'pu_a',
    grid: ['1', '1', '1'],
    pu_q: { ...defaultModeState },
    pu_a: { ...defaultModeState },
  };
}

// ========================================
// Export index for utils
// ========================================

export {
  type PenpaExportData,
  type PenpaPuzzleData,
};
