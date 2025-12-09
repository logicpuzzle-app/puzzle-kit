/**
 * Tool properties panel - line style, symbol size, rotation, etc.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { LineStyle, LineThickness, LineElement, toDataLayer } from '../../../types';
import {
  ColorSelector,
  MulticolorSettings,
  NumberPositionSettings,
  ArrowDirectionSettings,
  NumberInputPanel,
  FreehandLineList,
  FreeLineList,
} from '.';

export const ToolPropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings, highlightedLineIds, puzzle, activeLayer, updateLine, setHighlightedLineIds } = usePuzzleStore();
  const dataLayer = toDataLayer(activeLayer);

  // Get selected lines for property display/update
  const selectedLines = React.useMemo(() => {
    const layerData = puzzle[dataLayer];
    return highlightedLineIds
      .map(id => layerData.lines[id])
      .filter((line): line is LineElement => line !== undefined && !line.isFree);
  }, [puzzle, dataLayer, highlightedLineIds]);

  // Check if selected lines have consistent properties
  const hasSelectedLines = selectedLines.length > 0;
  const selectedLinesStyle = hasSelectedLines && selectedLines.every(l => l.style === selectedLines[0].style)
    ? selectedLines[0].style
    : null;
  const selectedLinesThickness = hasSelectedLines && selectedLines.every(l => l.thickness === selectedLines[0].thickness)
    ? selectedLines[0].thickness
    : null;

  // Handle style change - update both toolSettings and selected lines
  const handleStyleChange = (style: LineStyle) => {
    setToolSettings({ lineStyle: style });
    if (hasSelectedLines) {
      highlightedLineIds.forEach(id => {
        const line = puzzle[dataLayer].lines[id];
        if (line && !line.isFree) {
          updateLine(id, { style });
        }
      });
    }
  };

  // Handle thickness change - update both toolSettings and selected lines
  const handleThicknessChange = (thickness: LineThickness) => {
    setToolSettings({ lineThickness: thickness });
    if (hasSelectedLines) {
      highlightedLineIds.forEach(id => {
        const line = puzzle[dataLayer].lines[id];
        if (line && !line.isFree) {
          updateLine(id, { thickness });
        }
      });
    }
  };

  // Line style/thickness visual configs
  const lineStyles: { value: LineStyle; dashArray?: string }[] = [
    { value: 'solid' },
    { value: 'dashed', dashArray: '6,3' },
    { value: 'dotted', dashArray: '2,3' },
  ];

  const lineThicknesses: { value: LineThickness; strokeWidth: number }[] = [
    { value: 'thinnest', strokeWidth: 1 },
    { value: 'thin', strokeWidth: 2 },
    { value: 'normal', strokeWidth: 3 },
    { value: 'thick', strokeWidth: 5 },
    { value: 'thickest', strokeWidth: 8 },
  ];

  const sizes: { value: 'large' | 'medium' | 'small'; labelKey: string }[] = [
    { value: 'large', labelKey: 'size.large' },
    { value: 'medium', labelKey: 'size.medium' },
    { value: 'small', labelKey: 'size.small' },
  ];

  // Rotation controls for icon mode (not arrow/direction mode)
  const rotateSymbol = (delta: number) => {
    const next = (toolSettings.symbolRotation + delta) % 360;
    setToolSettings({ symbolRotation: next < 0 ? next + 360 : next });
  };

  const resetRotation = () => setToolSettings({ symbolRotation: 0 });

  // Show rotation controls only in icon submode (not arrow/direction)
  const showRotationControls = toolSettings.currentCategory === 'symbol' && toolSettings.symbolSubMode === 'icon';

  // Handle clearing selection
  const handleClearSelection = () => {
    setHighlightedLineIds([]);
  };

  // Get selected line color for inline display
  const selectedLinesColor = hasSelectedLines && selectedLines.every(l => l.color === selectedLines[0].color)
    ? selectedLines[0].color
    : null;

  const isLineToolCategory = toolSettings.currentCategory === 'line' ||
    toolSettings.currentCategory === 'edge' ||
    toolSettings.currentCategory === 'wall';

  return (
    <>
      {/* Color Selection - show for most tools except select */}
      {toolSettings.currentCategory !== 'select' && (
        <>
          {/* Selection alert inline with color selector */}
          {hasSelectedLines && isLineToolCategory && (
            <div className="flex items-center gap-1 mb-1">
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded">
                {t('tool.line.list.selected', '{{count}}件選択中', { count: selectedLines.length })}
              </span>
              <button
                className="text-orange-500 hover:text-orange-700 p-0.5"
                onClick={handleClearSelection}
                title={t('action.clearSelection', '選択解除')}
              >
                <X size={12} />
              </button>
            </div>
          )}
          <ColorSelector />
        </>
      )}

      {/* Line/Edge properties - visual SVG samples */}
      {(toolSettings.currentCategory === 'line' ||
        toolSettings.currentCategory === 'edge' ||
        toolSettings.currentCategory === 'wall') && (
        <>
          {/* Line Style - SVG samples */}
          <div>
            <label className="block text-[10px] text-office-text-secondary mb-1">
              {t('prop.style')}
            </label>
            <div className="flex gap-1">
              {lineStyles.map((style) => {
                const isActive = hasSelectedLines
                  ? selectedLinesStyle === style.value
                  : toolSettings.lineStyle === style.value;
                return (
                  <button
                    key={style.value}
                    className={`flex-1 h-6 border rounded-sm transition-colors ${
                      isActive
                        ? 'bg-office-accent/10 border-office-accent border-2'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => handleStyleChange(style.value)}
                    title={style.value}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 60 24" preserveAspectRatio="xMidYMid meet">
                      <line
                        x1="6"
                        y1="12"
                        x2="54"
                        y2="12"
                        stroke={isActive ? '#0078d4' : '#333'}
                        strokeWidth="2"
                        strokeDasharray={style.dashArray}
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Line Thickness - SVG samples */}
          <div>
            <label className="block text-[10px] text-office-text-secondary mb-1">
              {t('prop.thickness')}
            </label>
            <div className="flex gap-1">
              {lineThicknesses.map((thickness) => {
                const isActive = hasSelectedLines
                  ? selectedLinesThickness === thickness.value
                  : toolSettings.lineThickness === thickness.value;
                return (
                  <button
                    key={thickness.value}
                    className={`flex-1 h-6 border rounded-sm transition-colors ${
                      isActive
                        ? 'bg-office-accent/10 border-office-accent border-2'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => handleThicknessChange(thickness.value)}
                    title={thickness.value}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 32 24" preserveAspectRatio="xMidYMid meet">
                      <line
                        x1="4"
                        y1="12"
                        x2="28"
                        y2="12"
                        stroke={isActive ? '#0078d4' : '#333'}
                        strokeWidth={thickness.strokeWidth}
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Freehand line list - only show when in freehand mode */}
          {toolSettings.currentCategory === 'line' &&
            toolSettings.lineDirections?.includes('freehand') && (
              <FreehandLineList />
            )}

          {/* Free line list - show when in line category (not freehand) */}
          {toolSettings.currentCategory === 'line' &&
            !toolSettings.lineDirections?.includes('freehand') && (
              <FreeLineList />
            )}
        </>
      )}

      {/* Symbol size - toggle buttons */}
      {toolSettings.currentCategory === 'symbol' && (
        <div>
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('prop.size')}
          </label>
          <div className="flex gap-1">
            {sizes.map((size) => (
              <button
                key={size.value}
                className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                  toolSettings.symbolSize === size.value
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ symbolSize: size.value })}
              >
                {t(size.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rotation controls - only for icon submode */}
      {showRotationControls && (
        <div>
          <label className="block text-xs text-office-text-secondary mb-1">
            Rotation ({Math.round(toolSettings.symbolRotation)}°)
          </label>
          <div className="flex gap-1">
            <button
              className="flex-1 px-2 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => rotateSymbol(-15)}
              title="Rotate -15°"
            >
              -15°
            </button>
            <button
              className="flex-1 px-2 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={resetRotation}
              title="Reset rotation"
            >
              Reset
            </button>
            <button
              className="flex-1 px-2 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => rotateSymbol(15)}
              title="Rotate +15°"
            >
              +15°
            </button>
          </div>
        </div>
      )}

      {/* Number settings - size and position */}
      {toolSettings.currentCategory === 'number' && toolSettings.currentTool !== 'number-directional' && (
        <>
          <NumberPositionSettings />
          <NumberInputPanel />
        </>
      )}

      {/* Arrow direction settings and number input for directional numbers */}
      {toolSettings.currentTool === 'number-directional' && (
        <>
          <ArrowDirectionSettings />
          <NumberInputPanel />
        </>
      )}

      {/* Multicolor surface settings */}
      {toolSettings.currentTool === 'multicolor-surface' && (
        <MulticolorSettings />
      )}
    </>
  );
};
