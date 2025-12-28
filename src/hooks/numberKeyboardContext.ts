import { constraintCatalog } from '../constraints';
import { getAutoModeConfig } from '../constraints/inputModeMapping';
import { getMaxDigitsForGrid } from './keyboardUtils';

export interface NumberInputFlags {
  isNumberTool: boolean;
  isConstraintNumberInput: boolean;
  allowNonNumeric: boolean;
}

interface NumberInputFlagOptions {
  editableLayer: 'problem' | 'answer' | null;
  currentInputMode: string | null;
  currentSchemaId: string | null;
  showConstraintLayer: boolean;
  tool: string;
  isPaintSchema: boolean;
}

export function getNumberInputFlags({
  editableLayer,
  currentInputMode,
  currentSchemaId,
  showConstraintLayer,
  tool,
  isPaintSchema,
}: NumberInputFlagOptions): NumberInputFlags {
  if (!editableLayer) {
    return { isNumberTool: false, isConstraintNumberInput: false, allowNonNumeric: false };
  }

  const isNumberTool = tool.startsWith('number');
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;

  let isConstraintNumberInput = false;
  if (isConstraintEnabled && !isPaintSchema) {
    const isNumberInputMode = currentInputMode === 'number' || currentInputMode === 'number-';
    const isDirecInputMode = currentInputMode === 'direc';
    const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
    const isEditMode = editableLayer === 'problem';
    const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
    const isAutoNumberMode = currentInputMode === 'auto' && autoConfig.type === 'number';
    const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';
    const isAutoBorderNumberMode = currentInputMode === 'auto' && autoConfig.type === 'border-number';
    isConstraintNumberInput =
      isNumberInputMode || isDirecInputMode || isAutoNumberMode || isAutoDirecMode || isAutoBorderNumberMode;
  }

  const allowNonNumeric = !isConstraintNumberInput && tool !== 'number-directional';
  return { isNumberTool, isConstraintNumberInput, allowNonNumeric };
}

interface MaxDigitsOptions {
  gridRows: number;
  gridCols: number;
  editableLayer: 'problem' | 'answer' | null;
  currentInputMode: string | null;
  currentSchemaId: string | null;
}

export function getNumberMaxDigits({
  gridRows,
  gridCols,
  editableLayer,
  currentInputMode,
  currentSchemaId,
}: MaxDigitsOptions): number {
  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
  const isEditMode = editableLayer === 'problem';
  const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
  const isDirecType = currentInputMode === 'direc' ||
    (currentInputMode === 'auto' && autoConfig.type === 'direc');

  return getMaxDigitsForGrid(gridRows, gridCols, isDirecType);
}
