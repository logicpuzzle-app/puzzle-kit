import React, { useMemo, useState } from 'react';

type NPGeneratorGridMode = 'numbers' | 'pattern' | 'readonly';

interface NPGeneratorGridEditorProps {
  size: number;
  values: number[];
  mode: NPGeneratorGridMode;
  label: string;
  instructions?: string;
  clearLabel?: string;
  emptyLabel?: string;
  numberPadLabel?: string;
  blockLabels?: number[];
  diagonal?: boolean;
  onChange?: (values: number[]) => void;
}

function normalizedValues(values: number[], size: number): number[] {
  return Array.from({ length: size * size }, (_, index) => values[index] ?? 0);
}

export const NPGeneratorGridEditor: React.FC<NPGeneratorGridEditorProps> = ({
  size,
  values,
  mode,
  label,
  instructions,
  clearLabel = 'Clear board',
  emptyLabel = 'Empty',
  numberPadLabel = 'Number pad',
  blockLabels = [],
  diagonal = false,
  onChange,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const cells = useMemo(() => normalizedValues(values, size), [values, size]);
  const editable = mode !== 'readonly' && onChange !== undefined;
  const hasBlockLabels = blockLabels.length === size * size;
  const selectedCell = Math.min(selectedIndex, size * size - 1);

  const updateCell = (index: number, value: number) => {
    if (!editable) return;
    const next = [...cells];
    next[index] = value;
    onChange(next);
  };

  const moveSelection = (rowDelta: number, colDelta: number) => {
    const row = Math.floor(selectedCell / size);
    const col = selectedCell % size;
    const nextRow = Math.max(0, Math.min(size - 1, row + rowDelta));
    const nextCol = Math.max(0, Math.min(size - 1, col + colDelta));
    setSelectedIndex(nextRow * size + nextCol);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1, 0);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1, 0);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSelection(0, -1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveSelection(0, 1);
      return;
    }
    if (!editable) return;
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      event.preventDefault();
      updateCell(selectedCell, 0);
      return;
    }
    if (mode === 'numbers' && /^[1-9]$/.test(event.key)) {
      const value = Number(event.key);
      if (value <= size) {
        event.preventDefault();
        updateCell(selectedCell, value);
      }
    }
  };

  const selectCell = (index: number) => {
    setSelectedIndex(index);
    if (editable && mode === 'pattern') {
      updateCell(index, cells[index] ? 0 : 1);
    }
  };

  return (
    <div className="space-y-2">
      {instructions && (
        <p className="text-xs text-office-text-secondary">{instructions}</p>
      )}
      <div className="overflow-x-auto">
        <div
          role="grid"
          aria-label={label}
          className="relative grid mx-auto bg-white select-none"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            width: `${Math.min(560, Math.max(240, size * 44))}px`,
            maxWidth: '100%',
            aspectRatio: '1 / 1',
          }}
        >
          {cells.map((value, index) => {
            const row = Math.floor(index / size);
            const col = index % size;
            const rightBoundary =
              col === size - 1 ||
              (hasBlockLabels && blockLabels[index] !== blockLabels[index + 1]);
            const bottomBoundary =
              row === size - 1 ||
              (hasBlockLabels && blockLabels[index] !== blockLabels[index + size]);
            const selected = editable && selectedCell === index;
            const activePattern = mode === 'pattern' && value !== 0;
            const cellLabel = `${label}: ${row + 1}, ${col + 1}${
              activePattern ? ', selected' : value ? `, ${value}` : `, ${emptyLabel}`
            }`;

            return (
              <button
                key={index}
                type="button"
                role="gridcell"
                aria-label={cellLabel}
                aria-selected={selected}
                disabled={!editable}
                className={`relative min-w-0 min-h-0 w-full h-full overflow-hidden flex items-center justify-center p-0 leading-none box-border
                  ${activePattern ? 'bg-blue-100 text-office-accent' : 'bg-white text-office-text'}
                  ${editable ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}
                  ${selected ? 'z-10 ring-2 ring-inset ring-office-accent' : ''}
                `}
                style={{
                  borderStyle: 'solid',
                  borderColor: '#6b7280',
                  borderTopWidth: row === 0 ? 2 : 0,
                  borderLeftWidth: col === 0 ? 2 : 0,
                  borderRightWidth: rightBoundary ? 2 : 1,
                  borderBottomWidth: bottomBoundary ? 2 : 1,
                  fontSize: `clamp(9px, ${Math.min(4.5, 32 / size)}vw, ${Math.max(11, 28 - size)}px)`,
                }}
                onClick={() => selectCell(index)}
                onFocus={() => setSelectedIndex(index)}
                onKeyDown={handleKeyDown}
              >
                {activePattern ? (
                  <span
                    aria-hidden="true"
                    className="block rounded-full bg-office-accent"
                    style={{
                      width: size > 16 ? '35%' : '45%',
                      aspectRatio: '1 / 1',
                    }}
                  />
                ) : value > 0 ? (
                  <span className="font-semibold">{value}</span>
                ) : null}
              </button>
            );
          })}
          {diagonal && (
            <svg
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="0" x2="100" y2="100" stroke="#2563eb" strokeWidth="0.7" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#2563eb" strokeWidth="0.7" />
            </svg>
          )}
        </div>
      </div>

      {editable && mode === 'numbers' && (
        <div>
          <div className="text-xs text-office-text-secondary mb-1">{numberPadLabel}</div>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: size }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                type="button"
                className="btn-office min-w-8 h-8 px-2"
                onClick={() => updateCell(selectedCell, value)}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              className="btn-office h-8 px-3"
              onClick={() => updateCell(selectedCell, 0)}
            >
              {emptyLabel}
            </button>
          </div>
        </div>
      )}

      {editable && (
        <button
          type="button"
          className="btn-office text-xs"
          onClick={() => onChange(new Array(size * size).fill(0))}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
};
