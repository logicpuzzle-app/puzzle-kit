/**
 * Constraint Slice - Puzzle constraint configuration management
 */

import type { ConstraintSlice, SliceCreator, InputModeType, ValidationResultState } from './types';
import { getToolForInputMode } from '../../constraints/inputModeMapping';
import { constraintCatalog } from '../../constraints/ConstraintCatalog';
import { validatePuzzle } from '../../constraints/validators';
import type { InputMode } from '../../constraints/types';

export const createConstraintSlice: SliceCreator<ConstraintSlice> = (set, get) => ({
  // Current puzzle schema ID (null = no preset selected)
  currentSchemaId: null,
  setCurrentSchemaId: (schemaId) => {
    set({ currentSchemaId: schemaId });

    // When preset is set to "none" (null), turn off constraint check
    if (schemaId === null) {
      set({ showConstraintLayer: false });
      return;
    }

    // Apply grid style and frame style from schema if available
    // Also turn on constraint check when a preset is selected
    if (schemaId !== '__custom__') {
      const schema = constraintCatalog.getSchema(schemaId);
      if (schema) {
        const { setGrid } = get();
        const gridUpdates: Parameters<typeof setGrid>[0] = {};
        if (schema.gridStyle) {
          gridUpdates.gridStyle = schema.gridStyle;
        }
        if (schema.frameStyle) {
          gridUpdates.frameStyle = schema.frameStyle;
        }
        if (Object.keys(gridUpdates).length > 0) {
          setGrid(gridUpdates);
        }

        // Turn on constraint check when a preset is selected
        set({ showConstraintLayer: true });
      }
    }
  },

  // Constraint sub-category selection (common/edit/play/check)
  constraintSubCategory: 'common',
  setConstraintSubCategory: (category) => set({ constraintSubCategory: category }),

  // Current input mode (pzprjs-style)
  currentInputMode: 'auto' as InputModeType,
  savedInputModes: { edit: 'auto' as InputModeType, play: 'auto' as InputModeType },
  setInputMode: (mode) => {
    const { activeLayer, savedInputModes, setToolSettings, toolSettings, currentSchemaId } = get();
    const isEditMode = activeLayer === 'problem';

    // Update input mode state
    set({
      currentInputMode: mode,
      savedInputModes: {
        ...savedInputModes,
        [isEditMode ? 'edit' : 'play']: mode,
      },
    });

    // Get current schema for context-aware tool mapping
    const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;

    // Map inputMode to puzzle-kit tool (pass schema for lineTarget awareness)
    const toolMapping = getToolForInputMode(mode as InputMode, currentSchema);
    if (toolMapping) {
      // Update tool and category
      const newSettings: Parameters<typeof setToolSettings>[0] = {
        currentTool: toolMapping.tool,
        currentCategory: toolMapping.category,
        // Set override symbol type if specified (e.g., 'circle-filled' for black pearl)
        overrideSymbolType: toolMapping.symbolType,
      };

      // Apply additional settings if defined
      if (toolMapping.settings) {
        if (toolMapping.settings.color) {
          newSettings.color = toolMapping.settings.color;
        }
        if (toolMapping.settings.secondaryColor) {
          newSettings.secondaryColor = toolMapping.settings.secondaryColor;
        }
        if (toolMapping.settings.lineStyle) {
          newSettings.lineStyle = toolMapping.settings.lineStyle;
        }
        if (toolMapping.settings.lineThickness) {
          newSettings.lineThickness = toolMapping.settings.lineThickness;
        }
        if (toolMapping.settings.symbolSize) {
          newSettings.symbolSize = toolMapping.settings.symbolSize;
        }
        if (toolMapping.settings.symbolGridPoints) {
          newSettings.symbolGridPoints = toolMapping.settings.symbolGridPoints;
        }
        if (toolMapping.settings.lineGridPoints) {
          newSettings.lineGridPoints = toolMapping.settings.lineGridPoints;
        }
      }

      setToolSettings(newSettings);
    }
  },

  // Validation rule overrides (rule ID → enabled/disabled)
  validationOverrides: {},
  setValidationOverride: (ruleId, enabled) =>
    set((state) => ({
      validationOverrides: {
        ...state.validationOverrides,
        [ruleId]: enabled,
      },
    })),
  resetValidationOverrides: () => set({ validationOverrides: {} }),

  // Is a validation rule enabled?
  isRuleEnabled: (ruleId, defaultOn) => {
    const overrides = get().validationOverrides;
    if (ruleId in overrides) {
      return overrides[ruleId];
    }
    return defaultOn ?? true;
  },

  // Validation state
  lastValidationResult: null,
  isValidationModalOpen: false,

  checkAnswer: () => {
    const { currentSchemaId, puzzle, grid, validationOverrides } = get();
    if (!currentSchemaId) return null;

    const schema = constraintCatalog.getSchema(currentSchemaId);
    if (!schema) return null;

    const result = validatePuzzle(puzzle, grid, schema, validationOverrides);

    // Store result and open modal
    set({
      lastValidationResult: result,
      isValidationModalOpen: true,
    });

    return result;
  },

  openValidationModal: () => set({ isValidationModalOpen: true }),
  closeValidationModal: () => set({ isValidationModalOpen: false }),
});
