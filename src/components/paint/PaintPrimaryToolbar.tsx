import React from 'react';
import { NumericInput } from '../common';
import { OpenIcon, RedoIcon, TrashIcon, UndoIcon } from './PaintIcons';
import type { PaintAdjustMode, PdfImagePage, TranslateFn } from './types';

export type PaintPrimaryToolbarProps = {
  t: TranslateFn;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hasImage: boolean;
  onRemoveImage: () => void;
  pdfImagePages: PdfImagePage[];
  pdfPageIndex: number;
  onPdfPageIndexChange: (index: number) => void;
  onPdfPageSelect: (value: number | null) => void;
  currentPdfPage: PdfImagePage | null;
  activePaintMode: PaintAdjustMode;
  onSetAdjustMode: (mode: PaintAdjustMode) => void;
  isAnswerMode: boolean;
  trialStage: number;
  onEnterTrial: () => void;
  onAcceptTrial: () => void;
  onRejectCurrentTrial: () => void;
  onRejectTrial: () => void;
  getCurrentTrialColor: () => string | null;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearAnswer: () => void;
};

export type PaintMediaControlsProps = Pick<
  PaintPrimaryToolbarProps,
  | 't'
  | 'fileInputRef'
  | 'onImageSelect'
  | 'hasImage'
  | 'onRemoveImage'
  | 'pdfImagePages'
  | 'pdfPageIndex'
  | 'onPdfPageIndexChange'
  | 'onPdfPageSelect'
  | 'currentPdfPage'
>;

export type PaintAdjustModeControlsProps = Pick<
  PaintPrimaryToolbarProps,
  't' | 'activePaintMode' | 'onSetAdjustMode' | 'hasImage'
> & {
  size?: 'sm' | 'lg';
};

export type PaintTrialControlsProps = Pick<
  PaintPrimaryToolbarProps,
  | 't'
  | 'trialStage'
  | 'isAnswerMode'
  | 'onEnterTrial'
  | 'onAcceptTrial'
  | 'onRejectCurrentTrial'
  | 'onRejectTrial'
  | 'getCurrentTrialColor'
>;

export type PaintHistoryControlsProps = Pick<
  PaintPrimaryToolbarProps,
  't' | 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo' | 'onClearAnswer'
> & {
  size?: 'sm' | 'lg';
  className?: string;
};

export const PaintMediaControls: React.FC<PaintMediaControlsProps> = ({
  t,
  fileInputRef,
  onImageSelect,
  hasImage,
  onRemoveImage,
  pdfImagePages,
  pdfPageIndex,
  onPdfPageIndexChange,
  onPdfPageSelect,
  currentPdfPage,
}) => {
  const hasPdfPages = pdfImagePages.length > 0;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onImageSelect}
        className="hidden"
      />
      <button
        className="h-7 w-7 flex items-center justify-center border border-office-border rounded-sm hover:bg-office-ribbon-hover"
        onClick={() => fileInputRef.current?.click()}
        type="button"
        title={t('grid.selectImage')}
        aria-label={t('grid.selectImage')}
      >
        <OpenIcon />
      </button>
      {hasImage && (
        <button
          className="h-7 w-7 flex items-center justify-center border border-office-border rounded-sm hover:bg-office-ribbon-hover"
          onClick={onRemoveImage}
          type="button"
          title={t('action.delete')}
          aria-label={t('action.delete')}
        >
          <TrashIcon />
        </button>
      )}
      {hasPdfPages && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-office-text-secondary">
            {t('paint.pdfPages', 'PDF')}
          </span>
          <button
            className="h-6 w-6 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover disabled:opacity-50"
            onClick={() => onPdfPageIndexChange(pdfPageIndex - 1)}
            disabled={pdfPageIndex === 0}
            type="button"
            title={t('paint.pdfPrev', 'Previous page')}
            aria-label={t('paint.pdfPrev', 'Previous page')}
          >
            ‹
          </button>
          <NumericInput
            value={pdfPageIndex + 1}
            onChange={onPdfPageSelect}
            min={1}
            max={Math.max(1, pdfImagePages.length)}
            className="w-14 h-6"
          />
          <span className="text-xs text-office-text-secondary">
            / {pdfImagePages.length}
          </span>
          <button
            className="h-6 w-6 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover disabled:opacity-50"
            onClick={() => onPdfPageIndexChange(pdfPageIndex + 1)}
            disabled={pdfPageIndex >= pdfImagePages.length - 1}
            type="button"
            title={t('paint.pdfNext', 'Next page')}
            aria-label={t('paint.pdfNext', 'Next page')}
          >
            ›
          </button>
          {currentPdfPage && (
            <span className="text-[10px] text-office-text-secondary">
              {t('paint.pdfPageLabel', 'Page {{number}}', { number: currentPdfPage.pageNumber })}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export const PaintAdjustModeControls: React.FC<PaintAdjustModeControlsProps> = ({
  t,
  activePaintMode,
  onSetAdjustMode,
  hasImage,
  size = 'sm',
}) => {
  const baseClass = size === 'lg' ? 'h-12 px-3 text-[11px]' : 'h-7 px-2 text-xs';

  return (
    <div className="flex items-center border border-office-border rounded-sm overflow-hidden">
      <button
        className={`${baseClass} flex items-center justify-center ${
          activePaintMode === 'board'
            ? 'bg-office-accent text-white'
            : 'bg-white hover:bg-office-ribbon-hover'
        }`}
        onClick={() => onSetAdjustMode('board')}
        disabled={!hasImage}
        aria-pressed={activePaintMode === 'board'}
        title={t('paint.boardAdjust', 'Board Adjust')}
        type="button"
      >
        {t('paint.boardAdjust', 'Board Adjust')}
      </button>
      <button
        className={`${baseClass} flex items-center justify-center border-l border-office-border disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-office-text ${
          activePaintMode === 'image'
            ? 'bg-office-accent text-white'
            : 'bg-white hover:bg-office-ribbon-hover'
        }`}
        onClick={() => onSetAdjustMode('image')}
        disabled={!hasImage}
        aria-pressed={activePaintMode === 'image'}
        title={`${t('paint.imageAdjust', 'Image Adjust')} - ${t(
          'paint.imageAdjustHint',
          'Drag to move, handles to resize, wheel to zoom (Shift = fine)',
        )}`}
        type="button"
      >
        {t('paint.imageAdjust', 'Image Adjust')}
      </button>
      <button
        className={`${baseClass} flex items-center justify-center border-l border-office-border ${
          activePaintMode === 'answer'
            ? 'bg-office-accent text-white'
            : 'bg-white hover:bg-office-ribbon-hover'
        }`}
        onClick={() => onSetAdjustMode('answer')}
        aria-pressed={activePaintMode === 'answer'}
        title={t('layer.answer')}
        type="button"
      >
        {t('layer.answer')}
      </button>
    </div>
  );
};

export const PaintTrialControls: React.FC<PaintTrialControlsProps> = ({
  t,
  trialStage,
  isAnswerMode,
  onEnterTrial,
  onAcceptTrial,
  onRejectCurrentTrial,
  onRejectTrial,
  getCurrentTrialColor,
}) => (
  <div className="flex items-center gap-2">
    {trialStage === 0 ? (
      <button
        className={`h-7 px-2 text-xs rounded-sm border transition-colors ${
          isAnswerMode
            ? 'bg-white border-office-border hover:bg-orange-50 hover:border-orange-300'
            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
        }`}
        onClick={isAnswerMode ? onEnterTrial : undefined}
        disabled={!isAnswerMode}
        type="button"
        title={isAnswerMode ? t('trial.enterDesc') : t('trial.desc')}
        aria-label={t('trial.enter')}
      >
        {t('trial.enter')}
      </button>
    ) : (
      <div className="flex items-center">
        <div
          className="h-7 px-2 text-xs flex items-center gap-1 rounded-l-sm border border-r-0"
          style={{ backgroundColor: getCurrentTrialColor() || '#FF8888', color: '#000' }}
        >
          <span className="font-medium">{t('trial.title')}</span>
          {trialStage > 1 && <span className="text-xs">({trialStage})</span>}
        </div>
        <button
          className={`h-7 px-2 text-xs rounded-r-sm border transition-colors ${
            isAnswerMode
              ? 'bg-white border-office-border hover:bg-orange-50'
              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          onClick={isAnswerMode ? onEnterTrial : undefined}
          disabled={!isAnswerMode}
          type="button"
          title={t('trial.enterDesc')}
          aria-label={t('trial.enter')}
        >
          +
        </button>
      </div>
    )}
    {trialStage > 0 && (
      <div className="flex items-center gap-1">
        <button
          className="h-7 px-2 text-xs bg-white border border-green-500 text-green-700 rounded-sm hover:bg-green-50 transition-colors"
          onClick={onAcceptTrial}
          title={t('trial.acceptDesc')}
          type="button"
        >
          {t('trial.accept')}
        </button>
        <button
          className="h-7 px-2 text-xs bg-white border border-red-400 text-red-600 rounded-sm hover:bg-red-50 transition-colors"
          onClick={onRejectCurrentTrial}
          title={t('trial.rejectDesc')}
          type="button"
        >
          {t('trial.reject')}
        </button>
        {trialStage > 1 && (
          <button
            className="h-7 px-2 text-xs bg-white border border-red-500 text-red-700 rounded-sm hover:bg-red-100 transition-colors"
            onClick={onRejectTrial}
            title={t('trial.rejectDesc')}
            type="button"
          >
            {t('trial.rejectAll')}
          </button>
        )}
      </div>
    )}
  </div>
);

export const PaintHistoryControls: React.FC<PaintHistoryControlsProps> = ({
  t,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearAnswer,
  size = 'sm',
  className = '',
}) => {
  const buttonClass = size === 'lg' ? 'h-12 w-12' : 'h-7 w-7';
  const iconSize = size === 'lg' ? 20 : 16;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        className={`${buttonClass} flex items-center justify-center border border-office-border rounded-sm hover:bg-office-ribbon-hover disabled:opacity-50`}
        onClick={onUndo}
        disabled={!canUndo}
        type="button"
        title={t('edit.undo')}
        aria-label={t('edit.undo')}
      >
        <UndoIcon size={iconSize} />
      </button>
      <button
        className={`${buttonClass} flex items-center justify-center border border-office-border rounded-sm hover:bg-office-ribbon-hover disabled:opacity-50`}
        onClick={onRedo}
        disabled={!canRedo}
        type="button"
        title={t('edit.redo')}
        aria-label={t('edit.redo')}
      >
        <RedoIcon size={iconSize} />
      </button>
      <button
        className={`${buttonClass} flex items-center justify-center border border-office-border rounded-sm hover:bg-office-ribbon-hover`}
        onClick={onClearAnswer}
        type="button"
        title={t('edit.clearAnswer')}
        aria-label={t('edit.clearAnswer')}
      >
        <TrashIcon size={iconSize} />
      </button>
    </div>
  );
};

export const PaintPrimaryToolbar: React.FC<PaintPrimaryToolbarProps> = (props) => (
  <div className="flex flex-wrap items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border-t border-office-border bg-white">
    <PaintMediaControls {...props} />
    <PaintAdjustModeControls {...props} />
    <div className="h-5 w-px bg-office-border" />
    <PaintTrialControls {...props} />
    <PaintHistoryControls {...props} />
  </div>
);
