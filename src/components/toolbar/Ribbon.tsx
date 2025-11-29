import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { ToolCategory, ToolType, LineGridPoint, LineDirection } from '../../types';

// Eye icons for visibility toggle
const EyeIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// SVG Icons for special tools
const ThermoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Bulb at bottom */}
    <circle cx="12" cy="18" r="4" fill="currentColor" stroke="none" />
    {/* Tube going up */}
    <line x1="12" y1="14" x2="12" y2="4" strokeWidth="3" />
    {/* Top cap */}
    <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const ArrowIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Circle at start */}
    <circle cx="6" cy="12" r="4" fill="none" />
    {/* Arrow line */}
    <line x1="10" y1="12" x2="20" y2="12" />
    {/* Arrow head */}
    <polyline points="16 8 20 12 16 16" />
  </svg>
);

const CageIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Dashed rectangle representing cage */}
    <rect x="4" y="4" width="16" height="16" strokeDasharray="3,2" fill="none" />
    {/* Small number in corner */}
    <text x="6" y="10" fontSize="6" fill="currentColor" stroke="none">12</text>
  </svg>
);

// Map tool IDs to SVG icons
const SPECIAL_TOOL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'special-thermo': ThermoIcon,
  'special-arrow': ArrowIcon,
  'special-cage': CageIcon,
};

interface ToolDef {
  id: ToolType;
  icon: string;
  labelKey: string;
}

const toolGroups: Record<ToolCategory, ToolDef[]> = {
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
  ],
  cage: [
    { id: 'special-cage', icon: '⊞', labelKey: 'tool.special.cage' },
  ],
  select: [
    { id: 'select', icon: '⎕', labelKey: 'tools.select' },
  ],
};

// Main categories for the primary toolbar
interface CategoryDef {
  id: ToolCategory;
  icon: string;
  labelKey: string;
  defaultTool: ToolType;
}

const mainCategories: CategoryDef[] = [
  { id: 'surface', icon: '■', labelKey: 'tools.surface', defaultTool: 'surface-fill' },
  { id: 'line', icon: '─', labelKey: 'tools.line', defaultTool: 'line-normal' },
  { id: 'number', icon: '1', labelKey: 'tools.number', defaultTool: 'number-normal' },
  { id: 'symbol', icon: '○', labelKey: 'tools.symbol', defaultTool: 'symbol-circle' },
  { id: 'special', icon: '⊞', labelKey: 'tools.special', defaultTool: 'special-cage' },
];

export const Ribbon: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setTool,
    activeLayer,
    setActiveLayer,
    showProblemLayer,
    showAnswerLayer,
    toggleProblemLayer,
    toggleAnswerLayer,
    grid,
    setGrid,
    isGridMode,
    setGridMode,
  } = usePuzzleStore();

  const handleCategoryClick = (category: CategoryDef) => {
    // Close grid settings if open
    if (isGridMode) {
      setGridMode(false);
    }
    // If clicking the same category, keep current tool
    // Otherwise, switch to the default tool for this category
    if (toolSettings.currentCategory !== category.id) {
      setTool(category.defaultTool, category.id);
    }
  };

  const handleLayerClick = (layer: 'problem' | 'answer') => {
    // Close grid settings if open and switch to the layer
    if (isGridMode) {
      setGridMode(false);
    }
    setActiveLayer(layer);
  };

  return (
    <div className="bg-office-ribbon border-b border-office-border">
      {/* Primary toolbar - Category selection */}
      <div className="flex items-center px-2 py-1 border-b border-office-border">
        {/* Layer switcher with visibility toggles */}
        <div className="flex items-center gap-2 px-2 border-r border-office-border mr-2">
          {/* Grid button + toggle - leftmost */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isGridMode
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGridMode(!isGridMode)}
              title={t('grid.title')}
            >
              {t('grid.title')}
            </button>
            <button
              className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors text-xs ${
                isGridMode
                  ? grid.showGrid
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-office-accent/60 text-white/70 border-office-accent'
                  : grid.showGrid
                    ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                    : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGrid({ showGrid: !grid.showGrid })}
              title={t('view.showGrid')}
            >
              #
            </button>
          </div>
          {/* Problem layer - button with eye on right */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isGridMode
                  ? 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  : activeLayer === 'problem'
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleLayerClick('problem')}
              title={t('layer.problem')}
            >
              {t('layer.problem')}
            </button>
            <button
              className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors ${
                isGridMode
                  ? showProblemLayer
                    ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                    : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
                  : activeLayer === 'problem'
                    ? showProblemLayer
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-office-accent/60 text-white/70 border-office-accent'
                    : showProblemLayer
                      ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                      : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
              }`}
              onClick={toggleProblemLayer}
              title={t('view.showProblem')}
            >
              {showProblemLayer ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
            </button>
          </div>
          {/* Answer layer - button with eye on right */}
          <div className="flex items-center">
            <button
              className={`h-7 px-2 text-xs rounded-l-sm border border-r-0 transition-colors ${
                isGridMode
                  ? 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  : activeLayer === 'answer'
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleLayerClick('answer')}
              title={t('layer.answer')}
            >
              {t('layer.answer')}
            </button>
            <button
              className={`h-7 w-7 flex items-center justify-center rounded-r-sm border-t border-b border-r transition-colors ${
                isGridMode
                  ? showAnswerLayer
                    ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                    : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
                  : activeLayer === 'answer'
                    ? showAnswerLayer
                      ? 'bg-office-accent text-white border-office-accent'
                      : 'bg-office-accent/60 text-white/70 border-office-accent'
                    : showAnswerLayer
                      ? 'bg-white border-office-border text-office-text hover:bg-office-ribbon-hover'
                      : 'bg-white border-office-border text-gray-400 hover:bg-office-ribbon-hover'
              }`}
              onClick={toggleAnswerLayer}
              title={t('view.showAnswer')}
            >
              {showAnswerLayer ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
            </button>
          </div>
        </div>

        {/* Main category buttons */}
        <div className="flex items-center gap-1">
          {mainCategories.map((category) => (
            <button
              key={category.id}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-sm border transition-colors ${
                isGridMode
                  ? 'bg-white border-office-border hover:bg-office-ribbon-hover'
                  : toolSettings.currentCategory === category.id
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              <span className="text-base">{category.icon}</span>
              <span>{t(category.labelKey)}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Secondary toolbar - Tool details */}
      <div className="flex items-center px-2 py-1 min-h-[50px]">
        {isGridMode ? (
          <ViewTabContent />
        ) : (
          <>
            {/* Tool options for current category */}
            <div className="flex items-center gap-1">
              {toolGroups[toolSettings.currentCategory]?.map((tool) => {
                const SvgIcon = SPECIAL_TOOL_ICONS[tool.id];
                return (
                  <button
                    key={tool.id}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-sm border transition-colors ${
                      toolSettings.currentTool === tool.id
                        ? 'bg-office-accent text-white border-office-accent'
                        : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => setTool(tool.id, toolSettings.currentCategory)}
                    title={t(tool.labelKey)}
                  >
                    {SvgIcon ? (
                      <SvgIcon size={16} />
                    ) : (
                      <span className="text-base">{tool.icon}</span>
                    )}
                    <span>{t(tool.labelKey)}</span>
                  </button>
                );
              })}
            </div>

            {/* Additional options based on tool */}
            {toolSettings.currentCategory === 'line' && (
              <LineSettingsPicker />
            )}

            {toolSettings.currentCategory === 'symbol' && (
              <SymbolSettingsPicker />
            )}

            {toolSettings.currentCategory === 'text' && (
              <div className="ml-4 border-l border-office-border pl-4">
                <TextCharacterPicker />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ViewTabContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { grid, setGrid } = usePuzzleStore();

  return (
    <>
      {/* Grid Size */}
      <div className="flex flex-col items-center px-3 border-r border-office-border">
        <div className="flex gap-2 mb-1">
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-office-text-secondary">{t('grid.rows')}</label>
            <input
              type="number"
              className="w-12 h-6 px-1 text-xs border border-office-border rounded-sm text-center"
              value={grid.rows}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num) && num >= 1 && num <= 50) setGrid({ rows: num });
              }}
              min={1}
              max={50}
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-office-text-secondary">{t('grid.cols')}</label>
            <input
              type="number"
              className="w-12 h-6 px-1 text-xs border border-office-border rounded-sm text-center"
              value={grid.cols}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num) && num >= 1 && num <= 50) setGrid({ cols: num });
              }}
              min={1}
              max={50}
            />
          </div>
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('grid.size')}
        </span>
      </div>

      {/* Grid Style */}
      <div className="flex flex-col items-center px-3 border-r border-office-border">
        <div className="flex gap-0.5 mb-1">
          {(['normal', 'thick', 'dots', 'dashed'] as const).map((style) => (
            <button
              key={style}
              className={`px-2 py-1 text-[10px] border rounded-sm transition-colors ${
                grid.gridStyle === style
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGrid({ gridStyle: style })}
            >
              {t(`grid.style.${style}`)}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('grid.style')}
        </span>
      </div>

      {/* Frame Style */}
      <div className="flex flex-col items-center px-3 border-r border-office-border">
        <div className="flex gap-0.5 mb-1">
          {(['normal', 'thick', 'double', 'none'] as const).map((style) => (
            <button
              key={style}
              className={`px-2 py-1 text-[10px] border rounded-sm transition-colors ${
                grid.frameStyle === style
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => setGrid({ frameStyle: style })}
            >
              {t(`grid.frame.${style}`)}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('grid.frame')}
        </span>
      </div>

      {/* Colors */}
      <div className="flex flex-col items-center px-3">
        <div className="flex gap-2 mb-1">
          <div className="flex flex-col items-center">
            <input
              type="color"
              className="w-6 h-6 cursor-pointer border border-office-border rounded"
              value={grid.backgroundColor}
              onChange={(e) => setGrid({ backgroundColor: e.target.value })}
              title={t('grid.backgroundColor')}
            />
            <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '背景' : 'BG'}</span>
          </div>
          <div className="flex flex-col items-center">
            <input
              type="color"
              className="w-6 h-6 cursor-pointer border border-office-border rounded"
              value={grid.gridColor}
              onChange={(e) => setGrid({ gridColor: e.target.value })}
              title={t('grid.gridColor')}
            />
            <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '線' : 'Line'}</span>
          </div>
          <div className="flex flex-col items-center">
            <input
              type="color"
              className="w-6 h-6 cursor-pointer border border-office-border rounded"
              value={grid.frameColor}
              onChange={(e) => setGrid({ frameColor: e.target.value })}
              title={t('grid.frameColor')}
            />
            <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '枠' : 'Frame'}</span>
          </div>
          {/* Disabled cell color - only show when there are disabled cells */}
          {grid.disabledCells && grid.disabledCells.length > 0 && (
            <div className="flex flex-col items-center">
              <input
                type="color"
                className="w-6 h-6 cursor-pointer border border-office-border rounded"
                value={grid.disabledCellColor || '#c0c0c0'}
                onChange={(e) => setGrid({ disabledCellColor: e.target.value })}
                title={t('grid.disabledCellColor')}
              />
              <span className="text-[8px] text-office-text-secondary">{i18n.language === 'ja' ? '無効' : 'Off'}</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('panel.colors')}
        </span>
      </div>
    </>
  );
};

const TextCharacterPicker: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings } = usePuzzleStore();

  const getCharacterSet = () => {
    switch (toolSettings.currentTool) {
      case 'text-alphabet':
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      case 'text-hiragana':
        return 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');
      case 'text-katakana':
        return 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
      default:
        return [];
    }
  };

  const chars = getCharacterSet();
  const isFreeText = toolSettings.currentTool === 'text-free';

  return (
    <div className="flex flex-col items-center px-3 border-r border-office-border">
      {isFreeText ? (
        <>
          <input
            type="text"
            className="w-24 px-2 py-1 text-sm border border-office-border rounded focus:border-office-accent focus:outline-none mb-1"
            placeholder={t('tool.text.inputPlaceholder')}
            maxLength={10}
          />
          <span className="text-[10px] text-office-text-secondary">{t('tool.text.free')}</span>
        </>
      ) : chars.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-0.5 max-w-[180px] max-h-[60px] overflow-y-auto mb-1">
            {chars.map((char) => (
              <button
                key={char}
                className="w-5 h-5 text-xs border border-office-border rounded-sm hover:bg-office-ribbon-hover hover:border-office-accent transition-colors"
                title={char}
              >
                {char}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-office-text-secondary">
            {t(`tool.text.${toolSettings.currentTool.replace('text-', '')}`)}
          </span>
        </>
      ) : null}
    </div>
  );
};

const LineSettingsPicker: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();

  const gridPoints: { id: LineGridPoint; icon: string; labelKey: string }[] = [
    { id: 'cell', icon: '⬤', labelKey: 'tool.line.gridPoint.cell' },
    { id: 'vertex', icon: '⊡', labelKey: 'tool.line.gridPoint.vertex' },
    { id: 'edge', icon: '─', labelKey: 'tool.line.gridPoint.edge' },
  ];

  const directions: { id: LineDirection; icon: string; labelKey: string }[] = [
    { id: 'orthogonal', icon: '┼', labelKey: 'tool.line.direction.orthogonal' },
    { id: 'diagonal', icon: '╳', labelKey: 'tool.line.direction.diagonal' },
    { id: 'straight', icon: '╱', labelKey: 'tool.line.direction.straight' },
    { id: 'freehand', icon: '〜', labelKey: 'tool.line.direction.freehand' },
  ];

  const toggleGridPoint = (point: LineGridPoint) => {
    const current = toolSettings.lineGridPoints || ['cell'];
    let newPoints: LineGridPoint[];

    if (current.includes(point)) {
      // Don't allow removing the last item
      if (current.length > 1) {
        newPoints = current.filter(p => p !== point);
      } else {
        return;
      }
    } else {
      newPoints = [...current, point];
    }
    setToolSettings({ lineGridPoints: newPoints });
  };

  const toggleDirection = (direction: LineDirection) => {
    const current = toolSettings.lineDirections || ['orthogonal'];
    let newDirections: LineDirection[];

    // 'freehand' is mutually exclusive with all other modes
    // 'straight' is mutually exclusive with 'orthogonal' and 'diagonal' (but allows only one straight line)
    const gridSnapModes: LineDirection[] = ['orthogonal', 'diagonal'];
    const specialModes: LineDirection[] = ['straight', 'freehand'];

    if (direction === 'freehand') {
      if (current.includes('freehand')) {
        // Switching from freehand to orthogonal
        newDirections = ['orthogonal'];
      } else {
        // Select freehand, deselect all others
        newDirections = ['freehand'];
      }
    } else if (direction === 'straight') {
      if (current.includes('straight')) {
        // Switching from straight to orthogonal
        newDirections = ['orthogonal'];
      } else {
        // Select straight, deselect all others
        newDirections = ['straight'];
      }
    } else {
      // orthogonal or diagonal selected
      if (current.includes('freehand') || current.includes('straight')) {
        // Was in special mode, switch to the selected grid-snap direction
        newDirections = [direction];
      } else if (current.includes(direction)) {
        // Don't allow removing the last item
        if (current.length > 1) {
          newDirections = current.filter(d => d !== direction);
        } else {
          return;
        }
      } else {
        // Add direction (only grid-snap modes can be combined)
        newDirections = [...current.filter(d => gridSnapModes.includes(d)), direction];
      }
    }
    setToolSettings({ lineDirections: newDirections });
  };

  const currentGridPoints = toolSettings.lineGridPoints || ['cell'];
  const currentDirections = toolSettings.lineDirections || ['orthogonal'];

  return (
    <div className="flex items-center gap-4">
      {/* Grid point type selector (multi-select toggle) */}
      <div className="flex flex-col items-center">
        <div className="flex gap-0.5 mb-1">
          {gridPoints.map((gp) => (
            <button
              key={gp.id}
              className={`px-2 py-1 text-xs border rounded-sm transition-colors ${
                currentGridPoints.includes(gp.id)
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => toggleGridPoint(gp.id)}
              title={t(gp.labelKey)}
            >
              <span className="text-base mr-1">{gp.icon}</span>
              <span>{t(gp.labelKey)}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('tool.line.gridPoints')}
        </span>
      </div>

      {/* Direction selector (multi-select toggle) */}
      <div className="flex flex-col items-center border-l border-office-border pl-4">
        <div className="flex gap-0.5 mb-1">
          {directions.map((dir) => (
            <button
              key={dir.id}
              className={`px-2 py-1 text-xs border rounded-sm transition-colors ${
                currentDirections.includes(dir.id)
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => toggleDirection(dir.id)}
              title={t(dir.labelKey)}
            >
              <span className="text-base mr-1">{dir.icon}</span>
              <span>{t(dir.labelKey)}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('tool.line.directions')}
        </span>
      </div>
    </div>
  );
};

const SymbolSettingsPicker: React.FC = () => {
  const { t } = useTranslation();
  const { toolSettings, setToolSettings } = usePuzzleStore();

  const gridPoints: { id: LineGridPoint; icon: string; labelKey: string }[] = [
    { id: 'cell', icon: '⬤', labelKey: 'tool.line.gridPoint.cell' },
    { id: 'vertex', icon: '⊡', labelKey: 'tool.line.gridPoint.vertex' },
    { id: 'edge', icon: '─', labelKey: 'tool.line.gridPoint.edge' },
  ];

  const toggleGridPoint = (point: LineGridPoint) => {
    const current = toolSettings.symbolGridPoints || ['cell'];
    let newPoints: LineGridPoint[];

    if (current.includes(point)) {
      // Don't allow removing the last item
      if (current.length > 1) {
        newPoints = current.filter(p => p !== point);
      } else {
        return;
      }
    } else {
      newPoints = [...current, point];
    }
    setToolSettings({ symbolGridPoints: newPoints });
  };

  const currentGridPoints = toolSettings.symbolGridPoints || ['cell'];

  return (
    <div className="flex items-center gap-4 ml-4 border-l border-office-border pl-4">
      {/* Grid point type selector (multi-select toggle) */}
      <div className="flex flex-col items-center">
        <div className="flex gap-0.5 mb-1">
          {gridPoints.map((gp) => (
            <button
              key={gp.id}
              className={`px-2 py-1 text-xs border rounded-sm transition-colors ${
                currentGridPoints.includes(gp.id)
                  ? 'bg-office-accent text-white border-office-accent'
                  : 'bg-white border-office-border hover:bg-office-ribbon-hover'
              }`}
              onClick={() => toggleGridPoint(gp.id)}
              title={t(gp.labelKey)}
            >
              <span className="text-base mr-1">{gp.icon}</span>
              <span>{t(gp.labelKey)}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-office-text-secondary uppercase">
          {t('tool.symbol.gridPoints')}
        </span>
      </div>
    </div>
  );
};

