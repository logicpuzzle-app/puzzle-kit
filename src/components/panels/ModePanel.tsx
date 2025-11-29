/**
 * Mode Panel Component
 *
 * Displays Penpa-edit compatible mode selection panel
 */

import React, { useCallback } from 'react';
import type { PenpaEditMode, PenpaLayerMode } from '../../types/penpaModes';
import { getSubmodes, getModeShortcut } from '../../types/penpaModes';

interface ModePanelProps {
  editMode: PenpaEditMode;
  layerMode: PenpaLayerMode;
  submode: string;
  onEditModeChange: (mode: PenpaEditMode) => void;
  onLayerModeChange: (mode: PenpaLayerMode) => void;
  onSubmodeChange: (submode: string) => void;
  className?: string;
}

const EDIT_MODES: { mode: PenpaEditMode; label: string; icon?: string }[] = [
  { mode: 'surface', label: 'Surface', icon: '■' },
  { mode: 'line', label: 'Line', icon: '/' },
  { mode: 'lineE', label: 'Edge', icon: '|' },
  { mode: 'wall', label: 'Wall', icon: '▐' },
  { mode: 'number', label: 'Number', icon: '1' },
  { mode: 'symbol', label: 'Symbol', icon: '○' },
  { mode: 'special', label: 'Special', icon: '⬤' },
  { mode: 'cage', label: 'Cage', icon: '⊞' },
  { mode: 'combi', label: 'Combi', icon: '⬢' },
  { mode: 'board', label: 'Board', icon: '#' },
];

const LAYER_MODES: { mode: PenpaLayerMode; label: string; shortcut: string }[] = [
  { mode: 'question', label: 'Q', shortcut: 'Q' },
  { mode: 'answer', label: 'A', shortcut: 'Shift+A' },
];

export const ModePanel: React.FC<ModePanelProps> = ({
  editMode,
  layerMode,
  submode,
  onEditModeChange,
  onLayerModeChange,
  onSubmodeChange,
  className = '',
}) => {
  const submodes = getSubmodes(editMode);

  const handleModeClick = useCallback((mode: PenpaEditMode) => {
    if (mode === editMode) {
      // Same mode clicked - cycle submodes
      const currentIndex = submodes.indexOf(submode);
      const nextIndex = (currentIndex + 1) % submodes.length;
      if (submodes[nextIndex]) {
        onSubmodeChange(submodes[nextIndex]);
      }
    } else {
      onEditModeChange(mode);
      // Reset to first submode
      const newSubmodes = getSubmodes(mode);
      if (newSubmodes[0]) {
        onSubmodeChange(newSubmodes[0]);
      }
    }
  }, [editMode, submode, submodes, onEditModeChange, onSubmodeChange]);

  return (
    <div className={`mode-panel ${className}`} style={styles.container}>
      {/* Layer Mode Toggle */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Layer</div>
        <div style={styles.layerButtons}>
          {LAYER_MODES.map(({ mode, label, shortcut }) => (
            <button
              key={mode}
              onClick={() => onLayerModeChange(mode)}
              style={{
                ...styles.layerButton,
                ...(layerMode === mode ? styles.layerButtonActive : {}),
              }}
              title={shortcut}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Mode Selection */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Mode</div>
        <div style={styles.modeGrid}>
          {EDIT_MODES.map(({ mode, label, icon }) => {
            const shortcut = getModeShortcut(mode);
            return (
              <button
                key={mode}
                onClick={() => handleModeClick(mode)}
                style={{
                  ...styles.modeButton,
                  ...(editMode === mode ? styles.modeButtonActive : {}),
                }}
                title={`${label} (${shortcut})`}
              >
                <span style={styles.modeIcon}>{icon}</span>
                <span style={styles.modeLabel}>{label}</span>
                {shortcut && <span style={styles.shortcut}>{shortcut}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submode Selection */}
      {submodes.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Submode</div>
          <div style={styles.submodeList}>
            {submodes.map((sm) => (
              <button
                key={sm}
                onClick={() => onSubmodeChange(sm)}
                style={{
                  ...styles.submodeButton,
                  ...(submode === sm ? styles.submodeButtonActive : {}),
                }}
              >
                {formatSubmodeName(sm)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Format submode name for display
 */
function formatSubmodeName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace('line E', 'LineE')
    .replace('number S', 'Small')
    .trim();
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    minWidth: '180px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  layerButtons: {
    display: 'flex',
    gap: '4px',
  },
  layerButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.15s ease',
  },
  layerButtonActive: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
    color: '#fff',
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '4px',
  },
  modeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  modeButtonActive: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
    color: '#fff',
  },
  modeIcon: {
    fontSize: '16px',
    marginBottom: '2px',
  },
  modeLabel: {
    fontSize: '10px',
  },
  shortcut: {
    position: 'absolute',
    top: '2px',
    right: '4px',
    fontSize: '9px',
    opacity: 0.6,
  },
  submodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  submodeButton: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  submodeButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4a90d9',
  },
};

export default ModePanel;
