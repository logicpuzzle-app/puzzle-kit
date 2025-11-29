import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export type NumberPosition = 'center' | 'corner' | 'side' | 'candidates';

interface NumberInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cellId: string;
  initialValue?: string;
  initialPosition?: NumberPosition;
  initialCornerIndex?: number;
  initialSideIndex?: number;
  initialCandidates?: number[];
  onSubmit: (data: {
    value: string;
    position: NumberPosition;
    cornerIndex?: number;
    sideIndex?: number;
    candidates?: number[];
  }) => void;
}

export const NumberInputDialog: React.FC<NumberInputDialogProps> = ({
  isOpen,
  onClose,
  cellId,
  initialValue = '',
  initialPosition = 'center',
  initialCornerIndex,
  initialSideIndex,
  initialCandidates,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [position, setPosition] = useState<NumberPosition>(initialPosition);
  const [cornerIndex, setCornerIndex] = useState<number>(initialCornerIndex ?? 0);
  const [sideIndex, setSideIndex] = useState<number>(initialSideIndex ?? 0);
  const [candidates, setCandidates] = useState<Set<number>>(new Set(initialCandidates ?? []));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setPosition(initialPosition);
      setCornerIndex(initialCornerIndex ?? 0);
      setSideIndex(initialSideIndex ?? 0);
      setCandidates(new Set(initialCandidates ?? []));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue, initialPosition, initialCornerIndex, initialSideIndex, initialCandidates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (position === 'candidates') {
      if (candidates.size > 0) {
        onSubmit({
          value: Array.from(candidates).sort((a, b) => a - b).join(''),
          position,
          candidates: Array.from(candidates).sort((a, b) => a - b),
        });
      }
    } else if (value.trim()) {
      onSubmit({
        value: value.trim(),
        position,
        cornerIndex: position === 'corner' ? cornerIndex : undefined,
        sideIndex: position === 'side' ? sideIndex : undefined,
      });
    }
    onClose();
  };

  const toggleCandidate = (num: number) => {
    setCandidates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(num)) {
        newSet.delete(num);
      } else {
        newSet.add(num);
      }
      return newSet;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Quick number buttons
  const handleQuickNumber = (num: string) => {
    setValue((prev) => prev + num);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        className="bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[280px]"
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSubmit}>
          {/* Value input */}
          <div className="mb-3">
            <label className="block text-sm text-office-text mb-1">
              {t('tool.number.normal')}
            </label>
            <input
              ref={inputRef}
              type="text"
              className="input-office w-full"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="1, 2, 3..."
              maxLength={20}
            />
          </div>

          {/* Quick number pad */}
          <div className="mb-3">
            <div className="grid grid-cols-5 gap-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="btn-office py-2"
                  onClick={() => handleQuickNumber(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Position selector */}
          <div className="mb-3">
            <label className="block text-xs text-office-text-secondary mb-1">
              {t('prop.position') || 'Position'}
            </label>
            <div className="flex gap-1 flex-wrap">
              {(['center', 'corner', 'side', 'candidates'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`flex-1 min-w-[60px] px-2 py-1 text-xs border rounded-sm transition-colors ${
                    position === pos
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setPosition(pos)}
                >
                  {t(`tool.number.${pos}`) || pos}
                </button>
              ))}
            </div>
          </div>

          {/* Corner index selector */}
          {position === 'corner' && (
            <div className="mb-3">
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('prop.cornerPosition') || 'Corner'}
              </label>
              <div className="grid grid-cols-2 gap-1 w-24 mx-auto">
                {[
                  { idx: 0, label: '↖' },
                  { idx: 1, label: '↗' },
                  { idx: 2, label: '↙' },
                  { idx: 3, label: '↘' },
                ].map((c) => (
                  <button
                    key={c.idx}
                    type="button"
                    className={`px-3 py-2 text-sm border rounded-sm transition-colors ${
                      cornerIndex === c.idx
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setCornerIndex(c.idx)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Side index selector */}
          {position === 'side' && (
            <div className="mb-3">
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('prop.sidePosition') || 'Side'}
              </label>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  className={`px-4 py-1 text-sm border rounded-sm transition-colors ${
                    sideIndex === 0
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setSideIndex(0)}
                >
                  ↑
                </button>
                <div className="flex gap-8">
                  <button
                    type="button"
                    className={`px-4 py-1 text-sm border rounded-sm transition-colors ${
                      sideIndex === 3
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setSideIndex(3)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-1 text-sm border rounded-sm transition-colors ${
                      sideIndex === 1
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setSideIndex(1)}
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  className={`px-4 py-1 text-sm border rounded-sm transition-colors ${
                    sideIndex === 2
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  }`}
                  onClick={() => setSideIndex(2)}
                >
                  ↓
                </button>
              </div>
            </div>
          )}

          {/* Candidates selector (3x3 grid for 1-9) */}
          {position === 'candidates' && (
            <div className="mb-3">
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('tool.number.selectCandidates') || 'Select candidates'}
              </label>
              <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`px-3 py-2 text-sm font-medium border rounded-sm transition-colors ${
                      candidates.has(num)
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => toggleCandidate(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="text-center text-xs text-office-text-secondary mt-2">
                {candidates.size > 0
                  ? `Selected: ${Array.from(candidates).sort((a, b) => a - b).join(', ')}`
                  : t('tool.number.noCandidatesSelected') || 'Click numbers to toggle'}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn-office"
              onClick={() => {
                setValue('');
                setCandidates(new Set());
              }}
            >
              {t('action.clear') || 'Clear'}
            </button>
            <button type="button" className="btn-office" onClick={onClose}>
              {t('action.cancel')}
            </button>
            <button type="submit" className="btn-office-primary">
              {t('action.ok')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
