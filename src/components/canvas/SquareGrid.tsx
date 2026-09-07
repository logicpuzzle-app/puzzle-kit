import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { BackgroundImageLayer } from './grid/BackgroundImageLayer';

function isSudokuBoldLine(
  index: number,
  margin: number,
  count: number,
  blockSize: number,
): boolean {
  return (
    Number.isInteger(blockSize) &&
    blockSize > 0 &&
    index >= margin &&
    index <= margin + count &&
    count % blockSize === 0 &&
    (index - margin) % blockSize === 0
  );
}

/**
 * SquareGrid - Renders a standard square grid
 */
export const SquareGrid: React.FC = () => {
  const { grid } = usePuzzleStore();
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    showGrid,
    gridStyle,
    blockRows = 3,
    blockCols = 3,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    frameStyle,
    frameColor,
    gridColor,
    backgroundColor,
    backgroundImage,
    disabledCells,
  } = grid;

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
          isSudokuBoldLine(i, marginTop, rows, blockRows);
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
          isSudokuBoldLine(j, marginLeft, cols, blockCols);
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
  }, [rows, cols, cellSize, outerPadding, showGrid, gridStyle, blockRows, blockCols, gridColor, marginTop, marginLeft, totalRows, totalCols]);

  const outerFrame = useMemo(() => {
    if (frameStyle === 'none') return null;

    const strokeWidth = frameStyle === 'thick' ? 3 : 2;

    const disabledArray = Array.isArray(disabledCells) ? disabledCells :
      (disabledCells ? Array.from(disabledCells as unknown as Set<string>) : []);
    const disabledSet = new Set(disabledArray);
    const isDisabled = (r: number, c: number) => disabledSet.has(`cell-${r}-${c}`);

    const lines: React.ReactElement[] = [];

    // Top edge
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

    // Bottom edge
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

    // Left edge
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

    // Right edge
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

    if (frameStyle === 'double') {
      const outerLines: React.ReactElement[] = [];
      const offset = 2;

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
    <g className="square-grid-layer">
      <rect
        x={outerPadding}
        y={outerPadding}
        width={gridWidth}
        height={gridHeight}
        fill={backgroundColor}
      />
      {backgroundImage && (
        <BackgroundImageLayer
          gridConfig={grid}
          gridX={outerPadding}
          gridY={outerPadding}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
        />
      )}
      {gridLines}
      {outerFrame}
    </g>
  );
};

/**
 * SquareGridBackground - Renders only the background
 */
export const SquareGridBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { grid } = usePuzzleStore();
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    backgroundColor,
    backgroundImage,
  } = grid;

  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;
  const gridWidth = totalCols * cellSize;
  const gridHeight = totalRows * cellSize;

  return (
    <g className="square-grid-background">
      <rect
        x={outerPadding}
        y={outerPadding}
        width={gridWidth}
        height={gridHeight}
        fill={backgroundColor}
      />
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
 * SquareGridLines - Renders only the grid lines and frame
 */
export const SquareGridLines: React.FC = () => {
  const { grid } = usePuzzleStore();
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    showGrid,
    gridStyle,
    blockRows = 3,
    blockCols = 3,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    frameStyle,
    frameColor,
    gridColor,
    disabledCells,
  } = grid;

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
          isSudokuBoldLine(i, marginTop, rows, blockRows);
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
          isSudokuBoldLine(j, marginLeft, cols, blockCols);
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
  }, [rows, cols, cellSize, outerPadding, showGrid, gridStyle, blockRows, blockCols, gridColor, marginTop, marginLeft, totalRows, totalCols]);

  const outerFrame = useMemo(() => {
    if (frameStyle === 'none') return null;

    const strokeWidth = frameStyle === 'thick' ? 3 : 2;

    const disabledArray = Array.isArray(disabledCells) ? disabledCells :
      (disabledCells ? Array.from(disabledCells as unknown as Set<string>) : []);
    const disabledSet = new Set(disabledArray);
    const isDisabled = (r: number, c: number) => disabledSet.has(`cell-${r}-${c}`);

    const lines: React.ReactElement[] = [];

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

    return <>{lines}</>;
  }, [mainGridX, mainGridY, mainGridWidth, mainGridHeight, frameStyle, frameColor, rows, cols, cellSize, disabledCells]);

  return (
    <g className="square-grid-lines">
      {gridLines}
      {outerFrame}
    </g>
  );
};
