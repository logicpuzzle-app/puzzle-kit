import React, { useMemo } from 'react';
import { GridConfig } from '../../types';
import {
  getHexVertices,
  getTriangleVertices,
  getPyramidVertices,
  getPyramidRowCols,
} from '../../utils/hexGridUtils';

interface NonSquareGridProps {
  grid: GridConfig;
}

export const HexGrid: React.FC<NonSquareGridProps> = ({ grid }) => {
  const {
    rows,
    cols,
    outerPadding,
    showGrid,
    frameStyle,
    frameColor,
    gridColor,
    backgroundColor,
  } = grid;

  const cells = useMemo(() => {
    if (!showGrid) return null;

    const elements: React.ReactElement[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const vertices = getHexVertices(row, col, grid);
        const pathData = vertices
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`)
          .join(' ') + ' Z';

        elements.push(
          <path
            key={`hex-${row}-${col}`}
            d={pathData}
            fill={backgroundColor}
            stroke={gridColor}
            strokeWidth={1}
          />
        );
      }
    }

    return elements;
  }, [rows, cols, grid, showGrid, gridColor, backgroundColor]);

  // Outer frame for hex grid
  const outerFrame = useMemo(() => {
    if (frameStyle === 'none') return null;

    // Calculate bounding box of all hexes
    const allVertices: { x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        allVertices.push(...getHexVertices(row, col, grid));
      }
    }

    if (allVertices.length === 0) return null;

    const minX = Math.min(...allVertices.map(v => v.x));
    const maxX = Math.max(...allVertices.map(v => v.x));
    const minY = Math.min(...allVertices.map(v => v.y));
    const maxY = Math.max(...allVertices.map(v => v.y));

    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    return (
      <rect
        x={minX - 2}
        y={minY - 2}
        width={maxX - minX + 4}
        height={maxY - minY + 4}
        fill="none"
        stroke={frameColor}
        strokeWidth={strokeWidth}
      />
    );
  }, [rows, cols, grid, frameStyle, frameColor]);

  return (
    <g className="grid-layer hex-grid">
      {cells}
      {outerFrame}
    </g>
  );
};

export const TriangleGrid: React.FC<NonSquareGridProps> = ({ grid }) => {
  const {
    rows,
    cols,
    showGrid,
    frameStyle,
    frameColor,
    gridColor,
    backgroundColor,
  } = grid;

  // Triangle grid has 2*cols triangles per row
  const triColsPerRow = cols * 2;

  const cells = useMemo(() => {
    if (!showGrid) return null;

    const elements: React.ReactElement[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < triColsPerRow; col++) {
        const vertices = getTriangleVertices(row, col, grid);
        const pathData = vertices
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`)
          .join(' ') + ' Z';

        elements.push(
          <path
            key={`tri-${row}-${col}`}
            d={pathData}
            fill={backgroundColor}
            stroke={gridColor}
            strokeWidth={1}
          />
        );
      }
    }

    return elements;
  }, [rows, triColsPerRow, grid, showGrid, gridColor, backgroundColor]);

  // Outer frame
  const outerFrame = useMemo(() => {
    if (frameStyle === 'none') return null;

    const allVertices: { x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < triColsPerRow; col++) {
        allVertices.push(...getTriangleVertices(row, col, grid));
      }
    }

    if (allVertices.length === 0) return null;

    const minX = Math.min(...allVertices.map(v => v.x));
    const maxX = Math.max(...allVertices.map(v => v.x));
    const minY = Math.min(...allVertices.map(v => v.y));
    const maxY = Math.max(...allVertices.map(v => v.y));

    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    return (
      <rect
        x={minX - 2}
        y={minY - 2}
        width={maxX - minX + 4}
        height={maxY - minY + 4}
        fill="none"
        stroke={frameColor}
        strokeWidth={strokeWidth}
      />
    );
  }, [rows, triColsPerRow, grid, frameStyle, frameColor]);

  return (
    <g className="grid-layer triangle-grid">
      {cells}
      {outerFrame}
    </g>
  );
};

export const PyramidGrid: React.FC<NonSquareGridProps> = ({ grid }) => {
  const {
    rows,
    showGrid,
    frameStyle,
    frameColor,
    gridColor,
    backgroundColor,
  } = grid;

  const cells = useMemo(() => {
    if (!showGrid) return null;

    const elements: React.ReactElement[] = [];

    for (let row = 0; row < rows; row++) {
      const colsInRow = getPyramidRowCols(row);
      for (let col = 0; col < colsInRow; col++) {
        const vertices = getPyramidVertices(row, col, grid);
        const pathData = vertices
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`)
          .join(' ') + ' Z';

        elements.push(
          <path
            key={`pyr-${row}-${col}`}
            d={pathData}
            fill={backgroundColor}
            stroke={gridColor}
            strokeWidth={1}
          />
        );
      }
    }

    return elements;
  }, [rows, grid, showGrid, gridColor, backgroundColor]);

  // Outer frame - triangular shape
  const outerFrame = useMemo(() => {
    if (frameStyle === 'none') return null;

    const allVertices: { x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) {
      const colsInRow = getPyramidRowCols(row);
      for (let col = 0; col < colsInRow; col++) {
        allVertices.push(...getPyramidVertices(row, col, grid));
      }
    }

    if (allVertices.length === 0) return null;

    const minX = Math.min(...allVertices.map(v => v.x));
    const maxX = Math.max(...allVertices.map(v => v.x));
    const minY = Math.min(...allVertices.map(v => v.y));
    const maxY = Math.max(...allVertices.map(v => v.y));

    const strokeWidth = frameStyle === 'thick' ? 4 : 2;

    // For pyramid, draw a triangular frame
    const centerX = (minX + maxX) / 2;

    return (
      <polygon
        points={`${centerX},${minY - 4} ${maxX + 4},${maxY + 4} ${minX - 4},${maxY + 4}`}
        fill="none"
        stroke={frameColor}
        strokeWidth={strokeWidth}
      />
    );
  }, [rows, grid, frameStyle, frameColor]);

  return (
    <g className="grid-layer pyramid-grid">
      {cells}
      {outerFrame}
    </g>
  );
};
