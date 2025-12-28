export type ToolCategory =
  | 'surface'
  | 'surface-cycle'
  | 'line'
  | 'edge'
  | 'wall'
  | 'symbol'
  | 'special-thermo'
  | 'special-arrow'
  | 'special-cage'
  | 'special-boxline'
  | 'multicolor-surface'
  | 'solution-area'
  | 'number'
  | 'text'
  | 'select'
  | 'unknown';

export const LINE_TOOL_CATEGORIES = ['line', 'edge', 'wall'] as const;

export const isLineToolCategory = (category: string): boolean => {
  return LINE_TOOL_CATEGORIES.includes(category as typeof LINE_TOOL_CATEGORIES[number]);
};

export function getToolCategory(tool: string): ToolCategory {
  if (tool === 'surface-cycle') return 'surface-cycle';
  if (tool.startsWith('surface')) return 'surface';
  if (tool.startsWith('line')) return 'line';
  if (tool.startsWith('edge')) return 'edge';
  if (tool.startsWith('wall')) return 'wall';
  if (tool.startsWith('symbol')) return 'symbol';
  if (tool === 'special-thermo' || tool === 'thermo') return 'special-thermo';
  if (tool === 'special-arrow' || tool === 'arrow') return 'special-arrow';
  if (tool === 'special-cage' || tool === 'cage') return 'special-cage';
  if (tool === 'special-boxline' || tool === 'boxline') return 'special-boxline';
  if (tool === 'multicolor-surface') return 'multicolor-surface';
  if (tool === 'solution-area') return 'solution-area';
  if (tool.startsWith('number')) return 'number';
  if (tool.startsWith('text')) return 'text';
  if (tool === 'select') return 'select';
  return 'unknown';
}
