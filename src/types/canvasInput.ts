import type { NumberPosition, SymbolElement } from './index';

export interface NumberClickInfo {
  cellId: string;
  existingNumber?: {
    id: string;
    value: string;
    position: NumberPosition;
    cornerIndex?: number;
    sideIndex?: number;
    candidates?: number[];
  };
  numberPosition: NumberPosition;
  cornerIndex?: number;
  sideIndex?: number;
  selectedCandidates?: number[];
}

export interface TextClickInfo {
  cellId: string;
  existingText?: SymbolElement;
  textType: string;
}
