/**
 * GridPropertiesPanel - Main grid properties panel component
 *
 * Composed of:
 * - GridShapeContent: Grid type and size configuration
 * - GridDisplayContent: Display settings like cell size, padding, background
 * - GridMergeContent: Merge mode management
 * - GridSplitContent: Split mode (placeholder)
 * - GridExcludeContent: Exclude/disable cells mode
 * - GridSculptContent: Sculpt mode for isometric grids
 */

import React from 'react';
import { usePuzzleStore } from '../../../store/puzzleStoreContext';
import {
  GridShapeContent,
  GridDisplayContent,
  GridMergeContent,
  GridSplitContent,
  GridExcludeContent,
  GridSculptContent,
} from './grid';

export const GridPropertiesPanel: React.FC = () => {
  const { gridSubTab, gridEditMode } = usePuzzleStore();

  // Render content based on gridEditMode
  const renderContent = () => {
    switch (gridEditMode) {
      case 'preset':
        // Preset mode shows shape/display tabs
        return gridSubTab === 'shape' ? <GridShapeContent /> : <GridDisplayContent />;
      case 'merge':
        return <GridMergeContent />;
      case 'split':
        return <GridSplitContent />;
      case 'exclude':
        return <GridExcludeContent />;
      case 'sculpt':
        return <GridSculptContent />;
      default:
        return gridSubTab === 'shape' ? <GridShapeContent /> : <GridDisplayContent />;
    }
  };

  return (
    <div className="space-y-2">
      {renderContent()}
    </div>
  );
};
