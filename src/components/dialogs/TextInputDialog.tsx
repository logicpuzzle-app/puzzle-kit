import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export type TextInputType = 'alphabet' | 'hiragana' | 'katakana' | 'free';

interface TextInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cellId: string;
  initialValue?: string;
  textType: TextInputType;
  onSubmit: (data: { value: string; textType: TextInputType }) => void;
}

const CHARACTER_SETS: Record<string, string[]> = {
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  hiragana: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(''),
  katakana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split(''),
};

export const TextInputDialog: React.FC<TextInputDialogProps> = ({
  isOpen,
  onClose,
  cellId,
  initialValue = '',
  textType,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      const timer = setTimeout(() => (textareaRef.current ?? inputRef.current)?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ value, textType: normalizedType as TextInputType });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleCharacterClick = (char: string) => {
    setValue(char);
  };

  if (!isOpen) return null;

  const normalizedType = textType.startsWith('text-') ? textType.slice(5) : textType;
  const isFreeText = normalizedType === 'free';
  const isKana = normalizedType === 'hiragana' || normalizedType === 'katakana';
  const characters = CHARACTER_SETS[normalizedType] || [];
  const kanaColumns = isKana ? Math.min(12, Math.max(8, Math.ceil(characters.length / 4))) : 10;
  const characterButtonSizeClass = isKana ? 'flex items-center justify-center' : 'w-7 h-7 text-sm';
  const kanaButtonStyle = isKana
    ? {
        width: 'clamp(20px, 6vw, 28px)',
        height: 'clamp(20px, 6vw, 28px)',
        fontSize: 'clamp(12px, 3.5vw, 14px)',
        lineHeight: 1,
      }
    : undefined;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        className={`bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[300px] ${
          isKana ? 'max-w-[640px]' : 'max-w-[400px]'
        }`}
        style={isKana ? { width: 'min(640px, 96vw)', maxHeight: 'none', overflow: 'visible' } : undefined}
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSubmit}>
          {/* Dialog title */}
          <div className="mb-3 text-sm font-semibold text-office-text">
            {t(`tool.text.${normalizedType}`)}
          </div>

          {/* Value input */}
          <div className="mb-3">
            <label htmlFor="text-symbol-value" className="block text-sm text-office-text mb-1">
              {t('tool.text.inputPlaceholder')}
            </label>
            {isFreeText ? (
              <textarea
                id="text-symbol-value"
                ref={textareaRef}
                className="input-office w-full text-lg resize-y"
                rows={4}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t('tool.text.inputPlaceholder')}
                maxLength={200}
              />
            ) : (
              <input
                id="text-symbol-value"
                ref={inputRef}
                type="text"
                className="input-office w-full text-lg"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={2}
              />
            )}
          </div>

          {/* Character picker for non-free text */}
          {!isFreeText && characters.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('tool.text.selectCharacter') || 'Select character'}
              </label>
              <div
                className={`gap-0.5 p-1 border border-office-border rounded ${
                  isKana ? 'grid overflow-visible' : 'flex flex-wrap max-h-[200px] overflow-y-auto'
                }`}
                style={isKana ? { gridTemplateColumns: `repeat(${kanaColumns}, minmax(20px, 1fr))`, maxHeight: 'none', overflow: 'visible' } : undefined}
              >
                {characters.map((char, idx) => (
                  <button
                    key={`${char}-${idx}`}
                    type="button"
                    className={`${characterButtonSizeClass} border rounded-sm transition-colors ${
                      value === char
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover hover:border-office-accent'
                    }`}
                    style={kanaButtonStyle}
                    onClick={() => handleCharacterClick(char)}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick lowercase letters for alphabet mode */}
          {normalizedType === 'alphabet' && (
            <div className="mb-3">
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('tool.text.lowercase') || 'Lowercase'}
              </label>
              <div className="flex flex-wrap gap-0.5 max-h-[100px] overflow-y-auto p-1 border border-office-border rounded">
                {'abcdefghijklmnopqrstuvwxyz'.split('').map((char, idx) => (
                  <button
                    key={`${char}-${idx}`}
                    type="button"
                    className={`w-7 h-7 text-sm border rounded-sm transition-colors ${
                      value === char
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover hover:border-office-accent'
                    }`}
                    onClick={() => handleCharacterClick(char)}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn-office"
              onClick={() => setValue('')}
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
