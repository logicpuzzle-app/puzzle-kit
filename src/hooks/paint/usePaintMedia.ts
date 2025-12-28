import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type React from 'react';
import type { GridConfig } from '../../types';
import type { PdfImagePage, TranslateFn } from '../../components/paint/types';
import type { useModalStore } from '../../store/modalStoreContext';

type ModalStoreApi = ReturnType<typeof useModalStore>;

type PdfPagePreview = {
  pageNumber: number;
  width: number;
  height: number;
  thumbnail?: string;
  selected: boolean;
};

type UsePaintMediaArgs = {
  t: TranslateFn;
  grid: GridConfig;
  setGrid: (updates: Partial<GridConfig>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  showAlert: ModalStoreApi['showAlert'];
};

const MAX_CANVAS_DIMENSIONS = [32767, 16384, 8192];

GlobalWorkerOptions.workerSrc = workerSrc;

export const usePaintMedia = ({
  t,
  grid,
  setGrid,
  fileInputRef,
  showAlert,
}: UsePaintMediaArgs) => {
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [pdfPages, setPdfPages] = useState<PdfPagePreview[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfImagePages, setPdfImagePages] = useState<PdfImagePage[]>([]);
  const [pdfPageIndex, setPdfPageIndex] = useState(0);

  const selectedPdfCount = useMemo(() => pdfPages.filter((page) => page.selected).length, [pdfPages]);
  const currentPdfPage = pdfImagePages[pdfPageIndex] ?? null;

  useEffect(() => {
    if (pdfImagePages.length === 0) return;
    setPdfPageIndex((prev) => Math.min(prev, pdfImagePages.length - 1));
  }, [pdfImagePages]);

  useEffect(() => {
    if (!pdfImagePages.length) return;
    const page = pdfImagePages[pdfPageIndex];
    if (page) {
      setGrid({ backgroundImage: page.dataUrl });
    }
  }, [pdfImagePages, pdfPageIndex, setGrid]);

  const handleImageSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setPdfImportOpen(true);
        setPdfLoading(true);
        setPdfImporting(false);
        setPdfPages([]);
        setPdfImagePages([]);
        setPdfPageIndex(0);

        try {
          const data = await file.arrayBuffer();
          const doc = await getDocument({ data }).promise;
          pdfDocRef.current = doc;

          const previews: PdfPagePreview[] = [];
          for (let i = 1; i <= doc.numPages; i += 1) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1 });
            const maxThumb = 240;
            const scale = Math.min(1, maxThumb / Math.max(viewport.width, viewport.height));
            const thumbViewport = page.getViewport({ scale });
            const canvasEl = document.createElement('canvas');
            canvasEl.width = Math.ceil(thumbViewport.width);
            canvasEl.height = Math.ceil(thumbViewport.height);
            const ctx = canvasEl.getContext('2d', { alpha: false });
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport: thumbViewport }).promise;
            }
            previews.push({
              pageNumber: i,
              width: viewport.width,
              height: viewport.height,
              thumbnail: canvasEl.toDataURL('image/png'),
              selected: true,
            });
          }
          setPdfPages(previews);
        } catch (error) {
          showAlert({
            title: t('paint.pdfLoadError', 'Failed to load PDF.'),
            message: t('paint.pdfLoadError', 'Failed to load PDF.'),
            variant: 'error',
          });
          setPdfImportOpen(false);
        } finally {
          setPdfLoading(false);
        }
        event.target.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        showAlert({
          title: t('error.invalidImageFile'),
          message: t('error.invalidImageFile'),
          variant: 'error',
        });
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        setGrid({
          backgroundImage: dataUrl,
          backgroundOpacity: grid.backgroundOpacity ?? 0.5,
          backgroundFit: 'none',
          backgroundScale: grid.backgroundScale ?? 1,
          backgroundOffsetX: 0,
          backgroundOffsetY: 0,
          backgroundTile: false,
        });
        setPdfImagePages([]);
        setPdfPageIndex(0);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [grid.backgroundOpacity, grid.backgroundScale, setGrid, showAlert, t]
  );

  const handleRemoveImage = useCallback(() => {
    setGrid({
      backgroundImage: undefined,
      backgroundOpacity: undefined,
      backgroundFit: undefined,
      backgroundScale: undefined,
      backgroundTile: undefined,
      backgroundOffsetX: undefined,
      backgroundOffsetY: undefined,
    });
    setPdfPages([]);
    setPdfImagePages([]);
    setPdfPageIndex(0);
    pdfDocRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileInputRef, setGrid]);

  const handlePdfImport = useCallback(async () => {
    const doc = pdfDocRef.current;
    if (!doc) return;
    const selected = pdfPages.filter((page) => page.selected);
    if (selected.length === 0) {
      showAlert({
        title: t('paint.pdfImportEmpty', 'Select at least one page.'),
        message: t('paint.pdfImportEmpty', 'Select at least one page.'),
        variant: 'error',
      });
      return;
    }

    setPdfImporting(true);
    try {
      const images: PdfImagePage[] = [];
      for (const pageInfo of selected) {
        const page = await doc.getPage(pageInfo.pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const maxDim = MAX_CANVAS_DIMENSIONS.find(
          (limit) => viewport.width <= limit && viewport.height <= limit
        ) ?? MAX_CANVAS_DIMENSIONS[MAX_CANVAS_DIMENSIONS.length - 1];
        const scale = Math.min(1, maxDim / Math.max(viewport.width, viewport.height));
        const renderViewport = page.getViewport({ scale });
        const canvasEl = document.createElement('canvas');
        canvasEl.width = Math.ceil(renderViewport.width);
        canvasEl.height = Math.ceil(renderViewport.height);
        const ctx = canvasEl.getContext('2d', { alpha: false });
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
        }
        images.push({
          pageNumber: pageInfo.pageNumber,
          dataUrl: canvasEl.toDataURL('image/png'),
        });
      }

      setPdfImagePages(images);
      setPdfPageIndex(0);
      if (images[0]) {
        setGrid({
          backgroundImage: images[0].dataUrl,
          backgroundOpacity: grid.backgroundOpacity ?? 0.5,
          backgroundFit: 'none',
          backgroundScale: grid.backgroundScale ?? 1,
          backgroundOffsetX: 0,
          backgroundOffsetY: 0,
          backgroundTile: false,
        });
      }
      setPdfImportOpen(false);
      setPdfPages([]);
      pdfDocRef.current = null;
    } catch (error) {
      showAlert({
        title: t('paint.pdfLoadError', 'Failed to load PDF.'),
        message: t('paint.pdfLoadError', 'Failed to load PDF.'),
        variant: 'error',
      });
    } finally {
      setPdfImporting(false);
    }
  }, [grid.backgroundOpacity, grid.backgroundScale, pdfPages, setGrid, showAlert, t]);

  const togglePdfPage = useCallback((pageNumber: number) => {
    setPdfPages((prev) =>
      prev.map((page) =>
        page.pageNumber === pageNumber ? { ...page, selected: !page.selected } : page
      )
    );
  }, []);

  const selectAllPdfPages = useCallback(() => {
    setPdfPages((prev) => prev.map((page) => ({ ...page, selected: true })));
  }, []);

  const clearPdfPages = useCallback(() => {
    setPdfPages((prev) => prev.map((page) => ({ ...page, selected: false })));
  }, []);

  const closePdfImport = useCallback(() => {
    setPdfImportOpen(false);
    setPdfLoading(false);
    setPdfImporting(false);
    setPdfPages([]);
    pdfDocRef.current = null;
  }, []);

  const handlePdfPageIndexChange = useCallback(
    (index: number) => {
      const nextIndex = Math.max(0, Math.min(pdfImagePages.length - 1, index));
      setPdfPageIndex(nextIndex);
      const page = pdfImagePages[nextIndex];
      if (page) {
        setGrid({ backgroundImage: page.dataUrl });
      }
    },
    [pdfImagePages, setGrid]
  );

  const handlePdfPageSelect = useCallback(
    (value: number | null) => {
      if (value === null) return;
      handlePdfPageIndexChange(value - 1);
    },
    [handlePdfPageIndexChange]
  );

  return {
    pdfImportOpen,
    pdfPages,
    pdfLoading,
    pdfImporting,
    pdfImagePages,
    pdfPageIndex,
    selectedPdfCount,
    currentPdfPage,
    handleImageSelect,
    handleRemoveImage,
    handlePdfImport,
    togglePdfPage,
    selectAllPdfPages,
    clearPdfPages,
    closePdfImport,
    handlePdfPageIndexChange,
    handlePdfPageSelect,
  };
};
