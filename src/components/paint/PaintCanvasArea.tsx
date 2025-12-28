import React from 'react';
import { PuzzleCanvas } from '../canvas';
import type { TranslateFn, BoardResizeHandleType, ResizeHandleType } from './types';
import type { GridConfig } from '../../types';

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PaintCanvasAreaProps = {
  t: TranslateFn;
  canvasWrapperRef: React.RefObject<HTMLDivElement>;
  boardAdjustMode: boolean;
  hasImage: boolean;
  boardBounds: Bounds;
  grid: GridConfig;
  handleBoardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleBoardPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleBoardPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleBoardResizePointerDown: (handle: BoardResizeHandleType, event: React.PointerEvent<HTMLDivElement>) => void;
  handleBoardResizePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleBoardResizePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  imageAdjustMode: boolean;
  imageBounds: Bounds;
  handleImagePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleImagePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleImagePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleImageWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  handleResizePointerDown: (handle: ResizeHandleType, event: React.PointerEvent<HTMLDivElement>) => void;
  handleResizePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handleResizePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export const PaintCanvasArea: React.FC<PaintCanvasAreaProps> = ({
  t,
  canvasWrapperRef,
  boardAdjustMode,
  hasImage,
  boardBounds,
  grid,
  handleBoardPointerDown,
  handleBoardPointerMove,
  handleBoardPointerUp,
  handleBoardResizePointerDown,
  handleBoardResizePointerMove,
  handleBoardResizePointerUp,
  imageAdjustMode,
  imageBounds,
  handleImagePointerDown,
  handleImagePointerMove,
  handleImagePointerUp,
  handleImageWheel,
  handleResizePointerDown,
  handleResizePointerMove,
  handleResizePointerUp,
}) => (
  <div ref={canvasWrapperRef} className="flex-1 min-h-0 flex flex-col relative">
    <PuzzleCanvas allowMultiTouchPanZoom={false} />
    {boardAdjustMode && hasImage && (
      <div
        className="absolute inset-0 cursor-move"
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerLeave={handleBoardPointerUp}
        role="presentation"
      />
    )}
    {boardAdjustMode && hasImage && (
      <div className="absolute inset-0 pointer-events-none">
        {(() => {
          if (boardBounds.width <= 0 || boardBounds.height <= 0) return null;
          const isSquareGrid = grid.gridType === 'square' || !grid.gridType;
          const totalRows = grid.rows + (grid.marginTop ?? 0) + (grid.marginBottom ?? 0);
          const totalCols = grid.cols + (grid.marginLeft ?? 0) + (grid.marginRight ?? 0);
          const cellWidth = totalCols > 0 ? boardBounds.width / totalCols : 0;
          const cellHeight = totalRows > 0 ? boardBounds.height / totalRows : 0;
          const handleSize = 18;
          const baseClassName =
            'pointer-events-auto absolute rounded-sm border border-office-accent bg-white/90 text-[10px] text-office-text-secondary flex items-center justify-center shadow-sm';
          const handles: Array<{
            id: BoardResizeHandleType;
            left: number;
            top: number;
            className: string;
            label: string;
          }> = [
            {
              id: 'nw',
              left: boardBounds.x - handleSize / 2,
              top: boardBounds.y - handleSize / 2,
              className: `${baseClassName} cursor-nwse-resize`,
              label: '↖',
            },
            {
              id: 'n',
              left: boardBounds.x + boardBounds.width / 2 - handleSize / 2,
              top: boardBounds.y - handleSize / 2,
              className: `${baseClassName} cursor-ns-resize`,
              label: '↕',
            },
            {
              id: 'ne',
              left: boardBounds.x + boardBounds.width - handleSize / 2,
              top: boardBounds.y - handleSize / 2,
              className: `${baseClassName} cursor-nesw-resize`,
              label: '↗',
            },
            {
              id: 'w',
              left: boardBounds.x - handleSize / 2,
              top: boardBounds.y + boardBounds.height / 2 - handleSize / 2,
              className: `${baseClassName} cursor-ew-resize`,
              label: '↔',
            },
            {
              id: 'e',
              left: boardBounds.x + boardBounds.width - handleSize / 2,
              top: boardBounds.y + boardBounds.height / 2 - handleSize / 2,
              className: `${baseClassName} cursor-ew-resize`,
              label: '↔',
            },
            {
              id: 'sw',
              left: boardBounds.x - handleSize / 2,
              top: boardBounds.y + boardBounds.height - handleSize / 2,
              className: `${baseClassName} cursor-nesw-resize`,
              label: '↙',
            },
            {
              id: 's',
              left: boardBounds.x + boardBounds.width / 2 - handleSize / 2,
              top: boardBounds.y + boardBounds.height - handleSize / 2,
              className: `${baseClassName} cursor-ns-resize`,
              label: '↕',
            },
            {
              id: 'se',
              left: boardBounds.x + boardBounds.width - handleSize / 2,
              top: boardBounds.y + boardBounds.height - handleSize / 2,
              className: `${baseClassName} cursor-nwse-resize`,
              label: '↘',
            },
          ];

          return (
            <>
              <div
                className="absolute rounded-sm border-2 border-office-accent/70 bg-office-accent/10 box-border"
                style={{
                  left: boardBounds.x,
                  top: boardBounds.y,
                  width: boardBounds.width,
                  height: boardBounds.height,
                }}
              />
              {isSquareGrid && totalCols > 0 && totalRows > 0 && (
                <svg
                  className="absolute pointer-events-none text-office-accent"
                  style={{
                    left: boardBounds.x,
                    top: boardBounds.y,
                    width: boardBounds.width,
                    height: boardBounds.height,
                  }}
                  viewBox={`0 0 ${boardBounds.width} ${boardBounds.height}`}
                  preserveAspectRatio="none"
                  shapeRendering="crispEdges"
                >
                  {Array.from({ length: Math.max(0, totalCols - 1) }).map((_, index) => {
                    const x = (index + 1) * cellWidth;
                    return (
                      <line
                        key={`col-${index}`}
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={boardBounds.height}
                        stroke="currentColor"
                        strokeWidth={1}
                        opacity={0.35}
                      />
                    );
                  })}
                  {Array.from({ length: Math.max(0, totalRows - 1) }).map((_, index) => {
                    const y = (index + 1) * cellHeight;
                    return (
                      <line
                        key={`row-${index}`}
                        x1={0}
                        y1={y}
                        x2={boardBounds.width}
                        y2={y}
                        stroke="currentColor"
                        strokeWidth={1}
                        opacity={0.35}
                      />
                    );
                  })}
                </svg>
              )}
              {handles.map((handle) => (
                <div
                  key={handle.id}
                  className={handle.className}
                  style={{ width: handleSize, height: handleSize, left: handle.left, top: handle.top }}
                  onPointerDown={(event) => handleBoardResizePointerDown(handle.id, event)}
                  onPointerMove={handleBoardResizePointerMove}
                  onPointerUp={handleBoardResizePointerUp}
                  onPointerLeave={handleBoardResizePointerUp}
                  role="presentation"
                  title={t('grid.cellSize')}
                >
                  {handle.label}
                </div>
              ))}
            </>
          );
        })()}
      </div>
    )}
    {imageAdjustMode && (
      <div
        className={`absolute inset-0 ${hasImage ? 'cursor-move' : ''}`}
        onPointerDown={handleImagePointerDown}
        onPointerMove={handleImagePointerMove}
        onPointerUp={handleImagePointerUp}
        onPointerLeave={handleImagePointerUp}
        onWheel={handleImageWheel}
        role="presentation"
      />
    )}
    {imageAdjustMode && hasImage && (
      <div className="absolute inset-0 pointer-events-none">
        {(() => {
          const handleSize = 18;
          const baseClassName =
            'pointer-events-auto absolute rounded-sm border border-office-border bg-white/80 text-[10px] text-office-text-secondary flex items-center justify-center shadow-sm';
          const handles: Array<{
            id: ResizeHandleType;
            left: number;
            top: number;
            className: string;
            label: string;
          }> = [
            {
              id: 'nw',
              left: imageBounds.x - handleSize / 2,
              top: imageBounds.y - handleSize / 2,
              className: `${baseClassName} cursor-nwse-resize`,
              label: '↖',
            },
            {
              id: 'ne',
              left: imageBounds.x + imageBounds.width - handleSize / 2,
              top: imageBounds.y - handleSize / 2,
              className: `${baseClassName} cursor-nesw-resize`,
              label: '↗',
            },
            {
              id: 'sw',
              left: imageBounds.x - handleSize / 2,
              top: imageBounds.y + imageBounds.height - handleSize / 2,
              className: `${baseClassName} cursor-nesw-resize`,
              label: '↙',
            },
            {
              id: 'se',
              left: imageBounds.x + imageBounds.width - handleSize / 2,
              top: imageBounds.y + imageBounds.height - handleSize / 2,
              className: `${baseClassName} cursor-nesw-resize`,
              label: '↘',
            },
          ];

          return handles.map((handle) => (
            <div
              key={handle.id}
              className={handle.className}
              style={{ width: handleSize, height: handleSize, left: handle.left, top: handle.top }}
              onPointerDown={(event) => handleResizePointerDown(handle.id, event)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerLeave={handleResizePointerUp}
              role="presentation"
              title={t('grid.scale')}
            >
              {handle.label}
            </div>
          ));
        })()}
      </div>
    )}
  </div>
);
