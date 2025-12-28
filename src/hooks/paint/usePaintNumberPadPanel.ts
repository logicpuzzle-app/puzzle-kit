import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { ToolSettings } from '../../types';
import type { InputMode } from '../../constraints/types';

type UsePaintNumberPadPanelArgs = {
  rootRef: React.RefObject<HTMLDivElement>;
  canvasWrapperRef: React.RefObject<HTMLDivElement>;
  toolSettings: ToolSettings;
  currentInputMode: InputMode | null;
  onWindowResize?: () => void;
};

export const usePaintNumberPadPanel = ({
  rootRef,
  canvasWrapperRef,
  toolSettings,
  currentInputMode,
  onWindowResize,
}: UsePaintNumberPadPanelArgs) => {
  const panelPositionRef = useRef<{ x: number; y: number } | null>(null);
  const panelSizeRef = useRef<{ width: number; height: number }>({ width: 260, height: 280 });
  const panelHeaderRef = useRef<HTMLDivElement | null>(null);
  const panelContentRef = useRef<HTMLDivElement | null>(null);
  const panelContentHeightRef = useRef(0);
  const dragStateRef = useRef<{
    type: 'drag' | 'resize';
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);

  const showNumberPad = toolSettings.currentTool.startsWith('number') ||
    currentInputMode === 'number' ||
    currentInputMode === 'number-' ||
    currentInputMode === 'direc';

  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({
    width: panelSizeRef.current.width,
    height: panelSizeRef.current.height,
  });

  useEffect(() => {
    panelPositionRef.current = panelPosition;
  }, [panelPosition]);

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  const clampPanelWithinBounds = useCallback(
    (pos: { x: number; y: number }, size: { width: number; height: number }) => {
      const container = rootRef.current;
      if (!container) return { position: pos, size };
      const rect = container.getBoundingClientRect();
      const margin = 12;
      const minWidth = 200;
      const minHeight = 220;
      const maxWidth = Math.max(minWidth, rect.width - margin * 2);
      const maxHeight = Math.max(minHeight, rect.height - margin * 2);

      const width = Math.min(Math.max(size.width, minWidth), maxWidth);
      const height = Math.min(Math.max(size.height, minHeight), maxHeight);
      const x = Math.min(Math.max(pos.x, margin), rect.width - width - margin);
      const y = Math.min(Math.max(pos.y, margin), rect.height - height - margin);
      return { position: { x, y }, size: { width, height } };
    },
    [rootRef]
  );

  const initializePanelLayout = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    if (rootRect.width === 0 || rootRect.height === 0) return;

    const canvasRect = canvasWrapperRef.current?.getBoundingClientRect();
    const anchorRect = canvasRect ?? rootRect;
    const margin = 12;
    const maxWidth = rootRect.width - margin * 2;
    const maxHeight = rootRect.height - margin * 2;
    const width = Math.min(280, Math.max(200, maxWidth));
    const height = Math.min(280, Math.max(220, maxHeight));
    const anchorX = anchorRect.left - rootRect.left + (anchorRect.width - width) / 2;
    const anchorY = anchorRect.top - rootRect.top + anchorRect.height - height - margin;

    const { position, size } = clampPanelWithinBounds({ x: anchorX, y: anchorY }, { width, height });
    setPanelSize(size);
    setPanelPosition(position);
  }, [canvasWrapperRef, clampPanelWithinBounds, rootRef]);

  useEffect(() => {
    if (!showNumberPad) return;
    if (!panelPositionRef.current) {
      initializePanelLayout();
      return;
    }
    const { position, size } = clampPanelWithinBounds(panelPositionRef.current, panelSizeRef.current);
    setPanelPosition(position);
    setPanelSize(size);
  }, [showNumberPad, clampPanelWithinBounds, initializePanelLayout]);

  const updatePanelHeight = useCallback(() => {
    if (!showNumberPad) return;
    const headerEl = panelHeaderRef.current;
    const contentEl = panelContentRef.current;
    if (!headerEl || !contentEl) return;
    const container = rootRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const margin = 12;
    const minHeight = 220;
    const maxHeight = Math.max(minHeight, rect.height - margin * 2);
    const autoMaxHeight = Math.min(maxHeight, Math.round(rect.height * 0.8));
    const headerHeight = headerEl.getBoundingClientRect().height;
    const extraHeight = 8;
    const bodyPadding = 16;
    const contentHeight = contentEl.scrollHeight;
    const previousContentHeight = panelContentHeightRef.current;
    panelContentHeightRef.current = contentHeight;
    if (contentHeight <= previousContentHeight + 1) return;
    const desiredHeight = Math.min(
      autoMaxHeight,
      Math.max(minHeight, headerHeight + bodyPadding + contentHeight + extraHeight)
    );

    if (desiredHeight <= panelSizeRef.current.height + 1) return;
    const origin = panelPositionRef.current ?? { x: margin, y: margin };
    const { position, size } = clampPanelWithinBounds(origin, {
      width: panelSizeRef.current.width,
      height: desiredHeight,
    });
    setPanelPosition(position);
    setPanelSize(size);
  }, [showNumberPad, clampPanelWithinBounds, rootRef]);

  useEffect(() => {
    if (showNumberPad) {
      panelContentHeightRef.current = 0;
    }
  }, [showNumberPad]);

  useEffect(() => {
    if (!showNumberPad) return;
    const frame = requestAnimationFrame(updatePanelHeight);
    return () => cancelAnimationFrame(frame);
  }, [showNumberPad, updatePanelHeight]);

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
      const margin = 12;

      if (dragState.type === 'drag') {
        const nextX = Math.min(Math.max(dragState.originX + dx, margin), rect.width - panelSizeRef.current.width - margin);
        const nextY = Math.min(Math.max(dragState.originY + dy, margin), rect.height - panelSizeRef.current.height - margin);
        setPanelPosition({ x: nextX, y: nextY });
        return;
      }

      const minWidth = 240;
      const minHeight = 220;
      const maxWidth = Math.max(minWidth, rect.width - dragState.originX - margin);
      const maxHeight = Math.max(minHeight, rect.height - dragState.originY - margin);
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
  }, [rootRef]);

  useEffect(() => {
    const handleResize = () => {
      onWindowResize?.();
      if (panelPositionRef.current) {
        const { position, size } = clampPanelWithinBounds(panelPositionRef.current, panelSizeRef.current);
        setPanelPosition(position);
        setPanelSize(size);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPanelWithinBounds, onWindowResize]);

  const handlePanelDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
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
  };

  const handlePanelResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
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
  };

  return {
    showNumberPad,
    panelPosition,
    panelSize,
    panelHeaderRef,
    panelContentRef,
    handlePanelDragStart,
    handlePanelResizeStart,
    updatePanelHeight,
  };
};
