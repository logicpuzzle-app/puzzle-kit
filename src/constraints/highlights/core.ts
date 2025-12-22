/**
 * Highlight Core - Registry and types for visual highlight rules
 */

import type { PuzzleState, GridConfig } from '../../types';
import type { ConstraintSchema, HighlightRule, InputMode } from '../types';
import type { GridTopology } from '../../utils/gridTopology';

export type HighlightLayerHint = 'under-surfaces' | 'under-lines' | 'over-lines' | 'over-numbers';

export interface HighlightFill {
  cellId: string;
  color: string;
  opacity?: number;
  layer?: HighlightLayerHint;
}

export interface HighlightTextStyle {
  cellId: string;
  target: 'number' | 'directional' | 'text';
  color?: string;
  fontWeight?: 'normal' | 'bold';
}

export interface HighlightOverlaySymbol {
  cellId: string;
  symbolType: string;
  color?: string;
  size?: number;
  opacity?: number;
  layer?: HighlightLayerHint;
}

export interface HighlightOutput {
  fills?: HighlightFill[];
  textStyles?: HighlightTextStyle[];
  overlays?: HighlightOverlaySymbol[];
}

export interface HighlightContext {
  puzzle: PuzzleState;
  grid: GridConfig;
  schema: ConstraintSchema;
  topology: GridTopology | null;
  currentInputMode: InputMode;
  activeLayer: 'problem' | 'answer';
}

export type HighlightProvider = (ctx: HighlightContext, rule: HighlightRule) => HighlightOutput | null;

const highlightRegistry: Map<string, HighlightProvider> = new Map();

export function registerHighlightProvider(ruleId: string, fn: HighlightProvider): void {
  highlightRegistry.set(ruleId, fn);
}

export function getHighlightProvider(ruleId: string): HighlightProvider | undefined {
  return highlightRegistry.get(ruleId);
}

export function mergeHighlightOutputs(outputs: HighlightOutput[]): HighlightOutput {
  const fills: HighlightFill[] = [];
  const textStyles: HighlightTextStyle[] = [];
  const overlays: HighlightOverlaySymbol[] = [];

  outputs.forEach((output) => {
    if (!output) return;
    if (output.fills) fills.push(...output.fills);
    if (output.textStyles) textStyles.push(...output.textStyles);
    if (output.overlays) overlays.push(...output.overlays);
  });

  return {
    fills: fills.length ? fills : undefined,
    textStyles: textStyles.length ? textStyles : undefined,
    overlays: overlays.length ? overlays : undefined,
  };
}
