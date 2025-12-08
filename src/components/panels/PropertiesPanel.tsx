import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { LineStyle, LineThickness } from '../../types';
import { SymbolPanel } from './SymbolPanel';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';
import {
  ColorSelector,
  MulticolorSettings,
  NumberPositionSettings,
  ArrowDirectionSettings,
  NumberInputPanel,
  GridPropertiesPanel,
  FreehandLineList,
  TestCasePanel,
} from './properties';
import { CONSTRAINT_ICONS } from '../toolbar/RibbonIcons';
import { constraintCatalog } from '../../constraints';
import { solverWorkerManager } from '../../solver';

export const PropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    activeLayer,
    isPropertiesPanelOpen,
    togglePropertiesPanel,
    currentSchemaId,
    setCurrentSchemaId,
    constraintSubCategory,
    showConstraintLayer,
    currentInputMode,
    setInputMode,
    // Solver mode
    isSolverMode,
    isSolving,
    solverResult,
    solverStatus,
    solverTime,
    solverError,
    exitSolverMode,
    cancelSolver,
  } = usePuzzleStore();

  // Handle cancel solver
  const handleCancelSolver = useCallback(() => {
    solverWorkerManager.cancelAll();
    cancelSolver();
  }, [cancelSolver]);

  // Derived state
  const isGridMode = activeLayer === 'grid';
  const isSpecificMode = activeLayer === 'constraint';
  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  // When constraint is enabled, hide tool settings (tool is auto-selected by inputMode)
  const isConstraintEnabled = showConstraintLayer && currentSchema !== null;

  const lineStyles: { value: LineStyle; labelKey: string }[] = [
    { value: 'solid', labelKey: 'style.solid' },
    { value: 'dashed', labelKey: 'style.dashed' },
    { value: 'dotted', labelKey: 'style.dotted' },
  ];

  const lineThicknesses: { value: LineThickness; labelKey: string }[] = [
    { value: 'thinnest', labelKey: 'thickness.thinnest' },
    { value: 'thin', labelKey: 'thickness.thin' },
    { value: 'normal', labelKey: 'thickness.normal' },
    { value: 'thick', labelKey: 'thickness.thick' },
    { value: 'thickest', labelKey: 'thickness.thickest' },
  ];

  const sizes: { value: 'large' | 'medium' | 'small'; labelKey: string }[] = [
    { value: 'large', labelKey: 'size.large' },
    { value: 'medium', labelKey: 'size.medium' },
    { value: 'small', labelKey: 'size.small' },
  ];

  const rotateSymbol = (delta: number) => {
    const next = (toolSettings.symbolRotation + delta) % 360;
    setToolSettings({ symbolRotation: next < 0 ? next + 360 : next });
  };

  const resetRotation = () => setToolSettings({ symbolRotation: 0 });

  // Track if this is the first render to avoid re-applying input mode on mount
  const isFirstRender = useRef(true);

  // Re-apply input mode when surfaceButtonMode changes (to update the tool for auto mode)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Only re-apply if the current input mode is 'auto' (which depends on button mode)
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

      <div className="p-3 flex flex-col gap-4 flex-shrink-0">
        {/* Solver mode panel - shown when solving, solver mode is active, OR there's a status */}
        {(isSolving || isSolverMode || solverStatus) && (
          <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${
                solverStatus === 'error' || solverStatus === 'unsolvable' ? 'bg-red-500' :
                solverStatus === 'multiple' || solverStatus === 'timeout' ? 'bg-orange-500' :
                isSolving ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'
              }`} />
              <span className="text-xs text-office-text-secondary font-medium">{t('solver.mode')}</span>
            </div>

            {/* Solving in progress */}
            {isSolving && (
              <div className="text-xs mb-3 p-2 bg-yellow-50 rounded-sm border border-yellow-200">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-yellow-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="font-medium text-yellow-700">{t('solver.solving')}</span>
                </div>
                <div className="text-yellow-600 mt-1">{t('solver.runningInBackground')}</div>
                <button
                  onClick={handleCancelSolver}
                  className="mt-2 w-full px-3 py-1.5 text-xs border rounded-sm bg-white border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                >
                  {t('solver.cancel')}
                </button>
              </div>
            )}

            {/* Solved - complete solution */}
            {!isSolving && solverStatus === 'solved' && (
              <div className="text-xs mb-3 p-2 bg-green-50 rounded-sm border border-green-200">
                <div className="flex justify-between">
                  <span className="text-office-text-secondary">{t('solver.status')}:</span>
                  <span className="font-medium text-green-600">{t('solver.solved')}</span>
                </div>
                {solverTime !== null && (
                  <div className="flex justify-between mt-1">
                    <span className="text-office-text-secondary">{t('solver.time')}:</span>
                    <span>{solverTime.toFixed(0)}ms</span>
                  </div>
                )}
              </div>
            )}

            {/* Multiple solutions - partial result */}
            {!isSolving && solverStatus === 'multiple' && (
              <div className="text-xs mb-3 p-2 bg-orange-50 rounded-sm border border-orange-200">
                <div className="flex justify-between">
                  <span className="text-office-text-secondary">{t('solver.status')}:</span>
                  <span className="font-medium text-orange-600">{t('solver.partial')}</span>
                </div>
                <div className="text-orange-700 mt-1 font-medium">{t('solver.multiple')}</div>
                <div className="text-orange-600 text-[10px] mt-0.5">{t('solver.multipleSub')}</div>
                {solverTime !== null && (
                  <div className="flex justify-between mt-1">
                    <span className="text-office-text-secondary">{t('solver.time')}:</span>
                    <span>{solverTime.toFixed(0)}ms</span>
                  </div>
                )}
              </div>
            )}

            {/* Timeout - partial result */}
            {!isSolving && solverStatus === 'timeout' && (
              <div className="text-xs mb-3 p-2 bg-orange-50 rounded-sm border border-orange-200">
                <div className="flex justify-between">
                  <span className="text-office-text-secondary">{t('solver.status')}:</span>
                  <span className="font-medium text-orange-600">{t('solver.partial')}</span>
                </div>
                <div className="text-orange-700 mt-1 font-medium">{t('solver.timeout')}</div>
                <div className="text-orange-600 text-[10px] mt-0.5">{t('solver.timeoutSub')}</div>
                {solverTime !== null && (
                  <div className="flex justify-between mt-1">
                    <span className="text-office-text-secondary">{t('solver.time')}:</span>
                    <span>{solverTime.toFixed(0)}ms</span>
                  </div>
                )}
              </div>
            )}

            {/* Unsolvable */}
            {!isSolving && solverStatus === 'unsolvable' && (
              <div className="text-xs mb-3 p-2 bg-red-50 rounded-sm border border-red-200">
                <div className="flex justify-between">
                  <span className="text-office-text-secondary">{t('solver.status')}:</span>
                  <span className="font-medium text-red-600">{t('solver.failed')}</span>
                </div>
                <div className="text-red-700 mt-1 font-medium">{t('solver.unsolvable')}</div>
                {solverResult && (
                  <div className="text-red-600 text-[10px] mt-0.5">{t('solver.unsolvableSub')}</div>
                )}
                {solverTime !== null && (
                  <div className="flex justify-between mt-1">
                    <span className="text-office-text-secondary">{t('solver.time')}:</span>
                    <span>{solverTime.toFixed(0)}ms</span>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {!isSolving && solverStatus === 'error' && (
              <div className="text-xs mb-3 p-2 bg-red-50 rounded-sm border border-red-200">
                <div className="flex justify-between mb-1">
                  <span className="text-office-text-secondary">{t('solver.status')}:</span>
                  <span className="font-medium text-red-600">{t('solver.failed')}</span>
                </div>
                {solverError && <div className="text-red-600">{solverError}</div>}
                {solverTime !== null && (
                  <div className="flex justify-between mt-1">
                    <span className="text-office-text-secondary">{t('solver.time')}:</span>
                    <span>{solverTime.toFixed(0)}ms</span>
                  </div>
                )}
              </div>
            )}

            {/* Exit/Dismiss button - only show when not solving */}
            {!isSolving && (
              <button
                onClick={exitSolverMode}
                className="px-3 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover transition-colors"
              >
                {isSolverMode ? t('solver.exit') : t('action.dismiss')}
              </button>
            )}
          </div>
        )}

        {/* Grid properties - show when in grid mode */}
        {isGridMode && !isSolving && !isSolverMode && (
          <GridPropertiesPanel />
        )}

        {/* Constraint properties - show when in constraint mode */}
        {isSpecificMode && !isSolving && !isSolverMode && (
          <div className="space-y-3">
            {/* Common/Preset tab: Preset tree list (for selecting puzzle type) */}
            {constraintSubCategory === 'common' && (
              <div>
                <div className="text-xs font-medium text-office-text-secondary mb-2">
                  {t('constraint.preset')}
                </div>
                <div className="border border-office-border rounded-sm bg-white max-h-48 overflow-y-auto">
                  {/* None option (default) */}
                  <button
                    className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors border-b border-office-border ${
                      currentSchemaId === null
                        ? 'bg-purple-100 text-purple-800'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setCurrentSchemaId(null)}
                  >
                    <span className={`text-sm ${currentSchemaId === null ? 'text-purple-600' : 'text-gray-400'}`}>○</span>
                    <span>{t('constraint.none')}</span>
                  </button>

                  {/* Puzzle presets */}
                  {constraintCatalog.getPuzzleIds().map((pid) => {
                    const schema = constraintCatalog.getSchema(pid);
                    if (!schema) return null;
                    const isSelected = currentSchemaId === pid;
                    return (
                      <button
                        key={pid}
                        className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                          isSelected
                            ? 'bg-purple-100 text-purple-800'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setCurrentSchemaId(pid)}
                      >
                        <CONSTRAINT_ICONS.preset size={12} className={isSelected ? 'text-purple-600' : 'text-gray-400'} />
                        <span>{t(schema.nameKey)}</span>
                      </button>
                    );
                  })}

                  {/* Custom option - disabled for now */}
                  <button
                    className="w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors border-t border-office-border bg-gray-50 text-gray-400 cursor-not-allowed"
                    disabled
                    title={t('constraint.customDisabled')}
                  >
                    <CONSTRAINT_ICONS.constraint size={12} className="text-gray-300" />
                    <span>{t('constraint.custom')}</span>
                  </button>
                </div>

                {/* Notes for selected preset */}
                {currentSchema && currentSchema.notes && currentSchema.notes.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 p-2 bg-gray-50 rounded-sm">
                    {currentSchema.notes.map((note, i) => (
                      <div key={i}>• {note}</div>
                    ))}
                  </div>
                )}

                {/* Test cases for selected preset */}
                {currentSchemaId && currentSchemaId !== '__custom__' && (
                  <div className="mt-3">
                    <TestCasePanel />
                  </div>
                )}
              </div>
            )}

            {/* Edit tab: Show problem input rules (editor constraints) */}
            {constraintSubCategory === 'edit' && (
              <div className="space-y-2">
                {currentSchemaId === null && (
                  <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
                    {t('constraint.noneDesc')}
                  </div>
                )}
                {currentSchemaId === '__custom__' && (
                  <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
                    {t('constraint.customDesc')}
                  </div>
                )}
                {currentSchema && currentSchema.problem.length > 0 && (
                  <div className="space-y-1.5">
                    {currentSchema.problem.map((rule) => (
                      <div key={rule.id} className="p-2 bg-gray-50 rounded-sm border border-office-border">
                        <div className="font-medium text-xs text-office-text">{t(rule.title)}</div>
                        <div className="text-xs text-office-text-secondary mt-0.5">{t(rule.description)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Number input panel - show when in number mode */}
                {currentSchema && (currentInputMode === 'number' || currentInputMode === 'number-') && (
                  <NumberInputPanel />
                )}

                {/* Arrow direction panel - show when in direc mode */}
                {currentSchema && currentInputMode === 'direc' && (
                  <ArrowDirectionSettings />
                )}

                {/* Add button */}
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-dashed border-office-border rounded-sm text-office-text-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('constraint.addRule', 'Add rule (coming soon)')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t('action.add', 'Add')}</span>
                </button>
              </div>
            )}

            {/* Play tab: Show answer input rules */}
            {constraintSubCategory === 'play' && (
              <div className="space-y-2">
                {currentSchemaId === null && (
                  <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
                    {t('constraint.noneDesc')}
                  </div>
                )}
                {currentSchemaId === '__custom__' && (
                  <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
                    {t('constraint.customDesc')}
                  </div>
                )}
                {currentSchema && currentSchema.answer.length > 0 && (
                  <div className="space-y-1.5">
                    {currentSchema.answer.map((rule) => (
                      <div key={rule.id} className="p-2 bg-gray-50 rounded-sm border border-office-border">
                        <div className="font-medium text-xs text-office-text">{t(rule.title)}</div>
                        <div className="text-xs text-office-text-secondary mt-0.5">{t(rule.description)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Number input panel - show when in number mode */}
                {currentSchema && (currentInputMode === 'number' || currentInputMode === 'number-') && (
                  <NumberInputPanel />
                )}

                {/* Arrow direction panel - show when in direc mode */}
                {currentSchema && currentInputMode === 'direc' && (
                  <ArrowDirectionSettings />
                )}

                {/* Add button */}
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-dashed border-office-border rounded-sm text-office-text-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('constraint.addRule', 'Add rule (coming soon)')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t('action.add', 'Add')}</span>
                </button>
              </div>
            )}

            {/* Check tab: Show validation rules */}
            {constraintSubCategory === 'check' && (
              <div className="space-y-2">
                {currentSchemaId === null && (
                  <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
                    {t('constraint.noneDesc')}
                  </div>
                )}
                {currentSchemaId === '__custom__' && (
                  <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
                    {t('constraint.customDesc')}
                  </div>
                )}
                {currentSchema && (
                  <div className="space-y-1.5">
                    {currentSchema.validation.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-2 bg-gray-50 rounded-sm border border-office-border"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-office-text">{t(rule.title)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            rule.defaultOn !== false
                              ? 'bg-office-accent/10 text-office-accent'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            {rule.defaultOn !== false ? t('constraint.enabled') : t('constraint.disabled')}
                          </span>
                        </div>
                        <div className="text-xs text-office-text-secondary mt-0.5">
                          {t(rule.description)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add button */}
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-dashed border-office-border rounded-sm text-office-text-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('constraint.addRule', 'Add rule (coming soon)')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t('action.add', 'Add')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Auto mode panels - show when constraint is enabled (not in constraint layer), and auto input mode is active */}
        {!isSolving && !isSolverMode && !isSpecificMode && isConstraintEnabled && currentInputMode === 'auto' && (() => {
          // Determine if we're in edit or play mode based on activeLayer
          const isEditMode = activeLayer === 'problem';
          const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
          const autoModeType = autoConfig.type;

          return (
            <>
              {/* Number input panel for number/direc/border-number auto mode types */}
              {(autoModeType === 'number' || autoModeType === 'direc' || autoModeType === 'border-number') && (
                <NumberInputPanel />
              )}

              {/* Arrow direction panel for direc auto mode type */}
              {autoModeType === 'direc' && (
                <ArrowDirectionSettings />
              )}

              {/* Button mode switch for line-cell auto mode (Yajilin) */}
              {autoModeType === 'line-cell' && (
                <div className="p-2 bg-gray-50 rounded-sm border border-gray-200">
                  <div className="font-medium text-xs text-gray-700 mb-2">
                    {t('prop.buttonMode', 'Button Mode')}
                  </div>
                  <div className="flex gap-1">
                    <button
                      className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                        toolSettings.surfaceButtonMode === '2-button'
                          ? 'bg-office-accent text-white border-office-accent'
                          : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                      }`}
                      onClick={() => setToolSettings({ surfaceButtonMode: '2-button' })}
                    >
                      {t('prop.buttonMode.2button', '2-button')}
                    </button>
                    <button
                      className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                        toolSettings.surfaceButtonMode === '1-button'
                          ? 'bg-office-accent text-white border-office-accent'
                          : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                      }`}
                      onClick={() => setToolSettings({ surfaceButtonMode: '1-button' })}
                    >
                      {t('prop.buttonMode.1button', '1-button')}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {toolSettings.surfaceButtonMode === '2-button'
                      ? t('prop.buttonMode.2button.desc', 'Left: line, Right: shade')
                      : t('prop.buttonMode.1button.desc', 'Click: shade, Drag: line')}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Number input panel - show when constraint is enabled (not in constraint layer) and number/direc input mode is active */}
        {!isSolving && !isSolverMode && !isSpecificMode && isConstraintEnabled && (currentInputMode === 'number' || currentInputMode === 'number-' || currentInputMode === 'direc') && (
          <div className="p-2 bg-gray-50 rounded-sm border border-gray-200">
            <div className="font-medium text-xs text-gray-700 mb-2">
              {t('tool.number.input', 'Number Input')}
            </div>
            <NumberInputPanel />
          </div>
        )}

        {/* Arrow direction panel - show when constraint is enabled (not in constraint layer) and number/direc input mode is active */}
        {/* Allows converting regular numbers to directional clues by selecting a direction */}
        {!isSolving && !isSolverMode && !isSpecificMode && isConstraintEnabled && (currentInputMode === 'direc' || currentInputMode === 'number' || currentInputMode === 'number-') && (
          <div className="p-2 bg-gray-50 rounded-sm border border-gray-200">
            <div className="font-medium text-xs text-gray-700 mb-2">
              {t('prop.direction', 'Direction')}
            </div>
            <ArrowDirectionSettings />
          </div>
        )}

        {/* Color Selection - show for most tools except select, and not in grid/constraint/constraint-enabled/solver mode */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && toolSettings.currentCategory !== 'select' && (
          <ColorSelector />
        )}

        {/* Line/Edge properties - toggle buttons */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && (toolSettings.currentCategory === 'line' ||
          toolSettings.currentCategory === 'edge' ||
          toolSettings.currentCategory === 'wall') && (
          <>
            {/* Line Style */}
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('prop.style')}
              </label>
              <div className="flex gap-1">
                {lineStyles.map((style) => (
                  <button
                    key={style.value}
                    className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                      toolSettings.lineStyle === style.value
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setToolSettings({ lineStyle: style.value })}
                  >
                    {t(style.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Thickness */}
            <div>
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('prop.thickness')}
              </label>
              <div className="flex gap-1">
                {lineThicknesses.map((thickness) => (
                  <button
                    key={thickness.value}
                    className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                      toolSettings.lineThickness === thickness.value
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setToolSettings({ lineThickness: thickness.value })}
                  >
                    {t(thickness.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Freehand line list - only show when in freehand mode */}
            {toolSettings.currentCategory === 'line' &&
              toolSettings.lineDirections?.includes('freehand') && (
                <FreehandLineList />
              )}
          </>
        )}

        {/* Symbol size - toggle buttons */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && toolSettings.currentCategory === 'symbol' && (
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
            {/* Rotation controls */}
            <div className="mt-2">
              <label className="block text-xs text-office-text-secondary mb-1">
                Rotation ({Math.round(toolSettings.symbolRotation)}°)
              </label>
              <div className="flex gap-1">
                <button
                  className="flex-1 px-2 py-1.5 text-xs border rounded-sm bg-white border-office-border hover:bg-office-ribbon-hover"
                  onClick={() => rotateSymbol(-45)}
                  title="Rotate -45°"
                >
                  -45°
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
                  onClick={() => rotateSymbol(45)}
                  title="Rotate +45°"
                >
                  +45°
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Number settings - size and position */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && toolSettings.currentCategory === 'number' && toolSettings.currentTool !== 'number-directional' && (
          <>
            <NumberPositionSettings />
            <NumberInputPanel />
          </>
        )}

        {/* Arrow direction settings and number input for directional numbers */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && toolSettings.currentTool === 'number-directional' && (
          <>
            <ArrowDirectionSettings />
            <NumberInputPanel />
          </>
        )}

        {/* Multicolor surface settings */}
        {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && toolSettings.currentTool === 'multicolor-surface' && (
          <MulticolorSettings />
        )}
      </div>

      {/* Symbol Panel - show when symbol category selected */}
      {!isSolving && !isSolverMode && !isGridMode && !isSpecificMode && !isConstraintEnabled && toolSettings.currentCategory === 'symbol' && <SymbolPanel />}
    </div>
  );
};
