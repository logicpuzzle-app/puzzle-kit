import { useCallback, useState } from 'react';
import type { TextClickInfo } from '../components/canvas';
import type { TextInputType } from '../components/dialogs';
import type { SymbolElement, ToolSettings } from '../types';
import { toDataLayer } from '../types';
import { getTextSymbolValue } from '../utils/textSymbols';

interface UseTextSymbolDialogOptions {
  addSymbol: (element: Omit<SymbolElement, 'id'>) => string;
  removeSymbol: (id: string) => void;
  toolSettings: ToolSettings;
  activeLayer: 'problem' | 'answer' | 'grid' | 'constraint';
}

export function useTextSymbolDialog({
  addSymbol,
  removeSymbol,
  toolSettings,
  activeLayer,
}: UseTextSymbolDialogOptions) {
  const [existingText, setExistingText] = useState<SymbolElement>();
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDialogCellId, setTextDialogCellId] = useState('');
  const [textDialogInitialValue, setTextDialogInitialValue] = useState('');
  const [textDialogType, setTextDialogType] = useState<TextInputType>('alphabet');

  const handleTextClick = useCallback((info: TextClickInfo) => {
    setTextDialogCellId(info.cellId);
    setExistingText(info.existingText ?? undefined);
    const existingValue = getTextSymbolValue(info.existingText?.symbolType ?? '');
    setTextDialogInitialValue(existingValue);
    setTextDialogType(info.textType as TextInputType);
    setTextDialogOpen(true);
  }, []);

  const handleTextSubmit = useCallback(
    (data: { value: string; textType: TextInputType }) => {
      if (existingText && !data.value) {
        removeSymbol(existingText.id);
      } else if (textDialogCellId && data.value) {
        addSymbol({
          cellId: textDialogCellId,
          symbolType: `text-${data.textType}:${data.value}`,
          size: existingText?.size ?? toolSettings.symbolSize,
          rotation: existingText?.rotation ?? 0,
          color: existingText?.color ?? toolSettings.color,
          layer: existingText?.layer ?? toDataLayer(activeLayer),
        });
      }
    },
    [activeLayer, addSymbol, removeSymbol, existingText, textDialogCellId, toolSettings.color, toolSettings.symbolSize]
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
