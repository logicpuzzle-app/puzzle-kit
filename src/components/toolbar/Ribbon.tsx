/**
 * Ribbon - Main ribbon toolbar component
 *
 * Composed of:
 * - RibbonIcons: SVG icon components
 * - RibbonGridContent: Grid tab content (GridShapeContent, GridDisplayContent)
 * - RibbonPickers: Tool setting pickers (TextCharacterPicker, LineSettingsPicker, SymbolSettingsPicker)
 * - RibbonToolDefs: Tool and category definitions
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { ToolCategory } from '../../types';
import { ConstraintSubCategory, InputModeType } from '../../store/slices/types';
import { constraintCatalog } from '../../constraints';
import type { ConstraintSchema, InputMode } from '../../constraints';

// Import sub-components
import {
  EyeIcon,
  EyeOffIcon,
  CheckboxIcon,
  CheckboxEmptyIcon,
  SPECIAL_TOOL_ICONS,
  CONSTRAINT_ICONS,
} from './RibbonIcons';
import { ToolModeSelector } from './ToolModeSelector';
// Note: CheckboxIcon/CheckboxEmptyIcon are used for Constraint layer toggle (enables/disables constraint checking)
import { GridShapeContent, GridDisplayContent } from './RibbonGridContent';
import { TextCharacterPicker, LineSettingsPicker, SymbolSettingsPicker } from './RibbonPickers';
import { toolGroups, mainCategories, CategoryDef } from './RibbonToolDefs';

// Constraint sub-categories: Preset / Edit Settings / Play Settings / Check Settings
const constraintSubCategories: { id: ConstraintSubCategory; labelKey: string }[] = [
  { id: 'common', labelKey: 'constraint.preset' },
  { id: 'edit', labelKey: 'constraint.editSettings' },
  { id: 'play', labelKey: 'constraint.playSettings' },
  { id: 'check', labelKey: 'constraint.checkSettings' },
];

export const Ribbon: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setTool,
    activeLayer,
    setActiveLayer,
    showProblemLayer,
    showAnswerLayer,
    showConstraintLayer,
    toggleProblemLayer,
    toggleAnswerLayer,
    toggleConstraintLayer,
    grid,
    setGrid,
    gridSubTab,
    setGridSubTab,
    // Constraint state
    currentSchemaId,
    setCurrentSchemaId,
    constraintSubCategory,
    setConstraintSubCategory,
    // Input mode state
    currentInputMode,
    savedInputModes,
    setInputMode,
    // Trial mode state
    trialStage,
    enterTrial,
    acceptTrial,
    rejectTrial,
    rejectCurrentTrial,
    isInTrial,
    getCurrentTrialColor,
    // Validation
    checkAnswer,
    // Clear
    clearLayer,
  } = usePuzzleStore();

  // Derived state
  const isGridMode = activeLayer === 'grid';
  const isConstraintMode = activeLayer === 'constraint';
  const isProblemMode = activeLayer === 'problem';
  const isAnswerMode = activeLayer === 'answer';

  // Get current schema
  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;

  // When constraint is enabled (showConstraintLayer), use constraint-aware mode
  // Problem layer → Edit mode, Answer layer → Play mode
  const isConstraintEnabled = showConstraintLayer && currentSchema !== null;

  const handleCategoryClick = (category: CategoryDef) => {
    // Switch to problem layer if in grid or constraint mode
    if (isGridMode || isConstraintMode) {
      setActiveLayer('problem');
    }
    // If clicking the same category, keep current tool
    // Otherwise, switch to the default tool for this category
    if (toolSettings.currentCategory !== category.id) {
      setTool(category.defaultTool, category.id);
    }
  };

  const handleLayerClick = (layer: 'grid' | 'problem' | 'answer' | 'constraint') => {
    setActiveLayer(layer);
    // Automatically show the constraint layer when it's selected
    if (layer === 'constraint' && !showConstraintLayer) {
      toggleConstraintLayer();
    }
  };

  return (
    <div className="bg-office-ribbon border-b border-office-border">
      {/* Primary toolbar - Category selection */}
      <div className="flex items-center px-2 py-1 border-b border-office-border">
        {/* Layer switcher with visibility toggles */}
        <div className="flex items-center gap-2 px-2 border-r border-office-border mr-2">
          {/* Grid button + toggle */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isGridMode
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleLayerClick(isGridMode ? 'problem' : 'grid')}
              title={t('grid.title')}
            >
              {t('grid.title')}
            </button>
            <button
              className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors text-xs ${
                isGridMode
                  ? grid.showGrid
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-office-accent/60 text-white/70 border-office-accent'
                  : grid.showGrid
                    ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                    : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGrid({ showGrid: !grid.showGrid })}
              title={t('view.showGrid')}
            >
              #
            </button>
          </div>
          {/* Problem layer - button with eye on right */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isGridMode
                  ? 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  : activeLayer === 'problem'
                    ? isConstraintEnabled
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleLayerClick('problem')}
              title={t('layer.problem')}
            >
              {t('layer.problem')}
            </button>
            <button
              className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors ${
                isGridMode
                  ? showProblemLayer
                    ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                    : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
                  : activeLayer === 'problem'
                    ? showProblemLayer
                      ? isConstraintEnabled
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-office-accent text-white border-office-accent'
                      : isConstraintEnabled
                        ? 'bg-purple-600/60 text-white/70 border-purple-600'
                        : 'bg-office-accent/60 text-white/70 border-office-accent'
                    : showProblemLayer
                      ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                      : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
              }`}
              onClick={toggleProblemLayer}
              title={t('view.showProblem')}
            >
              {showProblemLayer ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
            </button>
          </div>
          {/* Answer layer - button with eye on right (blue in normal mode, purple in constraint mode) */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isGridMode
                  ? 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  : activeLayer === 'answer'
                    ? isConstraintEnabled
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleLayerClick('answer')}
              title={t('layer.answer')}
            >
              {t('layer.answer')}
            </button>
            <button
              className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors ${
                isGridMode
                  ? showAnswerLayer
                    ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                    : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
                  : activeLayer === 'answer'
                    ? showAnswerLayer
                      ? isConstraintEnabled
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-office-accent text-white border-office-accent'
                      : isConstraintEnabled
                        ? 'bg-purple-600/60 text-white/70 border-purple-600'
                        : 'bg-office-accent/60 text-white/70 border-office-accent'
                    : showAnswerLayer
                      ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                      : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
              }`}
              onClick={toggleAnswerLayer}
              title={t('view.showAnswer')}
            >
              {showAnswerLayer ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
            </button>
          </div>
          {/* Trial mode (仮置き) - always available */}
          <div className="flex items-center">
            {trialStage === 0 ? (
              /* Enter trial button - disabled when not in answer mode */
              <button
                className={`h-7 px-2 text-xs rounded-sm border transition-colors ${
                  isAnswerMode
                    ? 'bg-white border-office-border hover:bg-orange-50 hover:border-orange-300'
                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                onClick={isAnswerMode ? enterTrial : undefined}
                disabled={!isAnswerMode}
                title={isAnswerMode ? t('trial.enterDesc') : t('trial.desc')}
              >
                {t('trial.enter')}
              </button>
            ) : (
              /* Trial mode active - show indicator and + button only in main toolbar */
              <div className="flex items-center">
                {/* Stage indicator */}
                <div
                  className="h-7 px-2 text-xs flex items-center gap-1 rounded-l-sm border border-r-0"
                  style={{ backgroundColor: getCurrentTrialColor() || '#FF8888', color: '#000' }}
                >
                  <span className="font-medium">{t('trial.title')}</span>
                  {trialStage > 1 && <span className="text-xs">({trialStage})</span>}
                </div>
                {/* Enter nested trial - adjacent to indicator */}
                <button
                  className={`h-7 px-2 text-xs rounded-r-sm border transition-colors ${
                    isAnswerMode
                      ? 'bg-white border-office-border hover:bg-orange-50'
                      : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={isAnswerMode ? enterTrial : undefined}
                  disabled={!isAnswerMode}
                  title={t('trial.enterDesc')}
                >
                  +
                </button>
              </div>
            )}
          </div>
          {/* Constraint layer - button with checkbox on right */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isConstraintMode
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleLayerClick('constraint')}
              title={t('layer.constraint')}
            >
              {t('layer.constraint')}
            </button>
            <button
              className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors ${
                currentSchemaId === null
                  ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                  : isConstraintMode
                    ? showConstraintLayer
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-purple-600/60 text-white/70 border-purple-600'
                    : showConstraintLayer
                      ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                      : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
              }`}
              onClick={currentSchemaId !== null ? toggleConstraintLayer : undefined}
              disabled={currentSchemaId === null}
              title={currentSchemaId === null ? t('constraint.selectPresetFirst') : t('constraint.toggle')}
            >
              {showConstraintLayer ? <CheckboxIcon size={14} /> : <CheckboxEmptyIcon size={14} />}
            </button>
          </div>
        </div>

        {/* Grid mode subtabs - 盤面形状 / 盤面表示 */}
        {isGridMode && (
          <div className="flex items-center gap-1">
            <button
              className={`flex items-center gap-1 h-7 px-2 text-xs rounded-sm border transition-colors ${
                gridSubTab === 'shape'
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGridSubTab('shape')}
            >
              <span>{t('grid.tab.shape')}</span>
            </button>
            <button
              className={`flex items-center gap-1 h-7 px-2 text-xs rounded-sm border transition-colors ${
                gridSubTab === 'display'
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGridSubTab('display')}
            >
              <span>{t('grid.tab.display')}</span>
            </button>
          </div>
        )}

        {/* Main category buttons - shown in problem/answer mode when constraint is disabled */}
        {!isGridMode && !isConstraintMode && !isConstraintEnabled && (
          <div className="flex items-center gap-1">
            {mainCategories.map((category) => (
              <button
                key={category.id}
                className={`flex items-center gap-1 h-7 px-2 text-xs rounded-sm border transition-colors ${
                  toolSettings.currentCategory === category.id
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                <span className="text-sm">{category.icon}</span>
                <span>{t(category.labelKey)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Constraint mode sub-categories (Edit/Play/Check) - shown when constraint layer is selected */}
        {isConstraintMode && (
          <div className="flex items-center gap-1">
            {constraintSubCategories.map((subCat) => {
              const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
                'common': CONSTRAINT_ICONS['preset'],
                'edit': CONSTRAINT_ICONS['problem-input'],
                'play': CONSTRAINT_ICONS['answer-input'],
                'check': CONSTRAINT_ICONS['validation'],
              };
              const IconComponent = iconMap[subCat.id];
              return (
                <button
                  key={subCat.id}
                  className={`flex items-center gap-1 h-7 px-2 text-xs rounded-sm border transition-colors ${
                    constraintSubCategory === subCat.id
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setConstraintSubCategory(subCat.id)}
                >
                  {IconComponent && <IconComponent size={14} />}
                  <span>{t(subCat.labelKey)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Constraint-aware mode indicator - shown in problem/answer when constraint is enabled */}
        {!isGridMode && !isConstraintMode && isConstraintEnabled && (
          <div className="flex items-center gap-2">
            {/* Current mode indicator */}
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-sm">
              <CONSTRAINT_ICONS.preset size={14} className="text-purple-600" />
              <span className="text-xs text-purple-800 font-medium">{t(currentSchema!.nameKey)}</span>
              <span className="text-xs text-purple-600">
                ({isProblemMode ? t('constraint.edit') : t('constraint.play')})
              </span>
            </div>

            {/* Check Answer button and Clear Answer button - between puzzle name and trial controls */}
            {isAnswerMode && (
              <div className="flex items-center gap-1">
                <button
                  className="h-7 px-2 text-xs bg-green-600 text-white border border-green-700 rounded-sm hover:bg-green-700 transition-colors"
                  onClick={checkAnswer}
                  title={t('constraint.checkAnswer')}
                >
                  {t('constraint.checkAnswer')}
                </button>
                <button
                  className="h-7 w-7 flex items-center justify-center text-xs bg-white border border-office-border rounded-sm hover:bg-red-50 hover:border-red-300 transition-colors"
                  onClick={() => clearLayer('answer')}
                  title={t('edit.clearAnswer')}
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trial mode controls - shown when in trial mode (always available, not just in constraint mode) */}
        {!isGridMode && !isConstraintMode && trialStage > 0 && (
          <>
            {/* Divider between tool area and trial controls */}
            <div className="w-px h-5 bg-office-border mx-2" />
            <div className="flex items-center gap-1">
              {/* Trial label */}
              <span className="text-xs text-gray-600 mr-1">{t('trial.title')}</span>
              {/* Accept */}
              <button
                className="h-7 px-2 text-xs bg-white border border-green-500 text-green-700 rounded-sm hover:bg-green-50 transition-colors"
                onClick={acceptTrial}
                title={t('trial.acceptDesc')}
              >
                {t('trial.accept')}
              </button>
              {/* Reject current */}
              <button
                className="h-7 px-2 text-xs bg-white border border-red-400 text-red-600 rounded-sm hover:bg-red-50 transition-colors"
                onClick={rejectCurrentTrial}
                title={t('trial.rejectDesc')}
              >
                {t('trial.reject')}
              </button>
              {/* Reject all (only show if nested) */}
              {trialStage > 1 && (
                <button
                  className="h-7 px-2 text-xs bg-white border border-red-500 text-red-700 rounded-sm hover:bg-red-100 transition-colors"
                  onClick={rejectTrial}
                  title={t('trial.rejectDesc')}
                >
                  {t('trial.rejectAll')}
                </button>
              )}
            </div>
          </>
        )}

      </div>

      {/* Secondary toolbar - Tool details */}
      <div className="flex items-center px-2 py-1 min-h-[50px]">
        {isGridMode ? (
          gridSubTab === 'shape' ? <GridShapeContent /> : <GridDisplayContent />
        ) : isConstraintMode ? (
          /* Constraint mode content - show preset name only */
          <div className="flex items-center gap-2 flex-wrap">
            {/* None selected */}
            {currentSchemaId === null && (
              <div className="flex items-center gap-1 text-gray-500">
                <span className="text-sm">○</span>
                <span className="text-xs">{t('constraint.none')}</span>
              </div>
            )}

            {/* Custom selected */}
            {currentSchemaId === '__custom__' && (
              <div className="flex items-center gap-1 text-purple-600">
                <CONSTRAINT_ICONS.constraint size={14} />
                <span className="text-xs font-medium">{t('constraint.custom')}</span>
              </div>
            )}

            {/* Preset selected */}
            {currentSchema && (
              <div className="flex items-center gap-1 text-purple-600">
                <CONSTRAINT_ICONS.preset size={14} />
                <span className="text-xs font-medium">{t(currentSchema.nameKey)}</span>
              </div>
            )}
          </div>
        ) : isConstraintEnabled ? (
          /* Constraint-enabled mode: show constraint-specific tool selector */
          <div className="flex items-center gap-4">
            {/* Input mode selector based on current layer */}
            <ToolModeSelector
              modes={(isProblemMode
                ? currentSchema!.inputModes.edit
                : currentSchema!.inputModes.play) as InputMode[]}
              currentMode={currentInputMode as InputMode}
              onModeChange={(mode) => setInputMode(mode as InputModeType)}
            />
          </div>
        ) : (
          <>
            {/* Tool options for current category */}
            <div className="flex items-center gap-1">
              {toolGroups[toolSettings.currentCategory]?.map((tool) => {
                const SvgIcon = SPECIAL_TOOL_ICONS[tool.id];
                return (
                  <button
                    key={tool.id}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-sm border transition-colors ${
                      toolSettings.currentTool === tool.id
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setTool(tool.id, toolSettings.currentCategory)}
                    title={t(tool.labelKey)}
                  >
                    {SvgIcon ? (
                      <SvgIcon size={16} />
                    ) : (
                      <span className="text-base">{tool.icon}</span>
                    )}
                    <span>{t(tool.labelKey)}</span>
                  </button>
                );
              })}
            </div>

            {/* Additional options based on tool */}
            {toolSettings.currentCategory === 'line' && (
              <LineSettingsPicker />
            )}

            {toolSettings.currentCategory === 'symbol' && (
              <SymbolSettingsPicker />
            )}

            {toolSettings.currentCategory === 'text' && (
              <div className="ml-4 border-l border-office-border pl-4">
                <TextCharacterPicker />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
