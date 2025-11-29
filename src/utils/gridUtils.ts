import { GridConfig, GridPoint, Point, GridPointType, GridType } from '../types';
import {
  getHexCenter,
  getHexGridDimensions,
  findNearestHexCell,
  getHexCellId,
  getTriangleCenter,
  getTriangleGridDimensions,
  findNearestTriangleCell,
  getTriCellId,
  getPyramidCenter,
  getPyramidGridDimensions,
  findNearestPyramidCell,
  getPyramidCellId,
  getPyramidRowCols,
  parseHexCellId,
  parseTriCellId,
  parsePyramidCellId,
} from './hexGridUtils';

export function generateGridPoints(grid: GridConfig): GridPoint[] {
  const { rows, cols, cellSize, outerPadding } = grid;
  const points: GridPoint[] = [];

  // Cell centers (type 0)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      points.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        type: 'cell',
        x: outerPadding + col * cellSize + cellSize / 2,
        y: outerPadding + row * cellSize + cellSize / 2,
      });
    }
  }

  // Vertices (type 1) - includes outer boundary vertices
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      points.push({
        id: `vertex-${row}-${col}`,
        row,
        col,
        type: 'vertex',
        x: outerPadding + col * cellSize,
        y: outerPadding + row * cellSize,
      });
    }
  }

  // Horizontal edge centers (type 2)
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col < cols; col++) {
      points.push({
        id: `edge-h-${row}-${col}`,
        row,
        col,
        type: 'edge-h',
        x: outerPadding + col * cellSize + cellSize / 2,
        y: outerPadding + row * cellSize,
      });
    }
  }

  // Vertical edge centers (type 3)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= cols; col++) {
      points.push({
        id: `edge-v-${row}-${col}`,
        row,
        col,
        type: 'edge-v',
        x: outerPadding + col * cellSize,
        y: outerPadding + row * cellSize + cellSize / 2,
      });
    }
  }

  return points;
}

export function getCellId(row: number, col: number, gridType: GridType = 'square'): string {
  switch (gridType) {
    case 'hex':
      return getHexCellId(row, col);
    case 'triangle':
      return getTriCellId(row, col);
    case 'pyramid':
      return getPyramidCellId(row, col);
    default:
      return `cell-${row}-${col}`;
  }
}

export function getVertexId(row: number, col: number): string {
  return `vertex-${row}-${col}`;
}

export function getEdgeHId(row: number, col: number): string {
  return `edge-h-${row}-${col}`;
}

export function getEdgeVId(row: number, col: number): string {
  return `edge-v-${row}-${col}`;
}

export function parseCellId(id: string, gridType: GridType = 'square'): { row: number; col: number } | null {
  // Auto-detect by prefix if present
  if (id.startsWith('hex-')) return parseHexCellId(id);
  if (id.startsWith('tri-')) return parseTriCellId(id);
  if (id.startsWith('pyr-')) return parsePyramidCellId(id);

  // Otherwise fall back to gridType or square pattern
  switch (gridType) {
    case 'hex':
      return parseHexCellId(id);
    case 'triangle':
      return parseTriCellId(id);
    case 'pyramid':
      return parsePyramidCellId(id);
    default: {
      const match = id.match(/^cell-(\d+)-(\d+)$/);
      if (match) {
        return { row: parseInt(match[1]), col: parseInt(match[2]) };
      }
      return null;
    }
  }
}

export function parseVertexId(id: string): { row: number; col: number } | null {
  const match = id.match(/^vertex-(\d+)-(\d+)$/);
  if (match) {
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }
  return null;
}

export function screenToSvg(
  screenX: number,
  screenY: number,
  zoom: number,
  panX: number,
  panY: number,
  svgElement: SVGSVGElement | null
): Point {
  if (!svgElement) {
    return { x: screenX, y: screenY };
  }

  const rect = svgElement.getBoundingClientRect();
  const x = (screenX - rect.left - panX) / zoom;
  const y = (screenY - rect.top - panY) / zoom;

  return { x, y };
}

export function svgToScreen(
  svgX: number,
  svgY: number,
  zoom: number,
  panX: number,
  panY: number
): Point {
  return {
    x: svgX * zoom + panX,
    y: svgY * zoom + panY,
  };
}

export function findNearestCell(
  point: Point,
  grid: GridConfig,
  allowMargin: boolean = false
): { row: number; col: number } | null {
  const gridType = grid.gridType || 'square';

  // Handle non-square grids
  if (gridType === 'hex') {
    return findNearestHexCell(point, grid);
  } else if (gridType === 'triangle') {
    return findNearestTriangleCell(point, grid);
  } else if (gridType === 'pyramid') {
    return findNearestPyramidCell(point, grid);
  }

  // Square grid logic
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
  } = grid;

  const col = Math.floor((point.x - outerPadding) / cellSize);
  const row = Math.floor((point.y - outerPadding) / cellSize);

  // Adjust for margins - cells in margin have negative or beyond-range indices
  const adjustedRow = row - marginTop;
  const adjustedCol = col - marginLeft;

  if (allowMargin) {
    // Allow cells in margin areas
    const totalRows = rows + marginTop + marginBottom;
    const totalCols = cols + marginLeft + marginRight;

    if (row >= 0 && row < totalRows && col >= 0 && col < totalCols) {
      return { row: adjustedRow, col: adjustedCol };
    }
  } else {
    // Only allow cells in main grid
    if (adjustedRow >= 0 && adjustedRow < rows && adjustedCol >= 0 && adjustedCol < cols) {
      return { row: adjustedRow, col: adjustedCol };
    }
  }

  return null;
}

export function findNearestVertex(
  point: Point,
  grid: GridConfig,
  threshold: number = 10
): { row: number; col: number } | null {
  const { rows, cols, cellSize, outerPadding } = grid;

  // Calculate approximate vertex position
  const col = Math.round((point.x - outerPadding) / cellSize);
  const row = Math.round((point.y - outerPadding) / cellSize);

  if (row >= 0 && row <= rows && col >= 0 && col <= cols) {
    const vx = outerPadding + col * cellSize;
    const vy = outerPadding + row * cellSize;
    const dist = Math.sqrt(Math.pow(point.x - vx, 2) + Math.pow(point.y - vy, 2));

    if (dist <= threshold) {
      return { row, col };
    }
  }

  return null;
}

export function findNearestEdge(
  point: Point,
  grid: GridConfig,
  threshold: number = 10
): { type: 'h' | 'v'; row: number; col: number } | null {
  const { rows, cols, cellSize, outerPadding } = grid;

  // Check horizontal edges
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ex = outerPadding + col * cellSize + cellSize / 2;
      const ey = outerPadding + row * cellSize;
      const dist = Math.sqrt(Math.pow(point.x - ex, 2) + Math.pow(point.y - ey, 2));
      if (dist <= threshold) {
        return { type: 'h', row, col };
      }
    }
  }

  // Check vertical edges
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const ex = outerPadding + col * cellSize;
      const ey = outerPadding + row * cellSize + cellSize / 2;
      const dist = Math.sqrt(Math.pow(point.x - ex, 2) + Math.pow(point.y - ey, 2));
      if (dist <= threshold) {
        return { type: 'v', row, col };
      }
    }
  }

  return null;
}

export function getCellCenter(row: number, col: number, grid: GridConfig): Point {
  const gridType = grid.gridType || 'square';

  // Handle non-square grids
  if (gridType === 'hex') {
    return getHexCenter(row, col, grid);
  } else if (gridType === 'triangle') {
    return getTriangleCenter(row, col, grid);
  } else if (gridType === 'pyramid') {
    return getPyramidCenter(row, col, grid);
  }

  // Square grid
  const { cellSize, outerPadding, marginTop = 0, marginLeft = 0 } = grid;
  // Adjust for margins - row/col are relative to main grid origin (can be negative for margin cells)
  const actualCol = col + marginLeft;
  const actualRow = row + marginTop;
  return {
    x: outerPadding + actualCol * cellSize + cellSize / 2,
    y: outerPadding + actualRow * cellSize + cellSize / 2,
  };
}

export function getVertexPosition(row: number, col: number, grid: GridConfig): Point {
  const { cellSize, outerPadding } = grid;
  return {
    x: outerPadding + col * cellSize,
    y: outerPadding + row * cellSize,
  };
}

export function getEdgePosition(
  type: 'h' | 'v',
  row: number,
  col: number,
  grid: GridConfig
): Point {
  const { cellSize, outerPadding } = grid;

  if (type === 'h') {
    return {
      x: outerPadding + col * cellSize + cellSize / 2,
      y: outerPadding + row * cellSize,
    };
  } else {
    return {
      x: outerPadding + col * cellSize,
      y: outerPadding + row * cellSize + cellSize / 2,
    };
  }
}

export function getAdjacentCells(
  row: number,
  col: number,
  grid: GridConfig
): { row: number; col: number }[] {
  const { rows, cols } = grid;
  const adjacent: { row: number; col: number }[] = [];

  const directions = [
    [-1, 0], // up
    [1, 0],  // down
    [0, -1], // left
    [0, 1],  // right
  ];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      adjacent.push({ row: nr, col: nc });
    }
  }

  return adjacent;
}

export function getDiagonalCells(
  row: number,
  col: number,
  grid: GridConfig
): { row: number; col: number }[] {
  const { rows, cols } = grid;
  const diagonal: { row: number; col: number }[] = [];

  const directions = [
    [-1, -1], // top-left
    [-1, 1],  // top-right
    [1, -1],  // bottom-left
    [1, 1],   // bottom-right
  ];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      diagonal.push({ row: nr, col: nc });
    }
  }

  return diagonal;
}

export function getCellCorners(
  row: number,
  col: number,
  grid: GridConfig
): Point[] {
  const { cellSize, outerPadding, marginTop = 0, marginLeft = 0 } = grid;
  const actualCol = col + marginLeft;
  const actualRow = row + marginTop;
  const x = outerPadding + actualCol * cellSize;
  const y = outerPadding + actualRow * cellSize;

  return [
    { x, y },                           // top-left
    { x: x + cellSize, y },              // top-right
    { x: x + cellSize, y: y + cellSize }, // bottom-right
    { x, y: y + cellSize },              // bottom-left
  ];
}

export function getGridDimensions(grid: GridConfig): { width: number; height: number } {
  const gridType = grid.gridType || 'square';

  // Handle non-square grids
  if (gridType === 'hex') {
    return getHexGridDimensions(grid);
  } else if (gridType === 'triangle') {
    return getTriangleGridDimensions(grid);
  } else if (gridType === 'pyramid') {
    return getPyramidGridDimensions(grid);
  }

  // Square grid
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    exportPaddingTop = 0,
    exportPaddingBottom = 0,
    exportPaddingLeft = 0,
    exportPaddingRight = 0,
  } = grid;
  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;
  return {
    width: totalCols * cellSize + outerPadding * 2 + exportPaddingLeft + exportPaddingRight,
    height: totalRows * cellSize + outerPadding * 2 + exportPaddingTop + exportPaddingBottom,
  };
}

export function isPointInGrid(point: Point, grid: GridConfig): boolean {
  const { rows, cols, cellSize, outerPadding } = grid;
  return (
    point.x >= outerPadding &&
    point.x <= outerPadding + cols * cellSize &&
    point.y >= outerPadding &&
    point.y <= outerPadding + rows * cellSize
  );
}

export function snapToGrid(
  point: Point,
  grid: GridConfig,
  snapType: GridPointType
): Point {
  const { cellSize, outerPadding } = grid;

  switch (snapType) {
    case 'cell': {
      const col = Math.floor((point.x - outerPadding) / cellSize);
      const row = Math.floor((point.y - outerPadding) / cellSize);
      return getCellCenter(row, col, grid);
    }
    case 'vertex': {
      const col = Math.round((point.x - outerPadding) / cellSize);
      const row = Math.round((point.y - outerPadding) / cellSize);
      return getVertexPosition(row, col, grid);
    }
    case 'edge-h': {
      const col = Math.floor((point.x - outerPadding) / cellSize);
      const row = Math.round((point.y - outerPadding) / cellSize);
      return getEdgePosition('h', row, col, grid);
    }
    case 'edge-v': {
      const col = Math.round((point.x - outerPadding) / cellSize);
      const row = Math.floor((point.y - outerPadding) / cellSize);
      return getEdgePosition('v', row, col, grid);
    }
    default:
      return point;
  }
}
