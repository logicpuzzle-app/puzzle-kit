import React, { useEffect } from 'react';
import type { RefObject } from 'react';
import { NumberInputPanel } from './properties/NumberInputPanel';
import { useNumberPadPanel } from '../../hooks/useNumberPadPanel';

interface FloatingNumberPadProps {
  show: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  anchorRef: RefObject<HTMLDivElement | null>;
  title: string;
  resizeMinWidth?: number;
}

export const FloatingNumberPad: React.FC<FloatingNumberPadProps> = ({
  show,
  rootRef,
  anchorRef,
  title,
  resizeMinWidth,
}) => {
  const {
    panelPosition,
    panelSize,
    panelHeaderRef,
    panelBodyRef,
    panelContentRef,
    handleLayoutChange,
    handlePanelDragStart,
    handlePanelResizeStart,
    clampPanel,
  } = useNumberPadPanel({
    show,
    rootRef,
    anchorRef,
    resizeMinWidth,
  });

  useEffect(() => {
    if (!show) return;
    const handleResize = () => clampPanel();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPanel, show]);

  if (!show || !panelPosition) {
    return null;
  }

  return (
    <div
      className="absolute z-20 rounded-sm border border-office-border bg-white shadow-md flex flex-col"
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        width: panelSize.width,
        height: panelSize.height,
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-office-text-secondary bg-office-bg border-b border-office-border cursor-move touch-none select-none"
        ref={panelHeaderRef}
        onPointerDown={handlePanelDragStart}
      >
        <span>123</span>
        <span>{title}</span>
      </div>
      <div className="flex-1 overflow-auto p-2" ref={panelBodyRef}>
        <div ref={panelContentRef}>
          <NumberInputPanel onLayoutChange={handleLayoutChange} />
        </div>
      </div>
      <div
        className="absolute bottom-1 right-1 h-3 w-3 border-b border-r border-office-border cursor-se-resize touch-none"
        onPointerDown={handlePanelResizeStart}
        role="presentation"
      />
    </div>
  );
};
