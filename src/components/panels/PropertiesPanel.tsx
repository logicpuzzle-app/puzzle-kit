/**
 * Properties panel - main container for property editors
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
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
    setInputMode,
    isSolverMode,
    isSolving,
    solverStatus,
  } = usePuzzleStore();

  // Derived state
  const isGridMode = activeLayer === 'grid';
  const isSpecificMode = activeLayer === 'constraint';
  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  const isConstraintEnabled = showConstraintLayer && currentSchema !== null;

  // Track if this is the first render to avoid re-applying input mode on mount
  const isFirstRender = useRef(true);

  // Re-apply input mode when surfaceButtonMode changes (to update the tool for auto mode)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (currentInputMode === 'auto') {
      setInputMode('auto');
    }
  }, [toolSettings.surfaceButtonMode, currentInputMode, setInputMode]);

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
