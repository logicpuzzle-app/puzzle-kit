import type { LayerType } from '../types';

const OUTBOARD_HINT_TOOL_PREFIXES = ['number', 'text', 'symbol'];
const OUTBOARD_HINT_TOOLS = new Set(['select']);

export function shouldAllowOutboardForTool(tool: string, layer: LayerType): boolean {
  if (layer !== 'problem') return false;
  if (OUTBOARD_HINT_TOOLS.has(tool)) return true;
  return OUTBOARD_HINT_TOOL_PREFIXES.some((prefix) => tool.startsWith(prefix));
}
