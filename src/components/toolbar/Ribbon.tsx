/**
 * Ribbon - Main ribbon toolbar component
 *
 * Composed of:
 * - RibbonIcons: SVG icon components
 * - RibbonGridContent: Grid tab content (GridShapeContent, GridDisplayContent)
 * - RibbonPickers: Tool setting pickers (TextCharacterPicker, LineSettingsPicker, SymbolSettingsPicker)
 * - RibbonToolDefs: Tool and category definitions
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { ToolCategory } from '../../types';

// Import sub-components
import {
  EyeIcon,
  EyeOffIcon,
  CheckboxIcon,
  CheckboxEmptyIcon,
  SPECIAL_TOOL_ICONS,
} from './RibbonIcons';
import { GridShapeContent, GridDisplayContent } from './RibbonGridContent';
import { TextCharacterPicker, LineSettingsPicker, SymbolSettingsPicker } from './RibbonPickers';
import { toolGroups, mainCategories, CategoryDef } from './RibbonToolDefs';

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
    isGridMode,
    setGridMode,
    gridSubTab,
    setGridSubTab,
  } = usePuzzleStore();

  const handleCategoryClick = (category: CategoryDef) => {
    // Close grid settings if open
    if (isGridMode) {
      setGridMode(false);
    }
    // If clicking the same category, keep current tool
    // Otherwise, switch to the default tool for this category
    if (toolSettings.currentCategory !== category.id) {
      setTool(category.defaultTool, category.id);
    }
  };

  const handleLayerClick = (layer: 'problem' | 'answer') => {
    // Close grid settings if open and switch to the layer
    if (isGridMode) {
      setGridMode(false);
    }
    setActiveLayer(layer);
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
              onClick={() => setGridMode(!isGridMode)}
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
                    ? 'bg-office-accent text-white border-office-accent'
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
                      ? 'bg-office-accent text-white border-office-accent'
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
          {/* Answer layer - button with eye on right */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isGridMode
                  ? 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  : activeLayer === 'answer'
                    ? 'bg-office-accent text-white border-office-accent'
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
                      ? 'bg-office-accent text-white border-office-accent'
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
          {/* Constraint layer - label with checkbox on right */}
          <div className="flex items-center">
            <span
              className={`h-7 px-2 text-xs flex items-center rounded-l-sm border border-r-0 transition-colors bg-white border-office-border`}
            >
              {t('layer.constraint')}
            </span>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-r-sm border transition-colors bg-white border-office-border text-office-text hover:bg-office-ribbon-hover"
              onClick={toggleConstraintLayer}
              title={t('view.showConstraint')}
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

        {/* Main category buttons - hidden in grid mode */}
        {!isGridMode && (
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

      </div>

      {/* Secondary toolbar - Tool details */}
      <div className="flex items-center px-2 py-1 min-h-[50px]">
        {isGridMode ? (
          gridSubTab === 'shape' ? <GridShapeContent /> : <GridDisplayContent />
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
