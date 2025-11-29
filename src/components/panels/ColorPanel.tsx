/**
 * Color Panel Component
 *
 * Displays Penpa-edit compatible color selection panel
 */

import React, { useCallback, useState, useRef } from 'react';
import { PENPA_COLORS, getPenpaColor } from '../../types/penpaElements';

interface ColorPanelProps {
  selectedColor: number | string;
  secondaryColor: number | string;
  onColorChange: (colorIndex: number | string) => void;
  onSecondaryColorChange: (colorIndex: number | string) => void;
  onSwapColors: () => void;
  showSecondary?: boolean;
  className?: string;
}

// Color palette matching Penpa-edit
const COLOR_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0]; // 0 = transparent at end

const COLOR_NAMES: Record<number, string> = {
  0: 'Transparent',
  1: 'Light Grey',
  2: 'Grey',
  3: 'Black',
  4: 'Red',
  5: 'Blue',
  6: 'Green',
  7: 'Yellow',
  8: 'Purple',
  9: 'Orange',
  10: 'Pink',
  11: 'Cyan',
  12: 'White',
};

// Helper to get color display value
const getColorValue = (color: number | string): string => {
  if (typeof color === 'string') {
    return color;
  }
  return getPenpaColor(color);
};

// Helper to get color name
const getColorName = (color: number | string): string => {
  if (typeof color === 'string') {
    return `Custom (${color})`;
  }
  return COLOR_NAMES[color] || 'Unknown';
};

export const ColorPanel: React.FC<ColorPanelProps> = ({
  selectedColor,
  secondaryColor,
  onColorChange,
  onSecondaryColorChange,
  onSwapColors,
  showSecondary = true,
  className = '',
}) => {
  const [customColor, setCustomColor] = useState('#ff6600');
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleColorClick = useCallback(
    (colorIndex: number, e: React.MouseEvent) => {
      if (e.shiftKey || e.button === 2) {
        // Shift+click or right-click sets secondary color
        e.preventDefault();
        onSecondaryColorChange(colorIndex);
      } else {
        onColorChange(colorIndex);
      }
    },
    [onColorChange, onSecondaryColorChange]
  );

  const handleContextMenu = useCallback(
    (colorIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      onSecondaryColorChange(colorIndex);
    },
    [onSecondaryColorChange]
  );

  const handleCustomColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomColor(e.target.value);
    },
    []
  );

  const handleCustomColorClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey || e.button === 2) {
        e.preventDefault();
        onSecondaryColorChange(customColor);
      } else {
        onColorChange(customColor);
      }
    },
    [customColor, onColorChange, onSecondaryColorChange]
  );

  const handleCustomColorContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onSecondaryColorChange(customColor);
    },
    [customColor, onSecondaryColorChange]
  );

  const openColorPicker = useCallback(() => {
    colorInputRef.current?.click();
  }, []);

  const isCustomSelected = typeof selectedColor === 'string';
  const isCustomSecondary = typeof secondaryColor === 'string';

  return (
    <div className={`color-panel ${className}`} style={styles.container}>
      {/* Current Colors Display */}
      <div style={styles.currentColors}>
        <div
          style={{
            ...styles.primaryColor,
            backgroundColor: getColorValue(selectedColor),
          }}
          title={`Primary: ${getColorName(selectedColor)}`}
        />
        {showSecondary && (
          <>
            <button
              onClick={onSwapColors}
              style={styles.swapButton}
              title="Swap colors (Space)"
            >
              ⇆
            </button>
            <div
              style={{
                ...styles.secondaryColor,
                backgroundColor: getColorValue(secondaryColor),
              }}
              title={`Secondary: ${getColorName(secondaryColor)}`}
            />
          </>
        )}
      </div>

      {/* Color Grid */}
      <div style={styles.colorGrid}>
        {COLOR_INDICES.map((colorIndex) => {
          const color = getPenpaColor(colorIndex);
          const isSelected = !isCustomSelected && colorIndex === selectedColor;
          const isSecondary = !isCustomSecondary && colorIndex === secondaryColor;
          const isTransparent = colorIndex === 0;

          return (
            <button
              key={colorIndex}
              onClick={(e) => handleColorClick(colorIndex, e)}
              onContextMenu={(e) => handleContextMenu(colorIndex, e)}
              style={{
                ...styles.colorSwatch,
                backgroundColor: color,
                ...(isTransparent ? styles.transparentSwatch : {}),
                ...(isSelected ? styles.colorSwatchSelected : {}),
                ...(isSecondary && !isSelected ? styles.colorSwatchSecondary : {}),
              }}
              title={`${COLOR_NAMES[colorIndex]} (${colorIndex})\nShift+click for secondary`}
            >
              {isTransparent && <span style={styles.transparentX}>×</span>}
            </button>
          );
        })}
      </div>

      {/* Custom Color Section */}
      <div style={styles.customColorSection}>
        <div style={styles.customColorLabel}>Custom</div>
        <div style={styles.customColorRow}>
          <input
            ref={colorInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            style={styles.colorInput}
          />
          <button
            onClick={handleCustomColorClick}
            onContextMenu={handleCustomColorContextMenu}
            style={{
              ...styles.customColorSwatch,
              backgroundColor: customColor,
              ...(isCustomSelected && selectedColor === customColor ? styles.colorSwatchSelected : {}),
              ...(isCustomSecondary && secondaryColor === customColor && !(isCustomSelected && selectedColor === customColor) ? styles.colorSwatchSecondary : {}),
            }}
            title={`Custom: ${customColor}\nClick to use | Shift+click for secondary`}
          />
          <button
            onClick={openColorPicker}
            style={styles.pickButton}
            title="Pick custom color"
          >
            Pick
          </button>
        </div>
      </div>

      {/* Shortcut hint */}
      <div style={styles.hint}>
        1-9, 0: Quick select | Space: Swap
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  currentColors: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    justifyContent: 'center',
  },
  primaryColor: {
    width: '36px',
    height: '36px',
    borderRadius: '4px',
    border: '2px solid #333',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  secondaryColor: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: '1px solid #666',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  swapButton: {
    width: '24px',
    height: '24px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '4px',
  },
  colorSwatch: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    border: '2px solid #333',
    transform: 'scale(1.1)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  colorSwatchSecondary: {
    border: '2px dashed #666',
  },
  transparentSwatch: {
    background: `repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px`,
  },
  transparentX: {
    color: '#999',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  hint: {
    fontSize: '10px',
    color: '#888',
    textAlign: 'center',
  },
  customColorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    borderTop: '1px solid #ddd',
    paddingTop: '8px',
    marginTop: '4px',
  },
  customColorLabel: {
    fontSize: '11px',
    color: '#666',
    fontWeight: 500,
  },
  customColorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  colorInput: {
    width: '28px',
    height: '28px',
    padding: 0,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  customColorSwatch: {
    width: '48px',
    height: '28px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  pickButton: {
    padding: '4px 8px',
    fontSize: '11px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
};

export default ColorPanel;
