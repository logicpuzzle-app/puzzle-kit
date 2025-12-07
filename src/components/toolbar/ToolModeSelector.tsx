/**
 * ToolModeSelector - Input mode selector for constraint-aware mode
 *
 * Based on pzprjs inputModes system.
 * Shows tool buttons based on the current puzzle schema's inputModes.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { InputMode } from '../../constraints/types';

/**
 * Icons for each input mode
 */
const INPUT_MODE_ICONS: Record<InputMode, string> = {
  'auto': '🔄',
  'number': '🔢',
  'number-': '🔢',
  'clear': '🧹',
  'line': '━',
  'peke': '✕',
  'shade': '■',
  'unshade': '□',
  'border': '│',
  'subline': '┄',
  'bgcolor': '🎨',
  'bgcolor1': '1️⃣',
  'bgcolor2': '2️⃣',
  'subcircle': '◯',
  'subcross': '✗',
  'circle-unshade': '○',
  'circle-shade': '●',
  'arrow': '→',
  'direc': '↗',
  'bar': '┃',
  'empty': '∅',
  'ice': '❄',
  'crossdot': '⊙',
  'objblank': '·',
  'completion': '✓',
  'info-line': 'ℹ',
  'info-blk': 'ℹ',
  'info-ublk': 'ℹ',
  'info-room': 'ℹ',
};

interface ToolModeSelectorProps {
  /** Available input modes from the constraint schema */
  modes: InputMode[];
  /** Currently selected mode */
  currentMode: InputMode;
  /** Callback when mode is changed */
  onModeChange: (mode: InputMode) => void;
}

export const ToolModeSelector: React.FC<ToolModeSelectorProps> = ({
  modes,
  currentMode,
  onModeChange,
}) => {
  const { t } = useTranslation();

  // Filter out info modes for display (they're not primary input modes)
  const displayModes = modes.filter(mode => !mode.startsWith('info-'));
  const infoModes = modes.filter(mode => mode.startsWith('info-'));

  return (
    <div className="flex items-center gap-2">
      {/* Primary input mode buttons */}
      <div className="flex items-center gap-1">
        {displayModes.map((mode) => (
          <button
            key={mode}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-sm border transition-colors ${
              currentMode === mode
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white border-office-border hover:bg-office-ribbon-hover'
            }`}
            onClick={() => onModeChange(mode)}
            title={t(`inputMode.${mode}.desc`, t(`inputMode.${mode}`))}
          >
            <span>{INPUT_MODE_ICONS[mode] || '?'}</span>
            <span>{t(`inputMode.${mode}`)}</span>
          </button>
        ))}
      </div>

      {/* Info mode buttons - shown separately, disabled until implemented */}
      {infoModes.length > 0 && (
        <>
          <div className="w-px h-6 bg-office-border mx-1" />
          <div className="flex items-center gap-1">
            {infoModes.map((mode) => (
              <button
                key={mode}
                disabled
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-sm border bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                title={t(`inputMode.${mode}.desc`, t(`inputMode.${mode}`) + ' (未実装)')}
              >
                <span>{INPUT_MODE_ICONS[mode] || 'ℹ'}</span>
                <span>{t(`inputMode.${mode}`)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

