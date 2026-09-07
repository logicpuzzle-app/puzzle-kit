import { useCallback, useState } from 'react';
import type { TextClickInfo } from '../components/canvas';
import type { TextInputType } from '../components/dialogs';
import type { SymbolElement, ToolSettings } from '../types';
import { toDataLayer } from '../types';

interface UseTextSymbolDialogOptions {
  addSymbol: (element: Omit<SymbolElement, 'id'>) => string;
  toolSettings: ToolSettings;
  activeLayer: 'problem' | 'answer' | 'grid' | 'constraint';
}

export function useTextSymbolDialog({
  addSymbol,
  toolSettings,
  activeLayer,
}: UseTextSymbolDialogOptions) {
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDialogCellId, setTextDialogCellId] = useState('');
  const [textDialogInitialValue, setTextDialogInitialValue] = useState('');
  const [textDialogType, setTextDialogType] = useState<TextInputType>('alphabet');

  const handleTextClick = useCallback((info: TextClickInfo) => {
    setTextDialogCellId(info.cellId);
    const existingValue = info.existingText?.symbolType?.replace('text-', '').split(':')[1] || '';
    setTextDialogInitialValue(existingValue);
    setTextDialogType(info.textType as TextInputType);
    setTextDialogOpen(true);
  }, []);

  const handleTextSubmit = useCallback(
    (data: { value: string; textType: TextInputType }) => {
      if (textDialogCellId && data.value) {
        addSymbol({
          cellId: textDialogCellId,
          symbolType: `text-${data.textType}:${data.value}`,
          size: toolSettings.symbolSize,
          rotation: 0,
          color: toolSettings.color,
          layer: toDataLayer(activeLayer),
        });
      }
    },
    [activeLayer, addSymbol, textDialogCellId, toolSettings.color, toolSettings.symbolSize]
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
