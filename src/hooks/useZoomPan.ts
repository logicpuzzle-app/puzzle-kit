/**
 * useZoomPan - Hook for handling zoom and pan interactions
 */

import { useCallback, useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import type { Point } from '../types';

interface UseZoomPanOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export function useZoomPan({ svgRef }: UseZoomPanOptions) {
  const { canvas, setZoom, setPan } = usePuzzleStore();

  // Wheel handler (zoom/pan)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, canvas.zoom * delta));

        // Zoom toward mouse position
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const newPanX = mouseX - (mouseX - canvas.panX) * (newZoom / canvas.zoom);
          const newPanY = mouseY - (mouseY - canvas.panY) * (newZoom / canvas.zoom);

          setZoom(newZoom);
          setPan(newPanX, newPanY);
        }
      } else {
        // Pan
        setPan(canvas.panX - e.deltaX, canvas.panY - e.deltaY);
      }
    },
    [canvas.zoom, canvas.panX, canvas.panY, setZoom, setPan, svgRef]
  );

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        setZoom(canvas.zoom * 1.2);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom(canvas.zoom / 1.2);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan(0, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas.zoom, setZoom, setPan]);

  return {
    handleWheel,
    zoom: canvas.zoom,
    panX: canvas.panX,
    panY: canvas.panY,
    setZoom,
    setPan,
  };
}
