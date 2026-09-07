import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { usePuzzleStore, usePuzzleStoreApi } from '../../store/puzzleStoreContext';
import { useModalStore, useModalStoreApi } from '../../store/modalStoreContext';
import {
  generateShareUrl,
  downloadAsJson,
  exportToPng,
  downloadAsPng,
} from '../../utils/serialization';
import { createImportHandlers } from './menu/importHandlers';
import { NewPuzzleDialog } from '../dialogs/NewPuzzleDialog';

// SVG Icon components
const NewIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const OpenIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const SaveIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const UndoIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const RedoIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const ZoomInIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const PanIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const ImageIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const ShareIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const ImportIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, onClick, title, disabled, active }) => (
  <button
    className={`w-7 h-7 flex items-center justify-center rounded hover:bg-office-ribbon-hover transition-colors ${
      disabled ? 'opacity-40 cursor-not-allowed' : ''
    } ${active ? 'bg-blue-200 border border-blue-400' : ''}`}
    onClick={onClick}
    title={title}
    disabled={disabled}
  >
    {icon}
  </button>
);

const ToolbarDivider: React.FC = () => (
  <div className="w-px h-5 bg-office-border mx-1" />
);

export const IconToolbar: React.FC = () => {
  const { t } = useTranslation();
  const [isNewPuzzleOpen, setIsNewPuzzleOpen] = useState(false);

  const {
    grid,
    puzzle,
    canvas,
    undo,
    redo,
    clearLayer,
    clearAll,
    newPuzzle,
    setZoom,
    setPan,
    setPanMode,
    canUndo,
    canRedo,
  } = usePuzzleStore();
  const store = usePuzzleStoreApi();

  const { showConfirm, showAlert } = useModalStore();
  const modalStore = useModalStoreApi();

  const handleExportJson = () => {
    downloadAsJson(grid, puzzle, { title: 'Puzzle' });
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            if (data.grid && data.state) {
              store.setState({
                grid: data.grid,
                puzzle: data.state,
              });
            }
          } catch {
            showAlert({
              title: t('error.invalidFile'),
              message: t('error.invalidFile'),
              variant: 'error',
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportPng = async () => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const blob = await exportToPng(svg as SVGSVGElement, 2);
    if (blob) {
      downloadAsPng(blob, 'puzzle.png');
    }
  };

  const handleShareUrl = () => {
    const url = generateShareUrl(grid, puzzle);
    navigator.clipboard.writeText(url).then(() => {
      showAlert({
        title: t('share.copied'),
        message: t('share.copied'),
        variant: 'success',
      });
    });
  };

  const { handleImportPenpaUrl } = createImportHandlers({
    store,
    modalStore,
    grid,
    puzzle,
    setActiveMenu: () => {},
    setCurrentSchemaId: store.getState().setCurrentSchemaId,
    t,
  });

  return (
    <>
      <div className="flex items-center bg-office-ribbon border-b border-office-border h-8 px-2 gap-0.5 shrink-0 max-md:overflow-x-auto max-md:[&>*]:shrink-0">
        {/* File actions */}
        <ToolbarButton
          icon={<NewIcon />}
          onClick={() => setIsNewPuzzleOpen(true)}
          title={`${t('file.new')} (Ctrl+N)`}
        />
        <ToolbarButton
          icon={<OpenIcon />}
          onClick={handleImportJson}
          title={`${t('file.open')} (Ctrl+O)`}
        />
        <ToolbarButton
          icon={<SaveIcon />}
          onClick={handleExportJson}
          title={`${t('file.save')} (Ctrl+S)`}
        />

        <ToolbarDivider />

        {/* Edit actions */}
        <ToolbarButton
          icon={<UndoIcon />}
          onClick={undo}
          title={`${t('edit.undo')} (Ctrl+Z)`}
          disabled={!canUndo()}
        />
        <ToolbarButton
          icon={<RedoIcon />}
          onClick={redo}
          title={`${t('edit.redo')} (Ctrl+Y)`}
          disabled={!canRedo()}
        />

        <ToolbarDivider />

        {/* View actions */}
        <ToolbarButton
          icon={<ZoomInIcon />}
          onClick={() => setZoom(canvas.zoom * 1.2)}
          title={`${t('view.zoomIn')} (Ctrl++)`}
        />
        <ToolbarButton
          icon={<ZoomOutIcon />}
          onClick={() => setZoom(canvas.zoom / 1.2)}
          title={`${t('view.zoomOut')} (Ctrl+-)`}
        />
        <ToolbarButton
          icon={<PanIcon />}
          onClick={() => setPanMode(!canvas.panMode)}
          title={t('view.panMode') || 'Pan Mode (H)'}
          active={canvas.panMode}
        />
        <button
          className="h-6 px-2 text-xs border border-office-border rounded hover:bg-office-ribbon-hover transition-colors"
          onClick={() => { setZoom(1); setPan(0, 0); }}
          title={`${t('view.zoom100')} (Ctrl+0)`}
        >
          {Math.round(canvas.zoom * 100)}%
        </button>

        <ToolbarDivider />

        {/* Export/Import */}
        <ToolbarButton
          icon={<ImageIcon />}
          onClick={handleExportPng}
          title={t('file.exportPng')}
        />
        <ToolbarButton
          icon={<ShareIcon />}
          onClick={handleShareUrl}
          title={t('file.shareUrl')}
        />
        <ToolbarButton
          icon={<ImportIcon />}
          onClick={handleImportPenpaUrl}
          title={t('file.importPenpa')}
        />

        <ToolbarDivider />

        {/* Clear actions */}
        <ToolbarButton
          icon={<TrashIcon />}
          onClick={() => {
            showConfirm({
              title: t('confirm.clearAll.title'),
              message: t('confirm.clearAll.message'),
              variant: 'danger',
              confirmLabel: t('common.delete'),
              onConfirm: () => clearAll(),
            });
          }}
          title={t('edit.clearAll')}
        />

        {/* Spacer to push language button to right */}
        <div className="flex-1" />

        {/* Language toggle - shows current language */}
        <button
          className="h-6 px-2 text-xs font-medium border border-office-border rounded hover:bg-office-ribbon-hover transition-colors"
          onClick={() => {
            const newLang = i18n.language === 'ja' ? 'en' : 'ja';
            i18n.changeLanguage(newLang);
          }}
          title={t('menu.language')}
        >
          {i18n.language === 'ja' ? 'JA' : 'EN'}
        </button>
      </div>

      {/* New Puzzle Dialog */}
      <NewPuzzleDialog
        isOpen={isNewPuzzleOpen}
        onClose={() => setIsNewPuzzleOpen(false)}
      />
    </>
  );
};

export default IconToolbar;
