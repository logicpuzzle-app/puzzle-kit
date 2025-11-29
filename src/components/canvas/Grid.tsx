import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { HexGrid, TriangleGrid, PyramidGrid } from './HexGrid';
import type { GridConfig } from '../../types';

interface GridBackgroundProps {
  children?: React.ReactNode;
}

/**
 * BackgroundImageLayer - Renders background image with various fit modes and tiling
 */
interface BackgroundImageLayerProps {
  gridConfig: GridConfig;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

const BackgroundImageLayer: React.FC<BackgroundImageLayerProps> = ({
  gridConfig,
  gridX,
  gridY,
  gridWidth,
  gridHeight,
}) => {
  const {
    backgroundImage,
    backgroundOpacity = 0.5,
    backgroundFit = 'contain',
    backgroundScale = 1,
    backgroundTile = false,
    backgroundOffsetX = 0,
    backgroundOffsetY = 0,
  } = gridConfig;

  if (!backgroundImage) return null;

  // Generate unique pattern ID for tiling
  const patternId = useMemo(() => `bg-pattern-${Math.random().toString(36).substr(2, 9)}`, []);

  // For tiling mode
  if (backgroundTile) {
    // Calculate tile size based on scale
    // We'll use a base size and apply scale
    const baseTileSize = Math.min(gridWidth, gridHeight) * 0.5;
    const tileWidth = baseTileSize * backgroundScale;
    const tileHeight = baseTileSize * backgroundScale;

    return (
      <g className="background-image-layer" opacity={backgroundOpacity}>
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={tileWidth}
            height={tileHeight}
            x={gridX + backgroundOffsetX}
            y={gridY + backgroundOffsetY}
          >
            <image
              href={backgroundImage}
              width={tileWidth}
              height={tileHeight}
              preserveAspectRatio="xMidYMid meet"
            />
          </pattern>
        </defs>
        <rect
          x={gridX}
          y={gridY}
          width={gridWidth}
          height={gridHeight}
          fill={`url(#${patternId})`}
        />
      </g>
    );
  }

  // For non-tiling modes
  let imageX = gridX;
  let imageY = gridY;
  let imageWidth = gridWidth;
  let imageHeight = gridHeight;
  let preserveAspectRatio = 'xMidYMid meet';

  switch (backgroundFit) {
    case 'contain':
      // Image fits within bounds, maintaining aspect ratio (default SVG behavior)
      preserveAspectRatio = 'xMidYMid meet';
      break;
    case 'cover':
      // Image covers entire area, maintaining aspect ratio (may crop)
      preserveAspectRatio = 'xMidYMid slice';
      break;
    case 'fill':
      // Image stretches to fill (distorts aspect ratio)
      preserveAspectRatio = 'none';
      break;
    case 'none':
      // Image at natural size with scale applied, centered with offset
      preserveAspectRatio = 'xMidYMid meet';
      // Use scale factor for width/height
      imageWidth = gridWidth * backgroundScale;
      imageHeight = gridHeight * backgroundScale;
      // Center the image and apply offset
      imageX = gridX + (gridWidth - imageWidth) / 2 + backgroundOffsetX;
      imageY = gridY + (gridHeight - imageHeight) / 2 + backgroundOffsetY;
      break;
  }

  return (
    <g className="background-image-layer">
      {/* Clip path to constrain image to grid bounds */}
      <defs>
        <clipPath id={`${patternId}-clip`}>
          <rect x={gridX} y={gridY} width={gridWidth} height={gridHeight} />
        </clipPath>
      </defs>
      <image
        x={imageX}
        y={imageY}
        width={imageWidth}
        height={imageHeight}
        href={backgroundImage}
        preserveAspectRatio={preserveAspectRatio}
        opacity={backgroundOpacity}
        clipPath={backgroundFit === 'none' ? `url(#${patternId}-clip)` : undefined}
      />
    </g>
  );
};

/**
 * GridBackground - Renders only the grid background (cell fills)
 * Used to render surfaces between background and grid lines
 */
export const GridBackground: React.FC<GridBackgroundProps> = ({ children }) => {
  const { grid } = usePuzzleStore();
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    gridType = 'square',
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    backgroundColor,
    backgroundImage,
  } = grid;

  // Non-square grids handle their own background
  if (gridType !== 'square') {
    return <>{children}</>;
  }

  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;
  const gridWidth = totalCols * cellSize;
  const gridHeight = totalRows * cellSize;

  return (
    <g className="grid-background">
      <rect
        x={outerPadding}
        y={outerPadding}
        width={gridWidth}
        height={gridHeight}
        fill={backgroundColor}
      />
      {/* Background image (if set) */}
      {backgroundImage && (
        <BackgroundImageLayer
          gridConfig={grid}
          gridX={outerPadding}
          gridY={outerPadding}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
        />
      )}
      {children}
    </g>
  );
};

/**
 * GridLines - Renders grid lines and frame (without background)
 */
export const GridLines: React.FC = () => {
  const { grid } = usePuzzleStore();
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    showGrid,
    gridStyle,
    gridType = 'square',
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    frameStyle,
    frameColor,
    gridColor,
    disabledCells,
  } = grid;

  // Non-square grids - no lines here (handled by HexGrid etc.)
  if (gridType !== 'square') {
    return null;
  }

  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;

  const mainGridX = outerPadding + marginLeft * cellSize;
  const mainGridY = outerPadding + marginTop * cellSize;
  const mainGridWidth = cols * cellSize;
  const mainGridHeight = rows * cellSize;

  const gridLines = useMemo(() => {
    if (!showGrid) return null;

    const lines: React.ReactElement[] = [];
    const strokeWidth = gridStyle === 'thick' ? 2 : 1;

    if (gridStyle === 'dots') {
      for (let i = 0; i <= totalRows; i++) {
        for (let j = 0; j <= totalCols; j++) {
          const x = outerPadding + j * cellSize;
          const y = outerPadding + i * cellSize;
          lines.push(
            <circle
              key={`dot-${i}-${j}`}
              cx={x}
              cy={y}
              r={2}
              fill={gridColor}
            />
          );
        }
      }
    } else {
      const isDashed = gridStyle === 'dashed';
      const dashArray = isDashed ? '4,4' : undefined;

      for (let i = 0; i <= totalRows; i++) {
        const y = outerPadding + i * cellSize;
        const isInMainGrid = i >= marginTop && i <= marginTop + rows;
        const isBold =
          gridStyle === 'sudoku' &&
          isInMainGrid &&
          (i - marginTop) % 3 === 0 &&
          rows % 3 === 0;
        const opacity = isInMainGrid ? 1 : 0.3;

        lines.push(
          <line
            key={`h-${i}`}
            x1={outerPadding}
            y1={y}
            x2={outerPadding + totalCols * cellSize}
            y2={y}
            stroke={gridColor}
            strokeWidth={isBold ? 3 : strokeWidth}
            strokeDasharray={dashArray}
            opacity={opacity}
          />
        );
      }

      for (let j = 0; j <= totalCols; j++) {
        const x = outerPadding + j * cellSize;
        const isInMainGrid = j >= marginLeft && j <= marginLeft + cols;
        const isBold =
          gridStyle === 'sudoku' &&
          isInMainGrid &&
          (j - marginLeft) % 3 === 0 &&
          cols % 3 === 0;
        const opacity = isInMainGrid ? 1 : 0.3;

        lines.push(
          <line
            key={`v-${j}`}
            x1={x}
            y1={outerPadding}
            x2={x}
            y2={outerPadding + totalRows * cellSize}
            stroke={gridColor}
            strokeWidth={isBold ? 3 : strokeWidth}
            strokeDasharray={dashArray}
            opacity={opacity}
          />
        );
      }
    }

    return lines;
  }, [rows, cols, cellSize, outerPadding, showGrid, gridStyle, gridColor, marginTop, marginLeft, totalRows, totalCols]);

  const outerFrame = useMemo(() => {
    if (frameStyle === 'none') return null;

    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    // Create a set for efficient lookup of disabled cells
    const disabledArray = Array.isArray(disabledCells) ? disabledCells :
      (disabledCells ? Array.from(disabledCells as unknown as Set<string>) : []);
    const disabledSet = new Set(disabledArray);
    const isDisabled = (r: number, c: number) => disabledSet.has(`cell-${r}-${c}`);

    // Generate frame as individual line segments, skipping edges adjacent to disabled cells
    const lines: React.ReactElement[] = [];

    // Top edge (row = 0)
    for (let c = 0; c < cols; c++) {
      if (!isDisabled(0, c)) {
        const x1 = mainGridX + c * cellSize;
        const x2 = mainGridX + (c + 1) * cellSize;
        const y = mainGridY;
        lines.push(
          <line key={`frame-top-${c}`} x1={x1} y1={y} x2={x2} y2={y}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    // Bottom edge (row = rows - 1)
    for (let c = 0; c < cols; c++) {
      if (!isDisabled(rows - 1, c)) {
        const x1 = mainGridX + c * cellSize;
        const x2 = mainGridX + (c + 1) * cellSize;
        const y = mainGridY + mainGridHeight;
        lines.push(
          <line key={`frame-bottom-${c}`} x1={x1} y1={y} x2={x2} y2={y}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    // Left edge (col = 0)
    for (let r = 0; r < rows; r++) {
      if (!isDisabled(r, 0)) {
        const x = mainGridX;
        const y1 = mainGridY + r * cellSize;
        const y2 = mainGridY + (r + 1) * cellSize;
        lines.push(
          <line key={`frame-left-${r}`} x1={x} y1={y1} x2={x} y2={y2}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    // Right edge (col = cols - 1)
    for (let r = 0; r < rows; r++) {
      if (!isDisabled(r, cols - 1)) {
        const x = mainGridX + mainGridWidth;
        const y1 = mainGridY + r * cellSize;
        const y2 = mainGridY + (r + 1) * cellSize;
        lines.push(
          <line key={`frame-right-${r}`} x1={x} y1={y1} x2={x} y2={y2}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    if (lines.length === 0) return null;

    // For double frame style, add outer frame lines as well
    if (frameStyle === 'double') {
      const outerLines: React.ReactElement[] = [];
      const offset = 2;

      // Top edge outer
      for (let c = 0; c < cols; c++) {
        if (!isDisabled(0, c)) {
          const x1 = mainGridX + c * cellSize - (c === 0 ? offset : 0);
          const x2 = mainGridX + (c + 1) * cellSize + (c === cols - 1 ? offset : 0);
          const y = mainGridY - offset;
          outerLines.push(
            <line key={`frame-outer-top-${c}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      // Bottom edge outer
      for (let c = 0; c < cols; c++) {
        if (!isDisabled(rows - 1, c)) {
          const x1 = mainGridX + c * cellSize - (c === 0 ? offset : 0);
          const x2 = mainGridX + (c + 1) * cellSize + (c === cols - 1 ? offset : 0);
          const y = mainGridY + mainGridHeight + offset;
          outerLines.push(
            <line key={`frame-outer-bottom-${c}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      // Left edge outer
      for (let r = 0; r < rows; r++) {
        if (!isDisabled(r, 0)) {
          const x = mainGridX - offset;
          const y1 = mainGridY + r * cellSize - (r === 0 ? offset : 0);
          const y2 = mainGridY + (r + 1) * cellSize + (r === rows - 1 ? offset : 0);
          outerLines.push(
            <line key={`frame-outer-left-${r}`} x1={x} y1={y1} x2={x} y2={y2}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      // Right edge outer
      for (let r = 0; r < rows; r++) {
        if (!isDisabled(r, cols - 1)) {
          const x = mainGridX + mainGridWidth + offset;
          const y1 = mainGridY + r * cellSize - (r === 0 ? offset : 0);
          const y2 = mainGridY + (r + 1) * cellSize + (r === rows - 1 ? offset : 0);
          outerLines.push(
            <line key={`frame-outer-right-${r}`} x1={x} y1={y1} x2={x} y2={y2}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      return <>{outerLines}{lines}</>;
    }

    return <>{lines}</>;
  }, [mainGridX, mainGridY, mainGridWidth, mainGridHeight, frameStyle, frameColor, rows, cols, cellSize, disabledCells]);

  return (
    <g className="grid-lines">
      {gridLines}
      {outerFrame}
    </g>
  );
};

export const Grid: React.FC = () => {
  const { grid } = usePuzzleStore();
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    showGrid,
    gridStyle,
    gridType = 'square',
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    frameStyle,
    frameColor,
    gridColor,
    backgroundColor,
    backgroundImage,
    disabledCells,
  } = grid;

  // Render non-square grid types
  if (gridType === 'hex') {
    return <HexGrid grid={grid} />;
  } else if (gridType === 'triangle') {
    return <TriangleGrid grid={grid} />;
  } else if (gridType === 'pyramid') {
    return <PyramidGrid grid={grid} />;
  }

  // Total grid dimensions including margins
  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;

  // Main grid boundaries (inner grid without margins)
  const mainGridX = outerPadding + marginLeft * cellSize;
  const mainGridY = outerPadding + marginTop * cellSize;
  const mainGridWidth = cols * cellSize;
  const mainGridHeight = rows * cellSize;

  const gridLines = useMemo(() => {
    if (!showGrid) return null;

    const lines: React.ReactElement[] = [];
    const strokeWidth = gridStyle === 'thick' ? 2 : 1;

    if (gridStyle === 'dots') {
      // Dots at intersections instead of lines
      for (let i = 0; i <= totalRows; i++) {
        for (let j = 0; j <= totalCols; j++) {
          const x = outerPadding + j * cellSize;
          const y = outerPadding + i * cellSize;
          lines.push(
            <circle
              key={`dot-${i}-${j}`}
              cx={x}
              cy={y}
              r={2}
              fill={gridColor}
            />
          );
        }
      }
    } else {
      const isDashed = gridStyle === 'dashed';
      const dashArray = isDashed ? '4,4' : undefined;

      // Horizontal lines (full grid including margins)
      for (let i = 0; i <= totalRows; i++) {
        const y = outerPadding + i * cellSize;
        // Check if this is an inner grid line (inside main grid boundaries)
        const isInMainGrid = i >= marginTop && i <= marginTop + rows;
        const isBold =
          gridStyle === 'sudoku' &&
          isInMainGrid &&
          (i - marginTop) % 3 === 0 &&
          rows % 3 === 0;

        // Margin lines are lighter
        const opacity = isInMainGrid ? 1 : 0.3;

        lines.push(
          <line
            key={`h-${i}`}
            x1={outerPadding}
            y1={y}
            x2={outerPadding + totalCols * cellSize}
            y2={y}
            stroke={gridColor}
            strokeWidth={isBold ? 3 : strokeWidth}
            strokeDasharray={dashArray}
            opacity={opacity}
          />
        );
      }

      // Vertical lines (full grid including margins)
      for (let j = 0; j <= totalCols; j++) {
        const x = outerPadding + j * cellSize;
        const isInMainGrid = j >= marginLeft && j <= marginLeft + cols;
        const isBold =
          gridStyle === 'sudoku' &&
          isInMainGrid &&
          (j - marginLeft) % 3 === 0 &&
          cols % 3 === 0;

        const opacity = isInMainGrid ? 1 : 0.3;

        lines.push(
          <line
            key={`v-${j}`}
            x1={x}
            y1={outerPadding}
            x2={x}
            y2={outerPadding + totalRows * cellSize}
            stroke={gridColor}
            strokeWidth={isBold ? 3 : strokeWidth}
            strokeDasharray={dashArray}
            opacity={opacity}
          />
        );
      }
    }

    return lines;
  }, [rows, cols, cellSize, outerPadding, showGrid, gridStyle, gridColor, marginTop, marginBottom, marginLeft, marginRight, totalRows, totalCols]);

  // Outer frame
  const outerFrame = useMemo(() => {
    if (frameStyle === 'none') return null;

    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    // Create a set for efficient lookup of disabled cells
    const disabledArray = Array.isArray(disabledCells) ? disabledCells :
      (disabledCells ? Array.from(disabledCells as unknown as Set<string>) : []);
    const disabledSet = new Set(disabledArray);
    const isDisabled = (r: number, c: number) => disabledSet.has(`cell-${r}-${c}`);

    // Generate frame as individual line segments, skipping edges adjacent to disabled cells
    const lines: React.ReactElement[] = [];

    // Top edge (row = 0)
    for (let c = 0; c < cols; c++) {
      if (!isDisabled(0, c)) {
        const x1 = mainGridX + c * cellSize;
        const x2 = mainGridX + (c + 1) * cellSize;
        const y = mainGridY;
        lines.push(
          <line key={`frame-top-${c}`} x1={x1} y1={y} x2={x2} y2={y}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    // Bottom edge (row = rows - 1)
    for (let c = 0; c < cols; c++) {
      if (!isDisabled(rows - 1, c)) {
        const x1 = mainGridX + c * cellSize;
        const x2 = mainGridX + (c + 1) * cellSize;
        const y = mainGridY + mainGridHeight;
        lines.push(
          <line key={`frame-bottom-${c}`} x1={x1} y1={y} x2={x2} y2={y}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    // Left edge (col = 0)
    for (let r = 0; r < rows; r++) {
      if (!isDisabled(r, 0)) {
        const x = mainGridX;
        const y1 = mainGridY + r * cellSize;
        const y2 = mainGridY + (r + 1) * cellSize;
        lines.push(
          <line key={`frame-left-${r}`} x1={x} y1={y1} x2={x} y2={y2}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    // Right edge (col = cols - 1)
    for (let r = 0; r < rows; r++) {
      if (!isDisabled(r, cols - 1)) {
        const x = mainGridX + mainGridWidth;
        const y1 = mainGridY + r * cellSize;
        const y2 = mainGridY + (r + 1) * cellSize;
        lines.push(
          <line key={`frame-right-${r}`} x1={x} y1={y1} x2={x} y2={y2}
            stroke={frameColor} strokeWidth={strokeWidth} />
        );
      }
    }

    if (lines.length === 0) return null;

    // For double frame style, add outer frame lines as well
    if (frameStyle === 'double') {
      const outerLines: React.ReactElement[] = [];
      const offset = 2;

      // Top edge outer
      for (let c = 0; c < cols; c++) {
        if (!isDisabled(0, c)) {
          const x1 = mainGridX + c * cellSize - (c === 0 ? offset : 0);
          const x2 = mainGridX + (c + 1) * cellSize + (c === cols - 1 ? offset : 0);
          const y = mainGridY - offset;
          outerLines.push(
            <line key={`frame-outer-top-${c}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      // Bottom edge outer
      for (let c = 0; c < cols; c++) {
        if (!isDisabled(rows - 1, c)) {
          const x1 = mainGridX + c * cellSize - (c === 0 ? offset : 0);
          const x2 = mainGridX + (c + 1) * cellSize + (c === cols - 1 ? offset : 0);
          const y = mainGridY + mainGridHeight + offset;
          outerLines.push(
            <line key={`frame-outer-bottom-${c}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      // Left edge outer
      for (let r = 0; r < rows; r++) {
        if (!isDisabled(r, 0)) {
          const x = mainGridX - offset;
          const y1 = mainGridY + r * cellSize - (r === 0 ? offset : 0);
          const y2 = mainGridY + (r + 1) * cellSize + (r === rows - 1 ? offset : 0);
          outerLines.push(
            <line key={`frame-outer-left-${r}`} x1={x} y1={y1} x2={x} y2={y2}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      // Right edge outer
      for (let r = 0; r < rows; r++) {
        if (!isDisabled(r, cols - 1)) {
          const x = mainGridX + mainGridWidth + offset;
          const y1 = mainGridY + r * cellSize - (r === 0 ? offset : 0);
          const y2 = mainGridY + (r + 1) * cellSize + (r === rows - 1 ? offset : 0);
          outerLines.push(
            <line key={`frame-outer-right-${r}`} x1={x} y1={y1} x2={x} y2={y2}
              stroke={frameColor} strokeWidth={1} />
          );
        }
      }

      return <>{outerLines}{lines}</>;
    }

    return <>{lines}</>;
  }, [mainGridX, mainGridY, mainGridWidth, mainGridHeight, frameStyle, frameColor, rows, cols, cellSize, disabledCells]);

  const gridWidth = totalCols * cellSize;
  const gridHeight = totalRows * cellSize;

  return (
    <g className="grid-layer">
      {/* Background for entire grid (including margins) */}
      <rect
        x={outerPadding}
        y={outerPadding}
        width={gridWidth}
        height={gridHeight}
        fill={backgroundColor}
      />
      {/* Background image (if set) */}
      {backgroundImage && (
        <BackgroundImageLayer
          gridConfig={grid}
          gridX={outerPadding}
          gridY={outerPadding}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
        />
      )}
      {/* Grid lines */}
      {gridLines}
      {/* Outer frame (around main grid only) */}
      {outerFrame}
    </g>
  );
};

/**
 * DisabledCellsOverlay - Renders disabled cells overlay and border lines
 * In grid mode: shows grey semi-transparent overlay + border lines
 * In other modes: shows only border lines between enabled and disabled cells
 */
export const DisabledCellsOverlay: React.FC = () => {
  const { grid, isGridMode } = usePuzzleStore();
  const {
    cellSize,
    outerPadding,
    gridType = 'square',
    marginTop = 0,
    marginLeft = 0,
    disabledCells,
    rows,
    cols,
    frameColor,
    frameStyle,
    disabledCellColor,
    backgroundColor,
  } = grid;

  // useMemo must be called unconditionally (React Hooks rules)
  const { rects, borderLines } = useMemo(() => {
    // Return empty if conditions not met (but check for disabledCells regardless of mode)
    if (gridType !== 'square' || !disabledCells || disabledCells.length === 0) {
      return { rects: [], borderLines: [] };
    }
    const rectElements: React.ReactElement[] = [];
    const lineElements: React.ReactElement[] = [];

    // Handle both array and Set (for backwards compatibility)
    const disabledArray = Array.isArray(disabledCells) ? disabledCells : Array.from(disabledCells as unknown as Set<string>);
    const disabledSet = new Set(disabledArray);

    // Use same stroke width as frame style
    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    // Helper to check if a cell is disabled
    const isDisabled = (r: number, c: number) => disabledSet.has(`cell-${r}-${c}`);

    // Helper to check if a cell is within the grid bounds
    const isInBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

    // Helper to check if adjacent cell is enabled (in bounds and not disabled)
    const isAdjacentEnabled = (r: number, c: number) => isInBounds(r, c) && !isDisabled(r, c);

    disabledArray.forEach((cellId) => {
      // Parse cell ID (e.g., "cell-0-0")
      const match = cellId.match(/^cell-(-?\d+)-(-?\d+)$/);
      if (!match) return;
      const row = parseInt(match[1], 10);
      const col = parseInt(match[2], 10);

      // Skip cells outside the main grid
      if (!isInBounds(row, col)) return;

      // Calculate actual position (adjusted for margins)
      const actualCol = col + marginLeft;
      const actualRow = row + marginTop;
      const x = outerPadding + actualCol * cellSize;
      const y = outerPadding + actualRow * cellSize;

      // Add overlay for disabled cell
      // Use disabledCellColor in all modes (default: light grey #c0c0c0)
      const fillColor = disabledCellColor || '#c0c0c0';
      rectElements.push(
        <rect
          key={cellId}
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          fill={fillColor}
          pointerEvents="none"
        />
      );

      // Draw border only if adjacent cell is enabled (in bounds and not disabled)
      // No border for edges adjacent to out-of-bounds cells
      // Top edge
      if (isAdjacentEnabled(row - 1, col)) {
        lineElements.push(
          <line
            key={`${cellId}-top`}
            x1={x}
            y1={y}
            x2={x + cellSize}
            y2={y}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
      // Bottom edge
      if (isAdjacentEnabled(row + 1, col)) {
        lineElements.push(
          <line
            key={`${cellId}-bottom`}
            x1={x}
            y1={y + cellSize}
            x2={x + cellSize}
            y2={y + cellSize}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
      // Left edge
      if (isAdjacentEnabled(row, col - 1)) {
        lineElements.push(
          <line
            key={`${cellId}-left`}
            x1={x}
            y1={y}
            x2={x}
            y2={y + cellSize}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
      // Right edge
      if (isAdjacentEnabled(row, col + 1)) {
        lineElements.push(
          <line
            key={`${cellId}-right`}
            x1={x + cellSize}
            y1={y}
            x2={x + cellSize}
            y2={y + cellSize}
            stroke={frameColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        );
      }
    });

    return { rects: rectElements, borderLines: lineElements };
  }, [isGridMode, gridType, disabledCells, cellSize, outerPadding, marginTop, marginLeft, rows, cols, frameColor, frameStyle, disabledCellColor, backgroundColor]);

  // Return null if no content to render
  if (rects.length === 0 && borderLines.length === 0) return null;

  return (
    <g className="disabled-cells-overlay">
      {rects}
      {borderLines}
    </g>
  );
};
