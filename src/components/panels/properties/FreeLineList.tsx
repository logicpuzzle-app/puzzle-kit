import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { usePuzzleStore, usePuzzleStoreApi } from '../../../store/puzzleStoreContext';
import { LineElement, toDataLayer } from '../../../types';
import { getEditableDataLayer } from '../../../utils/editPolicy';
import type { GridConfig } from '../../../types';
import type { GridTopology } from '../../../utils/gridTopology';
import { getCellIndexById, getEdgeIndexById, getVertexIndexById } from '../../../utils/gridUtils';

// Free line info for display
interface FreeLineInfo {
  id: string;
  line: LineElement;
  fromCoord: string;
  toCoord: string;
}

// Merged line group for display
interface MergedLineGroup {
  ids: string[];
  lines: LineElement[];
  displayCoord: string;  // e.g., "(1,1)→(1,5)" for merged, or "(1,1)→(1,2)" for single
  fromCoord: string;
  toCoord: string;
  length: IrrationalLength;  // Length in cell units
}

// Irrational length representation: rational + sum of (coefficient * √radicand)
// e.g., 5 + 2√2 + √3 + 3√5 = { rational: 5, sqrtTerms: { 2: 2, 3: 1, 5: 3 } }
interface IrrationalLength {
  rational: number;  // Integer part
  sqrtTerms: Record<number, number>;  // radicand -> coefficient (e.g., { 2: 3 } means 3√2)
  decimal?: number;  // For non-simplifiable cases
}

// Simplify √n to k√m where m is square-free
const simplifySquareRoot = (n: number): { coefficient: number; radicand: number } => {
  if (n === 0) return { coefficient: 0, radicand: 0 };
  if (n === 1) return { coefficient: 1, radicand: 1 };

  let coefficient = 1;
  let radicand = n;

  // Extract perfect square factors
  for (let i = 2; i * i <= radicand; i++) {
    while (radicand % (i * i) === 0) {
      coefficient *= i;
      radicand /= (i * i);
    }
  }

  return { coefficient, radicand };
};

// Calculate length between two coordinates (in cell units)
const calculateSegmentLength = (
  fromCoord: string,
  toCoord: string
): IrrationalLength => {
  const from = parseCoordString(fromCoord);
  const to = parseCoordString(toCoord);

  if (!from || !to) {
    return { rational: 0, sqrtTerms: {} };
  }

  const dRow = Math.abs(to.row - from.row);
  const dCol = Math.abs(to.col - from.col);

  if (dRow === 0 && dCol === 0) {
    return { rational: 0, sqrtTerms: {} };
  }

  // Orthogonal: length = dRow or dCol
  if (dRow === 0 || dCol === 0) {
    return { rational: dRow + dCol, sqrtTerms: {} };
  }

  // General case: √(dRow² + dCol²)
  const distSquared = dRow * dRow + dCol * dCol;

  // Check if perfect square
  const sqrtDist = Math.sqrt(distSquared);
  if (Number.isInteger(sqrtDist)) {
    return { rational: sqrtDist, sqrtTerms: {} };
  }

  // Simplify √distSquared to coefficient * √radicand
  const { coefficient, radicand } = simplifySquareRoot(distSquared);

  if (radicand === 1) {
    // Perfect square
    return { rational: coefficient, sqrtTerms: {} };
  }

  // Return as coefficient√radicand
  return { rational: 0, sqrtTerms: { [radicand]: coefficient } };
};

// Add two irrational lengths
const addLengths = (a: IrrationalLength, b: IrrationalLength): IrrationalLength => {
  const sqrtTerms: Record<number, number> = { ...a.sqrtTerms };

  for (const [radicand, coef] of Object.entries(b.sqrtTerms)) {
    const r = Number(radicand);
    sqrtTerms[r] = (sqrtTerms[r] || 0) + coef;
    if (sqrtTerms[r] === 0) {
      delete sqrtTerms[r];
    }
  }

  return {
    rational: a.rational + b.rational,
    sqrtTerms,
    decimal: (a.decimal || 0) + (b.decimal || 0) || undefined,
  };
};

// Check if two lengths are equal
const areLengthsEqual = (a: IrrationalLength, b: IrrationalLength): boolean => {
  if (a.rational !== b.rational) return false;
  if ((a.decimal || 0) !== (b.decimal || 0)) return false;

  const aKeys = Object.keys(a.sqrtTerms);
  const bKeys = Object.keys(b.sqrtTerms);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (a.sqrtTerms[Number(key)] !== b.sqrtTerms[Number(key)]) return false;
  }
  return true;
};

// Format irrational length for display (value only, no prefix)
const formatLengthValue = (len: IrrationalLength): string => {
  const parts: string[] = [];

  // Rational part
  if (len.rational !== 0) {
    if (Number.isInteger(len.rational)) {
      parts.push(String(len.rational));
    } else {
      parts.push(len.rational.toFixed(3).replace(/\.?0+$/, ''));
    }
  }

  // Sort radicands for consistent display
  const sortedRadicands = Object.keys(len.sqrtTerms)
    .map(Number)
    .sort((a, b) => a - b);

  for (const radicand of sortedRadicands) {
    const coef = len.sqrtTerms[radicand];
    if (coef === 0) continue;

    if (coef === 1) {
      parts.push(`√${radicand}`);
    } else if (coef === -1) {
      parts.push(`-√${radicand}`);
    } else {
      parts.push(`${coef}√${radicand}`);
    }
  }

  // Decimal fallback
  if (len.decimal !== undefined && len.decimal !== 0) {
    parts.push(len.decimal.toFixed(3).replace(/\.?0+$/, ''));
  }

  if (parts.length === 0) {
    return '0';
  }

  // Join with + (handle negative signs)
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].startsWith('-')) {
      result += parts[i];
    } else {
      result += '+' + parts[i];
    }
  }

  return result;
};

// Get stroke width from thickness
const getStrokeWidth = (thickness: string): number => {
  switch (thickness) {
    case 'thinnest': return 1;
    case 'thin': return 1.5;
    case 'normal': return 2;
    case 'thick': return 3;
    case 'thickest': return 4;
    default: return 2;
  }
};

// Get stroke dasharray from style
const getStrokeDasharray = (style: string): string | undefined => {
  switch (style) {
    case 'dashed': return '4,2';
    case 'dotted': return '1,2';
    default: return undefined;
  }
};

// Calculate angle from coordinate strings (returns degrees)
const getAngleFromCoords = (fromCoord: string, toCoord: string): number => {
  const from = parseCoordString(fromCoord);
  const to = parseCoordString(toCoord);
  if (!from || !to) return 0;

  // Note: row increases downward, col increases rightward
  const dCol = to.col - from.col;
  const dRow = to.row - from.row;

  // atan2 returns angle in radians, convert to degrees
  // Math.atan2(y, x) - but our y is row (down = positive)
  return Math.atan2(dRow, dCol) * (180 / Math.PI);
};

// Line sample preview component with arrow support
const LineSamplePreview: React.FC<{
  line: LineElement;
  fromCoord: string;
  toCoord: string;
  size?: number;
}> = ({ line, fromCoord, toCoord, size = 24 }) => {
  const isDouble = line.style === 'double';
  // For double lines, use thinner base stroke
  const baseStrokeWidth = getStrokeWidth(line.thickness);
  const strokeWidth = isDouble ? Math.max(1, baseStrokeWidth * 0.5) : baseStrokeWidth;
  const doubleGap = strokeWidth * 2.5;
  const dashArray = getStrokeDasharray(line.style);

  // Calculate line angle from coordinates
  const angle = getAngleFromCoords(fromCoord, toCoord);

  // Use square viewBox so all angles have same line length
  const viewBoxSize = size;
  const center = viewBoxSize / 2;
  const lineHalfLength = (viewBoxSize - 4) / 2;

  // Arrow size - larger for double lines to match line width
  const totalLineWidth = isDouble ? strokeWidth + doubleGap : strokeWidth;
  const arrowSize = isDouble ? Math.max(totalLineWidth * 3, 6) : Math.min(6, viewBoxSize * 0.25);

  // Calculate line endpoints based on angle
  const radians = angle * (Math.PI / 180);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const startX = center - cos * lineHalfLength;
  const startY = center - sin * lineHalfLength;
  const endX = center + cos * lineHalfLength;
  const endY = center + sin * lineHalfLength;

  // Calculate arrow positions and rotations
  const getArrowTransforms = (): { cx: number; cy: number; rotation: number }[] => {
    if (!line.directed) return [];

    const isBackward = line.arrowDirection === 'backward';
    const arrowAngle = isBackward ? angle + 180 : angle;

    if (line.directed === 'endpoint') {
      // Arrow at endpoint
      if (isBackward) {
        return [{ cx: startX, cy: startY, rotation: arrowAngle }];
      } else {
        return [{ cx: endX, cy: endY, rotation: arrowAngle }];
      }
    } else if (line.directed === 'midpoint') {
      // Arrow at midpoint
      return [{ cx: center, cy: center, rotation: arrowAngle }];
    } else if (line.directed === 'both') {
      // Arrows at both ends (bidirectional)
      return [
        { cx: startX, cy: startY, rotation: angle + 180 }, // Arrow pointing outward at start
        { cx: endX, cy: endY, rotation: angle },           // Arrow pointing outward at end
      ];
    }
    return [];
  };

  const arrowTransforms = getArrowTransforms();

  // Arrow pointing right (will be rotated)
  const arrowPoints = `${arrowSize * 0.5},0 ${-arrowSize * 0.5},${-arrowSize * 0.4} ${-arrowSize * 0.5},${arrowSize * 0.4}`;

  // For midpoint arrows with double lines, render arrow below the line
  const isMidpointArrow = line.directed === 'midpoint';
  const arrowsBelowLine = isDouble && isMidpointArrow;

  const arrowElements = arrowTransforms.map((transform, i) => (
    <polygon
      key={i}
      points={arrowPoints}
      fill={line.color}
      transform={`translate(${transform.cx}, ${transform.cy}) rotate(${transform.rotation})`}
    />
  ));

  const lineElements = isDouble ? (
    <>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={line.color}
        strokeWidth={strokeWidth + doubleGap}
      />
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="white"
        strokeWidth={doubleGap - strokeWidth}
      />
    </>
  ) : (
    <line
      x1={startX}
      y1={startY}
      x2={endX}
      y2={endY}
      stroke={line.color}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
    />
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className="flex-shrink-0"
    >
      {arrowsBelowLine ? (
        <>
          {arrowElements}
          {lineElements}
        </>
      ) : (
        <>
          {lineElements}
          {arrowElements}
        </>
      )}
    </svg>
  );
};

// Get coordinate string from grid point ID using topology
const getCoordinateFromTopology = (id: string, topology: GridTopology | null, grid: GridConfig): string => {
  if (!topology) {
    if (id.startsWith('cell-')) {
      const index = getCellIndexById(id, grid);
      return index ? `(${index.row + 1},${index.col + 1})` : id;
    }
    if (id.startsWith('vertex-')) {
      const index = getVertexIndexById(id, grid);
      return index ? `+(${index.row + 1},${index.col + 1})` : id;
    }
    if (id.startsWith('edge-')) {
      const edge = getEdgeIndexById(id, grid);
      if (!edge) return id;
      const prefix = edge.type === 'h' ? '-' : '|';
      return `${prefix}(${edge.row + 1},${edge.col + 1})`;
    }
    return id;
  }

  // Try to get from cell
  const cell = topology.cells.get(id);
  if (cell?.index && cell.index[0] != null && cell.index[1] != null) {
    const [row, col] = cell.index;
    return `(${row + 1},${col + 1})`;
  }

  // Try to get from vertex
  const vertex = topology.vertices.get(id);
  if (vertex?.index && vertex.index[0] != null && vertex.index[1] != null) {
    const [row, col] = vertex.index;
    return `+(${row + 1},${col + 1})`;
  }

  // Try to get from edge
  const edge = topology.edges.get(id);
  if (edge?.index && edge.index[0] != null && edge.index[1] != null) {
    const [row, col] = edge.index;
    const prefix = edge.direction === 'h' ? '-' : '|';
    return `${prefix}(${row + 1},${col + 1})`;
  }

  // Fallback: parse ID directly
  return getCoordinateFromTopology(id, null, grid);
};

const resolveLineEndpointIdsForDisplay = (
  line: LineElement,
  topology: GridTopology | null,
  grid: GridConfig
): { fromId: string; toId: string } | null => {
  if (line.from && line.to) return { fromId: line.from, toId: line.to };
  if (!line.edgeId) return null;

  const lineTarget = line.lineTarget ?? 'cell';

  if (topology) {
    const edge = topology.edges.get(line.edgeId);
    if (!edge) return null;

    if (lineTarget === 'edge' || lineTarget === 'wall') {
      return { fromId: edge.startVertex, toId: edge.endVertex };
    }

    if (edge.adjacentCells.length >= 2) {
      return { fromId: edge.adjacentCells[0], toId: edge.adjacentCells[1] };
    }

    return null;
  }

  const idx = getEdgeIndexById(line.edgeId, grid);
  if (!idx) return null;

  if (lineTarget === 'edge' || lineTarget === 'wall') {
    const fromId = `vertex-${idx.row}-${idx.col}`;
    const toId = idx.type === 'h'
      ? `vertex-${idx.row}-${idx.col + 1}`
      : `vertex-${idx.row + 1}-${idx.col}`;
    return { fromId, toId };
  }

  const fromId =
    idx.type === 'h'
      ? `cell-${idx.row - 1}-${idx.col}`
      : `cell-${idx.row}-${idx.col - 1}`;
  const toId =
    idx.type === 'h'
      ? `cell-${idx.row}-${idx.col}`
      : `cell-${idx.row}-${idx.col}`;
  return { fromId, toId };
};

// Parse coordinate string to extract row, col, and prefix
const parseCoordString = (coord: string): { prefix: string; row: number; col: number } | null => {
  // Match patterns like "(1,2)", "+(1,2)", "-(1,2)", "|(1,2)"
  const match = coord.match(/^([+\-|]?)\((\d+),(\d+)\)$/);
  if (!match) return null;
  return {
    prefix: match[1] || '',
    row: parseInt(match[2], 10),
    col: parseInt(match[3], 10),
  };
};

// Check if two lines can be merged (same prefix, one coord matches, other differs by 1)
const canMergeLines = (
  a: { fromCoord: string; toCoord: string },
  b: { fromCoord: string; toCoord: string }
): boolean => {
  // Get normalized coords (min, max)
  const aCoords = [a.fromCoord, a.toCoord].sort();
  const bCoords = [b.fromCoord, b.toCoord].sort();

  // Parse all coordinates
  const aParsed = aCoords.map(parseCoordString);
  const bParsed = bCoords.map(parseCoordString);
  if (aParsed.some(p => !p) || bParsed.some(p => !p)) return false;

  const [aMin, aMax] = aParsed as { prefix: string; row: number; col: number }[];
  const [bMin, bMax] = bParsed as { prefix: string; row: number; col: number }[];

  // Prefixes must match
  if (aMin.prefix !== bMin.prefix || aMax.prefix !== bMax.prefix) return false;
  if (aMin.prefix !== aMax.prefix) return false;

  // Check if lines are collinear (same row or same col)
  const aIsHorizontal = aMin.row === aMax.row;
  const aIsVertical = aMin.col === aMax.col;
  const bIsHorizontal = bMin.row === bMax.row;
  const bIsVertical = bMin.col === bMax.col;

  // Both must be horizontal or both vertical
  if (aIsHorizontal && bIsHorizontal && aMin.row === bMin.row) {
    // Check if they share an endpoint (one's max.col === other's min.col)
    return aMax.col === bMin.col || bMax.col === aMin.col;
  }
  if (aIsVertical && bIsVertical && aMin.col === bMin.col) {
    // Check if they share an endpoint (one's max.row === other's min.row)
    return aMax.row === bMin.row || bMax.row === aMin.row;
  }

  return false;
};

// Merge consecutive lines into groups
const mergeLines = (lineInfos: FreeLineInfo[]): MergedLineGroup[] => {
  if (lineInfos.length === 0) return [];

  // Group lines by their visual properties (color, thickness, style)
  const groups: MergedLineGroup[] = [];
  const used = new Set<number>();

  for (let i = 0; i < lineInfos.length; i++) {
    if (used.has(i)) continue;

    const chain: FreeLineInfo[] = [lineInfos[i]];
    used.add(i);

    // Try to extend the chain
    let extended = true;
    while (extended) {
      extended = false;
      for (let j = 0; j < lineInfos.length; j++) {
        if (used.has(j)) continue;

        const candidate = lineInfos[j];
        const lastInChain = chain[chain.length - 1];
        const firstInChain = chain[0];

        // Check if candidate can be merged with chain endpoints
        // Must have same visual properties
        if (
          candidate.line.color !== lastInChain.line.color ||
          candidate.line.thickness !== lastInChain.line.thickness ||
          candidate.line.style !== lastInChain.line.style
        ) continue;

        if (canMergeLines(lastInChain, candidate)) {
          chain.push(candidate);
          used.add(j);
          extended = true;
        } else if (canMergeLines(firstInChain, candidate)) {
          chain.unshift(candidate);
          used.add(j);
          extended = true;
        }
      }
    }

    // Build the merged group
    const allCoords = chain.flatMap(info => [info.fromCoord, info.toCoord]);
    const parsedCoords = allCoords.map(parseCoordString).filter((p): p is NonNullable<typeof p> => p !== null);

    // Calculate total length of chain
    let totalLength: IrrationalLength = { rational: 0, sqrtTerms: {} };
    for (const info of chain) {
      const segmentLen = calculateSegmentLength(info.fromCoord, info.toCoord);
      totalLength = addLengths(totalLength, segmentLen);
    }

    if (parsedCoords.length > 0) {
      // Find the extent of the chain
      const prefix = parsedCoords[0].prefix;
      const rows = parsedCoords.map(p => p.row);
      const cols = parsedCoords.map(p => p.col);
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);

      const fromCoord = `${prefix}(${minRow},${minCol})`;
      const toCoord = `${prefix}(${maxRow},${maxCol})`;

      groups.push({
        ids: chain.map(info => info.id),
        lines: chain.map(info => info.line),
        displayCoord: `${fromCoord}→${toCoord}`,
        fromCoord,
        toCoord,
        length: totalLength,
      });
    } else {
      // Fallback: single line
      groups.push({
        ids: [chain[0].id],
        lines: [chain[0].line],
        displayCoord: `${chain[0].fromCoord}→${chain[0].toCoord}`,
        fromCoord: chain[0].fromCoord,
        toCoord: chain[0].toCoord,
        length: totalLength,
      });
    }
  }

  return groups;
};

// Sort options
type SortOption = 'row' | 'col' | 'len';
type SortDirection = 'asc' | 'desc';

// Get numeric length value for sorting
const getLengthNumericValue = (len: IrrationalLength): number => {
  // Approximate value for sorting purposes
  let value = len.rational;
  for (const [radicand, coef] of Object.entries(len.sqrtTerms)) {
    value += coef * Math.sqrt(Number(radicand));
  }
  if (len.decimal) {
    value += len.decimal;
  }
  return value;
};

// Free line list component - shows list of grid-snapped lines
export const FreeLineList: React.FC = () => {
  const { t } = useTranslation();
  const { puzzle, activeLayer, isPlayerMode, removeLine, topology, useTopology, setHighlightedLineIds, highlightedLineIds, grid } = usePuzzleStore();
  const storeApi = usePuzzleStoreApi();
  const [mergeConsecutive, setMergeConsecutive] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('row');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Toggle sort option - if same option clicked, toggle direction; otherwise change option
  const handleSortClick = (option: SortOption) => {
    if (sortOption === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('asc');
    }
  };

  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);
  const dataLayer = editableLayer ?? toDataLayer(activeLayer);
  const canEdit = Boolean(editableLayer);
  const activeTopology = useTopology ? topology : null;

  // Get all lines (excluding freehand) for current layer only
  const lineInfos = React.useMemo(() => {
    const layerData = puzzle[dataLayer];
    const allLines = Object.values(layerData.lines) as LineElement[];

    const result: FreeLineInfo[] = [];

    allLines.forEach((line) => {
      // Skip freehand lines (they have their own list)
      if (line.isFree) return;

      const endpoints = resolveLineEndpointIdsForDisplay(line, activeTopology, grid);
      if (!endpoints) return;
      const isBackward = line.arrowDirection === 'backward';
      const fromId = isBackward ? endpoints.toId : endpoints.fromId;
      const toId = isBackward ? endpoints.fromId : endpoints.toId;

      result.push({
        id: line.id,
        line,
        fromCoord: getCoordinateFromTopology(fromId, activeTopology, grid),
        toCoord: getCoordinateFromTopology(toId, activeTopology, grid),
      });
    });

    return result;
  }, [puzzle, dataLayer, activeTopology, grid]);

  // Sort function for coordinates based on sort option and direction
  const sortByCoord = React.useCallback((
    aFrom: string, aTo: string,
    bFrom: string, bTo: string,
    aLen?: IrrationalLength,
    bLen?: IrrationalLength
  ): number => {
    const aMin = aFrom < aTo ? aFrom : aTo;
    const aMax = aFrom < aTo ? aTo : aFrom;
    const bMin = bFrom < bTo ? bFrom : bTo;
    const bMax = bFrom < bTo ? bTo : bFrom;

    const aParsedMin = parseCoordString(aMin);
    const aParsedMax = parseCoordString(aMax);
    const bParsedMin = parseCoordString(bMin);
    const bParsedMax = parseCoordString(bMax);

    let result = 0;

    if (sortOption === 'row') {
      // Sort by row first, then col
      if (aParsedMin && bParsedMin) {
        if (aParsedMin.row !== bParsedMin.row) {
          result = aParsedMin.row - bParsedMin.row;
        } else if (aParsedMin.col !== bParsedMin.col) {
          result = aParsedMin.col - bParsedMin.col;
        } else if (aParsedMax && bParsedMax) {
          if (aParsedMax.row !== bParsedMax.row) {
            result = aParsedMax.row - bParsedMax.row;
          } else {
            result = aParsedMax.col - bParsedMax.col;
          }
        }
      }
      if (result === 0) {
        result = aMin.localeCompare(bMin) || aMax.localeCompare(bMax);
      }
    } else if (sortOption === 'col') {
      // Sort by col first, then row
      if (aParsedMin && bParsedMin) {
        if (aParsedMin.col !== bParsedMin.col) {
          result = aParsedMin.col - bParsedMin.col;
        } else if (aParsedMin.row !== bParsedMin.row) {
          result = aParsedMin.row - bParsedMin.row;
        } else if (aParsedMax && bParsedMax) {
          if (aParsedMax.col !== bParsedMax.col) {
            result = aParsedMax.col - bParsedMax.col;
          } else {
            result = aParsedMax.row - bParsedMax.row;
          }
        }
      }
      if (result === 0) {
        result = aMin.localeCompare(bMin) || aMax.localeCompare(bMax);
      }
    } else {
      // Sort by length first, then row, col
      if (aLen && bLen) {
        const aLenVal = getLengthNumericValue(aLen);
        const bLenVal = getLengthNumericValue(bLen);
        if (Math.abs(aLenVal - bLenVal) > 0.0001) {
          result = aLenVal - bLenVal;
        }
      }
      // Then by row, col
      if (result === 0 && aParsedMin && bParsedMin) {
        if (aParsedMin.row !== bParsedMin.row) {
          result = aParsedMin.row - bParsedMin.row;
        } else if (aParsedMin.col !== bParsedMin.col) {
          result = aParsedMin.col - bParsedMin.col;
        }
      }
      if (result === 0) {
        result = aMin.localeCompare(bMin) || aMax.localeCompare(bMax);
      }
    }

    // Apply sort direction
    return sortDirection === 'desc' ? -result : result;
  }, [sortOption, sortDirection]);

  // Sorted line infos
  const sortedLineInfos = React.useMemo(() => {
    return [...lineInfos].sort((a, b) => {
      const aLen = calculateSegmentLength(a.fromCoord, a.toCoord);
      const bLen = calculateSegmentLength(b.fromCoord, b.toCoord);
      return sortByCoord(a.fromCoord, a.toCoord, b.fromCoord, b.toCoord, aLen, bLen);
    });
  }, [lineInfos, sortByCoord]);

  // Merged groups (only computed when option is enabled)
  const mergedGroups = React.useMemo(() => {
    if (!mergeConsecutive) return null;
    const groups = mergeLines(lineInfos);
    // Sort groups
    groups.sort((a, b) => sortByCoord(a.fromCoord, a.toCoord, b.fromCoord, b.toCoord, a.length, b.length));
    return groups;
  }, [lineInfos, mergeConsecutive, sortByCoord]);

  // Check if all lines have the same length (to hide length display)
  const allSameLength = React.useMemo(() => {
    if (mergedGroups) {
      if (mergedGroups.length === 0) return true;
      const firstLen = mergedGroups[0].length;
      return mergedGroups.every(g => areLengthsEqual(g.length, firstLen));
    }
    if (lineInfos.length === 0) return true;
    const firstLen = calculateSegmentLength(lineInfos[0].fromCoord, lineInfos[0].toCoord);
    return lineInfos.every(info => {
      const len = calculateSegmentLength(info.fromCoord, info.toCoord);
      return areLengthsEqual(len, firstLen);
    });
  }, [lineInfos, mergedGroups]);

  // Get all item IDs in current display order (for shift-select range)
  const getOrderedItemIds = React.useCallback((): string[][] => {
    if (mergedGroups) {
      return mergedGroups.map(g => g.ids);
    } else {
      return sortedLineInfos.map(info => [info.id]);
    }
  }, [mergedGroups, sortedLineInfos]);

  // Handle selection with modifier keys
  const handleItemClick = React.useCallback((
    ids: string[],
    index: number,
    event: React.MouseEvent
  ) => {
    const { highlightedLineIds } = storeApi.getState();
    const orderedItems = getOrderedItemIds();

    if (event.shiftKey && lastClickedIndex !== null) {
      // Shift+click: range selection from last clicked to current
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeIds: string[] = [];
      for (let i = start; i <= end; i++) {
        rangeIds.push(...orderedItems[i]);
      }
      setHighlightedLineIds(rangeIds);
      // Don't update lastClickedIndex for shift-click to allow extending range
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: toggle selection (add/remove from current selection)
      const allSelected = ids.every(id => highlightedLineIds.includes(id));
      if (allSelected) {
        // Remove from selection
        setHighlightedLineIds(highlightedLineIds.filter(id => !ids.includes(id)));
      } else {
        // Add to selection
        setHighlightedLineIds([...highlightedLineIds, ...ids.filter(id => !highlightedLineIds.includes(id))]);
      }
      setLastClickedIndex(index);
    } else {
      // Normal click: single selection (replace)
      const allSelected = ids.every(id => highlightedLineIds.includes(id));
      if (allSelected) {
        // Deselect
        setHighlightedLineIds([]);
      } else {
        // Select only this item
        setHighlightedLineIds(ids);
      }
      setLastClickedIndex(index);
    }
  }, [lastClickedIndex, getOrderedItemIds, setHighlightedLineIds]);

  // Handle delete for multiple line IDs
  const handleDeleteMultiple = (ids: string[]) => {
    if (!canEdit) return;
    ids.forEach(id => removeLine(id));
  };

  if (lineInfos.length === 0) {
    return (
      <div className="text-xs text-office-text-secondary text-center py-2">
        {t('tool.line.list.noLines')}
      </div>
    );
  }

  const totalLines = lineInfos.length;
  const displayCount = mergedGroups ? mergedGroups.length : totalLines;

  return (
    <div className="border-t border-office-border pt-2 mt-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-office-text-secondary">
          {t('tool.line.list.title')} ({mergedGroups ? `${displayCount},${totalLines}` : totalLines})
        </label>
        <div className="flex items-center gap-2">
          {/* Sort options */}
          <div className="flex items-center gap-0.5">
            <button
              className={`px-1 py-0.5 text-[9px] rounded ${sortOption === 'row' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              onClick={() => handleSortClick('row')}
              title={t('tool.line.list.sortRow', '行優先')}
            >
              {t('tool.line.list.sortRowShort', '行')}{sortOption === 'row' && (sortDirection === 'asc' ? '▲' : '▼')}
            </button>
            <button
              className={`px-1 py-0.5 text-[9px] rounded ${sortOption === 'col' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              onClick={() => handleSortClick('col')}
              title={t('tool.line.list.sortCol', '列優先')}
            >
              {t('tool.line.list.sortColShort', '列')}{sortOption === 'col' && (sortDirection === 'asc' ? '▲' : '▼')}
            </button>
            <button
              className={`px-1 py-0.5 text-[9px] rounded ${sortOption === 'len' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              onClick={() => handleSortClick('len')}
              title={t('tool.line.list.sortLen', '長さ優先')}
            >
              {t('tool.line.list.sortLenShort', '長')}{sortOption === 'len' && (sortDirection === 'asc' ? '▲' : '▼')}
            </button>
          </div>
          {/* Merge checkbox */}
          <label className="flex items-center gap-1 text-[10px] text-office-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={mergeConsecutive}
              onChange={(e) => setMergeConsecutive(e.target.checked)}
              className="w-3 h-3"
            />
            {t('tool.line.list.merge', '統合')}
          </label>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto space-y-1">
        {mergedGroups ? (
          // Merged view
          mergedGroups.map((group, index) => {
            const isSelected = group.ids.every(id => highlightedLineIds.includes(id));
            return (
            <div
              key={group.ids.join('-')}
              className={`flex items-center justify-between p-1.5 rounded border cursor-pointer select-none ${
                isSelected
                  ? 'bg-orange-100 border-orange-400'
                  : 'bg-gray-50 border-office-border hover:bg-gray-100'
              }`}
              onClick={(e) => handleItemClick(group.ids, index, e)}
            >
              <div className="flex items-center gap-2">
                {/* Line sample preview with arrow */}
                <LineSamplePreview line={group.lines[0]} fromCoord={group.fromCoord} toCoord={group.toCoord} />
                {/* Coordinates and length */}
                <span
                  className="text-[10px] text-gray-600 truncate max-w-[140px]"
                  title={group.ids.length > 1 ? `${group.ids.length} lines` : undefined}
                >
                  {group.displayCoord}
                </span>
                {!allSameLength && (
                  <span className="text-[10px] text-office-text-secondary">
                    {t('tool.line.list.length', '長さ{{value}}', { value: formatLengthValue(group.length) })}
                  </span>
                )}
              </div>
              {/* Delete button */}
              <button
                className={`p-1 rounded transition-colors ${
                  canEdit ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMultiple(group.ids);
                }}
                disabled={!canEdit}
                title={t('action.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );})
        ) : (
          // Individual view
          sortedLineInfos.map((info, index) => {
            const isSelected = highlightedLineIds.includes(info.id);
            return (
            <div
              key={info.id}
              className={`flex items-center justify-between p-1.5 rounded border cursor-pointer select-none ${
                isSelected
                  ? 'bg-orange-100 border-orange-400'
                  : 'bg-gray-50 border-office-border hover:bg-gray-100'
              }`}
              onClick={(e) => handleItemClick([info.id], index, e)}
            >
              <div className="flex items-center gap-2">
                {/* Line sample preview with arrow */}
                <LineSamplePreview line={info.line} fromCoord={info.fromCoord} toCoord={info.toCoord} />
                {/* Coordinates and length */}
                <span
                  className="text-[10px] text-gray-600 truncate max-w-[100px]"
                  title={`${info.line.from} → ${info.line.to}`}
                >
                  {info.fromCoord}→{info.toCoord}
                </span>
                {!allSameLength && (
                  <span className="text-[10px] text-office-text-secondary">
                    {t('tool.line.list.length', '長さ{{value}}', { value: formatLengthValue(calculateSegmentLength(info.fromCoord, info.toCoord)) })}
                  </span>
                )}
              </div>
              {/* Delete button */}
              <button
                className={`p-1 rounded transition-colors ${
                  canEdit ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canEdit) return;
                  removeLine(info.id);
                }}
                disabled={!canEdit}
                title={t('action.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );})
        )}
      </div>
    </div>
  );
};
