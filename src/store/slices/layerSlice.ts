/**
 * Layer Slice - Layer visibility and active layer management
 */

import type { LayerSlice, SliceCreator } from './types';
import { getToolForInputMode, getDefaultInputMode } from '../../constraints/inputModeMapping';
import { constraintCatalog } from '../../constraints/ConstraintCatalog';
import type { InputMode } from '../../constraints/types';

export const createLayerSlice: SliceCreator<LayerSlice> = (set, get) => ({
  activeLayer: 'grid',
  setActiveLayer: (layer) => {
    const prevLayer = get().activeLayer;
    set({ activeLayer: layer });

    const {
      showConstraintLayer,
      currentSchemaId,
      savedInputModes,
      setInputMode,
      savedNormalToolSettings,
      setToolSettings,
      setHoverCell,
    } = get();

    // Clear hover cell when switching to constraint or grid mode (no editing allowed)
    if (layer === 'constraint' || layer === 'grid') {
      setHoverCell(null);
    }

    // When switching between problem/answer layers
    if ((layer === 'problem' || layer === 'answer') &&
        (prevLayer === 'problem' || prevLayer === 'answer' || prevLayer === 'grid' || prevLayer === 'constraint')) {

      const isEditMode = layer === 'problem';

      if (showConstraintLayer && currentSchemaId && currentSchemaId !== '__custom__') {
        // Constraint mode: use schema's inputModes
        const schema = constraintCatalog.getSchema(currentSchemaId);
        if (schema) {
          const modes = isEditMode ? schema.inputModes.edit : schema.inputModes.play;
          // Get saved mode or default to first mode in the list
          const savedMode = savedInputModes[isEditMode ? 'edit' : 'play'];
          // Check if saved mode is valid for current schema
          const isValidMode = modes.includes(savedMode as InputMode);
          const modeToApply = isValidMode ? savedMode : getDefaultInputMode(modes as InputMode[], false);
          setInputMode(modeToApply);
        }
      } else {
        // Normal mode: restore saved tool settings
        const saved = savedNormalToolSettings[isEditMode ? 'problem' : 'answer'];
        setToolSettings({
          currentTool: saved.tool,
          currentCategory: saved.category,
        });
      }
    }
  },

  // Layer visibility
  showProblemLayer: true,
  showAnswerLayer: true,
  showConstraintLayer: false,
  toggleProblemLayer: () =>
    set((state) => ({ showProblemLayer: !state.showProblemLayer })),
  toggleAnswerLayer: () =>
    set((state) => ({ showAnswerLayer: !state.showAnswerLayer })),
  toggleConstraintLayer: () => {
    const { showConstraintLayer, currentInputMode, currentSchemaId, activeLayer, setToolSettings } = get();
    const newShowConstraintLayer = !showConstraintLayer;
    set({ showConstraintLayer: newShowConstraintLayer });

    // When turning off constraint layer, reset inputConstraint and apply tool settings
    if (!newShowConstraintLayer) {
      // Reset inputConstraint to 'none' so parity check is disabled
      setToolSettings({ inputConstraint: 'none' });

      // Apply current input mode's tool settings if a schema is selected
      // This keeps the tool behavior consistent with what was set in constraint mode
      if (currentSchemaId && (activeLayer === 'problem' || activeLayer === 'answer')) {
        const { setInputMode } = get();
        // Re-apply current input mode to update tool settings
        setInputMode(currentInputMode);
      }
    }
  },
});
