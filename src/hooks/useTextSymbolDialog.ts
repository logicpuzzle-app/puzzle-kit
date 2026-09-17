import { useCallback, useState, useRef, useEffect } from 'react';
import type { TextClickInfo } from '../components/canvas';
import type { TextInputType } from '../components/dialogs';
import type { SymbolElement, ToolSettings, GridConfig } from '../types';
import { toDataLayer } from '../types';
import { getTextSymbolValue } from '../utils/textSymbols';

interface UseTextSymbolDialogOptions {
  addSymbol: (element: Omit<SymbolElement, 'id'>) => string;
  removeSymbol: (id: string) => void;
  toolSettings: ToolSettings;
  grid?: GridConfig;
  topology?: import('../utils/gridTopology').GridTopology | null;
  useTopology?: boolean;
  activeLayer: 'problem' | 'answer' | 'grid' | 'constraint';
}

export function useTextSymbolDialog({
  addSymbol,
  removeSymbol,
  toolSettings,
  activeLayer, grid, topology, useTopology,
}: UseTextSymbolDialogOptions) {
  const [existingText, setExistingText] = useState<SymbolElement>();
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDialogCellId, setTextDialogCellId] = useState('');
  const [textDialogInitialValue, setTextDialogInitialValue] = useState('');
  const [textDialogType, setTextDialogType] = useState<TextInputType>('alphabet');

  const pendingScope = useRef<{ grid: typeof grid; topology: typeof topology; useTopology: typeof useTopology; activeLayer: typeof activeLayer } | undefined>(undefined);
  useEffect(() => { setTextDialogOpen(false); pendingScope.current = undefined; }, [grid, topology, useTopology, activeLayer]);

  const handleTextClick = useCallback((info: TextClickInfo) => {
    pendingScope.current = { grid, topology, useTopology, activeLayer };
    setTextDialogCellId(info.cellId);
    setExistingText(info.existingText ?? undefined);
    const existingValue = getTextSymbolValue(info.existingText?.symbolType ?? '');
    setTextDialogInitialValue(existingValue);
    // The selected tool controls new entries, not the kind of existing text.
    const existingType = info.existingText?.symbolType.split(':', 1)[0].slice(5);
    setTextDialogType((existingType && ['alphabet', 'hiragana', 'katakana', 'free'].includes(existingType)
      ? existingType : info.textType) as TextInputType);
    setTextDialogOpen(true);
  }, [grid, topology, useTopology, activeLayer]);

  const handleTextSubmit = useCallback(
    (data: { value: string; textType: TextInputType }) => {
      const scope = pendingScope.current;
      if (!scope || scope.grid !== grid || scope.topology !== topology || scope.useTopology !== useTopology || scope.activeLayer !== activeLayer) return;
      if (existingText && !data.value) {
        removeSymbol(existingText.id);
      } else if (textDialogCellId && data.value) {
        addSymbol({
          ...existingText,
          cellId: textDialogCellId,
          pointType: 'cell',
          symbolType: `text-${data.textType}:${data.value}`,
          size: existingText?.size ?? toolSettings.symbolSize,
          rotation: existingText?.rotation ?? 0,
          color: existingText?.color ?? toolSettings.color,
          layer: existingText?.layer ?? toDataLayer(activeLayer),
        });
      }
    },
    [activeLayer, addSymbol, removeSymbol, existingText, textDialogCellId, toolSettings.color, toolSettings.symbolSize, grid, topology, useTopology]
  );

  return {
    handleTextClick,
    dialogProps: {
      isOpen: textDialogOpen,
      onClose: () => setTextDialogOpen(false),
      cellId: textDialogCellId,
      initialValue: textDialogInitialValue,
      textType: textDialogType,
      onSubmit: handleTextSubmit,
    },
  };
}
