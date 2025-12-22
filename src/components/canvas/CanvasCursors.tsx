/**
 * CanvasCursors - Renders cursor overlays and previews on the canvas
 *
 * This component handles:
 * - Hover cell cursor (rectangle/polygon)
 * - Line tool cursor and preview line
 * - Symbol tool cursor
 * - Selection rectangle
 * - Merge mode preview
 * - Split mode preview
 * - Sculpt mode hexagon cursor
 * - Number tool cell cursor
 */

import React from 'react';
import type { Point } from '../../types';

interface CanvasCursorsProps {
  canvas: {
    zoom: number;
    panX: number;
    panY: number;
  };
  // Hover cell
  hoverCellPolygon: string | null;
  hoverCellRect: { x: number; y: number; size: number } | null;
  // Cursor cell (last tapped cell for direction panel)
  cursorCellPolygon: string | null;
  cursorCellRect: { x: number; y: number; size: number } | null;
  // Line tool
  lineStartPoint: Point | null;
  lineHoverPoint: Point | null;
  isLineTool: boolean;
  lineColor: string;
  isStraightMode: boolean;
  // Symbol tool
  symbolHoverPoint: Point | null;
  isSymbolTool: boolean;
  // Number tool cursor
  cellCursorPath: string | null;
  // Selection
  isSelecting: boolean;
  selectionRect: { startX: number; startY: number; endX: number; endY: number } | null;
  // Merge mode
  mergingCellsPolygons: { cellId: string; points: string }[];
  // Split mode
  splitPreview: {
    startPos: Point;
    endPos: Point | null;
  } | null;
  splitHoverVertexPos: Point | null;
  // Sculpt mode
  sculptHoverPolygons: { id: string; points: string }[] | null;
}

export const CanvasCursors: React.FC<CanvasCursorsProps> = ({
  canvas,
  hoverCellPolygon,
  hoverCellRect,
  cursorCellPolygon,
  cursorCellRect,
  lineStartPoint,
  lineHoverPoint,
  isLineTool,
  lineColor,
  isStraightMode,
  symbolHoverPoint,
  isSymbolTool,
  cellCursorPath,
  isSelecting,
  selectionRect,
  mergingCellsPolygons,
  splitPreview,
  splitHoverVertexPos,
  sculptHoverPolygons,
}) => {
  return (
    <>
      {/* Cell cursor for number tools (Excel-like highlight) */}
      {cellCursorPath && (
        <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
          <path d={cellCursorPath} fill="none" stroke="#2563eb" strokeWidth={3 / canvas.zoom} />
        </g>
      )}

      {/* Cursor cell (last tapped) - stronger highlight */}
      <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {/* Topology mode: polygon cursor */}
        {cursorCellPolygon && (
          <polygon
            points={cursorCellPolygon}
            fill="rgba(255, 140, 0, 0.25)"
            stroke="rgba(255, 140, 0, 0.95)"
            strokeWidth={3 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Standard mode: rectangle cursor */}
        {cursorCellRect && (
          <rect
            x={cursorCellRect.x}
            y={cursorCellRect.y}
            width={cursorCellRect.size}
            height={cursorCellRect.size}
            fill="rgba(255, 140, 0, 0.25)"
            stroke="rgba(255, 140, 0, 0.95)"
            strokeWidth={3 / canvas.zoom}
            pointerEvents="none"
          />
        )}
      </g>

      {/* Hover cell cursor - must be in transformed space */}
      <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {/* Topology mode: polygon cursor */}
        {hoverCellPolygon && (
          <polygon
            points={hoverCellPolygon}
            fill="rgba(0, 120, 215, 0.1)"
            stroke="rgba(0, 120, 215, 0.5)"
            strokeWidth={1.5 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Standard mode: rectangle cursor */}
        {hoverCellRect && (
          <rect
            x={hoverCellRect.x}
            y={hoverCellRect.y}
            width={hoverCellRect.size}
            height={hoverCellRect.size}
            fill="rgba(0, 120, 215, 0.1)"
            stroke="rgba(0, 120, 215, 0.5)"
            strokeWidth={1.5 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Line tool preview - line from start point to hover point */}
        {/* Straight mode (free segment): 70% opacity (line will be drawn) */}
        {/* Orthogonal/diagonal mode: 30% opacity (line may not be drawable) */}
        {lineStartPoint && lineHoverPoint && isLineTool && (
          <line
            x1={lineStartPoint.x}
            y1={lineStartPoint.y}
            x2={lineHoverPoint.x}
            y2={lineHoverPoint.y}
            stroke={lineColor}
            strokeWidth={2 / canvas.zoom}
            strokeOpacity={isStraightMode ? 0.7 : 0.3}
            pointerEvents="none"
          />
        )}
        {/* Line tool grid point cursor */}
        {lineHoverPoint && isLineTool && (
          <circle
            cx={lineHoverPoint.x}
            cy={lineHoverPoint.y}
            r={6 / canvas.zoom}
            fill="rgba(0, 120, 215, 0.3)"
            stroke="#0078d7"
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Symbol tool grid point cursor */}
        {symbolHoverPoint && isSymbolTool && (
          <circle
            cx={symbolHoverPoint.x}
            cy={symbolHoverPoint.y}
            r={8 / canvas.zoom}
            fill="rgba(76, 175, 80, 0.3)"
            stroke="#4caf50"
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        )}
      </g>

      {/* Selection rectangle overlay - in transformed space */}
      <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {isSelecting && selectionRect && (
          <rect
            x={Math.min(selectionRect.startX, selectionRect.endX)}
            y={Math.min(selectionRect.startY, selectionRect.endY)}
            width={Math.abs(selectionRect.endX - selectionRect.startX)}
            height={Math.abs(selectionRect.endY - selectionRect.startY)}
            fill="rgba(0, 120, 215, 0.1)"
            stroke="#0078d7"
            strokeWidth={1 / canvas.zoom}
            strokeDasharray={`${4 / canvas.zoom} ${2 / canvas.zoom}`}
            pointerEvents="none"
          />
        )}
      </g>

      {/* Merge mode: highlight cells being merged */}
      <g data-merge-preview="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {mergingCellsPolygons.map((cell, index) => (
          <polygon
            key={cell.cellId}
            points={cell.points}
            fill={index === 0 ? 'rgba(255, 152, 0, 0.4)' : 'rgba(255, 193, 7, 0.3)'}
            stroke={index === 0 ? '#ff9800' : '#ffc107'}
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        ))}
      </g>

      {/* Split mode: show line between vertices and hover cursor */}
      <g data-split-preview="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {/* Hover vertex cursor when not dragging */}
        {!splitPreview && splitHoverVertexPos && (
          <circle
            cx={splitHoverVertexPos.x}
            cy={splitHoverVertexPos.y}
            r={6 / canvas.zoom}
            fill="rgba(156, 39, 176, 0.3)"
            stroke="#9c27b0"
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Dragging preview */}
        {splitPreview && (
          <>
            {/* Start vertex indicator */}
            <circle
              cx={splitPreview.startPos.x}
              cy={splitPreview.startPos.y}
              r={8 / canvas.zoom}
              fill="rgba(156, 39, 176, 0.4)"
              stroke="#9c27b0"
              strokeWidth={2 / canvas.zoom}
              pointerEvents="none"
            />
            {/* Line to hover vertex */}
            {splitPreview.endPos && (
              <>
                <line
                  x1={splitPreview.startPos.x}
                  y1={splitPreview.startPos.y}
                  x2={splitPreview.endPos.x}
                  y2={splitPreview.endPos.y}
                  stroke="#9c27b0"
                  strokeWidth={2 / canvas.zoom}
                  strokeDasharray={`${4 / canvas.zoom} ${2 / canvas.zoom}`}
                  pointerEvents="none"
                />
                {/* End vertex indicator */}
                <circle
                  cx={splitPreview.endPos.x}
                  cy={splitPreview.endPos.y}
                  r={6 / canvas.zoom}
                  fill="rgba(156, 39, 176, 0.3)"
                  stroke="#9c27b0"
                  strokeWidth={2 / canvas.zoom}
                  pointerEvents="none"
                />
              </>
            )}
          </>
        )}
      </g>

      {/* Sculpt mode: 3-cell cluster highlight */}
      {sculptHoverPolygons && sculptHoverPolygons.length > 0 && (
        <g data-sculpt-preview="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
          {sculptHoverPolygons.map(({ id, points }) => (
            <polygon
              key={id}
              points={points}
              fill="rgba(255, 87, 34, 0.25)"
              stroke="#ff5722"
              strokeWidth={2 / canvas.zoom}
              pointerEvents="none"
            />
          ))}
        </g>
      )}
    </>
  );
};

export default CanvasCursors;
