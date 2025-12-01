/**
 * RibbonToolDefs - Tool and category definitions for the Ribbon toolbar
 */

import { ToolCategory, ToolType } from '../../types';

export interface ToolDef {
  id: ToolType;
  icon: string;
  labelKey: string;
}

export interface CategoryDef {
  id: ToolCategory;
  icon: string;
  labelKey: string;
  defaultTool: ToolType;
}

// Tool definitions grouped by category
export const toolGroups: Record<ToolCategory, ToolDef[]> = {
  surface: [
    { id: 'surface-fill', icon: '■', labelKey: 'tool.surface.fill' },
    { id: 'surface-dot', icon: '·', labelKey: 'tool.surface.dot' },
    { id: 'multicolor-surface', icon: '◧', labelKey: 'tool.multicolor.surface' },
    { id: 'solution-area', icon: '▣', labelKey: 'tool.solutionArea' },
  ],
  line: [],
  edge: [],
  wall: [
    { id: 'wall-normal', icon: '▌', labelKey: 'tool.wall.normal' },
  ],
  number: [
    { id: 'number-normal', icon: '1', labelKey: 'tool.number.normal' },
    { id: 'number-directional', icon: '➤', labelKey: 'tool.number.directional' },
  ],
  text: [
    { id: 'text-alphabet', icon: 'A', labelKey: 'tool.text.alphabet' },
    { id: 'text-hiragana', icon: 'あ', labelKey: 'tool.text.hiragana' },
    { id: 'text-katakana', icon: 'ア', labelKey: 'tool.text.katakana' },
    { id: 'text-free', icon: 'T', labelKey: 'tool.text.free' },
  ],
  symbol: [],
  special: [
    { id: 'special-thermo', icon: '🌡', labelKey: 'tool.special.thermo' },
    { id: 'special-arrow', icon: '➤', labelKey: 'tool.special.arrow' },
    { id: 'special-cage', icon: '⊞', labelKey: 'tool.special.cage' },
    { id: 'special-boxline', icon: '▣', labelKey: 'tool.special.boxline' },
  ],
  cage: [
    { id: 'special-cage', icon: '⊞', labelKey: 'tool.special.cage' },
  ],
  select: [
    { id: 'select', icon: '⎕', labelKey: 'tools.select' },
  ],
};

// Main categories for the primary toolbar
export const mainCategories: CategoryDef[] = [
  { id: 'surface', icon: '■', labelKey: 'tools.surface', defaultTool: 'surface-fill' },
  { id: 'line', icon: '─', labelKey: 'tools.line', defaultTool: 'line-normal' },
  { id: 'number', icon: '1', labelKey: 'tools.number', defaultTool: 'number-normal' },
  { id: 'symbol', icon: '○', labelKey: 'tools.symbol', defaultTool: 'symbol-circle' },
  { id: 'special', icon: '⊞', labelKey: 'tools.special', defaultTool: 'special-cage' },
];
