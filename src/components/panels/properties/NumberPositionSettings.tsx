import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { toDataLayer } from '../../../types';

// Position icons as SVG components
const PositionIconCenter: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="3" y="3" width="10" height="10" fill={active ? 'white' : 'currentColor'} />
  </svg>
);

const PositionIconCorner: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="1" y="1" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="9" y="1" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="1" y="9" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="9" y="9" width="6" height="6" fill={active ? 'white' : 'currentColor'} />
  </svg>
);

const PositionIconSide: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="5" y="0" width="6" height="5" fill={active ? 'white' : 'currentColor'} />
    <rect x="11" y="5" width="5" height="6" fill={active ? 'white' : 'currentColor'} />
    <rect x="5" y="11" width="6" height="5" fill={active ? 'white' : 'currentColor'} />
    <rect x="0" y="5" width="5" height="6" fill={active ? 'white' : 'currentColor'} />
  </svg>
);

const PositionIconCandidates: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    {[0, 1, 2].map(row =>
      [0, 1, 2].map(col => (
        <rect
          key={`${row}-${col}`}
          x={1 + col * 5}
          y={1 + row * 5}
          width="4"
          height="4"
          fill={active ? 'white' : 'currentColor'}
        />
      ))
    )}
  </svg>
);

// Candidates selector component - shows and toggles candidates in selected cell
const CandidatesSelector: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    numberSelection,
    puzzle,
    activeLayer,
    addNumber,
    removeNumber,
  } = usePuzzleStore();

  const dataLayer = toDataLayer(activeLayer);

  // Get existing candidates in selected cell
  const getCellCandidates = (): Set<number> => {
    if (!numberSelection) return new Set();
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[dataLayer].numbers;
    const candidates = new Set<number>();

    Object.values(numbers).forEach((n) => {
      if (n.cellId === cellId && n.position === 'candidates' && n.value) {
        const num = parseInt(n.value, 10);
        if (num >= 1 && num <= 9) {
          candidates.add(num);
        }
      }
    });

    return candidates;
  };

  const cellCandidates = getCellCandidates();

  const handleToggleCandidate = (n: number) => {
    if (!numberSelection) return;
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[dataLayer].numbers;

    // Find existing candidate
    const existingEntry = Object.entries(numbers).find(
      ([, num]) => num.cellId === cellId && num.position === 'candidates' && num.value === String(n)
    );

    if (existingEntry) {
      // Remove existing
      removeNumber(existingEntry[0]);
    } else {
      // Add new candidate
      addNumber({
        cellId,
        value: String(n),
        size: toolSettings.numberSize,
        position: 'candidates',
        cornerIndex: 0,
        sideIndex: 0,
        color: toolSettings.color,
        layer: dataLayer,
      });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-office-text-secondary text-center">
        {numberSelection ? t('tool.number.selectCandidates') : t('tool.number.noCandidatesSelected')}
      </span>
      <div className="grid grid-cols-3 gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const selected = cellCandidates.has(n);
          return (
            <button
              key={n}
              className={`w-6 h-6 text-xs border rounded-sm transition-colors ${
                selected
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleToggleCandidate(n)}
              disabled={!numberSelection}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Number position settings component with visual grid selector
export const NumberPositionSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    numberSelection,
    puzzle,
    activeLayer,
    addNumber,
  } = usePuzzleStore();

  const dataLayer = toDataLayer(activeLayer);

  const sizes: { value: 'large' | 'medium' | 'small'; labelKey: string }[] = [
    { value: 'large', labelKey: 'size.large' },
    { value: 'medium', labelKey: 'size.medium' },
    { value: 'small', labelKey: 'size.small' },
  ];

  const positions: { id: 'center' | 'corner' | 'side' | 'candidates'; labelKey: string }[] = [
    { id: 'center', labelKey: 'tool.number.center' },
    { id: 'corner', labelKey: 'tool.number.corner' },
    { id: 'side', labelKey: 'tool.number.side' },
    { id: 'candidates', labelKey: 'tool.number.candidates' },
  ];

  const getPositionIcon = (id: string, active: boolean) => {
    switch (id) {
      case 'center': return <PositionIconCenter active={active} />;
      case 'corner': return <PositionIconCorner active={active} />;
      case 'side': return <PositionIconSide active={active} />;
      case 'candidates': return <PositionIconCandidates active={active} />;
      default: return null;
    }
  };

  const corners = [
    { idx: 0, labelKey: 'position.topLeft', pos: 'top-0 left-0' },
    { idx: 1, labelKey: 'position.topRight', pos: 'top-0 right-0' },
    { idx: 2, labelKey: 'position.bottomLeft', pos: 'bottom-0 left-0' },
    { idx: 3, labelKey: 'position.bottomRight', pos: 'bottom-0 right-0' },
  ];

  // Find existing number at current position
  const findExistingNumber = () => {
    if (!numberSelection) return null;
    const cellId = `cell-${numberSelection.row}-${numberSelection.col}`;
    const numbers = puzzle[dataLayer].numbers;
    const position = toolSettings.numberPosition;
    const cornerIndex = toolSettings.cornerIndex;
    const sideIndex = toolSettings.sideIndex;

    return Object.entries(numbers).find(([, n]) => {
      if (n.cellId !== cellId) return false;
      if (position === 'center') return n.position === 'center';
      if (position === 'corner') return n.position === 'corner' && n.cornerIndex === cornerIndex;
      if (position === 'side') return n.position === 'side' && n.sideIndex === sideIndex;
      return false;
    });
  };

  // Update existing number size
  const handleSizeChange = (newSize: 'large' | 'medium' | 'small') => {
    setToolSettings({ numberSize: newSize });

    const existingEntry = findExistingNumber();
    if (existingEntry) {
      const [, existing] = existingEntry;
      addNumber({
        cellId: existing.cellId,
        value: existing.value,
        size: newSize,
        position: existing.position,
        cornerIndex: existing.cornerIndex,
        sideIndex: existing.sideIndex,
        color: existing.color,
        layer: dataLayer,
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Number Size */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('prop.size')}
        </label>
        <div className="flex gap-1">
          {sizes.map((size) => (
            <button
              key={size.value}
              className={`flex-1 px-2 py-1.5 text-xs border rounded-sm transition-colors ${
                toolSettings.numberSize === size.value
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleSizeChange(size.value)}
            >
              {t(size.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Number Position */}
      <div>
        <label className="block text-xs text-office-text-secondary mb-1">
          {t('prop.position') || 'Position'}
        </label>
        <div className="flex gap-1 mb-2">
          {positions.map((pos) => {
            const isActive = toolSettings.numberPosition === pos.id;
            return (
              <button
                key={pos.id}
                className={`flex-1 px-2 py-1.5 border rounded-sm transition-colors flex items-center justify-center ${
                  isActive
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ numberPosition: pos.id })}
                title={t(pos.labelKey)}
              >
                {getPositionIcon(pos.id, isActive)}
              </button>
            );
          })}
        </div>

        {/* Visual grid selector for corner/side */}
        <div className="flex justify-center">
          {/* Corner index selector */}
          {toolSettings.numberPosition === 'corner' && (
            <div className="relative w-16 h-16 border border-office-border bg-white">
              {corners.map((c) => (
                <button
                  key={c.idx}
                  className={`absolute w-6 h-6 text-[10px] border rounded-sm ${c.pos} ${
                    toolSettings.cornerIndex === c.idx
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setToolSettings({ cornerIndex: c.idx })}
                  title={t(c.labelKey)}
                >
                  {t(c.labelKey)}
                </button>
              ))}
              <span className="absolute inset-0 flex items-center justify-center text-xs text-office-text-secondary pointer-events-none">
                {t('tool.number.cell')}
              </span>
            </div>
          )}

          {/* Side index selector */}
          {toolSettings.numberPosition === 'side' && (
            <div className="relative w-20 h-20 border border-office-border bg-white">
              {/* Top */}
              <button
                className={`absolute w-6 h-5 text-[10px] border rounded-sm top-0 left-1/2 -translate-x-1/2 ${
                  toolSettings.sideIndex === 0
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 0 })}
                title={t('position.top')}
              >
                {t('position.top')}
              </button>
              {/* Right */}
              <button
                className={`absolute w-5 h-6 text-[10px] border rounded-sm top-1/2 right-0 -translate-y-1/2 ${
                  toolSettings.sideIndex === 1
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 1 })}
                title={t('position.right')}
              >
                {t('position.right')}
              </button>
              {/* Bottom */}
              <button
                className={`absolute w-6 h-5 text-[10px] border rounded-sm bottom-0 left-1/2 -translate-x-1/2 ${
                  toolSettings.sideIndex === 2
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 2 })}
                title={t('position.bottom')}
              >
                {t('position.bottom')}
              </button>
              {/* Left */}
              <button
                className={`absolute w-5 h-6 text-[10px] border rounded-sm top-1/2 left-0 -translate-y-1/2 ${
                  toolSettings.sideIndex === 3
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setToolSettings({ sideIndex: 3 })}
                title={t('position.left')}
              >
                {t('position.left')}
              </button>
              <span className="absolute inset-0 flex items-center justify-center text-xs text-office-text-secondary pointer-events-none">
                {t('tool.number.cell')}
              </span>
            </div>
          )}

          {/* Candidates selector - shows candidates in selected cell */}
          {toolSettings.numberPosition === 'candidates' && (
            <CandidatesSelector />
          )}
        </div>
      </div>
    </div>
  );
};
