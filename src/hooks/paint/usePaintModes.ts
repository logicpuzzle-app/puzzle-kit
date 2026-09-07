import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { constraintCatalog } from '../../constraints/ConstraintCatalog';
import { inputModeToTool } from '../../constraints/inputModeMapping';
import type { InputMode } from '../../constraints/types';
import type { ToolSettings } from '../../types';
import { PAINT_CATEGORIES, PAINT_COLOR_SWATCHES } from '../../components/paint/constants';
import type { PaintCategory } from '../../components/paint/types';

const getPaintCategoryForMode = (mode: InputMode): PaintCategory | null => {
  if (mode === 'peke') {
    return 'line';
  }
  const mapping = inputModeToTool[mode];
  const category = mapping?.category;
  switch (category) {
    case 'surface':
      return 'surface';
    case 'number':
      return 'number';
    case 'symbol':
      return 'symbol';
    case 'line':
    case 'edge':
    case 'wall':
      return 'line';
    default:
      return null;
  }
};

type UsePaintModesArgs = {
  toolSettings: ToolSettings;
  currentInputMode: InputMode | null;
  setInputMode: (mode: InputMode) => void;
  setToolSettings: (updates: Partial<ToolSettings>) => void;
};

export const usePaintModes = ({
  toolSettings,
  currentInputMode,
  setInputMode,
  setToolSettings,
}: UsePaintModesArgs) => {
  const paintSchema = constraintCatalog.getSchema('paint');
  const paintModes = paintSchema?.inputModes.play ?? [];
  const lastWordModeRef = useRef<ToolSettings['numberInputMode']>('alphabet');
  const isFreehandLine = toolSettings.lineDirections?.includes('freehand') ?? false;
  const wordDirection = toolSettings.numberWordDirection ?? 'horizontal';

  const [activeCategory, setActiveCategory] = useState<PaintCategory>('surface');
  const [selectedSwatchId, setSelectedSwatchId] = useState<string>(() => {
    const match = PAINT_COLOR_SWATCHES.find((swatch) => swatch.color === toolSettings.color);
    return match?.id ?? PAINT_COLOR_SWATCHES[0]?.id ?? 'green';
  });
  const [lineAnchor, setLineAnchor] = useState<'cell' | 'vertex'>(() => {
    const points = toolSettings.lineGridPoints || ['cell'];
    return points.includes('vertex') && !points.includes('cell') ? 'vertex' : 'cell';
  });

  const categoryModes = useMemo(() => {
    const nextModes: Record<PaintCategory, InputMode[]> = {
      surface: [],
      number: [],
      word: [],
      symbol: [],
      line: [],
      freehand: [],
    };
    paintModes.forEach((mode) => {
      const category = getPaintCategoryForMode(mode);
      if (category) {
        nextModes[category].push(mode);
      }
    });
    nextModes.word = [...nextModes.number];
    nextModes.freehand = [...nextModes.line];
    return nextModes;
  }, [paintModes]);

  const availableCategories = useMemo(
    () =>
      PAINT_CATEGORIES.filter((category) => {
        if (category.id === 'word') {
          return categoryModes.number.length > 0;
        }
        if (category.id === 'freehand') {
          return categoryModes.line.length > 0;
        }
        return categoryModes[category.id].length > 0;
      }),
    [categoryModes]
  );

  useEffect(() => {
    const mode = toolSettings.numberInputMode;
    if (mode && mode !== 'number') {
      lastWordModeRef.current = mode;
    }
  }, [toolSettings.numberInputMode]);

  useEffect(() => {
    if (!paintModes.length) return;
    if (!paintModes.includes(currentInputMode as InputMode)) {
      setInputMode(paintModes[0]);
    }
  }, [paintModes, currentInputMode, setInputMode]);

  useEffect(() => {
    const match = PAINT_COLOR_SWATCHES.find((swatch) => swatch.color === toolSettings.color);
    if (match && match.id !== selectedSwatchId) {
      setSelectedSwatchId(match.id);
    }
  }, [selectedSwatchId, toolSettings.color]);

  useEffect(() => {
    const points = toolSettings.lineGridPoints || ['cell'];
    const nextAnchor = points.includes('vertex') && !points.includes('cell') ? 'vertex' : 'cell';
    if (nextAnchor !== lineAnchor) {
      setLineAnchor(nextAnchor);
    }
  }, [lineAnchor, toolSettings.lineGridPoints]);

  useEffect(() => {
    if (!currentInputMode) return;
    const category = getPaintCategoryForMode(currentInputMode as InputMode);
    if (!category) return;
    if (category === 'line') {
      setActiveCategory(isFreehandLine ? 'freehand' : 'line');
      return;
    }
    if (category === 'number') {
      const mode = toolSettings.numberInputMode ?? 'number';
      setActiveCategory(mode === 'number' ? 'number' : 'word');
      return;
    }
    setActiveCategory(category);
  }, [currentInputMode, isFreehandLine, toolSettings.numberInputMode]);

  const handleCategorySelect = useCallback(
    (category: PaintCategory) => {
      setActiveCategory(category);
      const resolvedCategory = category === 'word' ? 'number' : category === 'freehand' ? 'line' : category;
      const modes = categoryModes[resolvedCategory] ?? [];
      if (!modes.includes(currentInputMode as InputMode) && modes.length > 0) {
        setInputMode(modes[0]);
      }

      if (category === 'word') {
        setToolSettings({ numberInputMode: lastWordModeRef.current || 'alphabet' });
      } else if (category === 'number') {
        setToolSettings({ numberInputMode: 'number' });
      }

      if (category === 'freehand') {
        setToolSettings({ lineDirections: ['freehand'] });
      } else if (category === 'line') {
        const filtered = (toolSettings.lineDirections ?? ['orthogonal']).filter((dir) => dir !== 'freehand');
        setToolSettings({ lineDirections: filtered.length > 0 ? filtered : ['orthogonal'] });
      }
    },
    [categoryModes, currentInputMode, setInputMode, setToolSettings, toolSettings.lineDirections]
  );

  const handleInputModeSelect = useCallback(
    (mode: InputMode) => {
      setInputMode(mode);
      const swatch = PAINT_COLOR_SWATCHES.find((item) => item.id === selectedSwatchId);
      if (swatch) {
        setToolSettings({ color: swatch.color });
      }
    },
    [selectedSwatchId, setInputMode, setToolSettings]
  );

  const handleSwatchSelect = useCallback(
    (swatchId: string, color: string) => {
      setSelectedSwatchId(swatchId);
      setToolSettings({ color });
    },
    [setToolSettings]
  );

  const handleLineAnchorChange = useCallback(
    (next: 'cell' | 'vertex') => {
      setLineAnchor(next);
      setToolSettings({ lineGridPoints: [next] });
    },
    [setToolSettings]
  );

  const handleWordDirectionChange = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      setToolSettings({ numberWordDirection: direction });
    },
    [setToolSettings]
  );

  return {
    paintModes,
    categoryModes,
    availableCategories,
    activeCategory,
    selectedSwatchId,
    lineAnchor,
    wordDirection,
    handleCategorySelect,
    handleInputModeSelect,
    handleSwatchSelect,
    handleLineAnchorChange,
    handleWordDirectionChange,
  };
};
