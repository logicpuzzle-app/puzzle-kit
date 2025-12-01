import React from 'react';
import { useTranslation } from 'react-i18next';

interface StorageErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dataSize: number;
  errorType: 'quota' | 'general';
}

export const StorageErrorDialog: React.FC<StorageErrorDialogProps> = ({
  isOpen,
  onClose,
  dataSize,
  errorType,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const sizeKB = Math.round(dataSize / 1024);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white border border-office-border shadow-lg rounded-sm p-4 min-w-[320px] max-w-[400px]">
        {/* Error icon and title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-700">
            {errorType === 'quota'
              ? t('error.storageQuotaExceeded', 'ストレージ容量エラー')
              : t('error.storageSaveFailed', '保存エラー')}
          </h2>
        </div>

        {/* Error message */}
        <div className="mb-4 text-sm text-office-text">
          {errorType === 'quota' ? (
            <>
              <p className="mb-2">
                {t(
                  'error.storageQuotaMessage',
                  'ブラウザのローカルストレージの容量が不足しています。'
                )}
              </p>
              <p className="mb-2">
                {t('error.storageDataSize', '保存しようとしたデータサイズ')}:{' '}
                <span className="font-semibold">{sizeKB} KB</span>
              </p>
              <p className="text-xs text-office-text-secondary">
                {t(
                  'error.storageQuotaHint',
                  '古い保存データを削除するか、ブラウザのストレージ設定を確認してください。'
                )}
              </p>
            </>
          ) : (
            <p>
              {t(
                'error.storageSaveFailedMessage',
                'データの保存中にエラーが発生しました。'
              )}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end border-t border-office-border pt-3">
          <button type="button" className="btn-office-primary" onClick={onClose}>
            {t('action.ok', 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
};
