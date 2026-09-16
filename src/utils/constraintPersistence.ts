import type { PuzzleConstraintSettings } from '../types';
import type { InputMode } from '../constraints/types';
import { inputModeToTool } from '../constraints/inputModeMapping';

/** Validate before changing a live puzzle. Unknown schema/rule names are kept
 * exactly, so custom registries and future files do not silently change rules. */
export function restoreConstraintSettings(value: unknown): Required<PuzzleConstraintSettings> {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid constraint settings');
    return v as Record<string, unknown>;
  };
  const data = value === undefined ? {} : object(value);
  const schema = data.currentSchemaId === undefined ? null : data.currentSchemaId;
  if (schema !== null && typeof schema !== 'string') throw new Error('Invalid constraint schema');
  const mode = (v: unknown): InputMode => {
    if (v === undefined) return 'auto';
    if (typeof v !== 'string' || !Object.hasOwn(inputModeToTool, v)) throw new Error('Invalid constraint input mode');
    return v as InputMode;
  };
  const flags = (v: unknown): Record<string, boolean> => {
    if (v === undefined) return {};
    const entries = Object.entries(object(v));
    if (entries.some(([, flag]) => typeof flag !== 'boolean')) throw new Error('Invalid constraint rule override');
    return Object.fromEntries(entries) as Record<string, boolean>;
  };
  if (data.showConstraintLayer !== undefined && typeof data.showConstraintLayer !== 'boolean') throw new Error('Invalid constraint visibility');
  const currentInputMode = mode(data.currentInputMode);
  const saved = data.savedInputModes === undefined ? undefined : object(data.savedInputModes);
  return {
    currentSchemaId: schema,
    currentInputMode,
    validationOverrides: flags(data.validationOverrides),
    highlightOverrides: flags(data.highlightOverrides),
    showConstraintLayer: data.showConstraintLayer as boolean | undefined ?? schema !== null,
    savedInputModes: saved ? { edit: mode(saved.edit), play: mode(saved.play) } : { edit: currentInputMode, play: currentInputMode },
  };
}

export function captureConstraintSettings(state: PuzzleConstraintSettings): Required<PuzzleConstraintSettings> {
  return restoreConstraintSettings({
    currentSchemaId: state.currentSchemaId, currentInputMode: state.currentInputMode,
    validationOverrides: state.validationOverrides, highlightOverrides: state.highlightOverrides,
    showConstraintLayer: state.showConstraintLayer, savedInputModes: state.savedInputModes,
  });
}
