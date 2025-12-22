/**
 * Properties panel - main container for property editors
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { SymbolPanel } from './SymbolPanel';
import { DirectionPanel } from './DirectionPanel';
import { constraintCatalog } from '../../constraints';
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

export const PropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    activeLayer,
    isPropertiesPanelOpen,
    togglePropertiesPanel,
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

  // Collapsed state - show only toggle button
  if (!isPropertiesPanelOpen) {
    return (
      <div className="bg-white border-l border-office-border flex flex-col h-full">
        <button
          onClick={togglePropertiesPanel}
          className="p-2 hover:bg-office-ribbon-hover transition-colors"
          title={t('panel.properties')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 bg-white border-l border-office-border flex flex-col h-full">
      {/* Properties header with close button */}
      <div className="panel-header flex-shrink-0 flex items-center justify-between">
        <span>{t('panel.properties')}</span>
        <button
          onClick={togglePropertiesPanel}
          className="p-1 hover:bg-office-ribbon-hover rounded transition-colors"
          title={t('action.close')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="p-3 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
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
      </div>
    </div>
  );
};
