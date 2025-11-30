// Hexagonal and Triangular grid utilities
import { GridConfig, Point } from '../types';

// === Hexagonal Grid (pointy-top orientation) ===
// Hexagons are arranged in an offset coordinate system (odd-q offset)
// Each hex has 6 vertices and 6 edges

export function getHexSize(cellSize: number): { width: number; height: number } {
  // Interpret cellSize as diameter (2 * circumradius). Side length == circumradius.
  // For pointy-top hex, width = sqrt(3) * R, height = 2 * R, where R = cellSize / 2.
  const radius = cellSize / 2;
  return {
    width: Math.sqrt(3) * radius,
    height: cellSize,
  };
}

export function getHexCenter(row: number, col: number, grid: GridConfig): Point {
  const { cellSize, outerPadding } = grid;
  const { width, height } = getHexSize(cellSize);

  // Offset for odd rows (odd-r horizontal layout, pointy-top)
  const xOffset = row % 2 === 1 ? width / 2 : 0;
  const rowHeight = height * 0.75;

  return {
    x: outerPadding + col * width + xOffset + width / 2,
    y: outerPadding + row * rowHeight + height / 2,
  };
}

export function getHexVertices(row: number, col: number, grid: GridConfig): Point[] {
  const center = getHexCenter(row, col, grid);
  const { cellSize } = grid;
  const radius = cellSize / 2;

  // 6 vertices for pointy-top hexagon, starting from top
  const vertices: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 6) + (Math.PI / 3) * i; // 30° offset for pointy-top
    vertices.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }
  return vertices;
}

export function findNearestHexCell(
  point: Point,
  grid: GridConfig
): { row: number; col: number } | null {
  const { rows, cols, cellSize, outerPadding } = grid;
  const { width, height } = getHexSize(cellSize);
  const rowHeight = height * 0.75;

  const approxRow = Math.floor((point.y - outerPadding) / rowHeight);

  // Check nearby cells and find the closest center
  let bestCell: { row: number; col: number } | null = null;
  let bestDist = Infinity;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = approxRow + dr;
      if (r < 0 || r >= rows) continue;

      const xOffset = r % 2 === 1 ? width / 2 : 0;
      const approxCol = Math.floor((point.x - outerPadding - xOffset) / width);

      for (let dc2 = -1; dc2 <= 1; dc2++) {
        const c = approxCol + dc + dc2;
        if (c >= 0 && c < cols) {
          const center = getHexCenter(r, c, grid);
          const dist = Math.sqrt(
            Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
          );
          if (dist < bestDist) {
            bestDist = dist;
            bestCell = { row: r, col: c };
          }
        }
      }
    }
  }

  // Check if point is within the hex radius
  const maxDist = cellSize / 2;
  if (bestDist <= maxDist) {
    return bestCell;
  }

  return null;
}

export function getHexGridDimensions(grid: GridConfig): { width: number; height: number } {
  const { rows, cols, cellSize, outerPadding } = grid;
  const { width, height } = getHexSize(cellSize);
  const rowHeight = height * 0.75;

  return {
    width: cols * width + width / 2 + outerPadding * 2,
    height: (rows - 1) * rowHeight + height + outerPadding * 2,
  };
}

// === Triangular Grid ===
// Triangles alternate between pointing up and pointing down
// Each cell is identified by row, col, and orientation (up/down)

export type TriangleOrientation = 'up' | 'down';

export function getTriangleOrientation(row: number, col: number): TriangleOrientation {
  // Alternating pattern: (row + col) % 2 determines orientation
  return (row + col) % 2 === 0 ? 'up' : 'down';
}

export function getTriangleSize(cellSize: number): { width: number; height: number } {
  // Equilateral triangle: height = sqrt(3)/2 * side
  return {
    width: cellSize,
    height: (Math.sqrt(3) / 2) * cellSize,
  };
}

export function getTriangleCenter(row: number, col: number, grid: GridConfig): Point {
  const { cellSize, outerPadding } = grid;
  const { width, height } = getTriangleSize(cellSize);
  const orientation = getTriangleOrientation(row, col);

  // X position: col * (width/2)
  const x = outerPadding + col * (width / 2) + width / 2;

  // Y position depends on orientation
  // For up-pointing: center is lower (2/3 from top)
  // For down-pointing: center is higher (1/3 from top)
  const rowOffset = Math.floor(col / 2);
  let y = outerPadding + row * height + height / 2;

  if (orientation === 'up') {
    y += height / 6; // Centroid of up-pointing triangle
  } else {
    y -= height / 6; // Centroid of down-pointing triangle
  }

  return { x, y };
}

export function getTriangleVertices(row: number, col: number, grid: GridConfig): Point[] {
  const { cellSize, outerPadding } = grid;
  const { width, height } = getTriangleSize(cellSize);
  const orientation = getTriangleOrientation(row, col);

  // Base X position for the triangle
  const baseX = outerPadding + col * (width / 2);
  const baseY = outerPadding + row * height;

  if (orientation === 'up') {
    return [
      { x: baseX + width / 2, y: baseY },           // top
      { x: baseX + width, y: baseY + height },      // bottom-right
      { x: baseX, y: baseY + height },               // bottom-left
    ];
  } else {
    return [
      { x: baseX, y: baseY },                        // top-left
      { x: baseX + width, y: baseY },               // top-right
      { x: baseX + width / 2, y: baseY + height },  // bottom
    ];
  }
}

export function findNearestTriangleCell(
  point: Point,
  grid: GridConfig
): { row: number; col: number } | null {
  const { rows, cols, cellSize, outerPadding } = grid;
  const { width, height } = getTriangleSize(cellSize);

  // Approximate position
  const approxCol = Math.floor((point.x - outerPadding) / (width / 2));
  const approxRow = Math.floor((point.y - outerPadding) / height);

  // Check nearby cells
  let bestCell: { row: number; col: number } | null = null;
  let bestDist = Infinity;

  // Triangular grids have 2*cols columns per row effectively
  const maxCols = cols * 2;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = approxRow + dr;
      const c = approxCol + dc;
      if (r >= 0 && r < rows && c >= 0 && c < maxCols) {
        const center = getTriangleCenter(r, c, grid);
        const dist = Math.sqrt(
          Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = { row: r, col: c };
        }
      }
    }
  }

  // Check if within reasonable distance
  const maxDist = cellSize / 2;
  if (bestDist <= maxDist) {
    return bestCell;
  }

  return null;
}

export function getTriangleGridDimensions(grid: GridConfig): { width: number; height: number } {
  const { rows, cols, cellSize, outerPadding } = grid;
  const { width, height } = getTriangleSize(cellSize);

  return {
    width: cols * width + outerPadding * 2,
    height: rows * height + outerPadding * 2,
  };
}

// === Pyramid Grid ===
// Pyramid is a triangular arrangement of cells (like bowling pins)
// Row 0 has 1 cell, row 1 has 2 cells, etc.

export function getPyramidCellCount(rows: number): number {
  // Total cells = 1 + 2 + 3 + ... + rows = rows*(rows+1)/2
  return (rows * (rows + 1)) / 2;
}

export function getPyramidRowCols(row: number): number {
  return row + 1;
}

export function getPyramidCenter(row: number, col: number, grid: GridConfig): Point {
  const { cellSize, outerPadding, rows } = grid;
  const { width, height } = getTriangleSize(cellSize);

  // Calculate pyramid width at this row
  const maxRowWidth = rows * width;
  const currentRowWidth = (row + 1) * width;
  const rowOffset = (maxRowWidth - currentRowWidth) / 2;

  return {
    x: outerPadding + rowOffset + col * width + width / 2,
    y: outerPadding + row * height + height / 2,
  };
}

export function getPyramidVertices(row: number, col: number, grid: GridConfig): Point[] {
  const { cellSize, outerPadding, rows } = grid;
  const { width, height } = getTriangleSize(cellSize);

  // Calculate pyramid width at this row
  const maxRowWidth = rows * width;
  const currentRowWidth = (row + 1) * width;
  const rowOffset = (maxRowWidth - currentRowWidth) / 2;

  const baseX = outerPadding + rowOffset + col * width;
  const baseY = outerPadding + row * height;

  // All pyramid cells are down-pointing triangles
  return [
    { x: baseX, y: baseY },                        // top-left
    { x: baseX + width, y: baseY },               // top-right
    { x: baseX + width / 2, y: baseY + height },  // bottom
  ];
}

export function findNearestPyramidCell(
  point: Point,
  grid: GridConfig
): { row: number; col: number } | null {
  const { rows, cellSize, outerPadding } = grid;
  const { width, height } = getTriangleSize(cellSize);

  let bestCell: { row: number; col: number } | null = null;
  let bestDist = Infinity;

  for (let r = 0; r < rows; r++) {
    const colsInRow = getPyramidRowCols(r);
    for (let c = 0; c < colsInRow; c++) {
      const center = getPyramidCenter(r, c, grid);
      const dist = Math.sqrt(
        Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestCell = { row: r, col: c };
      }
    }
  }

  const maxDist = cellSize / 2;
  if (bestDist <= maxDist) {
    return bestCell;
  }

  return null;
}

export function getPyramidGridDimensions(grid: GridConfig): { width: number; height: number } {
  const { rows, cellSize, outerPadding } = grid;
  const { width, height } = getTriangleSize(cellSize);

  return {
    width: rows * width + outerPadding * 2,
    height: rows * height + outerPadding * 2,
  };
}

// === Cell ID generation for non-square grids ===

export function getHexCellId(row: number, col: number): string {
  return `hex-${row}-${col}`;
}

export function getTriCellId(row: number, col: number): string {
  return `tri-${row}-${col}`;
}

export function getPyramidCellId(row: number, col: number): string {
  return `pyr-${row}-${col}`;
}

export function parseHexCellId(id: string): { row: number; col: number } | null {
  const match = id.match(/^hex-(\d+)-(\d+)$/);
  if (match) {
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }
  return null;
}

export function parseTriCellId(id: string): { row: number; col: number } | null {
  const match = id.match(/^tri-(\d+)-(\d+)$/);
  if (match) {
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }
  return null;
}

export function parsePyramidCellId(id: string): { row: number; col: number } | null {
  const match = id.match(/^pyr-(\d+)-(\d+)$/);
  if (match) {
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
  }
  return null;
}
