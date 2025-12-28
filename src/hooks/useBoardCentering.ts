import { useCallback } from 'react';
import type { RefObject } from 'react';
import { getGridDimensions } from '../utils/gridUtils';
import type { GridConfig } from '../types';
import type { GridTopology } from '../utils/gridTopology';

interface UseBoardCenteringOptions {
  canvasWrapperRef: RefObject<HTMLDivElement | null>;
  grid: GridConfig;
  topology: GridTopology | null;
  useTopology: boolean;
  setPan: (panX: number, panY: number) => void;
  setZoom: (zoom: number) => void;
  getCurrentZoom: () => number;
}

export function useBoardCentering({
  canvasWrapperRef,
  grid,
  topology,
  useTopology,
  setPan,
  setZoom,
  getCurrentZoom,
}: UseBoardCenteringOptions) {
  const getBoardDimensions = useCallback(() => {
    const topologyPreferred =
      useTopology ||
      grid.gridType === 'pyramid' ||
      grid.gridType === 'iso' ||
      grid.gridType === 'penrose_P3';

    if (topologyPreferred && topology) {
      const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
      const exportPaddingRight = grid.exportPaddingRight ?? 0;
      const exportPaddingTop = grid.exportPaddingTop ?? 0;
      const exportPaddingBottom = grid.exportPaddingBottom ?? 0;
      return {
        width: topology.bounds.width + exportPaddingLeft + exportPaddingRight,
        height: topology.bounds.height + exportPaddingTop + exportPaddingBottom,
      };
    }

    return getGridDimensions(grid);
  }, [grid, topology, useTopology]);

  const centerBoard = useCallback(
    (forceFit: boolean) => {
      const container = canvasWrapperRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const { width, height } = getBoardDimensions();
      if (width === 0 || height === 0) return;

      const currentZoom = getCurrentZoom();
      let nextZoom = currentZoom;

      if (forceFit) {
        const fitZoom = Math.min(1, rect.width / width, rect.height / height);
        nextZoom = Math.max(0.1, Math.min(5, fitZoom));
        if (Math.abs(nextZoom - currentZoom) > 0.001) {
          setZoom(nextZoom);
        }
      }

      const zoomForPan = forceFit ? nextZoom : currentZoom;
      const panX = (rect.width - width * zoomForPan) / 2;
      const panY = (rect.height - height * zoomForPan) / 2;
      setPan(panX, panY);
    },
    [canvasWrapperRef, getBoardDimensions, getCurrentZoom, setPan, setZoom]
  );

  return { getBoardDimensions, centerBoard };
}
