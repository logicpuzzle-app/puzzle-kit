import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ShareUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export const ShareUrlDialog: React.FC<ShareUrlDialogProps> = ({
  isOpen,
  onClose,
  url,
}) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Select all text when dialog opens
      setTimeout(() => {
        textareaRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleCopyAgain = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // Select text to give visual feedback
      textareaRef.current?.select();
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        className="bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[400px] max-w-[600px]"
        onKeyDown={handleKeyDown}
      >
        {/* Success icon and title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-green-700">
            {t('share.urlCopied', 'URLをコピーしました')}
          </h2>
        </div>

        {/* URL textarea */}
        <div className="mb-4">
          <label className="block text-xs text-office-text-secondary mb-1">
            {t('share.shareUrl', '共有URL')}
          </label>
          <textarea
            ref={textareaRef}
            readOnly
            value={url}
            className="w-full h-24 p-2 text-sm font-mono border border-office-border rounded resize-none bg-gray-50 focus:outline-none focus:ring-1 focus:ring-office-accent"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <p className="mt-1 text-xs text-office-text-secondary">
            {t('share.urlHint', 'このURLを共有すると、パズルを開くことができます。')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end border-t border-office-border pt-3">
          <button
            type="button"
            className="btn-office flex items-center gap-1"
            onClick={handleCopyAgain}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {t('share.copyAgain', '再コピー')}
          </button>
          <button type="button" className="btn-office-primary" onClick={onClose}>
            {t('action.close', '閉じる')}
          </button>
        </div>
      </div>
    </div>
  );
};
