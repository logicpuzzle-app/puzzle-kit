/**
 * Highlight Providers - Visual helper logic for constraints
 */

export {
  type HighlightOutput,
  type HighlightContext,
  type HighlightFill,
  type HighlightTextStyle,
  type HighlightOverlaySymbol,
  type HighlightProvider,
  type HighlightLayerHint,
  registerHighlightProvider,
  getHighlightProvider,
  mergeHighlightOutputs,
} from './core';

// Register highlight providers
import './akari';
import './lits';
import './norinori';
import './yajilin';
