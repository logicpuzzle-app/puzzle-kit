import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { HexGrid, TriangleGrid, PyramidGrid } from './HexGrid';
import { BackgroundImageLayer } from './grid/BackgroundImageLayer';

// Re-export DisabledCellsOverlay for backwards compatibility
export { DisabledCellsOverlay } from './grid/DisabledCellsOverlay';

interface GridBackgroundProps {
  children?: React.ReactNode;
}

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
