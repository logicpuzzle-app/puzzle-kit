/**
 * RibbonPickers - Tool setting picker components for the Ribbon toolbar
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { LineGridPoint, LineDirection } from '../../types';

// Text is entered in the cell dialog; avoid presenting inactive ribbon controls.
export const TextInputHint: React.FC = () => {
  const { t } = useTranslation();
  return <span className="text-xs text-office-text-secondary">{t('tool.text.editCellHint')}</span>;
};

// Line settings picker for line tools
export const LineSettingsPicker: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();

  const gridPoints: { id: LineGridPoint; icon: string; labelKey: string }[] = [
    { id: 'cell', icon: '⬤', labelKey: 'tool.line.gridPoint.cell' },
    { id: 'vertex', icon: '⊡', labelKey: 'tool.line.gridPoint.vertex' },
    { id: 'edge', icon: '─', labelKey: 'tool.line.gridPoint.edge' },
  ];

  const directions: { id: LineDirection; icon: string; labelKey: string }[] = [
    { id: 'orthogonal', icon: '┼', labelKey: 'tool.line.direction.orthogonal' },
    { id: 'diagonal', icon: '╳', labelKey: 'tool.line.direction.diagonal' },
    { id: 'straight', icon: '╱', labelKey: 'tool.line.direction.straight' },
    { id: 'freehand', icon: '〜', labelKey: 'tool.line.direction.freehand' },
  ];

  const toggleGridPoint = (point: LineGridPoint) => {
    const current = toolSettings.lineGridPoints || ['cell'];
    let newPoints: LineGridPoint[];

    if (current.includes(point)) {
      // Don't allow removing the last item
      if (current.length > 1) {
        newPoints = current.filter(p => p !== point);
      } else {
        return;
      }
    } else {
      newPoints = [...current, point];
    }
    setToolSettings({ lineGridPoints: newPoints });
  };

  const toggleDirection = (direction: LineDirection) => {
    const current = toolSettings.lineDirections || ['orthogonal'];
    let newDirections: LineDirection[];

    // 'freehand' is mutually exclusive with all other modes
    // 'straight' is mutually exclusive with 'orthogonal' and 'diagonal' (but allows only one straight line)
    const gridSnapModes: LineDirection[] = ['orthogonal', 'diagonal'];

    if (direction === 'freehand') {
      if (current.includes('freehand')) {
        // Switching from freehand to orthogonal
        newDirections = ['orthogonal'];
      } else {
        // Select freehand, deselect all others
        newDirections = ['freehand'];
      }
    } else if (direction === 'straight') {
      if (current.includes('straight')) {
        // Switching from straight to orthogonal
        newDirections = ['orthogonal'];
      } else {
        // Select straight, deselect all others
        newDirections = ['straight'];
      }
    } else {
      // orthogonal or diagonal selected
      if (current.includes('freehand') || current.includes('straight')) {
        // Was in special mode, switch to the selected grid-snap direction
        newDirections = [direction];
      } else if (current.includes(direction)) {
        // Don't allow removing the last item
        if (current.length > 1) {
          newDirections = current.filter(d => d !== direction);
        } else {
          return;
        }
      } else {
        // Add direction (only grid-snap modes can be combined)
        newDirections = [...current.filter(d => gridSnapModes.includes(d)), direction];
      }
    }
    setToolSettings({ lineDirections: newDirections });
  };

  const currentGridPoints = toolSettings.lineGridPoints || ['cell'];
  const currentDirections = toolSettings.lineDirections || ['orthogonal'];

  // Half mode availability logic:
  // Enabled when there's potential for lines between different types of grid points
  const hasCell = currentGridPoints.includes('cell');
  const hasVertex = currentGridPoints.includes('vertex');
  const hasEdge = currentGridPoints.includes('edge');
  const hasOrthogonal = currentDirections.includes('orthogonal');
  const hasDiagonal = currentDirections.includes('diagonal');
  const isSpecialMode = currentDirections.includes('freehand') || currentDirections.includes('straight');

  // Calculate if half mode should be available
  let isHalfModeAvailable = false;
  if (!isSpecialMode) {
    // Edge + Diagonal: allows lines between edge columns and rows
    if (hasEdge && hasDiagonal) {
      isHalfModeAvailable = true;
    }
    // Center + Vertex + Diagonal: allows lines between center and vertex
    if (hasCell && hasVertex && hasDiagonal) {
      isHalfModeAvailable = true;
    }
    // Center + Edge + Orthogonal: allows lines between center and edge
    if (hasCell && hasEdge && hasOrthogonal) {
      isHalfModeAvailable = true;
    }
    // Vertex + Edge + Orthogonal: allows lines between vertex and edge
    if (hasVertex && hasEdge && hasOrthogonal) {
      isHalfModeAvailable = true;
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Grid point type selector (multi-select toggle) */}
      <div className="flex flex-col items-center">
        <div className="flex gap-0.5 mb-1">
          {gridPoints.map((gp) => (
            <button
              key={gp.id}
              className={`px-2 py-1 text-xs border rounded-sm transition-colors ${
                currentGridPoints.includes(gp.id)
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => toggleGridPoint(gp.id)}
              title={t(gp.labelKey)}
            >
              <span className="text-base mr-1">{gp.icon}</span>
              <span>{t(gp.labelKey)}</span>
            </button>
          ))}
          {/* Half mode checkbox - always visible, disabled when not applicable */}
          <label
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-sm transition-colors ml-1 ${
              isHalfModeAvailable
                ? 'cursor-pointer hover:bg-office-ribbon-hover border-office-border'
                : 'cursor-not-allowed opacity-50 border-office-border bg-gray-50'
            }`}
            title={t('prop.halfMode')}
          >
            <input
              type="checkbox"
              checked={toolSettings.lineHalfMode || false}
              onChange={(e) => setToolSettings({ lineHalfMode: e.target.checked })}
              disabled={!isHalfModeAvailable}
              className="rounded border-office-border"
            />
            <span>{t('prop.halfMode')}</span>
          </label>
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('tool.line.gridPoints')}
        </span>
      </div>

      {/* Direction selector (multi-select toggle) */}
      <div className="flex flex-col items-center border-l border-office-border pl-4">
        <div className="flex gap-0.5 mb-1">
          {directions.map((dir) => (
            <button
              key={dir.id}
              className={`px-2 py-1 text-xs border rounded-sm transition-colors ${
                currentDirections.includes(dir.id)
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => toggleDirection(dir.id)}
              title={t(dir.labelKey)}
            >
              <span className="text-base mr-1">{dir.icon}</span>
              <span>{t(dir.labelKey)}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('tool.line.directions')}
        </span>
      </div>
    </div>
  );
};

// Symbol settings picker for symbol tools
export const SymbolSettingsPicker: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();

  const gridPoints: { id: LineGridPoint; icon: string; labelKey: string }[] = [
    { id: 'cell', icon: '⬤', labelKey: 'tool.line.gridPoint.cell' },
    { id: 'vertex', icon: '⊡', labelKey: 'tool.line.gridPoint.vertex' },
    { id: 'edge', icon: '─', labelKey: 'tool.line.gridPoint.edge' },
  ];

  const toggleGridPoint = (point: LineGridPoint) => {
    const current = toolSettings.symbolGridPoints || ['cell'];
    let newPoints: LineGridPoint[];

    if (current.includes(point)) {
      // Don't allow removing the last item
      if (current.length > 1) {
        newPoints = current.filter(p => p !== point);
      } else {
        return;
      }
    } else {
      newPoints = [...current, point];
    }
    setToolSettings({ symbolGridPoints: newPoints });
  };

  const currentGridPoints = toolSettings.symbolGridPoints || ['cell'];

  return (
    <div className="flex items-center gap-4 ml-4 border-l border-office-border pl-4">
      {/* Grid point type selector (multi-select toggle) */}
      <div className="flex flex-col items-center">
        <div className="flex gap-0.5 mb-1">
          {gridPoints.map((gp) => (
            <button
              key={gp.id}
              className={`px-2 py-1 text-xs border rounded-sm transition-colors ${
                currentGridPoints.includes(gp.id)
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => toggleGridPoint(gp.id)}
              title={t(gp.labelKey)}
            >
              <span className="text-base mr-1">{gp.icon}</span>
              <span>{t(gp.labelKey)}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('tool.symbol.gridPoints')}
        </span>
      </div>
    </div>
  );
};
