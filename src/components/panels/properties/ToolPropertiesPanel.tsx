/**
 * Tool properties panel - line style, symbol size, rotation, etc.
 */

import React from 'react';
import { SymbolSizePanel } from './SymbolSizePanel';
import { useTranslation } from 'react-i18next';
import { X, GitMerge, Minus, Scissors } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import { LineStyle, LineThickness, LineElement, toDataLayer } from '../../../types';
import { isLineToolCategory } from '../../../utils/lineRender';
import { getEditableDataLayer } from '../../../utils/editPolicy';
import {
  ColorSelector,
  NumberPositionSettings,
  ArrowDirectionSettings,
  NumberInputPanel,
  FreehandLineList,
  FreeLineList,
} from '.';

export const ToolPropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    highlightedLineIds,
    puzzle,
    activeLayer,
    isPlayerMode,
    updateLine,
    setHighlightedLineIds,
    groupSelectedLinesByConnectivity,
    groupSelectedLinesByCollinearity,
    removeLineGroup,
  } = usePuzzleStore();
  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);
  const dataLayer = editableLayer ?? toDataLayer(activeLayer);
  const canEdit = Boolean(editableLayer);

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

  // Check if any selected lines belong to a group
  const lineGroups = puzzle[dataLayer].lineGroups;
  const selectedLineGroups = React.useMemo(() => {
    const groups = new Set<string>();
    if (!lineGroups) return groups;
    for (const lineId of highlightedLineIds) {
      // Check all groups to find if this line belongs to any
      for (const group of Object.values(lineGroups)) {
        if (group.lineIds.includes(lineId)) {
          groups.add(group.id);
          break;
        }
      }
    }
    return groups;
    // Use puzzle[dataLayer] to ensure re-computation when lineGroups changes
  }, [highlightedLineIds, puzzle, dataLayer]);
  const hasGroupedLines = selectedLineGroups.size > 0;

  // Handle ungroup - remove selected lines from their groups
  const handleUngroup = () => {
    if (!canEdit) return;
    selectedLineGroups.forEach(groupId => {
      removeLineGroup(groupId);
    });
  };

  // Handle style change - update both toolSettings and selected lines
  const handleStyleChange = (style: LineStyle) => {
    setToolSettings({ lineStyle: style });
    if (canEdit && hasSelectedLines) {
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
    if (canEdit && hasSelectedLines) {
      highlightedLineIds.forEach(id => {
        const line = puzzle[dataLayer].lines[id];
        if (line && !line.isFree) {
          updateLine(id, { thickness });
        }
      });
    }
  };

  // Handle directed change - update both toolSettings and selected lines
  // When changing from undirected to directed, auto-group selected lines
  const handleDirectedChange = (directed: 'endpoint' | 'midpoint' | 'both' | undefined) => {
    setToolSettings({ lineDirected: directed });

    if (!canEdit) return;

    // Check if any selected line is currently undirected (before updating)
    const hasUndirectedLines = selectedLines.some(line => !line.directed);
    const shouldAutoGroup = hasUndirectedLines && directed && selectedLines.length >= 2;

    // Save line IDs before any state changes
    const lineIdsToGroup = [...highlightedLineIds];

    // Update all selected lines with directed property only
    // arrowDirection will be computed during grouping based on chain order
    if (hasSelectedLines) {
      highlightedLineIds.forEach(id => {
        const line = puzzle[dataLayer].lines[id];
        if (line && !line.isFree) {
          updateLine(id, { directed });
        }
      });
    }

    // Auto-group when switching from undirected to directed (2+ lines)
    // This also computes correct arrowDirection for each line based on chain traversal
    if (shouldAutoGroup) {
      // midpoint: group by collinearity (same direction)
      // endpoint/both: group by connectivity (any direction)
      if (directed === 'midpoint') {
        groupSelectedLinesByCollinearity(lineIdsToGroup);
      } else {
        groupSelectedLinesByConnectivity(lineIdsToGroup);
      }
    } else if (hasUndirectedLines && directed && selectedLines.length === 1) {
      // Single line: set default arrowDirection to 'forward'
      const lineId = highlightedLineIds[0];
      if (lineId) {
        updateLine(lineId, { arrowDirection: 'forward' });
      }
    }
  };

  // Handle arrow direction change - update both toolSettings and selected lines
  const handleArrowDirectionChange = (arrowDirection: 'forward' | 'backward') => {
    setToolSettings({ lineArrowDirection: arrowDirection });
    if (canEdit && hasSelectedLines) {
      highlightedLineIds.forEach(id => {
        const line = puzzle[dataLayer].lines[id];
        if (line && !line.isFree) {
          updateLine(id, { arrowDirection });
        }
      });
    }
  };

  // Flip arrow direction for each selected line individually
  const handleFlipArrowDirection = () => {
    // Flip toolSettings direction
    const newToolDirection = toolSettings.lineArrowDirection === 'backward' ? 'forward' : 'backward';
    setToolSettings({ lineArrowDirection: newToolDirection });

    // Flip each selected line's direction individually
    if (canEdit && hasSelectedLines) {
      highlightedLineIds.forEach(id => {
        const line = puzzle[dataLayer].lines[id];
        if (line && !line.isFree) {
          const currentDirection = line.arrowDirection || 'forward';
          const flippedDirection = currentDirection === 'backward' ? 'forward' : 'backward';
          updateLine(id, { arrowDirection: flippedDirection });
        }
      });
    }
  };

  // Line style/thickness visual configs
  const lineStyles: { value: LineStyle; dashArray?: string; isDouble?: boolean }[] = [
    { value: 'solid' },
    { value: 'dashed', dashArray: '6,3' },
    { value: 'dotted', dashArray: '2,3' },
    { value: 'double', isDouble: true },
  ];

  const lineThicknesses: { value: LineThickness; strokeWidth: number }[] = [
    { value: 'thinnest', strokeWidth: 1 },
    { value: 'thin', strokeWidth: 2 },
    { value: 'normal', strokeWidth: 3 },
    { value: 'thick', strokeWidth: 5 },
    { value: 'thickest', strokeWidth: 8 },
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

  const isLineTool = isLineToolCategory(toolSettings.currentCategory);

  return (
    <>
      {/* Color Selection - show for most tools except select */}
      {toolSettings.currentCategory !== 'select' && (
        <>
          {/* Selection alert inline with color selector - always reserve space for line tools */}
          {isLineTool && (
            <div className="flex items-center gap-1 mb-1 h-5">
              {hasSelectedLines ? (
                <>
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
                </>
              ) : null}
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
          {/* Line Style - SVG samples (no label) */}
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
                    {style.isDouble ? (
                      <>
                        <line
                          x1="6"
                          y1="9"
                          x2="54"
                          y2="9"
                          stroke={isActive ? '#0078d4' : '#333'}
                          strokeWidth="2"
                        />
                        <line
                          x1="6"
                          y1="15"
                          x2="54"
                          y2="15"
                          stroke={isActive ? '#0078d4' : '#333'}
                          strokeWidth="2"
                        />
                      </>
                    ) : (
                      <line
                        x1="6"
                        y1="12"
                        x2="54"
                        y2="12"
                        stroke={isActive ? '#0078d4' : '#333'}
                        strokeWidth="2"
                        strokeDasharray={style.dashArray}
                      />
                    )}
                  </svg>
                </button>
              );
            })}
          </div>

          {/* Line Thickness - SVG samples (no label) */}
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

          {/* Arrow style - toggle buttons (no label) */}
          <div className="flex gap-0.5">
            {/* Undirected */}
            <button
              className={`flex-1 h-6 border rounded-sm transition-colors ${
                !toolSettings.lineDirected
                  ? 'bg-office-accent/10 border-office-accent border-2'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleDirectedChange(undefined)}
              title={t('prop.undirected', 'Undirected')}
            >
              <svg width="100%" height="100%" viewBox="0 0 32 24" preserveAspectRatio="xMidYMid meet">
                <line x1="5" y1="12" x2="27" y2="12" stroke={!toolSettings.lineDirected ? '#0078d4' : '#333'} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {/* Midpoint arrow */}
            <button
              className={`flex-1 h-6 border rounded-sm transition-colors ${
                toolSettings.lineDirected === 'midpoint'
                  ? 'bg-office-accent/10 border-office-accent border-2'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleDirectedChange('midpoint')}
              title={t('prop.midpointArrow', 'Midpoint Arrow')}
            >
              <svg width="100%" height="100%" viewBox="0 0 32 24" preserveAspectRatio="xMidYMid meet">
                <line x1="5" y1="12" x2="27" y2="12" stroke={toolSettings.lineDirected === 'midpoint' ? '#0078d4' : '#333'} strokeWidth="2" strokeLinecap="round" />
                <polygon points="20,12 14,7 14,17" fill={toolSettings.lineDirected === 'midpoint' ? '#0078d4' : '#333'} />
              </svg>
            </button>
            {/* Endpoint arrow */}
            <button
              className={`flex-1 h-6 border rounded-sm transition-colors ${
                toolSettings.lineDirected === 'endpoint'
                  ? 'bg-office-accent/10 border-office-accent border-2'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleDirectedChange('endpoint')}
              title={t('prop.endpointArrow', 'Endpoint Arrow')}
            >
              <svg width="100%" height="100%" viewBox="0 0 32 24" preserveAspectRatio="xMidYMid meet">
                <line x1="5" y1="12" x2="27" y2="12" stroke={toolSettings.lineDirected === 'endpoint' ? '#0078d4' : '#333'} strokeWidth="2" strokeLinecap="round" />
                <polygon points="27,12 21,7 21,17" fill={toolSettings.lineDirected === 'endpoint' ? '#0078d4' : '#333'} />
              </svg>
            </button>
            {/* Both ends arrow (bidirectional) */}
            <button
              className={`flex-1 h-6 border rounded-sm transition-colors ${
                toolSettings.lineDirected === 'both'
                  ? 'bg-office-accent/10 border-office-accent border-2'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleDirectedChange('both')}
              title={t('prop.bothArrow', 'Both Ends Arrow')}
            >
              <svg width="100%" height="100%" viewBox="0 0 32 24" preserveAspectRatio="xMidYMid meet">
                <line x1="5" y1="12" x2="27" y2="12" stroke={toolSettings.lineDirected === 'both' ? '#0078d4' : '#333'} strokeWidth="2" strokeLinecap="round" />
                <polygon points="5,12 11,7 11,17" fill={toolSettings.lineDirected === 'both' ? '#0078d4' : '#333'} />
                <polygon points="27,12 21,7 21,17" fill={toolSettings.lineDirected === 'both' ? '#0078d4' : '#333'} />
              </svg>
            </button>
          </div>

          {/* Reverse direction & Grouping buttons - only show when directed */}
          {toolSettings.lineDirected && (
            <div className="flex items-center gap-1">
              {/* Reverse direction button (flip arrows on selected lines) */}
              <button
                className="h-6 px-2 border rounded-sm transition-colors bg-white border-office-border hover:bg-office-ribbon-hover flex items-center gap-1"
                onClick={handleFlipArrowDirection}
                title={t('prop.reverseDirection', 'Reverse Direction')}
              >
                <svg width="20" height="16" viewBox="0 0 20 16" preserveAspectRatio="xMidYMid meet">
                  {/* Horizontal flip/reverse icon */}
                  <path d="M2 4 L6 1 L6 3 L10 3 L10 5 L6 5 L6 7 Z" fill="#333" />
                  <path d="M18 12 L14 15 L14 13 L10 13 L10 11 L14 11 L14 9 Z" fill="#333" />
                </svg>
              </button>

              {/* Grouping buttons - show when 2+ lines selected */}
              {selectedLines.length >= 2 && (
                <>
                  {/* Group by connectivity (any direction) - merge/branch icon */}
                  <button
                    className={`h-6 px-1.5 border rounded-sm transition-colors flex items-center ${
                      canEdit ? 'bg-white border-office-border hover:bg-office-ribbon-hover' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (!canEdit) return;
                      groupSelectedLinesByConnectivity(highlightedLineIds);
                    }}
                    disabled={!canEdit}
                    title={t('tool.line.group.connected', '連続でグループ化')}
                  >
                    <GitMerge size={14} />
                  </button>
                  {/* Group by collinearity (same direction) - straight line icon */}
                  <button
                    className={`h-6 px-1.5 border rounded-sm transition-colors flex items-center ${
                      canEdit ? 'bg-white border-office-border hover:bg-office-ribbon-hover' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (!canEdit) return;
                      groupSelectedLinesByCollinearity(highlightedLineIds);
                    }}
                    disabled={!canEdit}
                    title={t('tool.line.group.collinear', '同方向&連続でグループ化')}
                  >
                    <Minus size={14} />
                  </button>
                </>
              )}

              {/* Ungroup button - show when any selected lines are in a group */}
              {hasGroupedLines && (
                <button
                  className={`h-6 px-1.5 border rounded-sm transition-colors flex items-center ${
                    canEdit ? 'bg-white border-office-border hover:bg-office-ribbon-hover' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={handleUngroup}
                  disabled={!canEdit}
                  title={t('tool.line.group.ungroup', 'グループ解除')}
                >
                  <Scissors size={14} />
                </button>
              )}
            </div>
          )}

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

      {toolSettings.currentCategory === 'symbol' && <SymbolSizePanel />}

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

    </>
  );
};
