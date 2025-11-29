/**
 * Style Panel Component
 *
 * Displays line style, thickness, and size options
 */

import React, { useCallback } from 'react';
import { PenpaLineStyle, getLineStyleProps } from '../../types/penpaElements';
import type { PenpaSymbolSize } from '../../types/penpaModes';

interface StylePanelProps {
  lineStyle: number;
  symbolSize: PenpaSymbolSize;
  onLineStyleChange: (style: number) => void;
  onSymbolSizeChange: (size: PenpaSymbolSize) => void;
  mode?: 'line' | 'symbol' | 'number' | 'all';
  className?: string;
}

const LINE_STYLES: { style: number; label: string; shortcut: string }[] = [
  { style: PenpaLineStyle.NORMAL, label: 'Normal', shortcut: '1' },
  { style: PenpaLineStyle.DOTTED, label: 'Dotted', shortcut: '2' },
  { style: PenpaLineStyle.DASHED, label: 'Dashed', shortcut: '3' },
  { style: PenpaLineStyle.BOLD, label: 'Bold', shortcut: '4' },
  { style: PenpaLineStyle.VERY_BOLD, label: 'Very Bold', shortcut: '5' },
  { style: PenpaLineStyle.X_MARK, label: 'X Mark', shortcut: '6' },
  { style: PenpaLineStyle.DOUBLE, label: 'Double', shortcut: '7' },
  { style: PenpaLineStyle.DELETE, label: 'Delete', shortcut: '8' },
];

const SYMBOL_SIZES: { size: PenpaSymbolSize; label: string; shortcut: string }[] = [
  { size: 'L', label: 'Large', shortcut: 'L' },
  { size: 'M', label: 'Medium', shortcut: 'M' },
  { size: 'S', label: 'Small', shortcut: 'S' },
  { size: 'SS', label: 'Extra Small', shortcut: '' },
];

export const StylePanel: React.FC<StylePanelProps> = ({
  lineStyle,
  symbolSize,
  onLineStyleChange,
  onSymbolSizeChange,
  mode = 'all',
  className = '',
}) => {
  const showLineStyles = mode === 'line' || mode === 'all';
  const showSymbolSizes = mode === 'symbol' || mode === 'number' || mode === 'all';

  return (
    <div className={`style-panel ${className}`} style={styles.container}>
      {/* Line Style Selection */}
      {showLineStyles && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Line Style</div>
          <div style={styles.styleGrid}>
            {LINE_STYLES.map(({ style, label, shortcut }) => {
              const props = getLineStyleProps(style);
              return (
                <button
                  key={style}
                  onClick={() => onLineStyleChange(style)}
                  style={{
                    ...styles.styleButton,
                    ...(lineStyle === style ? styles.styleButtonActive : {}),
                  }}
                  title={`${label} (${shortcut})`}
                >
                  <LineStylePreview style={style} />
                  {shortcut && <span style={styles.shortcut}>{shortcut}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Symbol Size Selection */}
      {showSymbolSizes && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Size</div>
          <div style={styles.sizeButtons}>
            {SYMBOL_SIZES.map(({ size, label, shortcut }) => (
              <button
                key={size}
                onClick={() => onSymbolSizeChange(size)}
                style={{
                  ...styles.sizeButton,
                  ...(symbolSize === size ? styles.sizeButtonActive : {}),
                }}
                title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Line style preview component
 */
const LineStylePreview: React.FC<{ style: number }> = ({ style }) => {
  const props = getLineStyleProps(style);

  if (style === PenpaLineStyle.X_MARK) {
    return (
      <svg width="40" height="16" viewBox="0 0 40 16">
        <line x1="4" y1="4" x2="12" y2="12" stroke="#333" strokeWidth="2" />
        <line x1="12" y1="4" x2="4" y2="12" stroke="#333" strokeWidth="2" />
      </svg>
    );
  }

  if (style === PenpaLineStyle.DELETE) {
    return (
      <svg width="40" height="16" viewBox="0 0 40 16">
        <line
          x1="4"
          y1="8"
          x2="36"
          y2="8"
          stroke="#ccc"
          strokeWidth="2"
          strokeDasharray="4,2"
        />
      </svg>
    );
  }

  if (style === PenpaLineStyle.DOUBLE) {
    return (
      <svg width="40" height="16" viewBox="0 0 40 16">
        <line x1="4" y1="5" x2="36" y2="5" stroke="#333" strokeWidth="1.5" />
        <line x1="4" y1="11" x2="36" y2="11" stroke="#333" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg width="40" height="16" viewBox="0 0 40 16">
      <line
        x1="4"
        y1="8"
        x2="36"
        y2="8"
        stroke={props.stroke || '#333'}
        strokeWidth={props.strokeWidth}
        strokeDasharray={props.strokeDasharray}
      />
    </svg>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
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
  styleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '4px',
  },
  styleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  styleButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4a90d9',
  },
  shortcut: {
    position: 'absolute',
    bottom: '2px',
    right: '4px',
    fontSize: '9px',
    color: '#888',
  },
  sizeButtons: {
    display: 'flex',
    gap: '4px',
  },
  sizeButton: {
    flex: 1,
    padding: '8px 4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.15s ease',
  },
  sizeButtonActive: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
    color: '#fff',
  },
};

export default StylePanel;
