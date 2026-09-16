import React, { useCallback } from 'react';
import { screenToSvg } from '../utils/gridUtils';
import type { Point } from '../types';

interface UseCanvasPointOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  zoom: number;
  panX: number;
  panY: number;
  exportPaddingLeft?: number;
  exportPaddingTop?: number;
}

export function useCanvasPoint({
  svgRef,
  zoom,
  panX,
  panY,
  exportPaddingLeft = 0,
  exportPaddingTop = 0,
}: UseCanvasPointOptions) {
  return useCallback(
    (clientX: number, clientY: number): Point => {
      const coordinates = svgRef.current?.querySelector<SVGGElement>('[data-board-coordinates]');
      const matrix = coordinates?.getScreenCTM();
      if (matrix) {
        const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
        return { x: point.x, y: point.y };
      }
      return screenToSvg(
        clientX,
        clientY,
        zoom,
        panX,
        panY,
        svgRef.current,
        exportPaddingLeft,
        exportPaddingTop
      );
    },
    [zoom, panX, panY, exportPaddingLeft, exportPaddingTop, svgRef]
  );
}
