import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import type { InputMode } from '../constraints/types';

interface UseConstraintPresetOptions {
  currentSchemaId: string | null;
  showConstraintLayer: boolean;
  t: TFunction;
}

export function useConstraintPresetOptions({
  currentSchemaId,
  showConstraintLayer,
  t,
}: UseConstraintPresetOptions) {
  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  const isConstraintAvailable = currentSchemaId !== null && currentSchemaId !== '__custom__';
  const isConstraintEnabled = isConstraintAvailable && showConstraintLayer;
  const editModes = (currentSchema?.inputModes.edit ?? []) as InputMode[];
  const playModes = (currentSchema?.inputModes.play ?? []) as InputMode[];

  const presetOptions = useMemo(
    () =>
      constraintCatalog
        .getAllSchemas()
        .map((schema) => ({
          id: schema.pid,
          label: schema.nameKey ? t(schema.nameKey) : schema.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [t]
  );

  return {
    currentSchema,
    presetOptions,
    isConstraintAvailable,
    isConstraintEnabled,
    editModes,
    playModes,
  };
}
