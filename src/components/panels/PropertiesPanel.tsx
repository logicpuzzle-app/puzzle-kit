/**
 * Properties panel - main container for property editors
 */

import { SurfaceTargetControl } from './properties/SurfaceTargetControl';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore, usePuzzleStoreApi } from '../../store/puzzleStoreContext';
import { SymbolPanel } from './SymbolPanel';
import { DirectionPanel } from './DirectionPanel';
import { constraintCatalog } from '../../constraints';
import { PropertiesPanelFrame } from './PropertiesPanelFrame';
import {
  SolverPanel,
  ConstraintPropertiesPanel,
  ToolPropertiesPanel,
  AutoModePanel,
  GridPropertiesPanel,
  NumberInputPanel,
  ArrowDirectionSettings,
  MulticolorSettings,
} from './properties';

export const PropertiesPanel: React.FC<{ suspended?: boolean }> = ({ suspended }) => {
  const { t } = useTranslation();
  const {
    toolSettings,
    activeLayer,
    currentSchemaId,
    showConstraintLayer,
    currentInputMode,
    isSolverMode,
    isSolving,
    solverStatus,
  } = usePuzzleStore();

  // Derived state
  const isGridMode = activeLayer === 'grid';
  const isSpecificMode = activeLayer === 'constraint';
  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  const isConstraintEnabled = showConstraintLayer && Boolean(currentSchema);

  const store = usePuzzleStoreApi();
  const previousButtonMode = useRef(toolSettings.surfaceButtonMode);
  // Reapply only for a real button-mode change. A mount/effect replay must not
  // overwrite an input mode just restored by a sibling's document loader.
  useEffect(() => {
    if (previousButtonMode.current === toolSettings.surfaceButtonMode) return;
    previousButtonMode.current = toolSettings.surfaceButtonMode;
    const current = store.getState();
    if (current.currentInputMode === 'auto') current.setInputMode('auto');
  }, [toolSettings.surfaceButtonMode, store]);

  return (
    <PropertiesPanelFrame suspended={suspended}>
        {/* Solver mode panel */}
        {(isSolving || isSolverMode || solverStatus) && (
          <SolverPanel />
        )}

        {/* Grid properties - show when in grid mode */}
        {isGridMode && !isSolving && !isSolverMode && (
          <GridPropertiesPanel />
        )}

        {/* Constraint properties - show when in constraint mode */}
        {isSpecificMode && !isSolving && !isSolverMode && (
          <ConstraintPropertiesPanel />
        )}

        {/* Auto mode panels */}
        {!isSolving && !isSolverMode && !isSpecificMode && isConstraintEnabled && currentInputMode === 'auto' && (
          <AutoModePanel />
        )}

        {/* Number input panel - for number/direc input modes in constraint-enabled state */}
        {!isSolving && !isSolverMode && !isSpecificMode && isConstraintEnabled &&
         (currentInputMode === 'number' || currentInputMode === 'number-' || currentInputMode === 'direc') && (
          <div className="p-2 bg-gray-50 rounded-sm border border-gray-200">
            <div className="font-medium text-xs text-gray-700 mb-2">
              {t('tool.number.input', 'Number Input')}
            </div>
            <NumberInputPanel />
          </div>
        )}

        {/* Arrow direction panel - for direc/number modes in constraint-enabled state */}
        {!isSolving && !isSolverMode && !isSpecificMode && isConstraintEnabled &&
         (currentInputMode === 'direc' || currentInputMode === 'number' || currentInputMode === 'number-') && (
          <div className="p-2 bg-gray-50 rounded-sm border border-gray-200">
            <div className="font-medium text-xs text-gray-700 mb-2">
              {t('prop.direction', 'Direction')}
            </div>
            <ArrowDirectionSettings />
          </div>
        )}

        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && <SurfaceTargetControl />}

        {/* Tool properties - standard tool settings */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && (
          <ToolPropertiesPanel />
        )}

        {/* Symbol Panel - show when symbol category selected */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled &&
         toolSettings.currentCategory === 'symbol' && (
          /* Show content based on sub-mode (toggle is in Ribbon) */
          toolSettings.symbolSubMode === 'multicolor' ? (
            <MulticolorSettings />
          ) : toolSettings.symbolSubMode === 'direction' ? (
            <DirectionPanel />
          ) : (
            <SymbolPanel />
          )
        )}
    </PropertiesPanelFrame>
  );
};
