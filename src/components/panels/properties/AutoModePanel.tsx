/**
 * Auto mode panel - shows settings based on current auto mode type
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { getAutoModeConfig } from '../../../constraints/inputModeMapping';
import { constraintCatalog } from '../../../constraints';
import { NumberInputPanel } from './NumberInputPanel';
import { ArrowDirectionSettings } from './ArrowDirectionSettings';

export const AutoModePanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    activeLayer,
    currentSchemaId,
  } = usePuzzleStore();

  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;

  if (!currentSchema) {
    return null;
  }

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
};
