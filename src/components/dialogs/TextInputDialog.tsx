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

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit({
        value: value.trim(),
        textType,
      });
    }
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

  const isFreeText = textType === 'free';
  const characters = CHARACTER_SETS[textType] || [];

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        className="bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[300px] max-w-[400px]"
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSubmit}>
          {/* Dialog title */}
          <div className="mb-3 text-sm font-semibold text-office-text">
            {t(`tool.text.${textType}`)}
          </div>

          {/* Value input */}
          <div className="mb-3">
            <label className="block text-sm text-office-text mb-1">
              {t('tool.text.inputPlaceholder')}
            </label>
            <input
              ref={inputRef}
              type="text"
              className="input-office w-full text-lg"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isFreeText ? t('tool.text.inputPlaceholder') : ''}
              maxLength={isFreeText ? 20 : 2}
            />
          </div>

          {/* Character picker for non-free text */}
          {!isFreeText && characters.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs text-office-text-secondary mb-1">
                {t('tool.text.selectCharacter') || 'Select character'}
              </label>
              <div className="flex flex-wrap gap-0.5 max-h-[200px] overflow-y-auto p-1 border border-office-border rounded">
                {characters.map((char, idx) => (
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

          {/* Quick lowercase letters for alphabet mode */}
          {textType === 'alphabet' && (
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
