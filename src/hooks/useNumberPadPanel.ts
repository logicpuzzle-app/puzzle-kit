import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

type PanelPosition = { x: number; y: number };
type PanelSize = { width: number; height: number };

interface DragState {
  type: 'drag' | 'resize';
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
}

interface UseNumberPadPanelOptions {
  show: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  anchorRef: RefObject<HTMLDivElement | null>;
  resizeMinWidth?: number;
  resizeMinHeight?: number;
}

const DEFAULT_SIZE: PanelSize = { width: 260, height: 280 };
const MIN_SIZE: PanelSize = { width: 200, height: 220 };
const PANEL_MARGIN = 12;

export function useNumberPadPanel({
  show,
  rootRef,
  anchorRef,
  resizeMinWidth = 240,
  resizeMinHeight = MIN_SIZE.height,
}: UseNumberPadPanelOptions) {
  const panelPositionRef = useRef<PanelPosition | null>(null);
  const panelSizeRef = useRef<PanelSize>({ ...DEFAULT_SIZE });
  const panelHeaderRef = useRef<HTMLDivElement | null>(null);
  const panelBodyRef = useRef<HTMLDivElement | null>(null);
  const panelContentRef = useRef<HTMLDivElement | null>(null);
  const panelContentHeightRef = useRef(0);
  const dragStateRef = useRef<DragState | null>(null);

  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const [panelSize, setPanelSize] = useState<PanelSize>({ ...DEFAULT_SIZE });

  useEffect(() => {
    panelPositionRef.current = panelPosition;
  }, [panelPosition]);

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  const clampPanelWithinBounds = useCallback((pos: PanelPosition, size: PanelSize) => {
    const container = rootRef.current;
    if (!container) return { position: pos, size };
    const rect = container.getBoundingClientRect();
    const maxWidth = Math.max(MIN_SIZE.width, rect.width - PANEL_MARGIN * 2);
    const maxHeight = Math.max(MIN_SIZE.height, rect.height - PANEL_MARGIN * 2);

    const width = Math.min(Math.max(size.width, MIN_SIZE.width), maxWidth);
    const height = Math.min(Math.max(size.height, MIN_SIZE.height), maxHeight);
    const x = Math.min(Math.max(pos.x, PANEL_MARGIN), rect.width - width - PANEL_MARGIN);
    const y = Math.min(Math.max(pos.y, PANEL_MARGIN), rect.height - height - PANEL_MARGIN);
    return { position: { x, y }, size: { width, height } };
  }, [rootRef]);

  const initializePanelLayout = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    if (rootRect.width === 0 || rootRect.height === 0) return;

    const anchorRect = anchorRef.current?.getBoundingClientRect() ?? rootRect;
    const maxWidth = rootRect.width - PANEL_MARGIN * 2;
    const maxHeight = rootRect.height - PANEL_MARGIN * 2;
    const width = Math.min(280, Math.max(MIN_SIZE.width, maxWidth));
    const height = Math.min(280, Math.max(MIN_SIZE.height, maxHeight));
    const anchorX = anchorRect.left - rootRect.left + (anchorRect.width - width) / 2;
    const anchorY = anchorRect.top - rootRect.top + anchorRect.height - height - PANEL_MARGIN;

    const { position, size } = clampPanelWithinBounds({ x: anchorX, y: anchorY }, { width, height });
    setPanelSize(size);
    setPanelPosition(position);
  }, [anchorRef, clampPanelWithinBounds, rootRef]);

  const updatePanelHeight = useCallback((contentHeight: number) => {
    if (!show) return;
    const headerEl = panelHeaderRef.current;
    if (!headerEl) return;
    const container = rootRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const maxHeight = Math.max(MIN_SIZE.height, rect.height - PANEL_MARGIN * 2);
    const autoMaxHeight = Math.min(maxHeight, Math.round(rect.height * 0.8));
    const headerHeight = headerEl.getBoundingClientRect().height;
    const bodyPadding = 16;
    const extraHeight = 8;
    const desiredHeight = Math.min(
      autoMaxHeight,
      Math.max(MIN_SIZE.height, headerHeight + bodyPadding + contentHeight + extraHeight)
    );

    if (desiredHeight <= panelSizeRef.current.height + 1) return;
    const origin = panelPositionRef.current ?? { x: PANEL_MARGIN, y: PANEL_MARGIN };
    const { position, size } = clampPanelWithinBounds(origin, {
      width: panelSizeRef.current.width,
      height: desiredHeight,
    });
    setPanelPosition(position);
    setPanelSize(size);
  }, [clampPanelWithinBounds, rootRef, show]);

  const handleLayoutChange = useCallback((height: number) => {
    panelContentHeightRef.current = height;
    updatePanelHeight(height);
  }, [updatePanelHeight]);

  useEffect(() => {
    if (!show) return;
    if (!panelPositionRef.current) {
      initializePanelLayout();
      return;
    }
    const { position, size } = clampPanelWithinBounds(panelPositionRef.current, panelSizeRef.current);
    setPanelPosition(position);
    setPanelSize(size);
  }, [show, clampPanelWithinBounds, initializePanelLayout]);

  useEffect(() => {
    if (!show) return;
    panelContentHeightRef.current = 0;
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const frame = requestAnimationFrame(() => {
      if (panelContentHeightRef.current > 0) {
        updatePanelHeight(panelContentHeightRef.current);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [show, updatePanelHeight]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const container = rootRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;

      if (dragState.type === 'drag') {
        const nextX = Math.min(Math.max(dragState.originX + dx, PANEL_MARGIN), rect.width - panelSizeRef.current.width - PANEL_MARGIN);
        const nextY = Math.min(Math.max(dragState.originY + dy, PANEL_MARGIN), rect.height - panelSizeRef.current.height - PANEL_MARGIN);
        setPanelPosition({ x: nextX, y: nextY });
        return;
      }

      const minWidth = Math.max(resizeMinWidth, MIN_SIZE.width);
      const minHeight = Math.max(resizeMinHeight, MIN_SIZE.height);
      const maxWidth = Math.max(minWidth, rect.width - dragState.originX - PANEL_MARGIN);
      const maxHeight = Math.max(minHeight, rect.height - dragState.originY - PANEL_MARGIN);
      const nextWidth = Math.min(Math.max(dragState.originWidth + dx, minWidth), maxWidth);
      const nextHeight = Math.min(Math.max(dragState.originHeight + dy, minHeight), maxHeight);
      setPanelSize({ width: nextWidth, height: nextHeight });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizeMinHeight, resizeMinWidth, rootRef]);

  const handlePanelDragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelPositionRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      type: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPositionRef.current.x,
      originY: panelPositionRef.current.y,
      originWidth: panelSizeRef.current.width,
      originHeight: panelSizeRef.current.height,
    };
  }, []);

  const handlePanelResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelPositionRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      type: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPositionRef.current.x,
      originY: panelPositionRef.current.y,
      originWidth: panelSizeRef.current.width,
      originHeight: panelSizeRef.current.height,
    };
  }, []);

  const clampPanel = useCallback(() => {
    if (!panelPositionRef.current) return;
    const { position, size } = clampPanelWithinBounds(panelPositionRef.current, panelSizeRef.current);
    setPanelPosition(position);
    setPanelSize(size);
  }, [clampPanelWithinBounds]);

  return {
    panelPosition,
    panelSize,
    panelHeaderRef,
    panelBodyRef,
    panelContentRef,
    handleLayoutChange,
    handlePanelDragStart,
    handlePanelResizeStart,
    clampPanel,
  };
}
